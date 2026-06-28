export const dynamic = 'force-dynamic';
import { checkAdmin } from '@/lib/adminAuth';
import { query } from '@/lib/db';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const BASE_URL = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
const PROJECT_ROOT = process.cwd();

const tools = [
  { type: 'function', function: { name: 'get_dashboard_stats', description: 'Get sales overview', parameters: { type: 'object', properties: {} } } },
  { type: 'function', function: { name: 'list_products', description: 'List products', parameters: { type: 'object', properties: { search: { type: 'string' } } } } },
  { type: 'function', function: { name: 'create_product', description: 'Add product', parameters: { type: 'object', properties: { title: { type: 'string' }, price: { type: 'number' }, description: { type: 'string' }, category: { type: 'string' }, stock: { type: 'number' } }, required: ['title','price'] } } },
  { type: 'function', function: { name: 'update_product_price', description: 'Change product price', parameters: { type: 'object', properties: { product_id: { type: 'string' }, price: { type: 'number' } }, required: ['product_id','price'] } } },
  { type: 'function', function: { name: 'list_orders', description: 'List recent orders', parameters: { type: 'object', properties: {} } } },
  { type: 'function', function: { name: 'update_order_status', description: 'Change order status', parameters: { type: 'object', properties: { order_id: { type: 'string' }, status: { type: 'string', enum: ['pending','confirmed','preparing','delivering','delivered','cancelled'] } }, required: ['order_id','status'] } } },
  { type: 'function', function: { name: 'scrape_product', description: 'Scrape a product from URL and save it', parameters: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] } } },
  { type: 'function', function: { name: 'list_crawl_jobs', description: 'List all crawl jobs', parameters: { type: 'object', properties: {} } } },
  { type: 'function', function: { name: 'create_crawl_job', description: 'Create a new crawl job', parameters: { type: 'object', properties: { name: { type: 'string' }, start_url: { type: 'string' }, config: { type: 'string', description: 'JSON config string (optional)' } }, required: ['start_url'] } } },
  { type: 'function', function: { name: 'control_crawl_job', description: 'Start or stop a crawl job', parameters: { type: 'object', properties: { job_id: { type: 'string' }, action: { type: 'string', enum: ['start','stop'] } }, required: ['job_id','action'] } } },
  { type: 'function', function: { name: 'get_system_health', description: 'Get CPU/RAM/Disk usage', parameters: { type: 'object', properties: {} } } },
  { type: 'function', function: { name: 'get_error_logs', description: 'Get recent error logs', parameters: { type: 'object', properties: { limit: { type: 'number' } } } } },
  { type: 'function', function: { name: 'run_auto_heal', description: 'Fix common issues (restart, clear cache)', parameters: { type: 'object', properties: {} } } },
  { type: 'function', function: { name: 'clear_cache', description: 'Clear Next.js build cache', parameters: { type: 'object', properties: {} } } },
  { type: 'function', function: { name: 'restart_server', description: 'Restart the PM2 thaesu process', parameters: { type: 'object', properties: {} } } },
  { type: 'function', function: { name: 'get_settings', description: 'Get all global settings', parameters: { type: 'object', properties: {} } } },
  { type: 'function', function: { name: 'update_setting', description: 'Update a global setting', parameters: { type: 'object', properties: { key: { type: 'string' }, value: { type: 'string' } }, required: ['key','value'] } } },
  { type: 'function', function: { name: 'read_file', description: 'Read the contents of a file in the project', parameters: { type: 'object', properties: { filepath: { type: 'string', description: 'Relative path from project root, e.g., app/page.js' } }, required: ['filepath'] } } },
  { type: 'function', function: { name: 'write_file', description: 'Create or overwrite a file in the project. Use with caution! Provide full file content.', parameters: { type: 'object', properties: { filepath: { type: 'string', description: 'Relative path, e.g., components/atoms/MyComponent.jsx' }, content: { type: 'string', description: 'Full file content to write' } }, required: ['filepath','content'] } } },
  { type: 'function', function: { name: 'run_sql', description: 'Execute a safe SQL command (CREATE TABLE IF NOT EXISTS)', parameters: { type: 'object', properties: { sql: { type: 'string' } }, required: ['sql'] } } },
  { type: 'function', function: { name: 'git_commit_and_push', description: 'Stage all changes, commit with a message, and push to remote (only when explicitly asked)', parameters: { type: 'object', properties: { message: { type: 'string' } }, required: ['message'] } } },
];

async function executeFunction(name, args, secret) {
  const headers = { 'Content-Type': 'application/json', 'x-admin-secret': secret };
  let url, method = 'GET', body;
  switch (name) {
    case 'get_dashboard_stats': url = `${BASE_URL}/api/admin/sales`; break;
    case 'list_products': url = `${BASE_URL}/api/admin/products?` + new URLSearchParams(args).toString(); break;
    case 'create_product': url = `${BASE_URL}/api/admin/products`; method = 'POST'; body = JSON.stringify(args); break;
    case 'update_product_price': url = `${BASE_URL}/api/admin/products/${args.product_id}`; method = 'PUT'; body = JSON.stringify({ price: args.price }); break;
    case 'list_orders': url = `${BASE_URL}/api/admin/orders`; break;
    case 'update_order_status': url = `${BASE_URL}/api/admin/orders/${args.order_id}`; method = 'PATCH'; body = JSON.stringify({ status: args.status }); break;
    case 'scrape_product': url = `${BASE_URL}/api/admin/scrape`; method = 'POST'; body = JSON.stringify({ url: args.url }); break;
    case 'list_crawl_jobs': url = `${BASE_URL}/api/admin/crawler`; break;
    case 'create_crawl_job': url = `${BASE_URL}/api/admin/crawler`; method = 'POST'; body = JSON.stringify({ name: args.name || 'AI Crawl Job', start_url: args.start_url, config: args.config ? JSON.parse(args.config) : {} }); break;
    case 'control_crawl_job': url = `${BASE_URL}/api/admin/crawler/${args.job_id}`; method = 'PATCH'; body = JSON.stringify({ action: args.action }); break;
    case 'get_system_health': url = `${BASE_URL}/api/admin/system-stats`; break;
    case 'get_error_logs': url = `${BASE_URL}/api/admin/error-logs?limit=${args.limit || 20}`; break;
    case 'run_auto_heal': url = `${BASE_URL}/api/admin/run-auto-heal`; break;
    case 'clear_cache': url = `${BASE_URL}/api/admin/cleanup`; break;
    case 'restart_server':
      try { execSync('pm2 restart thaesu'); return { message: 'Server restarted' }; } catch (e) { return { error: e.message }; }
    case 'get_settings': url = `${BASE_URL}/api/admin/settings`; break;
    case 'update_setting': url = `${BASE_URL}/api/admin/settings`; method = 'PATCH'; body = JSON.stringify({ key: args.key, value: args.value }); break;
    case 'read_file': {
      const filePath = path.join(PROJECT_ROOT, args.filepath);
      if (!filePath.startsWith(PROJECT_ROOT)) return { error: 'Invalid path' };
      try { return { content: fs.readFileSync(filePath, 'utf8') }; } catch (e) { return { error: e.message }; }
    }
    case 'write_file': {
      const filePath = path.join(PROJECT_ROOT, args.filepath);
      if (!filePath.startsWith(PROJECT_ROOT)) return { error: 'Invalid path' };
      try {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(filePath, args.content, 'utf8');
        return { message: `File written: ${args.filepath}` };
      } catch (e) { return { error: e.message }; }
    }
    case 'run_sql':
      if (!args.sql.trim().toUpperCase().startsWith('CREATE TABLE IF NOT EXISTS')) return { error: 'Only CREATE TABLE IF NOT EXISTS allowed' };
      try { await query(args.sql); return { message: 'SQL executed' }; } catch (e) { return { error: e.message }; }
    case 'git_commit_and_push':
      try {
        execSync('git add .', { cwd: PROJECT_ROOT, timeout: 10000 });
        execSync(`git commit -m "${args.message}"`, { cwd: PROJECT_ROOT, timeout: 10000 });
        execSync('git push', { cwd: PROJECT_ROOT, timeout: 15000 });
        return { message: 'Changes committed and pushed to GitHub.' };
      } catch (e) { return { error: e.message }; }
    default: return { error: 'Unknown function' };
  }
  if (url) {
    const res = await fetch(url, { method, headers, body });
    return res.json();
  }
}

export async function GET(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
  try {
    const res = await query('SELECT role, content FROM chat_history WHERE role IN (\'user\', \'assistant\') ORDER BY created_at ASC LIMIT 50');
    return Response.json(res.rows);
  } catch (e) {
    return Response.json([]);
  }
}

export async function POST(request) {
  try {
    const auth = checkAdmin(request);
    if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
    const { message } = await request.json();
    if (!message) return Response.json({ error: 'Message required' }, { status: 400 });
    if (!DEEPSEEK_API_KEY) return Response.json({ error: 'API key missing' }, { status: 500 });

    await query('INSERT INTO chat_history (role, content) VALUES ($1, $2)', ['user', message]);

    const historyRes = await query("SELECT role, content FROM chat_history WHERE role IN ('user','assistant') ORDER BY created_at ASC LIMIT 30");
    const history = historyRes.rows.map(r => ({ role: r.role, content: r.content }));

    const systemMessage = {
      role: 'system',
      content: 'You are the Ultimate AI Admin. You can use multiple tools in sequence to accomplish complex tasks. When a user asks for something that requires multiple steps, keep calling tools one after another until the task is fully done. Do not ask for permission; just proceed. If you get stuck, report the issue. Be concise and helpful.'
    };
    const conversation = [systemMessage, ...history];

    let finalReply = '';
    let maxSteps = 10; // maximum tool calls in a row
    let step = 0;

    while (step < maxSteps) {
      const deepRes = await fetch(DEEPSEEK_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${DEEPSEEK_API_KEY}` },
        body: JSON.stringify({ model: 'deepseek-chat', messages: conversation, tools: tools, tool_choice: 'auto' }),
      });
      const deepData = await deepRes.json();
      if (!deepRes.ok || !deepData.choices || deepData.choices.length === 0) {
        return Response.json({ error: `DeepSeek error: ${deepData.error?.message || 'No response'}` }, { status: 500 });
      }

      const assistantMessage = deepData.choices[0]?.message;
      if (!assistantMessage) {
        finalReply = 'No response from AI.';
        break;
      }

      // If AI decides not to call any tool, it's the final answer
      if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
        finalReply = assistantMessage.content;
        conversation.push(assistantMessage);
        break;
      }

      // Process all tool calls in this message
      const toolResults = [];
      for (const toolCall of assistantMessage.tool_calls) {
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments || '{}');
        const functionResult = await executeFunction(functionName, functionArgs, process.env.ADMIN_HASH);
        toolResults.push({ role: 'tool', tool_call_id: toolCall.id, content: JSON.stringify(functionResult) });
      }

      // Add the assistant message and tool results to conversation
      conversation.push(assistantMessage);
      conversation.push(...toolResults);

      step++;

      // If the assistant's last message indicates completion, break early
      if (assistantMessage.content && assistantMessage.content.toLowerCase().includes('done')) {
        finalReply = assistantMessage.content;
        break;
      }
    }

    if (!finalReply) finalReply = 'Action completed.';

    // Save final reply to history
    if (finalReply) {
      await query('INSERT INTO chat_history (role, content) VALUES ($1, $2)', ['assistant', finalReply]);
    }

    return Response.json({ reply: finalReply });
  } catch (error) {
    console.error('AI Chat error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
  await query('DELETE FROM chat_history');
  return Response.json({ message: 'History cleared' });
}
