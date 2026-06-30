import { Server } from 'socket.io';
let io;

export function initSocket(httpServer) {
  io = new Server(httpServer, { cors: { origin: '*' } });
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    socket.on('join-room', (room) => socket.join(room));
    socket.on('leave-room', (room) => socket.leave(room));
  });
  return io;
}

export function getIO() { return io; }
export function emitEvent(room, event, data) {
  if (io) io.to(room).emit(event, data);
}
