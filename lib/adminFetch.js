export async function adminFetch(url, options = {}) {
  const secret = localStorage.getItem('adminSecret') || process.env.NEXT_PUBLIC_ADMIN_HASH;
  const headers = {
    'x-admin-secret': secret,
    ...(options.headers || {}),
  };
  return fetch(url, { ...options, headers });
}
