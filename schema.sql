-- English Careers Hub — D1 Schema
-- Run via: wrangler d1 execute careers-db --file=schema.sql

CREATE TABLE IF NOT EXISTS scores(
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  name  TEXT UNIQUE COLLATE NOCASE,
  pack  TEXT DEFAULT 'Everyday',
  level INTEGER,
  acc   INTEGER,
  ts    INTEGER
);

CREATE TABLE IF NOT EXISTS kv(
  k TEXT PRIMARY KEY,
  v TEXT
);

CREATE TABLE IF NOT EXISTS feedback(
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT,
  role       TEXT,
  class_info TEXT,
  r_useful   INTEGER,
  r_games    INTEGER,
  r_speaking INTEGER,
  comment    TEXT,
  ts         INTEGER
);

-- Seed default config (only if not exists)
INSERT OR IGNORE INTO kv(k,v) VALUES
  ('pass',    '70'),
  ('banner',  ''),
  ('timer',   '0'),
  ('pack_Everyday',
   '["Say your name and one thing you love about English.",
     "Describe your favourite book in three sentences.",
     "Talk about a career you find interesting and why.",
     "Explain what journalism means to you.",
     "Share your favourite English idiom and its meaning.",
     "Tell us about a place you want to visit and describe it vividly.",
     "What does the word eloquence mean? Use it in a sentence.",
     "Describe the plot of a movie you recently watched.",
     "What are three qualities of a good communicator?",
     "Explain the difference between a novel and a short story."]'),
  ('pack_Journalism',
   '["Read this headline aloud and explain its meaning: Local Students Win National Debate Championship.",
     "Describe the role of a journalist in a democratic society.",
     "Read aloud: The editor reviewed the manuscript before it went to print.",
     "Explain the five Ws of journalism: Who, What, When, Where, Why.",
     "Read this lead sentence: Hundreds gathered at the city square to protest rising tuition fees.",
     "Describe the difference between a news report and an editorial.",
     "Read aloud: Investigative journalism exposes corruption and holds power accountable.",
     "What is the role of social media in modern journalism?",
     "Read and explain: The broadcaster delivered the breaking news with composure and clarity.",
     "Describe what a press conference is and what happens there."]'),
  ('pack_Law',
   '["Read aloud: The defendant pleaded not guilty to all charges.",
     "Explain the difference between civil law and criminal law.",
     "Read: The court interpreter translated the testimony with precision.",
     "What does the term litigation mean? Use it in a sentence.",
     "Read aloud: Advocacy requires both eloquence and evidence.",
     "Describe the role of a lawyer in a courtroom.",
     "Read: The judge overruled the objection and allowed the witness to continue.",
     "What is a preamble? Read the preamble to the Indian Constitution.",
     "Read aloud: Justice delayed is justice denied.",
     "Explain what a legal brief is."]'),
  ('pack_Academic',
   '["Read aloud: The hypothesis was tested through rigorous empirical research.",
     "Explain the difference between a thesis and a dissertation.",
     "Read: The bibliography listed over forty scholarly sources.",
     "What does peer-reviewed mean in academic research?",
     "Read aloud: Plagiarism undermines the integrity of academic work.",
     "Describe the structure of a well-written academic essay.",
     "Read: The curriculum emphasised critical thinking and linguistic analysis.",
     "What is the difference between deductive and inductive reasoning?",
     "Read aloud: The annotation provided contextual notes for each cited source.",
     "Explain what a literature review is and why it matters in research."]');
