import { callGemini } from './geminiClient.js';
import { 
  CAKIL_SYSTEM_PROMPT, 
  JARVIS_SYSTEM_PROMPT, 
  buildConversationPrompt, 
  buildDailyReportPrompt 
} from './prompts.js';

// Sıdıka ile Çakıl Sohbeti
export async function generateChatResponse(chatId, userName, userMessage, memoriesText, history = []) {
  const dynamicContext = buildConversationPrompt(userName, memoriesText, history);
  
  const contents = [
    {
      role: 'user',
      parts: [{ text: `[Sistem Bilgilendirmesi]\n${dynamicContext}` }]
    },
    {
      role: 'model',
      parts: [{ text: 'Anlaşıldı. Sıdıka ile sıcak, zeki ve samimi bir şekilde iletişim kuracağım.' }]
    },
    ...history.map(item => ({
      role: item.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: item.message }]
    })),
    {
      role: 'user',
      parts: [{ text: userMessage }]
    }
  ];

  try {
    return await callGemini({
      systemInstruction: CAKIL_SYSTEM_PROMPT,
      contents: contents,
      temperature: 0.8
    });
  } catch (error) {
    console.error('generateChatResponse error:', error);
    return "Kısa bir an bağlantımda bir pürüz oldu ama buradayım Sıdıka. Ne diyordun?";
  }
}

// Emre ile Jarvis Sohbeti
export async function generateJarvisResponse(emreMessage, memoriesText, todayChats, medicineStatus) {
  const systemContext = `
[GÜNCEL SİSTEM DURUMU]
Tarih/Saat: ${new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}
İlaç Durumu: ${medicineStatus === 'taken' ? 'İçildi' : 'İçilmedi / Beklemede'}
Sıdıka Hanım'ın Hafıza Profili:
${memoriesText}

Bugünkü Mesaj Sayısı: ${todayChats.length}
`;

  const contents = [
    {
      role: 'user',
      parts: [{ text: `[Sistem Bilgisi]\n${systemContext}\n\nEmre Bey: ${emreMessage}` }]
    }
  ];

  try {
    return await callGemini({
      systemInstruction: JARVIS_SYSTEM_PROMPT,
      contents: contents,
      temperature: 0.7
    });
  } catch (error) {
    console.error('generateJarvisResponse error:', error);
    return "Emrindeyim Efendim. Sistemlerimde kısa bir gecikme yaşandı, lütfen tekrar edebilir misiniz?";
  }
}

// 00:00 Günlük Rapor
export async function generateDailyReport(todayDate, medicineStatus, todayChats, memoriesToday, upcomingReminders) {
  const prompt = buildDailyReportPrompt(todayDate, medicineStatus, todayChats, memoriesToday, upcomingReminders);

  const contents = [
    {
      role: 'user',
      parts: [{ text: prompt }]
    }
  ];

  try {
    return await callGemini({
      systemInstruction: JARVIS_SYSTEM_PROMPT,
      contents: contents,
      temperature: 0.6
    });
  } catch (error) {
    console.error('generateDailyReport error:', error);
    return `📋 **GÜNLÜK YÖNETİCİ RAPORU (${todayDate})**\n\nİyi geceler Efendim.\n- İlaç Durumu: ${medicineStatus === 'taken' ? 'İçildi ✅' : 'Kayıt bulunamadı ⚠️'}\n- Sıdıka Hanım ile bugün ${todayChats.length} adet mesajlaşma gerçekleşti.`;
  }
}
