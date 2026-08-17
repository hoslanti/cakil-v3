import fs from 'node:fs';
import path from 'node:path';
import { callGemini } from '../ai/geminiClient.js';
import { memoryRepo } from '../database/memoryRepo.js';
import { chatRepo } from '../database/chatRepo.js';

async function main() {
  console.log('[ANALYZER] WhatsApp sohbet analizi basliyor...');

  const chatFilePath = path.resolve('data/_chat.txt');
  if (!fs.existsSync(chatFilePath)) {
    console.error('data/_chat.txt bulunamadi.');
    return;
  }

  const rawText = fs.readFileSync(chatFilePath, 'utf8');
  const lines = rawText.split('\n');

  console.log(`[ANALYZER] Toplam satir: ${lines.length}`);

  // Örnek diyalogları topla
  const sidikaMessages = [];
  const emreMessages = [];
  const sampleDialogues = [];

  for (const line of lines) {
    if (line.includes('🤎:')) {
      const msg = line.split('🤎:')[1]?.trim();
      if (msg && !msg.includes('dahil edilmedi')) sidikaMessages.push(msg);
    } else if (line.includes('Emre:')) {
      const msg = line.split('Emre:')[1]?.trim();
      if (msg && !msg.includes('dahil edilmedi')) emreMessages.push(msg);
    }
  }

  console.log(`[ANALYZER] Sıdıka mesaj sayısı: ${sidikaMessages.length}`);
  console.log(`[ANALYZER] Emre mesaj sayısı: ${emreMessages.length}`);

  // 1. Sıdıka hakkında hafıza analizi yap ve veritabanına kaydet
  console.log('[ANALYZER] Sıdıka hakkında anılar ve tercihler cikariliyor...');
  
  // Örnek mesaj gruplarını Gemini'ye analiz ettir
  const chunks = [];
  for (let i = 0; i < lines.length; i += 400) {
    chunks.push(lines.slice(i, i + 400).join('\n'));
  }

  const sidikaChatId = 'sidika_main';
  chatRepo.upsertUser(sidikaChatId, 'sidika', 'Sıdıka', 'sidika');

  for (let i = 0; i < Math.min(chunks.length, 5); i++) {
    console.log(`[ANALYZER] Chunk ${i + 1}/${Math.min(chunks.length, 5)} isleniyor...`);
    const prompt = `
Aşağıda Emre ile sevgilisi Sıdıka arasındaki gerçek WhatsApp mesajlaşmasından bir kesit yer almaktadır (🤎 Sıdıka'dır, Emre ise Emre'dir).

Bu konuşmadan Sıdıka hakkında kalıcı ve somut bilgileri, alışkanlıklarını, sevdiklerini/sevmediklerini, tepkilerini, aralarındaki özel detayları ve sağlık durumlarını tespit et.

METİN:
${chunks[i]}

Şu JSON formatında döndür:
{
  "memories": [
    {
      "category": "preference|routine|health|hobby|nickname|relationship|inside_joke",
      "fact": "Sıdıka hakkında net bilgi"
    }
  ]
}
SADECE JSON döndür.
`;

    try {
      let result = await callGemini({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        temperature: 0.2
      });
      result = result.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(result);
      if (parsed.memories && Array.isArray(parsed.memories)) {
        for (const m of parsed.memories) {
          memoryRepo.addMemory(sidikaChatId, m.category, m.fact, 'WhatsApp Geçmişi');
          console.log(`[HAFIZA EKLENDİ] (${m.category}): ${m.fact}`);
        }
      }
    } catch (e) {
      console.warn(`[CHUNK ${i + 1} UYARI]:`, e.message);
    }
  }

  // 2. Emre'nin konuşma tarzını analiz et
  console.log('[ANALYZER] Emre\'nin konusma tarzi ve dil profili cikariliyor...');
  const stylePrompt = `
Aşağıda Emre'nin sevgilisi Sıdıka'ya attığı gerçek mesajlardan örnekler yer alıyor:

${emreMessages.slice(0, 100).join('\n')}

GÖREV:
Emre'nin sevgilisi Sıdıka ile konuşurken kullandığı:
1. Hitap kelimeleri (güzelim, yavrum, bebeğim, bıdık vb.)
2. Cümle kurma tarzı, esprileri, tepkileri (sjsksk gülüşleri, "ısırırım yanağını", "özledim ya" vb.)
3. Sevgi gösterme ve sahiplenme dili
4. Kısaltmaları ve yazım alışkanlıkları (muah, afieeed, yerim vb.)

Bunu yapay zekanın Emre'yi %100 birebir taklit edebilmesi için detaylı bir "Emre Konuşma Kılavuzu" olarak Türkçe özetle.
`;

  try {
    const styleAnalysis = await callGemini({
      contents: [{ role: 'user', parts: [{ text: stylePrompt }] }],
      temperature: 0.3
    });

    fs.writeFileSync('data/emre_style_profile.txt', styleAnalysis, 'utf8');
    console.log('[ANALYZER] Emre dil profili data/emre_style_profile.txt dosyasina kaydedildi.');
    console.log('\n--- EMRE DİL PROFİLİ ÖZETİ ---\n');
    console.log(styleAnalysis);
  } catch (styleErr) {
    console.error('[STYLE ERROR]:', styleErr.message);
  }

  console.log('\n[ANALYZER] WhatsApp analizi tamamlandi.');
}

main().catch(console.error);
