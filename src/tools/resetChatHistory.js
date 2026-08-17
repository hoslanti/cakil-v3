import { db } from '../database/db.js';

// Deneme sohbet geçmişini ve test alarmlarını temizle
db.exec(`
  DELETE FROM chat_history;
  DELETE FROM reminders;
  DELETE FROM medicine_logs;
`);

console.log('[DATABASE RESET] Deneme mesajları, test alarmları ve ilaç kayıtları başarıyla sıfırlandı.');
console.log('[DATABASE STATS] Korunan WhatsApp Anı Sayısı:', db.prepare('SELECT count(*) as c FROM memories').get().c);
