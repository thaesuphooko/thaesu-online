// Mock email sender – no real email sent
export async function sendEmail({ to, subject, html }) {
  console.log(`[Email Mock] To: ${to}, Subject: ${subject}`);
  return true;
}
