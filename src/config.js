import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// .env dosyasını kök dizinden yükle
dotenv.config({ path: path.resolve(__dirname, '../.env') });

export const config = {
  // Çakıl Bot Token (Sıdıka'nın botu)
  botToken: process.env.BOT_TOKEN || '',
  
  // Jarvis Bot Token (Opsiyonel: Emre için ayrı rapor botu. Boşsa tek bot üzerinden çalışır)
  jarvisBotToken: process.env.JARVIS_BOT_TOKEN || '',
  
  // Emre'nin Telegram Chat ID'si (Raporların ve canlı konuşmaların iletileceği tek adres)
  emreChatId: process.env.EMRE_CHAT_ID || '2090159683',

  // Google Gemini API Key
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  
  // Saat Dilimi
  timezone: process.env.TIMEZONE || 'Europe/Istanbul',
  
  // Günlük İlaç Saati (23:30)
  medicineTime: process.env.MEDICINE_TIME || '23:30',

  // Günlük Yönetici Rapor Saati (00:00)
  reportTime: process.env.REPORT_TIME || '00:00'
};

export function validateConfig() {
  const missing = [];
  if (!config.botToken && !config.jarvisBotToken) missing.push('BOT_TOKEN');
  if (!config.geminiApiKey) missing.push('GEMINI_API_KEY');
  return missing;
}
