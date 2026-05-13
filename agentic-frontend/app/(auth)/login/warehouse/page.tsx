'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Loader2 } from 'lucide-react';
import Cookies from 'js-cookie';

export default function WarehouseLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    const API = process.env.NEXT_PUBLIC_API_URL;


    try {
      const response = await fetch(`${API}/api/auth/login/warehouse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        Cookies.set('userID', String(data.userID));
    Cookies.set('role', 'warehouse'); // or 'user'
        router.push(`/${data.userID}/warehouse`); 
      } else {
        setError(data.error || 'Warehouse authentication failed'); 
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
        type="text" placeholder="Warehouse Admin ID" value={username}
        onChange={(e) => setUsername(e.target.value)}
        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-green-500 outline-none"
        required
      />
      <input
        type="password" placeholder="System Key" value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-green-500 outline-none"
        required
      />
      {error && <p className="text-red-500 text-xs">{error}</p>}
      <button className="w-full bg-green-600 py-3 rounded-lg font-bold flex justify-center items-center gap-2">
        {isLoading ? <Loader2 className="animate-spin" /> : <Box size={18}/>}
        ENTER HUB
      </button>
    </form>
  );
}