#!/usr/bin/env node
import { readFile, readdir, readlink, access } from 'node:fs/promises';
import { resolve, basename } from 'node:path';
import { cwd, exit } from 'node:process';

// ─── Colors ───
const R = '\x1b[31m', G = '\x1b[32m', Y = '\x1b[33m', C = '\x1b[36m', B = '\x1b[1m', N = '\x1b[0m';

async function findPort(port, kill = false) {
  const hexPort = port.toString(16).padStart(4, '0').toUpperCase();
  const protoFiles = ['/proc/net/tcp', '/proc/net/tcp6'];
  let inode = null;

  for (const protoFile of protoFiles) {
    try {
      const data = await readFile(protoFile, 'utf8');
      const lines = data.trim().split('\n').slice(1);
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const local = parts[1]; // e.g., 00000000:0BB8
        const portHex = local.split(':')[1];
        if (portHex === hexPort) {
          inode = parts[9]; // socket inode
          break;
        }
      }
    } catch (_) { /* ignore unreadable files */ }
    if (inode) break;
  }

  if (!inode) {
    console.log(`${Y}⚠️  No process found listening on port ${port}${N}`);
    return false;
  }

  // Search for PID
  let pid = null, comm = '';
  try {
    const procDirs = await readdir('/proc');
    for (const dirent of procDirs) {
      if (!/^\d+$/.test(dirent)) continue;
      const fdDir = `/proc/${dirent}/fd`;
      try {
        const fds = await readdir(fdDir);
        for (const fd of fds) {
          try {
            const link = await readlink(resolve(fdDir, fd));
            if (link.includes(`socket:[${inode}]`)) {
              pid = dirent;
              try {
                comm = (await readFile(`/proc/${pid}/comm`, 'utf8')).trim();
              } catch (_) {}
              break;
            }
          } catch (_) {}
        }
      } catch (_) {}
      if (pid) break;
    }
  } catch (_) {}

  if (!pid) {
    console.log(`${Y}⚠️  Port ${port} inode ${inode} found but no process accessible.${N}`);
    return false;
  }

  console.log(`${G}✅ Port ${port} -> PID: ${B}${pid}${N}   Name: ${C}${comm || 'unknown'}${N}`);

  if (kill) {
    try {
      process.kill(pid, 'SIGKILL');
      console.log(`${R}💀 Killed process ${pid}${N}`);
    } catch (e) {
      console.log(`${R}❌ Failed to kill PID ${pid}: ${e.message}${N}`);
    }
  }
  return true;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log(`${B}Usage:${N} node find-port-ultra.mjs <port1> [port2...] [--kill]`);
    console.log(`${B}Example:${N} node find-port-ultra.mjs 3000 3001 --kill`);
    exit(1);
  }

  const ports = [];
  let kill = false;
  for (const arg of args) {
    if (arg === '--kill') {
      kill = true;
    } else if (/^\d+$/.test(arg)) {
      ports.push(parseInt(arg));
    } else {
      console.log(`${Y}Ignoring invalid argument: ${arg}${N}`);
    }
  }

  if (ports.length === 0) {
    console.log(`${R}No valid ports provided.${N}`);
    exit(1);
  }

  console.log(`${B}🔍 Scanning ports: ${ports.join(', ')}${N}`);
  let found = 0;
  for (const port of ports) {
    const result = await findPort(port, kill);
    if (result) found++;
  }
  console.log(`\n${B}Summary:${N} Found ${found}/${ports.length} listener(s).`);
}

main().catch(err => {
  console.error(`${R}Fatal error:${N}`, err.message);
  exit(1);
});
