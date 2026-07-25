export async function adminFetch(url, options = {}) {
  // Get the hash from URL fragment, fallback to localStorage adminSecret
  let hash = '';
  if (typeof window !== 'undefined') {
    hash = window.location.hash.substring(1) || localStorage.getItem('adminSecret') || '';
  }
  
  const headers = new Headers(options.headers || {});
  
  if (hash) {
    headers.set('x-admin-hash', hash);
  }
  
  if (!(options.body instanceof FormData)) {
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (res.status === 403) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Forbidden: Invalid Admin Credentials');
  }

  return res;
}
