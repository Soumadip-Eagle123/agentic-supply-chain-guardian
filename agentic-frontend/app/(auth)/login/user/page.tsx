'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Loader2 } from 'lucide-react';
import Cookies from 'js-cookie';

export default function UserLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const API = process.env.NEXT_PUBLIC_API_URL;
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`${API}/api/auth/login/user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        Cookies.set('userID', String(data.userID));
        Cookies.set('role', 'user'); // or 'warehouse'
        router.push(`/${data.userID}/shipment`);
      } else {
        setError(data.error || 'User authentication failed'); 
      }
    } catch (err) {
      setError('Connection failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <input
        type="text" placeholder="User ID" value={username}
        onChange={(e) => setUsername(e.target.value)}
        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
        required
      />
      <input
        type="password" placeholder="Access Key" value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
        required
      />
      {error && <p className="text-red-500 text-xs">{error}</p>}
      <button className="w-full bg-blue-600 py-3 rounded-lg font-bold flex justify-center items-center gap-2">
        {isLoading ? <Loader2 className="animate-spin" /> : <ShieldCheck size={18}/>}
        ENTER PORTAL
      </button>
    </form>
  );
}