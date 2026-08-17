import { callGemini } from './geminiClient.js';

export async function parseReminderIntent(userMessage, recentHistory = []) {
  if (!userMessage || userMessage.trim().length === 0) return null;

  const lower = userMessage.toLowerCase();
  
  // Bariz alakasız soru filtreleri
  if (lower.includes('saat kaç') || lower.includes('nasılsın') || lower.includes('kimsin')) {
    return null;
  }

  const now = new Date();
  const istanbulTimeStr = now.toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });
  const istanbulIsoStr = now.toISOString();

  // Son birkaç mesajın bağlamı
  const contextSnippet = recentHistory.slice(-4).map(h => `${h.role === 'user' ? 'Kullanıcı' : 'Çakıl'}: ${h.message}`).join('\n');

  const prompt = `
Aşağıda Sıdıka (veya kullanıcı) ile asistanı Çakıl arasındaki son konuşma bağlamı ve kullanıcının son mesajı yer alıyor.

GÖREV:
Kullanıcının bir hatırlatıcı, alarm, sınav, fırındaki yemek, arama veya randevu talep edip etmediğini tespit et.
Kullanıcı önceki mesajda bir saatten bahsedip şimdi "Tamam", "Ara", "Evet hatırlat", "Kur" demişse veya doğrudan "14:25'te hatırlat", "Yarın sınavım var" demişse bunu tespit et.

ÖNEMLİ BAĞLAM:
- Sıdıka Konya'da yaşamaktadır.
- Sınav, mülakat, randevu gibi dışarı etkinliklerinde; kullanıcının söylediği saatten 1.5 saat ÖNCEYE alarm kurulur (Örn: 12:00 sınavı -> 10:30).
- Ev içi, fırın, arama, yemek veya kısa süreli hatırlatmalarda direkt belirtilen saat kullanılır.
- "5 dakika sonra", "10 dk sonra" gibi ifadelerde şu anki zamana ekleme yap.

Şu anki Türkiye Zamanı: ${istanbulTimeStr} (ISO: ${istanbulIsoStr})

ÖNCEKİ MESAJ BAĞLAMI:
${contextSnippet || 'Yok'}

KULLANICININ SON MESAJI:
"${userMessage}"

Eğer hatırlatıcı/alarm isteği YOKSA SADECE şunu döndür:
{"isReminder": false}

Eğer hatırlatıcı/alarm isteği VARSA şunu döndür:
{
  "isReminder": true,
  "title": "Hatırlatma konusu (Örn: 'Fırındaki Yemek', 'Vize Sınavı', 'Arama')",
  "eventTime": "Etkinliğin asıl saati (Örn: '14:25')",
  "targetTime": "YYYY-MM-DDTHH:mm:00 (Alarmın çalacağı tam ISO zamanı)",
  "explanation": "Kullanıcıya yapılacak nazik teyit açıklaması (Örn: 'Saat 14:25 için hatırlatıcını kurdum. Vakti geldiğinde hem mesajla hem de arayarak haber vereceğim.')",
  "type": "exam|appointment|custom|special_day",
  "requiresAck": true
}

SADECE geçerli JSON formatında döndür.
`;

  try {
    let text = await callGemini({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      temperature: 0.1
    });

    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(text);

    if (parsed.isReminder && parsed.targetTime && parsed.title) {
      return parsed;
    }
    return null;
  } catch (error) {
    console.error('Reminder parser error:', error.message);
    return null;
  }
}
