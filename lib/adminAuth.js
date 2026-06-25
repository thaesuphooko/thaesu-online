import { verifyToken } from '@/lib/auth';

// Simple middleware-like check for API routes
export function checkAdmin(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'Unauthorized', status: 401 };
  }
  const token = authHeader.split(' ')[1];
  try {
    const payload = verifyToken(token);
    if (payload.role !== 'admin') {
      return { error: 'Forbidden', status: 403 };
    }
    return { user: payload }; // OK
  } catch {
    return { error: 'Invalid token', status: 401 };
  }
}
