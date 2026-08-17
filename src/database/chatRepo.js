import { db } from './db.js';

// Tabloda mode kolonu var mı kontrol et
try {
  db.exec(`ALTER TABLE users ADD COLUMN active_mode TEXT DEFAULT 'cakil';`);
} catch (e) {
  // Kolon zaten varsa hata vermez
}

export const chatRepo = {
  // Mesaj kaydet
  saveMessage(chatId, role, message) {
    const stmt = db.prepare(`
      INSERT INTO chat_history (chat_id, role, message)
      VALUES (?, ?, ?)
    `);
    stmt.run(chatId, role, message);
  },

  // Son N adet mesajı getir
  getRecentHistory(chatId, limit = 12) {
    const stmt = db.prepare(`
      SELECT role, message, created_at 
      FROM chat_history 
      WHERE chat_id = ?
      ORDER BY id DESC 
      LIMIT ?
    `);
    const rows = stmt.all(chatId, limit);
    return rows.reverse();
  },

  // Bugünün mesajlarını getir
  getTodayChats(chatId, dateStr) {
    const stmt = db.prepare(`
      SELECT role, message, created_at 
      FROM chat_history 
      WHERE chat_id = ? AND date(created_at) = date(?)
      ORDER BY id ASC
    `);
    return stmt.all(chatId, dateStr);
  },

  // Sıdıka'nın bugünkü sohbetleri
  getTodaySidikaChats() {
    const stmt = db.prepare(`
      SELECT c.role, c.message, c.created_at, u.first_name 
      FROM chat_history c
      LEFT JOIN users u ON c.chat_id = u.chat_id
      WHERE (u.role = 'sidika' OR u.role IS NULL)
        AND date(c.created_at) = date('now')
      ORDER BY c.id ASC
    `);
    return stmt.all();
  },

  // Kullanıcı kaydet veya güncelle
  upsertUser(chatId, username = '', firstName = '', role = 'sidika') {
    const existing = db.prepare(`SELECT chat_id FROM users WHERE chat_id = ?`).get(chatId);
    if (!existing) {
      db.prepare(`
        INSERT INTO users (chat_id, username, first_name, role, active_mode)
        VALUES (?, ?, ?, ?, 'cakil')
      `).run(chatId, username, firstName, role);
    } else {
      db.prepare(`
        UPDATE users 
        SET username = ?, first_name = ?, last_interaction = CURRENT_TIMESTAMP
        WHERE chat_id = ?
      `).run(username, firstName, chatId);
    }
  },

  // Aktif mod (cakil veya emre)
  getBotMode(chatId) {
    const row = db.prepare(`SELECT active_mode FROM users WHERE chat_id = ?`).get(chatId);
    return row ? row.active_mode : 'cakil';
  },

  // Mod değiştir
  setBotMode(chatId, mode) {
    db.prepare(`UPDATE users SET active_mode = ? WHERE chat_id = ?`).run(mode, chatId);
  },

  getUserByRole(role) {
    return db.prepare(`SELECT * FROM users WHERE role = ? LIMIT 1`).get(role);
  },

  getAllUsers() {
    return db.prepare(`SELECT * FROM users`).all();
  }
};
