const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DB_PATH = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.join(__dirname, '..', 'data', 'app.db');

// Pastikan direktori penyimpanan DB ada.
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT    NOT NULL,
    email         TEXT    NOT NULL UNIQUE,
    password_hash TEXT    NOT NULL,
    role          TEXT    NOT NULL DEFAULT 'user',  -- 'admin' | 'user'
    active        INTEGER NOT NULL DEFAULT 1,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS activities (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name         TEXT    NOT NULL,
    category     TEXT    NOT NULL DEFAULT 'Lainnya',
    target_time  TEXT,                       -- "HH:MM" atau NULL
    type         TEXT    NOT NULL DEFAULT 'daily',  -- 'daily' | 'weekly'
    days_of_week TEXT,                        -- csv "0,1,..6" untuk weekly; NULL = tiap hari
    weight       INTEGER NOT NULL DEFAULT 1,
    sort_order   INTEGER NOT NULL DEFAULT 0,
    active       INTEGER NOT NULL DEFAULT 1,
    created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS logs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
    activity_id INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    date        TEXT    NOT NULL,             -- "YYYY-MM-DD"
    done        INTEGER NOT NULL DEFAULT 0,
    done_time   TEXT,                          -- "HH:MM" atau NULL
    note        TEXT,
    updated_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE (activity_id, date)
  );

  CREATE INDEX IF NOT EXISTS idx_logs_date ON logs(date);
  CREATE INDEX IF NOT EXISTS idx_logs_activity ON logs(activity_id);
`);

// --- Migrasi ringan untuk database lama (pra-autentikasi) ---
function hasColumn(table, col) {
  return db.prepare(`PRAGMA table_info(${table})`).all().some((c) => c.name === col);
}
const migrate = db.transaction(() => {
  if (!hasColumn('activities', 'user_id')) {
    db.exec('ALTER TABLE activities ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE');
  }
  if (!hasColumn('logs', 'user_id')) {
    db.exec('ALTER TABLE logs ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE');
  }
  // Hapus data global lama (seed pra-autentikasi) yang belum terikat pengguna.
  db.exec('DELETE FROM activities WHERE user_id IS NULL');
  db.exec('DELETE FROM logs WHERE user_id IS NULL');
  // Indeks user_id dibuat setelah kolomnya dipastikan ada.
  db.exec('CREATE INDEX IF NOT EXISTS idx_activities_user ON activities(user_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_logs_user ON logs(user_id)');
});
migrate();

module.exports = db;
module.exports.DB_PATH = DB_PATH;
