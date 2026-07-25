const cache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 min
const MAX_RETRIES = 2;

export async function generateAIReply(userMessage) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return fallbackReply();

  const cacheKey = userMessage.toLowerCase().trim();
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.reply;
  }

  let attempts = 0;
  while (attempts <= MAX_RETRIES) {
    try {
      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful customer support assistant for a Myanmar ecommerce marketplace. Keep replies concise, friendly, and bilingual (Burmese/English).'
            },
            { role: 'user', content: userMessage },
          ],
          max_tokens: 200,
          temperature: 0.7,
        }),
      });
      const data = await response.json();
      const reply = data.choices?.[0]?.message?.content;
      if (reply) {
        cache.set(cacheKey, { reply, timestamp: Date.now() });
        return reply;
      }
    } catch (e) {
      attempts++;
      if (attempts > MAX_RETRIES) break;
      await new Promise(r => setTimeout(r, 500));
    }
  }
  return fallbackReply();
}

function fallbackReply() {
  const replies = [
    'လူကြီးမင်းရဲ့ မေးခွန်းကို မှတ်သားထားပါတယ်။ ကျွန်ုပ်တို့အဖွဲ့ မှမကြာမီ ပြန်လည်ဆက်သွယ်ပေးပါမည်။',
    'ဝယ်ယူမှုနှင့် ပတ်သက်၍ အကူအညီလိုပါက ကျွန်ုပ်တို့၏ Help Center ကို ကြည့်ရှုနိုင်ပါတယ်။',
    'ကျေးဇူးပြု၍ ခဏစောင့်ပါ။ Admin မှ တစ်ဆင့် ပြန်လည်ဖြေကြားပေးပါမည်။',
    'လူကြီးမင်း၏ မေးခွန်းအတွက် အဖြေရှာဖွေနေပါတယ်...',
  ];
  return replies[Math.floor(Math.random() * replies.length)];
}
