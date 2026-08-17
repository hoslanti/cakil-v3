import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config.js';

let genAI = null;

export function getGenAI() {
  if (!genAI && config.geminiApiKey) {
    genAI = new GoogleGenerativeAI(config.geminiApiKey);
  }
  return genAI;
}

// Aktif ve Yüksek Hızlı Modeller
const MODELS = [
  'gemini-3.6-flash',
  'gemini-3.5-flash-lite',
  'gemini-2.5-flash',
  'gemini-3.5-flash'
];

export async function callGemini({ systemInstruction = '', contents = [], temperature = 0.8 }) {
  const ai = getGenAI();
  if (!ai) throw new Error('GEMINI_API_KEY bulunamadı.');

  for (const modelName of MODELS) {
    try {
      const model = ai.getGenerativeModel({
        model: modelName,
        systemInstruction: systemInstruction || undefined
      });

      const result = await model.generateContent({
        contents: contents,
        generationConfig: {
          temperature: temperature,
          maxOutputTokens: 1500
        }
      });

      const response = await result.response;
      const text = response.text();
      if (text) return text;
    } catch (err) {
      console.warn(`[Gemini ${modelName} Hatası]:`, err.message);
    }
  }

  throw new Error('Tüm Gemini modelleri denendi ancak yanıt alınamadı.');
}
