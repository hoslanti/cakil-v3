import { db } from './db.js';

export const memoryRepo = {
  // Sıdıka hakkında yeni bir bilgi / anı / tercih kaydet
  addMemory(chatId, category, fact, sourceMessage = '') {
    const existing = db.prepare(`
      SELECT id FROM memories WHERE chat_id = ? AND fact = ?
    `).get(chatId, fact);

    if (!existing) {
      const stmt = db.prepare(`
        INSERT INTO memories (chat_id, category, fact, source_message, updated_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);
      stmt.run(chatId, category, fact, sourceMessage);
      return true;
    }
    return false;
  },

  // Sıdıka hakkında kaydedilmiş tüm hafıza bilgilerini getir
  getAllMemories(chatId = null) {
    if (chatId) {
      const stmt = db.prepare(`
        SELECT category, fact, created_at, updated_at 
        FROM memories 
        WHERE chat_id = ?
        ORDER BY updated_at DESC
      `);
      return stmt.all(chatId);
    }
    return db.prepare(`
      SELECT category, fact, created_at, updated_at 
      FROM memories 
      ORDER BY updated_at DESC
    `).all();
  },

  // Bugün eklenen hafıza kayıtları
  getTodayMemories() {
    return db.prepare(`
      SELECT category, fact, created_at 
      FROM memories 
      WHERE date(created_at) = date('now')
      ORDER BY id ASC
    `).all();
  },

  // Kategoriye göre hafıza getir
  getMemoriesByCategory(chatId, category) {
    const stmt = db.prepare(`
      SELECT fact FROM memories WHERE chat_id = ? AND category = ?
    `);
    return stmt.all(chatId, category);
  },

  // Hafıza özetini prompt için metin formatında hazırla
  formatMemoriesForPrompt(chatId = null) {
    const memories = this.getAllMemories(chatId);
    if (!memories || memories.length === 0) {
      return "Henüz Sıdıka hakkında kaydedilmiş özel bir detay yok.";
    }

    const grouped = {};
    for (const mem of memories) {
      if (!grouped[mem.category]) grouped[mem.category] = [];
      grouped[mem.category].push(mem.fact);
    }

    const lines = [];
    for (const [category, facts] of Object.entries(grouped)) {
      lines.push(`- [${category.toUpperCase()}]: ${facts.join('; ')}`);
    }

    return lines.join('\n');
  }
};
