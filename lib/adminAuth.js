export function checkAdmin(request) {
  const secret = request.headers.get('x-admin-secret');
  if (secret !== process.env.ADMIN_HASH) {
    return { error: 'Forbidden', status: 403 };
  }
  return { user: { role: 'admin' } };
}
