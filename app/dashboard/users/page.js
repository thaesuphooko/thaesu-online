'use client';
import { useState, useEffect } from 'react';
import { adminFetch } from '@/lib/adminFetch';
import { toast } from 'sonner';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const fetchUsers = async () => { const res = await adminFetch('/api/admin/users'); if(res.ok) setUsers(await res.json()); };
  useEffect(()=>{ fetchUsers(); }, []);
  const updateRole = async (userId, role) => {
    await adminFetch('/api/admin/users',{ method:'PATCH', body:JSON.stringify({id:userId, role}), headers:{'Content-Type':'application/json'} });
    toast.success('Role updated'); fetchUsers();
  };
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Users</h1>
      <div className="glass-card overflow-x-auto"><table className="w-full"><thead><tr><th className="p-2">Email</th><th>Name</th><th>Role</th><th>Verified</th><th>Action</th></tr></thead><tbody>{users.map(u=>(<tr key={u.id} className="border-t"><td className="p-2">{u.email}</td><td>{u.full_name}</td><td>{u.role}</td><td>{u.is_verified?'✅':'❌'}</td><td><select value={u.role} onChange={e=>updateRole(u.id,e.target.value)} className="border rounded p-1"><option>customer</option><option>vendor</option><option>admin</option></select></td></tr>))}</tbody></table></div>
    </div>
  );
}
