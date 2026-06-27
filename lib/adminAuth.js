// Simple admin check using secret hash (passed from client)
const ADMIN_SECRET = process.env.ADMIN_HASH;

export function checkAdmin(request) {
  const secret = request.headers.get('x-admin-secret');
  if (secret !== ADMIN_SECRET) {
    return { error: 'Forbidden', status: 403 };
  }
  return { user: { role: 'admin' } };
}
