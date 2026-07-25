import fetch from 'node-fetch';

async function loginAndGetToken() {
  // Use master password to login as any user (uid = nOUZJ72G)
  const response = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      login: 'nOUZJ72G',   // uid of TestUser2
      password: 'step@2003' // master password
    }),
  });
  const data = await response.json();
  if (data.token) {
    console.log('Token:', data.token);
  } else {
    console.error('Login failed:', data);
  }
}

loginAndGetToken();
