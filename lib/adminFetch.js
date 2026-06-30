export const adminFetch = async (url, options = {}) => {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
  return res;
};
