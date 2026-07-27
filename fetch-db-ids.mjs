import { setTimeout } from 'node:timers/promises';
import db from './lib/db.js';
const Q = [
  ["userUid","SELECT uid FROM users WHERE role='user' LIMIT 1"],
  ["vendorUid","SELECT uid FROM users WHERE vendor_status='active' LIMIT 1"],
  ["adminUid","SELECT uid FROM users WHERE role='admin' LIMIT 1"],
  ["productId","SELECT id FROM products LIMIT 1"],
  ["productSlug","SELECT slug FROM products LIMIT 1"],
  ["orderId","SELECT id FROM orders LIMIT 1"],
  ["subscriptionId","SELECT id FROM user_subscriptions LIMIT 1"],
  ["planId","SELECT id FROM subscription_plans LIMIT 1"],
  ["postId","SELECT id FROM posts LIMIT 1"],
  ["commentId","SELECT id FROM comments LIMIT 1"],
  ["storyId","SELECT id FROM stories LIMIT 1"]
];
const R = {};
for (let [k,q] of Q) {
  try {
    let res = await Promise.race([db.query(q), setTimeout(5000,'TO')]);
    R[k] = (res!=='TO' && res.rows?.[0]) ? (Object.values(res.rows[0])[0]||'') : '';
  } catch { R[k] = ''; }
}
console.log(JSON.stringify(R));
process.exit(0);
