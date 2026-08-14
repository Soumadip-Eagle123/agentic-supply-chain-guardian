'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Truck, Loader2 } from 'lucide-react';
import Cookies from 'js-cookie';

export default function TransporterLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`${API}/api/auth/login/transporter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        Cookies.set('userID', String(data.userID));
        Cookies.set('role', 'transporter');
        router.push(`/${data.userID}/transporter`);
      } else {
        setError(data.error || 'Transporter authentication failed');
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
        type="text"
        placeholder="Driver / Fleet Identifier"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-purple-500 outline-none"
        required
      />
      <input
        type="password"
        placeholder="Driver Access Key"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-purple-500 outline-none"
        required
      />
      {error && <p className="text-red-500 text-xs">{error}</p>}
      <button className="w-full bg-purple-600 hover:bg-purple-500 text-white py-3 rounded-lg font-bold flex justify-center items-center gap-2 transition-all shadow-[0_0_15px_rgba(168,85,247,0.3)]">
        {isLoading ? <Loader2 className="animate-spin" /> : <Truck size={18} />}
        ENTER FLEET PORTAL
      </button>
    </form>
  );
}