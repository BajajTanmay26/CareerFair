/**
 * English Careers Hub — Cloudflare Pages Functions
 * Single-file handler for all /api/* routes
 * Bound: DB (D1), ELEVEN_KEY, ADMIN_PASSWORD, STT_MODEL, DICTIONARY_API
 */

// ─── Helpers ────────────────────────────────────────────────────────────────

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });

const err = (msg, status = 400) => json({ error: msg }, status);

/** Levenshtein distance */
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[m][n];
}

/** Normalise text for comparison */
const norm = s => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();

/** Word-level accuracy (1 - WER) */
function accuracy(ref, hyp) {
  const rw = norm(ref).split(/\s+/);
  const hw = norm(hyp).split(/\s+/);
  const dist = levenshtein(rw.join(' '), hw.join(' '));
  const maxLen = Math.max(rw.join(' ').length, hw.join(' ').length);
  if (maxLen === 0) return 100;
  return Math.max(0, Math.round((1 - dist / maxLen) * 100));
}

/** Auth check */
const authed = (req, env) => {
  const auth = req.headers.get('Authorization') || '';
  const pwd = auth.replace('Bearer ', '');
  return pwd === (env.ADMIN_PASSWORD || 'careers2026');
};

/** Get kv value */
async function kvGet(db, k, fallback = '') {
  try {
    const row = await db.prepare('SELECT v FROM kv WHERE k=?').bind(k).first();
    return row ? row.v : fallback;
  } catch { return fallback; }
}

/** Set kv value */
async function kvSet(db, k, v) {
  await db.prepare('INSERT OR REPLACE INTO kv(k,v) VALUES(?,?)').bind(k, String(v)).run();
}

// Default sentence pools
const DEFAULT_SENTENCES = {
  Everyday: [
    'Say your name and one thing you love about English.',
    'Describe your favourite book in three sentences.',
    'Talk about a career you find interesting and why.',
    'Explain what journalism means to you.',
    'Share your favourite English idiom and its meaning.',
    'Tell us about a place you want to visit and describe it vividly.',
    'What does the word eloquence mean? Use it in a sentence.',
    'Describe the plot of a movie you recently watched.',
    'What are three qualities of a good communicator?',
    'Explain the difference between a novel and a short story.',
  ],
  Journalism: [
    'Read this headline aloud and explain its meaning: Local Students Win National Debate Championship.',
    'Describe the role of a journalist in a democratic society.',
    'Read aloud: The editor reviewed the manuscript before it went to print.',
    'Explain the five Ws of journalism: Who, What, When, Where, Why.',
    'Read this lead: Hundreds gathered at the city square to protest rising tuition fees.',
    'Describe the difference between a news report and an editorial.',
    'Read aloud: Investigative journalism exposes corruption and holds power accountable.',
    'What is the role of social media in modern journalism?',
    'Read and explain: The broadcaster delivered the breaking news with composure and clarity.',
    'Describe what a press conference is and what happens there.',
  ],
  Law: [
    'Read aloud: The defendant pleaded not guilty to all charges.',
    'Explain the difference between civil law and criminal law.',
    'Read: The court interpreter translated the testimony with precision.',
    'What does the term litigation mean? Use it in a sentence.',
    'Read aloud: Advocacy requires both eloquence and evidence.',
    'Describe the role of a lawyer in a courtroom.',
    'Read: The judge overruled the objection and allowed the witness to continue.',
    'What is a preamble? Read the preamble to the Indian Constitution.',
    'Read aloud: Justice delayed is justice denied.',
    'Explain what a legal brief is.',
  ],
  Academic: [
    'Read aloud: The hypothesis was tested through rigorous empirical research.',
    'Explain the difference between a thesis and a dissertation.',
    'Read: The bibliography listed over forty scholarly sources.',
    'What does peer-reviewed mean in academic research?',
    'Read aloud: Plagiarism undermines the integrity of academic work.',
    'Describe the structure of a well-written academic essay.',
    'Read: The curriculum emphasised critical thinking and linguistic analysis.',
    'What is the difference between deductive and inductive reasoning?',
    'Read aloud: The annotation provided contextual notes for each cited source.',
    'Explain what a literature review is and why it matters in research.',
  ],
};

// ─── Router ─────────────────────────────────────────────────────────────────

export async function onRequest(ctx) {
  const { request, env } = ctx;
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api/, '').replace(/\/$/, '') || '/';
  const method = request.method.toUpperCase();

  // CORS preflight
  if (method === 'OPTIONS')
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      },
    });

  const db = env.DB;

  // ── GET /config ──────────────────────────────────────────────────────────
  if (path === '/config' && method === 'GET') {
    const pass   = await kvGet(db, 'pass', '70');
    const banner = await kvGet(db, 'banner', '');
    const timer  = await kvGet(db, 'timer', '0');
    const packs  = {};
    for (const p of ['Everyday', 'Journalism', 'Law', 'Academic']) {
      const raw = await kvGet(db, `pack_${p}`, '');
      try { packs[p] = JSON.parse(raw); } catch { packs[p] = DEFAULT_SENTENCES[p]; }
    }
    return json({ pass: parseInt(pass), banner, timer: parseInt(timer), packs });
  }

  // ── GET /scores ──────────────────────────────────────────────────────────
  if (path === '/scores' && method === 'GET') {
    const pack = url.searchParams.get('pack') || '';
    let q = 'SELECT id,name,pack,level,acc,ts FROM scores';
    const binds = [];
    if (pack && pack !== 'All') { q += ' WHERE pack=?'; binds.push(pack); }
    q += ' ORDER BY level DESC, acc DESC LIMIT 50';
    const { results } = binds.length
      ? await db.prepare(q).bind(...binds).all()
      : await db.prepare(q).all();
    return json(results || []);
  }

  // ── POST /attempt ────────────────────────────────────────────────────────
  if (path === '/attempt' && method === 'POST') {
    const formData = await request.formData();
    const name   = (formData.get('name') || '').trim().slice(0, 40);
    const level  = parseInt(formData.get('level') || '1');
    const pack   = (formData.get('pack') || 'Everyday').trim();
    const audio  = formData.get('audio');
    const target = (formData.get('target') || '').trim();

    if (!name) return err('Name required');
    if (!audio) return err('Audio required');

    // ElevenLabs STT with graceful fallback
    let transcript = (formData.get('fallback_text') || '').trim();

    if (env.ELEVEN_KEY && env.ELEVEN_KEY.startsWith('sk_')) {
      try {
        const sttForm = new FormData();
        sttForm.append('file', audio, 'audio.webm');
        sttForm.append('model_id', env.STT_MODEL || 'scribe_v1');

        const sttRes = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
          method: 'POST',
          headers: { 'xi-api-key': env.ELEVEN_KEY },
          body: sttForm,
        });

        if (sttRes.ok) {
          const sttJson = await sttRes.json();
          if (sttJson.text) transcript = sttJson.text.trim();
        }
      } catch (e) {
        // Fallback to client transcript
      }
    }

    const passThreshold = parseInt(await kvGet(db, 'pass', '70'));
    const acc = transcript ? accuracy(target, transcript) : 0;
    const passed = acc >= passThreshold;

    // Upsert score (keep best: highest level then highest acc)
    const existing = await db
      .prepare('SELECT level, acc FROM scores WHERE name=? COLLATE NOCASE')
      .bind(name).first();

    if (!existing || level > existing.level || (level === existing.level && acc > existing.acc)) {
      await db
        .prepare(
          'INSERT INTO scores(name,pack,level,acc,ts) VALUES(?,?,?,?,?) ' +
          'ON CONFLICT(name) DO UPDATE SET pack=excluded.pack, level=excluded.level, acc=excluded.acc, ts=excluded.ts'
        )
        .bind(name, pack, level, acc, Date.now())
        .run();
    }

    return json({ transcript, acc, passed, passThreshold });
  }

  // ── GET /random-sentence ─────────────────────────────────────────────────
  if (path === '/random-sentence' && method === 'GET') {
    const pack = url.searchParams.get('pack') || 'Everyday';
    const raw = await kvGet(db, `pack_${pack}`, '');
    let sentences;
    try { sentences = JSON.parse(raw); } catch { sentences = DEFAULT_SENTENCES[pack] || DEFAULT_SENTENCES.Everyday; }
    if (!sentences.length) sentences = DEFAULT_SENTENCES.Everyday;
    const sentence = sentences[Math.floor(Math.random() * sentences.length)];
    return json({ sentence });
  }

  // ── GET /dict/:word ──────────────────────────────────────────────────────
  if (path.startsWith('/dict/') && method === 'GET') {
    const word = decodeURIComponent(path.replace('/dict/', '').trim().toLowerCase());
    if (!word) return err('Word required');
    // Check kv cache
    const cacheKey = `dict_${word}`;
    const cached = await kvGet(db, cacheKey, '');
    if (cached) {
      try { return json(JSON.parse(cached)); } catch {}
    }
    try {
      const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
      const data = await res.json();
      if (res.ok) {
        // Cache for ~24h (we just store it — D1 has no TTL so it persists)
        await kvSet(db, cacheKey, JSON.stringify(data));
      }
      return new Response(JSON.stringify(data), {
        status: res.status,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    } catch (e) {
      return err(`Dictionary fetch failed: ${e.message}`, 502);
    }
  }

  // ── POST /feedback ───────────────────────────────────────────────────────
  if (path === '/feedback' && method === 'POST') {
    let body;
    try { body = await request.json(); } catch { return err('Invalid JSON'); }
    const { name='', role='Student', class_info='', r_useful=0, r_games=0, r_speaking=0, comment='' } = body;
    await db
      .prepare(
        'INSERT INTO feedback(name,role,class_info,r_useful,r_games,r_speaking,comment,ts) VALUES(?,?,?,?,?,?,?,?)'
      )
      .bind(
        String(name).slice(0,50), String(role).slice(0,20), String(class_info).slice(0,50),
        parseInt(r_useful)||0, parseInt(r_games)||0, parseInt(r_speaking)||0,
        String(comment).slice(0,1000), Date.now()
      ).run();
    return json({ ok: true });
  }

  // ── GET /feedback (admin) ────────────────────────────────────────────────
  if (path === '/feedback' && method === 'GET') {
    if (!authed(request, env)) return err('Unauthorized', 401);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = 20;
    const offset = (page - 1) * limit;
    const { results } = await db
      .prepare('SELECT * FROM feedback ORDER BY ts DESC LIMIT ? OFFSET ?')
      .bind(limit, offset).all();
    const countRow = await db.prepare('SELECT COUNT(*) as c FROM feedback').first();
    return json({ results: results || [], total: countRow?.c || 0, page });
  }

  // ── GET /admin/ping ──────────────────────────────────────────────────────
  if (path === '/admin/ping' && method === 'GET') {
    if (!authed(request, env)) return err('Unauthorized', 401);
    return json({ ok: true });
  }

  // ── PUT /admin/config ────────────────────────────────────────────────────
  if (path === '/admin/config' && method === 'PUT') {
    if (!authed(request, env)) return err('Unauthorized', 401);
    let body;
    try { body = await request.json(); } catch { return err('Invalid JSON'); }
    const allowed = ['pass','banner','timer','pack_Everyday','pack_Journalism','pack_Law','pack_Academic'];
    for (const [k, v] of Object.entries(body)) {
      if (allowed.includes(k)) await kvSet(db, k, typeof v === 'object' ? JSON.stringify(v) : String(v));
    }
    return json({ ok: true });
  }

  // ── POST /admin/del ──────────────────────────────────────────────────────
  if (path === '/admin/del' && method === 'POST') {
    if (!authed(request, env)) return err('Unauthorized', 401);
    let body;
    try { body = await request.json(); } catch { return err('Invalid JSON'); }
    const { id } = body;
    if (!id) return err('id required');
    await db.prepare('DELETE FROM scores WHERE id=?').bind(id).run();
    return json({ ok: true });
  }

  // ── POST /admin/del-feedback ─────────────────────────────────────────────
  if (path === '/admin/del-feedback' && method === 'POST') {
    if (!authed(request, env)) return err('Unauthorized', 401);
    let body;
    try { body = await request.json(); } catch { return err('Invalid JSON'); }
    const { id } = body;
    if (!id) return err('id required');
    await db.prepare('DELETE FROM feedback WHERE id=?').bind(id).run();
    return json({ ok: true });
  }

  // ── POST /admin/reset ────────────────────────────────────────────────────
  if (path === '/admin/reset' && method === 'POST') {
    if (!authed(request, env)) return err('Unauthorized', 401);
    await db.prepare('DELETE FROM scores').run();
    return json({ ok: true });
  }

  // ── GET /admin/export ────────────────────────────────────────────────────
  if (path === '/admin/export' && method === 'GET') {
    if (!authed(request, env)) return err('Unauthorized', 401);
    const { results } = await db
      .prepare('SELECT id,name,pack,level,acc,ts FROM scores ORDER BY level DESC,acc DESC')
      .all();
    const rows = (results || []);
    let csv = 'ID,Name,Pack,Level,Accuracy,Timestamp\n';
    for (const r of rows) {
      const date = new Date(r.ts).toISOString();
      csv += `${r.id},"${r.name}","${r.pack}",${r.level},${r.acc},"${date}"\n`;
    }
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="scores.csv"',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  // ── GET /admin/export-feedback ───────────────────────────────────────────
  if (path === '/admin/export-feedback' && method === 'GET') {
    if (!authed(request, env)) return err('Unauthorized', 401);
    const { results } = await db
      .prepare('SELECT * FROM feedback ORDER BY ts DESC')
      .all();
    let csv = 'ID,Name,Role,ClassInfo,Useful,Games,Speaking,Comment,Timestamp\n';
    for (const r of (results || [])) {
      const date = new Date(r.ts).toISOString();
      const comment = String(r.comment || '').replace(/"/g, '""');
      csv += `${r.id},"${r.name}","${r.role}","${r.class_info}",${r.r_useful},${r.r_games},${r.r_speaking},"${comment}","${date}"\n`;
    }
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="feedback.csv"',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  return err('Not Found', 404);
}
