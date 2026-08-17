import { config } from '../config.js';

export async function triggerTelegramCall(username, text = 'Sınav ve hazırlık saatin geldi Sıdıka.') {
  if (!username) {
    console.warn('[CALL ERROR] Kullanici adi bulunamadi, arama baslatilamadi.');
    return false;
  }

  // Kullanıcı adının başındaki @ işaretini düzenle
  const cleanUsername = username.startsWith('@') ? username : `@${username}`;
  const encodedText = encodeURIComponent(text);
  const url = `https://api.callmebot.com/start.php?user=${cleanUsername}&text=${encodedText}&lang=tr-TR-Standard-A`;

  console.log(`[CALL INITIATED] Telegram uzerinden ${cleanUsername} araniyor...`);

  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: AbortSignal.timeout(10000)
    });

    if (response.ok) {
      console.log(`[CALL SUCCESS] ${cleanUsername} icin arama cagrisi gonderildi. Cevaplanmazsa Telegram tarafindan otomatik sonlandirilacaktir.`);
      return true;
    } else {
      console.warn(`[CALL STATUS]: ${response.status} ${response.statusText}`);
      return false;
    }
  } catch (error) {
    console.error('[CALL SERVICE ERROR]:', error.message);
    return false;
  }
}
