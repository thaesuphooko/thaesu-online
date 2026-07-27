#!/usr/bin/env node
/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  GOD MODE – Database Role Constraint Repair Tool            ║
 * ╚══════════════════════════════════════════════════════════════╝
 * Usage: node fix-roles.mjs [--dry-run]
 */
import db from './lib/db.js';
import readline from 'readline';

const DRY_RUN = process.argv.includes('--dry-run');

function askQuestion(query) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(query, ans => { rl.close(); resolve(ans); }));
}

async function main() {
  console.log(`\n⚡ God Mode Role Repair Tool ${DRY_RUN ? '(DRY RUN)' : '(LIVE)'}\n`);

  try {
    // 1. Check current constraint
    const { rows: constraints } = await db.query(`
      SELECT conname FROM pg_constraint
      WHERE conrelid = 'users'::regclass AND contype = 'c' AND conname = 'users_role_check'
    `);
    const constraintExists = constraints.length > 0;
    console.log(`📋 Current constraint: ${constraintExists ? 'users_role_check EXISTS' : 'No constraint found'}`);

    // 2. Find invalid roles
    const { rows: invalidRows } = await db.query(
      `SELECT id, uid, full_name, role FROM users WHERE role NOT IN ('user', 'admin', 'vendor')`
    );
    console.log(`👥 Users with invalid roles: ${invalidRows.length}`);

    if (invalidRows.length > 0) {
      console.log('\n🚨 Invalid role details:');
      console.table(invalidRows.map(r => ({ id: r.id.slice(0,8)+'…', name: r.full_name, role: r.role })));

      if (!DRY_RUN) {
        const confirm = await askQuestion('\n⚠️ Update all invalid roles to "user"? (yes/no): ');
        if (confirm.toLowerCase() !== 'yes') {
          console.log('❌ Aborted by user.');
          process.exit(0);
        }
      }

      // 3. Perform fix inside a transaction
      if (!DRY_RUN) {
        const client = await db.connect();
        try {
          await client.query('BEGIN');

          // Drop old constraint
          await client.query('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check');
          console.log('✅ Old constraint dropped.');

          // Update invalid rows
          const ids = invalidRows.map(r => r.id);
          const result = await client.query(
            `UPDATE users SET role = 'user' WHERE id = ANY($1::uuid[])`,
            [ids]
          );
          console.log(`✅ ${result.rowCount} rows updated to role 'user'.`);

          // Add new constraint
          await client.query(
            `ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('user', 'admin', 'vendor'))`
          );
          console.log('✅ New constraint added.');

          await client.query('COMMIT');
          console.log('🎉 All done!');
        } catch (err) {
          await client.query('ROLLBACK');
          console.error('❌ Transaction rolled back:', err.message);
        } finally {
          client.release();
        }
      } else {
        console.log('🔍 Dry run completed. No changes made.');
      }
    } else {
      console.log('ℹ️ All roles are valid. No action needed.');
      // Ensure constraint exists
      if (!constraintExists && !DRY_RUN) {
        await db.query(
          `ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('user', 'admin', 'vendor'))`
        );
        console.log('✅ Constraint added.');
      }
    }
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
  } finally {
    process.exit(0);
  }
}

main();
