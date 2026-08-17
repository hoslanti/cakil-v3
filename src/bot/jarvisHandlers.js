import { chatRepo } from '../database/chatRepo.js';
import { memoryRepo } from '../database/memoryRepo.js';
import { reminderRepo } from '../database/reminderRepo.js';
import { generateJarvisResponse, generateDailyReport } from '../ai/gemini.js';

export function setupJarvisHandlers(bot) {
  // /start - Emre'yi karşılama
  bot.command('start', async (ctx) => {
    const chatId = String(ctx.chat.id);
    const username = ctx.from?.username || '';
    const firstName = ctx.from?.first_name || 'Emre';

    chatRepo.upsertUser(chatId, username, firstName, 'emre');

    const welcomeMsg = `
Emrindeyim Efendim.

Ben Jarvis. Sıdıka Hanım için geliştirdiğiniz Çakıl sisteminin ve tüm bilişsel etkileşimlerin yönetim modülüyüm.

Her gece saat 00:00'da Sıdıka Hanım'ın duygu durumu, gün içindeki diyalogları ve ilaç takibine ilişkin detaylı yönetici raporunu burada size arz edeceğim.

Kullanabileceğiniz Komutlar:
• /rapor - Bugünkü anlık etkileşim raporunu getirir
• /hafiza - Sıdıka Hanım hakkında kaydedilen profil bilgileri
• /ilac - Bugünkü ilaç kullanım durumu
• /hatirlaticilar - Yaklaşan tüm hatırlatıcılar ve planlar
• /id - Telegram Chat ID'nizi görüntüler

Dilediğiniz an bana Sıdıka Hanım'ın durumu hakkında soru yöneltebilirsiniz Efendim.
`;

    await ctx.reply(welcomeMsg);
  });

  // /id - Chat ID
  bot.command('id', async (ctx) => {
    const chatId = String(ctx.chat.id);
    chatRepo.upsertUser(chatId, ctx.from?.username || '', 'Emre', 'emre');
    await ctx.reply(`Efendim, Telegram Chat ID'niz: ${chatId}\nSistemde 'Emre' olarak kaydedildiniz. 00:00 Raporları bu adrese iletilecektir.`);
  });

  // /rapor - Anlık Rapor
  bot.command('rapor', async (ctx) => {
    await ctx.replyWithChatAction('typing');
    const today = new Date().toISOString().split('T')[0];
    const todayChats = chatRepo.getTodaySidikaChats();
    const memoriesToday = memoryRepo.getTodayMemories();
    const upcomingReminders = reminderRepo.getPendingReminders();
    const medicineStatus = reminderRepo.getTodayMedicineStatus(todayChats[0]?.chat_id || 'sidika', today);

    const report = await generateDailyReport(today, medicineStatus, todayChats, memoriesToday, upcomingReminders);
    await ctx.reply(report);
  });

  // /hafiza - Sıdıka Hakkındaki Bilgiler
  bot.command('hafiza', async (ctx) => {
    const memories = memoryRepo.getAllMemories();
    if (!memories || memories.length === 0) {
      await ctx.reply("Efendim, şu ana kadar hafızaya kaydedilmiş özel bir bilgi bulunmamaktadır.");
      return;
    }

    let msg = `Sıdıka Hanım Hakkında Kayıtlı Bilgiler:\n\n`;
    for (const mem of memories) {
      msg += `• [${mem.category.toUpperCase()}] ${mem.fact}\n`;
    }
    await ctx.reply(msg);
  });

  // /ilac - İlaç Durumu
  bot.command('ilac', async (ctx) => {
    const today = new Date().toISOString().split('T')[0];
    const sidikaUser = chatRepo.getUserByRole('sidika');
    const status = reminderRepo.getTodayMedicineStatus(sidikaUser?.chat_id || 'sidika', today);

    if (status === 'taken') {
      await ctx.reply("Efendim, Sıdıka Hanım bugünkü ilacını almıştır.");
    } else if (status === 'snoozed') {
      await ctx.reply("Efendim, Sıdıka Hanım ilacı erteledi (Takip ediliyor).");
    } else {
      await ctx.reply("Efendim, Sıdıka Hanım henüz bugünkü ilacını almadı veya bildirim saatine henüz ulaşılamadı.");
    }
  });

  // /hatirlaticilar - Planlar
  bot.command('hatirlaticilar', async (ctx) => {
    const reminders = reminderRepo.getPendingReminders();
    if (!reminders || reminders.length === 0) {
      await ctx.reply("Efendim, şu an bekleyen aktif bir hatırlatıcı veya sınav bulunmuyor.");
      return;
    }

    let msg = `Sıdıka Hanım'ın Yaklaşan Hatırlatıcıları:\n\n`;
    reminders.forEach((r, idx) => {
      const dateStr = new Date(r.target_time).toLocaleString('tr-TR', {
        timeZone: 'Europe/Istanbul',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit'
      });
      msg += `${idx + 1}. ${r.title} (${dateStr})\n   ${r.description || ''}\n\n`;
    });
    await ctx.reply(msg);
  });

  // Emre ile Jarvis Mesajlaşması
  bot.on('message:text', async (ctx) => {
    const chatId = String(ctx.chat.id);
    const text = ctx.message.text.trim();
    chatRepo.upsertUser(chatId, ctx.from?.username || '', 'Emre', 'emre');

    await ctx.replyWithChatAction('typing');

    const today = new Date().toISOString().split('T')[0];
    const todayChats = chatRepo.getTodaySidikaChats();
    const memoriesText = memoryRepo.formatMemoriesForPrompt();
    const medicineStatus = reminderRepo.getTodayMedicineStatus('sidika', today);

    const reply = await generateJarvisResponse(text, memoriesText, todayChats, medicineStatus);
    await ctx.reply(reply);
  });
}
