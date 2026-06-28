export async function POST(request) {
  const { email, name } = await request.json();
  // Simulate successful login
  return Response.json({ token: 'mock-jwt-token', user: { email, name, role: 'customer' } });
}
