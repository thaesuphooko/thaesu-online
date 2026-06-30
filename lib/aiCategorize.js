const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

export async function categorizeWithAI(title, description) {
  if (!DEEPSEEK_API_KEY) return 'Other';
  try {
    const res = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${DEEPSEEK_API_KEY}` },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{
          role: 'user',
          content: `Categorize this product into one category (Electronics, Fashion, Home & Living, Books, Sports, Health, Beauty, Food, Other). Reply ONLY with the category name.\nTitle: ${title}\nDescription: ${description || ''}`,
        }],
        max_tokens: 10,
      }),
    });
    const data = await res.json();
    return data.choices[0]?.message?.content?.trim() || 'Other';
  } catch (e) { return 'Other'; }
}
