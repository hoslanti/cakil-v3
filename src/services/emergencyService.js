import { chatRepo } from '../database/chatRepo.js';
import { config } from '../config.js';

const EMERGENCY_KEYWORDS = [
  'hastane', 'bayıl', 'kaza', 'ambulans', 'nefes alamı', 'zehirlen',
  'çok kötüyüm', 'kanama', 'acil', 'düştüm', 'dayanamıyorum', 'kalbim sıkış'
];

export async function checkAndTriggerEmergencyAlert(bot, userMessage, userName = 'Sıdıka') {
  if (!userMessage) return;

  const lower = userMessage.toLowerCase();
  const isEmergency = EMERGENCY_KEYWORDS.some(keyword => lower.includes(keyword));

  if (isEmergency) {
    const emreUser = chatRepo.getUserByRole('emre') || { chat_id: config.emreChatId || '2090159683' };
    if (!emreUser || !emreUser.chat_id) return;

    const timeStr = new Date().toLocaleTimeString('tr-TR', { timeZone: 'Europe/Istanbul', hour: '2-digit', minute: '2-digit' });

    const alertMessage = `
🚨 [ACİL DURUM BİLDİRİMİ - JARVIS]

Efendim, Sıdıka Hanım az önce sistemimize kritik bir sağlık/güvenlik durumu iletti:

Zaman: ${timeStr}
İleti: "${userMessage}"

Durumu ivedilikle bilgilerinize arz ederim.
`;

    try {
      await bot.api.sendMessage(emreUser.chat_id, alertMessage);
      console.log(`[EMERGENCY TRIGGERED] Emre Bey'e acil durum iletildi: "${userMessage}"`);
    } catch (err) {
      console.error('[EMERGENCY SEND ERROR]:', err.message);
    }
  }
}
