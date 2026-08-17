import readline from 'node:readline';
import { generateChatResponse } from './ai/gemini.js';
import { memoryRepo } from './database/memoryRepo.js';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const testChatId = 'sandbox_test_user';
const history = [];

console.log('====================================================');
console.log('[ÇAKIL BİLİŞSEL SİSTEMİ - TEST VE SİMÜLASYON KONSOLU]');
console.log('Sıdıka rolünde mesaj yazıp Enter\'a basın. (Çıkış: q)');
console.log('====================================================\n');

function askQuestion() {
  rl.question('\n[Sıdıka] > ', async (input) => {
    const text = input.trim();
    if (!text || text.toLowerCase() === 'q' || text.toLowerCase() === 'exit') {
      console.log('\n[SİSTEM] Test konsolu sonlandırıldı.');
      process.exit(0);
    }

    try {
      console.log('\n[Çakıl yanıt hazırlıyor...]');
      const memoryText = memoryRepo.formatMemoriesForPrompt(testChatId);
      const reply = await generateChatResponse(testChatId, 'Sıdıka', text, memoryText, history);
      
      console.log('\n[Çakıl]:');
      console.log(reply);

      history.push({ role: 'user', message: text });
      history.push({ role: 'assistant', message: reply });
    } catch (err) {
      console.error('\n[HATA]:', err.message);
    }

    askQuestion();
  });
}

askQuestion();
