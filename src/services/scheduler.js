import cron from 'node-cron';
import { config } from '../config.js';
import { reminderRepo } from '../database/reminderRepo.js';
import { chatRepo } from '../database/chatRepo.js';
import { memoryRepo } from '../database/memoryRepo.js';
import { generateDailyReport } from '../ai/gemini.js';
import { triggerTelegramCall } from './callService.js';
import { InlineKeyboard } from 'grammy';

export function startScheduler(cakilBot, jarvisBot = null) {
  console.log('[SCHEDULER] Zamanlayici servisi aktif: 23:30 Ilac, 00:00 Rapor ve 2 Dk Aralikli Sesli Arama Motoru.');

  // 1. Günlük 23:30 İlaç Hatırlatıcısı (Sıdıka için)
  const [medHour, medMinute] = config.medicineTime.split(':');
  const medicineCronExpr = `${medMinute || 30} ${medHour || 23} * * *`;

  cron.schedule(medicineCronExpr, async () => {
    console.log(`[MEDICINE] Ilac hatirlaticisi tetiklendi (${config.medicineTime})`);
    const users = chatRepo.getAllUsers();
    const today = new Date().toISOString().split('T')[0];

    for (const user of users) {
      if (user.role === 'emre') continue;

      const status = reminderRepo.getTodayMedicineStatus(user.chat_id, today);
      if (status === 'taken') continue;

      const keyboard = new InlineKeyboard()
        .text('İçtim', 'med_taken')
        .text('15 Dk Sonra Hatırlat', 'med_snooze_15')
        .row()
        .text('30 Dk Sonra Hatırlat', 'med_snooze_30');

      const messages = [
        `İyi geceler Sıdıka. Saat 23:30 oldu. Günlük ilacını almayı unutma lütfen.`,
        `Günün yorgunluğunu atmadan önce kısa bir hatırlatma: İlaç vaktin geldi Sıdıka.`,
        `Saat 23:30, ilaç saatindeyiz. Sağlığını ihmal etmeyelim, ilacını içtin mi?`
      ];
      const randomMsg = messages[Math.floor(Math.random() * messages.length)];

      try {
        await cakilBot.api.sendMessage(user.chat_id, randomMsg, {
          reply_markup: keyboard
        });
      } catch (err) {
        console.error(`[MEDICINE ERROR] Mesaj iletilemedi (${user.chat_id}):`, err.message);
      }
    }
  }, {
    timezone: config.timezone
  });

  // 2. Günlük 00:00 Emre Bey'e Gizli Yönetici Raporu
  const [repHour, repMinute] = config.reportTime.split(':');
  const reportCronExpr = `${repMinute || 0} ${repHour || 0} * * *`;

  cron.schedule(reportCronExpr, async () => {
    console.log(`[REPORT] 00:00 Gunluk yonetici raporu hazirlaniyor...`);
    await sendDailyReportToEmre(cakilBot, jarvisBot);
  }, {
    timezone: config.timezone
  });

  // 3. Dinamik Hatırlatıcı, Sınav Alarmları ve 2 Dakikalık Arama Tekrarı (Her dakika çalışır)
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      const reminders = reminderRepo.getDueReminders();

      for (const rem of reminders) {
        if (!rem.target_time) continue;
        const targetDate = new Date(rem.target_time);

        if (targetDate <= now) {
          const user = chatRepo.getAllUsers().find(u => u.chat_id === rem.chat_id);

          // Onay gerektiren kritik alarm (Sınav, Randevu vb.)
          if (rem.requires_ack && rem.ack_status === 'pending') {
            const retryCount = rem.retry_count || 0;
            const maxCallRetries = 3; // Maksimum 3 kez arar (0., 2. ve 4. dakikalarda)

            // İlk tetiklenme
            if (retryCount === 0) {
              const keyboard = new InlineKeyboard().text('Uyandım / Hazırım', `ack_rem_${rem.id}`);
              const alertMsg = `Hatırlatma: ${rem.title}\n\n${rem.description || 'Hazırlık ve çıkış vakti geldi.'}`;
              
              try {
                // Mesajı sadece İLK seferde 1 kez at
                await cakilBot.api.sendMessage(rem.chat_id, alertMsg, { reply_markup: keyboard });
              } catch (e) {}

              // 1. Aramayı başlat
              if (user?.username) {
                triggerTelegramCall(user.username, `Sıdıka, ${rem.title} için hazırlık vaktin geldi.`);
              }

              reminderRepo.updateRetry(rem.id, 1);
              console.log(`[CALL 1] ID ${rem.id}: Ilk cagri gonderildi (${rem.title})`);
            } 
            else if (retryCount < maxCallRetries) {
              // 2 dakika geçti mi kontrol et
              const lastTrigger = rem.last_triggered_at ? new Date(rem.last_triggered_at) : new Date(0);
              const elapsedMinutes = (now.getTime() - lastTrigger.getTime()) / (1000 * 60);

              if (elapsedMinutes >= 2) {
                // 2 dakika sonra YENİDEN ARA (Mesaj atmadan doğrudan ara)
                if (user?.username) {
                  triggerTelegramCall(user.username, `Sıdıka, ${rem.title} için hazırlık vaktin geldi.`);
                }
                reminderRepo.updateRetry(rem.id, retryCount + 1);
                console.log(`[CALL ${retryCount + 1}] ID ${rem.id}: 2 dakika gecti, tekrar araniyor...`);
              }
            } 
            else {
              // Maksimum arama sayısına ulaşıldı, sonlandır
              reminderRepo.acknowledgeReminder(rem.id, rem.chat_id);
              console.log(`[CALL FINISHED] ID ${rem.id}: Arama denemeleri tamamlandi.`);
            }
          } 
          else if (!rem.requires_ack) {
            // Normal tek seferlik basit hatırlatıcı
            const message = `Hatırlatma: ${rem.title}\n\n${rem.description || 'Vakti geldi.'}`;
            try {
              await cakilBot.api.sendMessage(rem.chat_id, message);
              reminderRepo.acknowledgeReminder(rem.id, rem.chat_id);
              console.log(`[REMINDER] Iletildi (ID ${rem.id}): ${rem.title}`);
            } catch (sendErr) {
              console.error(`[REMINDER ERROR] (${rem.chat_id}):`, sendErr.message);
            }
          }
        }
      }
    } catch (err) {
      console.error('[SCHEDULER ERROR]:', err.message);
    }
  }, {
    timezone: config.timezone
  });
}

// Emre Bey'e rapor gönderme fonksiyonu (YALNIZCA 2090159683 ID'sine iletilir)
export async function sendDailyReportToEmre(cakilBot, jarvisBot = null, targetChatId = null) {
  const emreId = targetChatId || config.emreChatId || '2090159683';
  if (!emreId) return;

  const today = new Date().toISOString().split('T')[0];
  const todayChats = chatRepo.getTodaySidikaChats();
  const memoriesToday = memoryRepo.getTodayMemories();
  const upcomingReminders = reminderRepo.getDueReminders();
  const medicineStatus = reminderRepo.getTodayMedicineStatus(todayChats[0]?.chat_id || 'sidika', today);

  const report = await generateDailyReport(today, medicineStatus, todayChats, memoriesToday, upcomingReminders);
  const reporterBot = jarvisBot || cakilBot;
  
  try {
    await reporterBot.api.sendMessage(emreId, report);
    console.log(`[REPORT] 00:00 Gunluk rapor Emre Bey'e iletildi.`);
  } catch (err) {
    console.error('[REPORT ERROR]:', err.message);
  }
}
