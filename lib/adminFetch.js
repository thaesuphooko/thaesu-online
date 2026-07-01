export async function adminFetch(url, options = {}) {
  let secret = '';
  if (typeof window !== 'undefined') {
    secret = localStorage.getItem('adminSecret') || process.env.NEXT_PUBLIC_ADMIN_HASH || '';
  }
  const headers = {
    'x-admin-secret': secret,
    ...(options.headers || {}),
  };
  return fetch(url, { ...options, headers });
}
