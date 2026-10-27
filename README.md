# 🎓 Class Xth D · English Careers Hub

A full-stack, responsive English careers, college guidance, voice-assessment, and language gaming web application built for Class Xth D. Hosted on **Cloudflare Pages** backed by **Cloudflare D1 (SQLite)**, **Cloudflare Workers Functions**, **ElevenLabs Speech-to-Text API**, and **Free Dictionary API**.

---

## 📁 Repository Structure

```text
careers-site/
├── functions/
│   └── api/
│       └── [[path]].js     # Cloudflare Pages Functions backend (D1, STT, dictionary, admin, feedback)
├── public/
│   └── index.html          # Full frontend (vanilla HTML5/CSS3/ES6+, responsive, no build step)
├── schema.sql              # D1 SQLite database tables & starter configuration
└── README.md               # Deployment and architecture guide
```

---

## 🚀 How to Deploy on Cloudflare Pages & GitHub

### Step 1: Push Project to GitHub
1. Create a new repository on [GitHub](https://github.com) (e.g. `english-careers-hub`).
2. Initialize git and push this folder's contents:
   ```bash
   git init
   git add .
   git commit -m "Initial commit for Class Xth D English Careers Hub"
   git branch -M main
   git remote add origin https://github.com/<your-username>/english-careers-hub.git
   git push -u origin main
   ```

### Step 2: Create Cloudflare Pages Project
1. Log in to your [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Navigate to **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**.
3. Select your `english-careers-hub` repository.
4. Set the build configuration:
   - **Framework preset**: `None`
   - **Build command**: *(leave completely empty)*
   - **Build output directory**: `public`
5. Click **Save and Deploy**.

### Step 3: Create Cloudflare D1 Database
1. In Cloudflare Dashboard, go to **Storage & Databases** > **D1 SQL Database**.
2. Click **Create database**, name it (e.g. `careers-db`).
3. Click on your newly created database, open the **Console** tab.
4. Copy the entire contents of [`schema.sql`](./schema.sql), paste into the console, and click **Execute**.

### Step 4: Bind D1 Database to Pages
1. Go back to **Workers & Pages** > select your **Pages project**.
2. Navigate to **Settings** > **Functions** > scroll to **D1 database bindings**.
3. Click **Add binding**:
   - **Variable name**: `DB`  *(must be exactly uppercase `DB`)*
   - **D1 Database**: select `careers-db` (or whatever you named it)
4. Click **Save**.

### Step 5: Add Environment Variables & Secrets
1. In your Pages project settings, go to **Environment variables** (or **Variables and Secrets**).
2. Add the following secrets under **Production**:
   - `ADMIN_PASSWORD`: `careers2026`
   - `ELEVEN_KEY`: *(Your ElevenLabs API key — free from [elevenlabs.io](https://elevenlabs.io))*
   - `STT_MODEL`: `scribe_v1` *(optional, defaults to scribe_v1)*
3. Click **Save**.

### Step 6: Trigger Redeployment
1. Go to the **Deployments** tab of your Pages project.
2. Click **Create deployment** or select the latest deployment and click **Retry deployment**.
3. Once deployed, open your live `*.pages.dev` URL!

---

## 🔑 Admin Portal Guide
- Go to the **Admin** tab on your live site.
- Enter the admin password: `careers2026`.
- **Admin features include**:
  - Live broadcast announcement banner at the top of the site.
  - Session / Exam countdown timer (shown in the header).
  - Configurable passing threshold percentage for speaking tests.
  - Live editor for all 4 Speaking Packs (`Everyday`, `Journalism`, `Law`, `Academic`).
  - View speaking leaderboard attempts, delete entries, clear scores, or export to CSV.
  - Exhibition feedback dashboard with star ratings and CSV export.

---

## 🎮 Included Interactive Features
1. **Careers Directory**: 32 English career pathways with skills, salaries, and Title Cased headers.
2. **College Explorer**: Major Maharashtra colleges (Mumbai, Pune, Nagpur, Aurangabad), all-India universities, and study-abroad options.
3. **Entrance Exams**: CUET-UG, CLAT, AILET, IIMC, EFLU, CTET, IELTS, TOEFL, SAT, UPSC.
4. **10 Interactive Language Games**:
   - *Flash Cards*: 40 Career + 40 SAT words with phonetic IPA, pronunciation audio, meaning, sentence, and origin.
   - *Live Word Check*: Validates any English word via dictionary API with instant grammar & definition.
   - *Word Guess (Wordle)*: 5-letter English words with colored tile feedback.
   - *Spelling Bee*: Browser speaks words aloud; student types correct spelling; tracks streaks.
   - *Hangman*: SVG animated gallows with career vocabulary clues.
   - *Crossword*: Interactive 8x8 crossword with clues and instant solution checking.
   - *Career Match-Up*: Pair goals with entrance exams.
   - *Timed Quiz*: 10-second rapid-fire questions on colleges, careers, and grammar.
   - *Fill in the Blank*: Grammar and context questions with immediate explanations.
   - *Idiom Match*: Common idioms and figurative meanings.
5. **ElevenLabs Speaking Ladder**: Real voice recording with speech-to-text accuracy scoring and level progression.
6. **Class Leaderboard**: Filter by speaking pack with medals for top rankers.
7. **Exhibition Feedback Form**: Anonymous or first-name only feedback with 5-star rating metrics.
