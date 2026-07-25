import { NextResponse } from 'next/server';
import { Server as SocketIOServer } from 'socket.io';
import pool from '@/lib/db';
import jwt from 'jsonwebtoken';
import { generateAIReply } from '@/lib/aiChatHelper';

let io;
const JWT_SECRET = process.env.JWT_SECRET || 'thaesu-secret-key-2024-prod-v2';

const onlineUsers = new Map(); // userId -> Set<socketId>

export async function GET(req) {
  if (!io) {
    const { socket: serverSocket } = await import('http').then(m => m);
    io = new SocketIOServer(serverSocket, {
      path: '/api/chat/socket',
      addTrailingSlash: false,
      cors: { origin: '*' },
    });

    io.on('connection', (socket) => {
      console.log('User connected:', socket.id);

      socket.on('join', ({ token }) => {
        try {
          const decoded = jwt.verify(token, JWT_SECRET);
          socket.user = decoded;
          socket.join(decoded.id); // personal room for customer
          if (decoded.role === 'admin') {
            socket.join('admins');
          }
          // Track online users
          if (!onlineUsers.has(decoded.id)) onlineUsers.set(decoded.id, new Set());
          onlineUsers.get(decoded.id).add(socket.id);
          io.to('admins').emit('user online', { userId: decoded.id, role: decoded.role });
          console.log(`${decoded.role} joined: ${decoded.id}`);
        } catch (err) {
          console.error('Invalid token:', err.message);
        }
      });

      // Typing indicator
      socket.on('typing', ({ conversationId, to }) => {
        if (socket.user) {
          socket.to(to).emit('typing', { conversationId, userId: socket.user.id });
        }
      });
      socket.on('stop typing', ({ conversationId, to }) => {
        if (socket.user) {
          socket.to(to).emit('stop typing', { conversationId, userId: socket.user.id });
        }
      });

      // Customer message
      socket.on('customer message', async ({ conversationId, message }) => {
        if (!socket.user || socket.user.role !== 'customer') return;
        try {
          const { rows: [msg] } = await pool.query(
            'INSERT INTO chat_messages (sender_id, sender_role, message, conversation_id) VALUES ($1, $2, $3, $4) RETURNING *',
            [socket.user.id, 'customer', message, conversationId]
          );
          io.to('admins').emit('new message', msg);
          // Auto AI reply
          setTimeout(async () => {
            try {
              const aiReply = await generateAIReply(message);
              const { rows: [aiMsg] } = await pool.query(
                'INSERT INTO chat_messages (sender_id, sender_role, message, conversation_id) VALUES ($1, $2, $3, $4) RETURNING *',
                [null, 'ai', aiReply, conversationId]
              );
              io.to(socket.user.id).emit('new message', aiMsg);
              io.to('admins').emit('new message', aiMsg);
            } catch (e) { console.error('AI reply error:', e); }
          }, 1500);
        } catch (err) {
          console.error('Message error:', err);
        }
      });

      // Admin message
      socket.on('admin message', async ({ conversationId, message, customerId }) => {
        if (!socket.user || socket.user.role !== 'admin') return;
        try {
          const { rows: [msg] } = await pool.query(
            'INSERT INTO chat_messages (sender_id, sender_role, message, conversation_id) VALUES ($1, $2, $3, $4) RETURNING *',
            [socket.user.id, 'admin', message, conversationId]
          );
          io.to(customerId).emit('new message', msg);
          io.to('admins').emit('new message', msg);
        } catch (err) {
          console.error('Admin message error:', err);
        }
      });

      // Disconnect handling
      socket.on('disconnect', () => {
        if (socket.user) {
          const userSockets = onlineUsers.get(socket.user.id);
          if (userSockets) {
            userSockets.delete(socket.id);
            if (userSockets.size === 0) {
              onlineUsers.delete(socket.user.id);
              io.to('admins').emit('user offline', { userId: socket.user.id });
            }
          }
        }
        console.log('User disconnected:', socket.id);
      });
    });
  }
  return NextResponse.json({ status: 'Socket.IO server active' });
}

export const runtime = 'nodejs';
