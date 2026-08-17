import { callGemini } from './geminiClient.js';
import { memoryRepo } from '../database/memoryRepo.js';

export async function extractAndSaveMemories(chatId, userMessage) {
  if (!userMessage || userMessage.length < 5) return;

  const prompt = `
Aşağıdaki mesaj Sıdıka isimli bir kullanıcının kişisel asistanı Çakıl'a yazdığı bir mesajdır.
Bu mesajdan Sıdıka hakkında ileride hatırlanması gereken önemli bir bilgi, zevk, tercih, sağlık durumu, alışkanlık, sınav/okul/iş detayı, duygu durumu veya anı var mı analiz et.

Mesaj: "${userMessage}"

Eğer kalıcı bir bilgi YOKSA, yalnızca şu JSON'ı döndür:
{"hasMemory": false}

Eğer kalıcı ve değerli bir bilgi VARSA, şu JSON formatında yanıt ver:
{
  "hasMemory": true,
  "memories": [
    {
      "category": "preference|routine|health|hobby|emotion|important_date|general",
      "fact": "Sıdıka hakkında kısa, net bilgi"
    }
  ]
}

SADECE geçerli JSON döndür, başka hiçbir metin yazma.
`;

  try {
    let text = await callGemini({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      temperature: 0.2
    });

    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(text);

    if (parsed.hasMemory && Array.isArray(parsed.memories)) {
      for (const item of parsed.memories) {
        if (item.fact && item.category) {
          memoryRepo.addMemory(chatId, item.category, item.fact, userMessage);
          console.log(`[Hafıza Kaydedildi] (${item.category}): ${item.fact}`);
        }
      }
    }
  } catch (error) {
    console.error('Memory extraction error:', error.message);
  }
}
