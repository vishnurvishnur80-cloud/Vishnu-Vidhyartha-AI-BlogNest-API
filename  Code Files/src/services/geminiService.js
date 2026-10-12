const { GoogleGenerativeAI } = require('@google/generative-ai');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const callGemini = async (prompt) => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('Gemini API key is not configured');
  }

  // Use the model from .env, otherwise use the fallback
  const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
  });

  const maxRetries = 4;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(
        `Calling Gemini (${modelName}) - attempt ${attempt + 1}/${maxRetries + 1}`
      );

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      if (!text) {
        throw new Error('Invalid Gemini response');
      }

      return text;
    } catch (error) {
      console.error('Gemini API Error:', error.message);

      // Retry only temporary server/rate-limit errors
      const status = error?.status || error?.response?.status;

      const isRetryable =
        status === 429 ||
        status === 500 ||
        status === 502 ||
        status === 503 ||
        status === 504 ||
        error.message?.includes('503 Service Unavailable') ||
        error.message?.includes('high demand');

      if (!isRetryable || attempt === maxRetries) {
        throw error;
      }

      // Exponential backoff: 1s, 2s, 4s, 8s
      const delay = 1000 * Math.pow(2, attempt);

      console.log(`Gemini temporarily unavailable. Retrying in ${delay}ms...`);

      await sleep(delay);
    }
  }
};

module.exports = {
  callGemini,
};