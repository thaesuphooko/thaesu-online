export const dynamic = 'force-dynamic';
import { checkAdmin } from '@/lib/adminAuth';
import { query } from '@/lib/db';

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const BASE_URL = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';

// Simple agent: call DeepSeek with a system prompt, optionally with tools
async function callAgent(systemPrompt, userPrompt, tools = null) {
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];
  const body = { model: 'deepseek-chat', messages };
  if (tools) body.tools = tools;
  const res = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${DEEPSEEK_API_KEY}` },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return data.choices[0]?.message?.content || 'No response';
}

// Collector: gather site data
async function gatherSiteData() {
  const statsRes = await fetch(`${BASE_URL}/api/admin/sales`, { headers: { 'x-admin-secret': process.env.ADMIN_HASH } });
  const healthRes = await fetch(`${BASE_URL}/api/admin/system-stats`, { headers: { 'x-admin-secret': process.env.ADMIN_HASH } });
  const errorRes = await fetch(`${BASE_URL}/api/admin/error-logs?limit=10`, { headers: { 'x-admin-secret': process.env.ADMIN_HASH } });
  const keyRes = await fetch(`${BASE_URL}/api/admin/key-tester`, { headers: { 'x-admin-secret': process.env.ADMIN_HASH } });
  const productsRes = await fetch(`${BASE_URL}/api/admin/products?limit=5`, { headers: { 'x-admin-secret': process.env.ADMIN_HASH } });
  const ordersRes = await fetch(`${BASE_URL}/api/admin/orders`, { headers: { 'x-admin-secret': process.env.ADMIN_HASH } });

  const data = {
    stats: await statsRes.json(),
    health: await healthRes.json(),
    errors: await errorRes.json(),
    keys: await keyRes.json(),
    products: (await productsRes.json()).data?.slice(0, 5),
    orders: (await ordersRes.json()).slice(0, 5),
  };
  return JSON.stringify(data);
}

// Executor: perform safe actions (via internal API)
async function executeAction(action) {
  const headers = { 'Content-Type': 'application/json', 'x-admin-secret': process.env.ADMIN_HASH };
  if (action.type === 'restart_service') {
    await fetch(`${BASE_URL}/api/admin/bots`, { method: 'POST', headers, body: JSON.stringify({ action: 'restart', botName: action.target }) });
  } else if (action.type === 'clear_cache') {
    await fetch(`${BASE_URL}/api/admin/cleanup`);
  } else if (action.type === 'update_setting') {
    await fetch(`${BASE_URL}/api/admin/settings`, { method: 'PATCH', headers, body: JSON.stringify({ key: action.key, value: action.value }) });
  } else if (action.type === 'run_auto_heal') {
    await fetch(`${BASE_URL}/api/admin/run-auto-heal`);
  } else if (action.type === 'scrape') {
    await fetch(`${BASE_URL}/api/admin/scrape`, { method: 'POST', headers, body: JSON.stringify({ url: action.url }) });
  }
}

export async function POST(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });

  if (!DEEPSEEK_API_KEY) return Response.json({ error: 'DeepSeek API key missing' }, { status: 500 });

  // Step 1: Gather site data
  const siteData = await gatherSiteData();

  // Step 2: Agent A – Analyzer (find issues and suggest improvements)
  const analyzerPrompt = `You are an expert site auditor. Analyze the provided site data and list issues (errors, performance, low stock, etc.) and suggest actionable improvements. Output JSON with "issues" array and "suggestions" array. Only output valid JSON.`;
  const analyzerResponse = await callAgent(analyzerPrompt, `Site data:\n${siteData}`);
  let analysis;
  try {
    analysis = JSON.parse(analyzerResponse.replace(/```json|```/g, '').trim());
  } catch {
    analysis = { issues: [], suggestions: [analyzerResponse] };
  }

  // Step 3: Agent B – Planner (choose safe actions from suggestions)
  const plannerPrompt = `You are an action planner. Given the analysis below, create a list of safe, executable actions that can be performed automatically. Actions can include: restart_service (thaesu, telegram-bot), clear_cache, update_setting (key, value), run_auto_heal. Output JSON array of action objects. Example: [{"type":"restart_service","target":"thaesu"},{"type":"clear_cache"}]. Only output valid JSON.`;
  const plannerResponse = await callAgent(plannerPrompt, `Analysis:\n${JSON.stringify(analysis)}`);
  let actions;
  try {
    actions = JSON.parse(plannerResponse.replace(/```json|```/g, '').trim());
  } catch {
    actions = [];
  }

  // Step 4: Execute actions
  const results = [];
  for (const action of actions) {
    await executeAction(action);
    results.push({ action, status: 'executed' });
  }

  // Step 5: Summarize with Agent C (optional) – generate a report
  const reporterPrompt = `You are a summarizer. Write a concise report (in Myanmar language) of the actions taken to improve the website.`;
  const report = await callAgent(reporterPrompt, `Actions taken:\n${JSON.stringify(results)}`);

  // Save log to database (optional)
  await query('INSERT INTO system_health_logs (component, status, message) VALUES ($1,$2,$3)', ['AI-Improvement', 'OK', report]).catch(() => {});

  return Response.json({ analysis, actions, results, report });
}
