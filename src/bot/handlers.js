import { setupCakilHandlers } from './cakilHandlers.js';
import { setupJarvisHandlers } from './jarvisHandlers.js';
import { config } from '../config.js';
import { chatRepo } from '../database/chatRepo.js';

export function setupUnifiedHandlers(bot) {
  // Eğer sadece 1 bot token varsa, kimin yazdığına göre dinamik davranır:
  // Emre yazdığında -> Jarvis (Resmi, Efendim, Raporlar)
  // Sıdıka yazdığında -> Çakıl (Samimi, Can Yoldaşı, İlaç)
  
  bot.use(async (ctx, next) => {
    const chatId = String(ctx.chat?.id || '');
    const isEmre = (config.emreChatId && chatId === config.emreChatId) || 
                   (chatRepo.getUserByRole('emre')?.chat_id === chatId);
    
    // Eğer Emre /start veya /id yazdıysa rolünü emre yap
    if (ctx.message?.text?.startsWith('/id') || ctx.message?.text === '/start_emre') {
      chatRepo.upsertUser(chatId, ctx.from?.username || '', 'Emre', 'emre');
    }
    
    await next();
  });

  // Varsayılan olarak Çakıl işleyicilerini kur
  setupCakilHandlers(bot);
}
