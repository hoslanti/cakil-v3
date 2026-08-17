import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';

const dataDir = path.resolve('data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'cakil.db');
export const db = new DatabaseSync(dbPath);

export function initDatabase() {
  // 1. Kullanıcılar tablosu
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      chat_id TEXT PRIMARY KEY,
      username TEXT,
      first_name TEXT,
      role TEXT DEFAULT 'sidika',
      active_mode TEXT DEFAULT 'cakil',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_interaction DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. Uzun süreli anılar / Bilişsel hafıza tablosu
  db.exec(`
    CREATE TABLE IF NOT EXISTS memories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_id TEXT,
      category TEXT,
      fact TEXT,
      source_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 3. Sohbet geçmişi tablosu
  db.exec(`
    CREATE TABLE IF NOT EXISTS chat_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_id TEXT,
      role TEXT,
      message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 4. Hatırlatıcılar & Akıllı alarmlar tablosu
  db.exec(`
    CREATE TABLE IF NOT EXISTS reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_id TEXT,
      type TEXT,
      title TEXT,
      description TEXT,
      target_time DATETIME,
      is_recurring INTEGER DEFAULT 0,
      cron_expr TEXT,
      status TEXT DEFAULT 'pending',
      requires_ack INTEGER DEFAULT 0,
      retry_count INTEGER DEFAULT 0,
      ack_status TEXT DEFAULT 'pending',
      last_triggered_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 5. İlaç takip kayıtları
  db.exec(`
    CREATE TABLE IF NOT EXISTS medicine_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_id TEXT,
      date TEXT,
      status TEXT,
      taken_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Güvenli Migrasyonlar (Eğer eski tabloda kolonlar eksikse ekle)
  const columnsToAdd = [
    { table: 'memories', col: 'updated_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
    { table: 'reminders', col: 'requires_ack', type: 'INTEGER DEFAULT 0' },
    { table: 'reminders', col: 'retry_count', type: 'INTEGER DEFAULT 0' },
    { table: 'reminders', col: 'ack_status', type: "TEXT DEFAULT 'pending'" },
    { table: 'reminders', col: 'last_triggered_at', type: 'DATETIME' },
    { table: 'users', col: 'active_mode', type: "TEXT DEFAULT 'cakil'" }
  ];

  for (const item of columnsToAdd) {
    try {
      db.exec(`ALTER TABLE ${item.table} ADD COLUMN ${item.col} ${item.type};`);
    } catch (e) {
      // Kolon zaten varsa hata vermez
    }
  }

  console.log('[DATABASE] SQLite veritabanı ve migrasyonlar hazır.');
}

initDatabase();
