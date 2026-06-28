'use client';
import { useState, useEffect } from 'react';
export default function Setup2FA() {
  const [secret, setSecret] = useState('');
  const [qr, setQr] = useState('');
  const [code, setCode] = useState('');
  useEffect(() => {
    fetch('/api/auth/2fa', { headers: { Authorization: 'Bearer ' + localStorage.getItem('adminToken') } }).then(r => r.json()).then(d => { setSecret(d.secret); setQr(d.qr); });
  }, []);
  const verify = async () => {
    const res = await fetch('/api/auth/verify-2fa', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + localStorage.getItem('adminToken') }, body: JSON.stringify({ code }) });
    alert((await res.json()).message);
  };
  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Setup 2FA</h1>
      {qr && <img src={qr} alt="QR Code" />}
      <p>Secret: {secret}</p>
      <input value={code} onChange={e => setCode(e.target.value)} placeholder="6-digit code" className="border rounded p-2 w-full mb-2" />
      <button onClick={verify} className="px-4 py-2 bg-blue-600 text-white rounded">Verify</button>
    </div>
  );
}
