import './loadEnv.mjs';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';

const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_API_KEY;

if (!GEMINI_API_KEY) {
  throw new Error('Missing Gemini API key. Set GEMINI_API_KEY (or reuse VITE_API_KEY) in the environment.');
}

export const createGeminiChatModel = (options = {}) => {
  const {
    temperature = 0.7,
    maxOutputTokens = 4096,
    safetySettings,
  } = options;

  return new ChatGoogleGenerativeAI({
    apiKey: GEMINI_API_KEY,
    temperature,
    maxOutputTokens,
    model: GEMINI_MODEL,
    safetySettings,
  });
};
