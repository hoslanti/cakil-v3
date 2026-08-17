import { db } from './db.js';

export const reminderRepo = {
  // Yeni hatırlatıcı ekle
  addReminder(chatId, type, title, description, targetTime, isRecurring = 0, recurringCron = null, requiresAck = 0) {
    const stmt = db.prepare(`
      INSERT INTO reminders (chat_id, type, title, description, target_time, is_recurring, cron_expr, status, requires_ack, ack_status, retry_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, 'pending', 0)
    `);
    const result = stmt.run(chatId, type, title, description, targetTime, isRecurring, recurringCron, requiresAck);
    return result.lastInsertRowid;
  },

  // Zamanı gelmiş veya onaylanmadığı için tekrar etmesi gereken hatırlatıcıları getir
  getDueReminders() {
    const stmt = db.prepare(`
      SELECT * FROM reminders 
      WHERE status = 'pending'
    `);
    return stmt.all();
  },

  // Hatırlatıcıyı onayla / tamamla (Sıdıka "Uyandım/Hazırım" dediğinde)
  acknowledgeReminder(id, chatId) {
    db.prepare(`
      UPDATE reminders 
      SET status = 'completed', ack_status = 'acknowledged' 
      WHERE id = ? AND chat_id = ?
    `).run(id, chatId);
  },

  // Tekrar deneme sayısını ve son tetiklenme zamanını güncelle
  updateRetry(id, retryCount) {
    db.prepare(`
      UPDATE reminders 
      SET retry_count = ?, last_triggered_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(retryCount, id);
  },

  // Kullanıcının yaklaşan hatırlatıcılarını getir
  getUserReminders(chatId) {
    const stmt = db.prepare(`
      SELECT * FROM reminders 
      WHERE chat_id = ? AND status = 'pending'
      ORDER BY target_time ASC
    `);
    return stmt.all(chatId);
  },

  // Hatırlatıcıyı iptal et
  cancelReminder(id, chatId) {
    return db.prepare(`UPDATE reminders SET status = 'cancelled' WHERE id = ? AND chat_id = ?`).run(id, chatId);
  },

  // İlaç Durumu Kaydet
  logMedicine(chatId, date, status) {
    db.prepare(`
      INSERT INTO medicine_logs (chat_id, date, status)
      VALUES (?, ?, ?)
    `).run(chatId, date, status);
  },

  // Bugün ilaç içildi mi kontrol et
  getTodayMedicineStatus(chatId, todayDate) {
    const row = db.prepare(`
      SELECT status, taken_at FROM medicine_logs 
      WHERE chat_id = ? AND date = ? 
      ORDER BY id DESC LIMIT 1
    `).get(chatId, todayDate);
    return row ? row.status : null;
  }
};
