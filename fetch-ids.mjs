import { setTimeout } from 'timers/promises';
import db from './lib/db.js';
async function fetchRow(query) {
  const controller = new AbortController();
  const timeout = setTimeout(10000, null, { signal: controller.signal }).catch(() => {});
  try {
    const result = await Promise.race([ db.query(query), timeout ]);
    if (result && result.rows && result.rows.length) {
      const row = result.rows[0];
      console.log(row.id || row.uid || row.slug || '');
    } else console.log('');
  } catch (e) { console.error('DB ERROR:', e.message); console.log(''); } finally { process.exit(0); }
}
fetchRow(process.argv[2]);
