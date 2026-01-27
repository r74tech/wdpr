-- Users table (Wikidot ozone_user equivalent)
CREATE TABLE IF NOT EXISTS users (
  user_id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  unix_name TEXT NOT NULL UNIQUE
);

-- Site members (Wikidot member table equivalent)
CREATE TABLE IF NOT EXISTS members (
  member_id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id INTEGER NOT NULL DEFAULT 1,
  user_id INTEGER NOT NULL REFERENCES users(user_id),
  date_joined TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(site_id, user_id)
);

-- Pages table (Wikidot page table equivalent)
CREATE TABLE IF NOT EXISTS pages (
  page_id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id INTEGER NOT NULL DEFAULT 1,
  category TEXT NOT NULL DEFAULT '_default',
  unix_name TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT '',
  date_created TEXT NOT NULL DEFAULT (datetime('now')),
  date_last_edited TEXT NOT NULL DEFAULT (datetime('now')),
  owner_user_id INTEGER NOT NULL DEFAULT 1,
  rate INTEGER NOT NULL DEFAULT 0,
  UNIQUE(site_id, category, unix_name)
);

-- Page tags (Wikidot page_tag equivalent)
CREATE TABLE IF NOT EXISTS page_tags (
  page_id INTEGER NOT NULL REFERENCES pages(page_id),
  tag TEXT NOT NULL,
  PRIMARY KEY (page_id, tag)
);

-- Page rate votes (Wikidot page_rate_vote equivalent)
CREATE TABLE IF NOT EXISTS page_rate_vote (
  rate_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  page_id INTEGER NOT NULL REFERENCES pages(page_id),
  rate INTEGER NOT NULL DEFAULT 1,
  date TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, page_id)
);
