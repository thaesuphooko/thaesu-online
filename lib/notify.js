// lib/notify.js – reuse the global io instance from chat route
let io;

export function setIO(socketIO) {
  io = socketIO;
}

export function sendNotification(userId, message, type = 'social') {
  if (!io) return;
  // Save to DB
  import('./db.js').then(async ({ query }) => {
    try {
      await query(
        'INSERT INTO notifications (user_id, message, type) VALUES ($1, $2, $3)',
        [userId, message, type]
      );
    } catch (e) {}
  });
  // Send real-time
  io.to(userId).emit('notification', { message, type, created_at: new Date().toISOString() });
}
