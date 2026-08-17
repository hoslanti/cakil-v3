import { Bot } from 'grammy';
import http from 'node:http';
import { config } from './config.js';
import { initDatabase } from './database/db.js';
import { setupUnifiedHandlers } from './bot/handlers.js';
import { startScheduler } from './services/scheduler.js';

async function main() {
  console.log('--------------------------------------------------');
  console.log('  ÇAKIL & JARVIS BİLİŞSEL ASİSTAN SİSTEMİ');
  console.log('--------------------------------------------------');

  // 1. Veritabanını başlat
  initDatabase();

  if (!config.botToken) {
    console.error('[HATA] BOT_TOKEN bulunamadı. Lütfen .env dosyasını kontrol edin.');
    process.exit(1);
  }

  // 2. Ana Botu Başlat (Sıdıka için Çakıl / Emre için Jarvis)
  const cakilBot = new Bot(config.botToken);
  setupUnifiedHandlers(cakilBot);

  // 3. Zamanlayıcı Servisini Başlat (23:30 İlaç, 00:00 Rapor, 2 Dk Arama)
  startScheduler(cakilBot, null);

  // 4. Cloud Health-Check HTTP Sunucusu (Render/Railway/Koyeb 7/24 için)
  const port = process.env.PORT || 3000;
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ 
      status: 'active', 
      system: 'Çakıl & Jarvis Bilişsel Yaşam Asistanı',
      time: new Date().toISOString()
    }));
  });

  server.listen(port, () => {
    console.log(`[HEALTH SERVER] Cloud port ${port} üzerinde aktif.`);
  });

  // 5. Bot Dinlemeyi Başlat
  cakilBot.start({
    onStart: (botInfo) => {
      console.log(`[ONLINE] @${botInfo.username} başarıyla 7/24 yayına geçti.`);
    }
  });

  cakilBot.catch((err) => {
    console.error('[BOT ERROR]:', err.message);
  });
}

main().catch(console.error);
