// Webhook Notifier – Infinity Premium Ultra Pro Max
// Supports Slack, Discord, and custom webhooks for crawl events

import { query } from './db.js';

const WEBHOOK_TYPES = {
  SLACK: 'slack',
  DISCORD: 'discord',
  TELEGRAM: 'telegram',
  CUSTOM: 'custom',
};

async function getWebhookConfigs() {
  try {
    const { rows } = await query(
      "SELECT * FROM webhook_configs WHERE is_active = true"
    );
    return rows;
  } catch (e) {
    // Table may not exist yet
    return [];
  }
}

async function sendSlack(webhookUrl, payload) {
  const message = {
    text: payload.text,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: payload.text,
        },
      },
    ],
    ...(payload.color && {
      attachments: [{ color: payload.color, fields: payload.fields || [] }],
    }),
  };

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message),
  });
}

async function sendDiscord(webhookUrl, payload) {
  const embed = {
    title: payload.title || 'Crawl Notification',
    description: payload.text,
    color: payload.color === 'green' ? 5763719 : payload.color === 'red' ? 15548997 : 3447003,
    fields: payload.fields || [],
    timestamp: new Date().toISOString(),
  };

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ embeds: [embed] }),
  });
}

async function sendTelegram(botToken, chatId, text) {
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    }),
  });
}

export async function notifyCrawlEvent(event) {
  const configs = await getWebhookConfigs();
  if (configs.length === 0) return;

  const { type, jobId, jobName, status, message, stats } = event;

  const text = formatCrawlMessage(type, jobName, status, message, stats);

  for (const config of configs) {
    try {
      switch (config.webhook_type) {
        case WEBHOOK_TYPES.SLACK:
          await sendSlack(config.webhook_url, {
            text,
            color: status === 'completed' ? 'green' : status === 'failed' ? 'red' : '#3498db',
            fields: stats ? [
              { title: 'Products', value: String(stats.productCount || 0), short: true },
              { title: 'Duration', value: stats.duration || 'N/A', short: true },
            ] : [],
          });
          break;
        case WEBHOOK_TYPES.DISCORD:
          await sendDiscord(config.webhook_url, {
            title: `Crawl Job: ${jobName || jobId}`,
            text,
            color: status === 'completed' ? 'green' : status === 'failed' ? 'red' : 'blue',
            fields: stats ? [
              { name: 'Products', value: String(stats.productCount || 0), inline: true },
              { name: 'Duration', value: stats.duration || 'N/A', inline: true },
            ] : [],
          });
          break;
        case WEBHOOK_TYPES.TELEGRAM:
          await sendTelegram(config.bot_token, config.chat_id, text);
          break;
        case WEBHOOK_TYPES.CUSTOM:
          await fetch(config.webhook_url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(event),
          });
          break;
      }
    } catch (e) {
      console.error(`Webhook notification failed for ${config.webhook_type}:`, e.message);
    }
  }
}

function formatCrawlMessage(type, jobName, status, message, stats) {
  const emoji = status === 'completed' ? '✅' : status === 'failed' ? '❌' : status === 'started' ? '🚀' : '⏹️';
  let text = `${emoji} <b>Crawl ${type}</b>\n`;
  text += `📋 Job: ${jobName || 'Unknown'}\n`;
  text += `📊 Status: ${status}\n`;
  if (message) text += `💬 ${message}\n`;
  if (stats) {
    text += `🛍️ Products: ${stats.productCount || 0}\n`;
    text += `⏱️ Duration: ${stats.duration || 'N/A'}\n`;
  }
  return text;
}

export { WEBHOOK_TYPES };
