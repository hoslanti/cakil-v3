import { db } from '../database/db.js';

// 1. Kaba veya hatalı kayıtları sil
db.exec(`
  DELETE FROM memories 
  WHERE fact LIKE '%keleş%' 
     OR fact LIKE '%otistik%' 
     OR fact LIKE '%küllük%' 
     OR fact LIKE '%top olsun%';
`);

// 2. Mami düzeltmesi: Mami annesi değil, kuzenidir
db.exec(`
  DELETE FROM memories WHERE fact LIKE '%mami%';
  INSERT INTO memories (chat_id, category, fact, source_message)
  VALUES ('sidika_main', 'routine', 'Sıdıka, kuzeni Mami (Muhammed/Mami) ile markete ve dışarıya çıkmaktadır.', 'Kullanıcı Düzeltmesi');
`);

const remaining = db.prepare('SELECT count(*) as c FROM memories').get();
console.log(`[CLEANUP SUCCESS] Kaba kelimeler silindi ve Mami=Kuzen olarak güncellendi. Toplam anı sayısı: ${remaining.c}`);
