'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { UserPlus, Loader2, AlertCircle } from 'lucide-react';

const LocationPicker = dynamic(() => import('@/app/components/Map/LocationPicker'), { 
  ssr: false,
  loading: () => <div className="h-64 w-full bg-slate-900 animate-pulse rounded-lg flex items-center justify-center text-slate-500 font-mono text-xs">INITIALIZING MAP SATELLITE...</div>
});

export default function SignupPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [coords, setCoords] = useState<[number, number] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(''); // New: Track API errors
  const router = useRouter();

  const API = process.env.NEXT_PUBLIC_API_URL;

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coords) return;
    setIsLoading(true);
    setErrorMessage('');

    const endpoint = role === 'warehouse' ? 'warehouse' : 'user';

    try {
      const response = await fetch(`${API}/api/auth/signup/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            username, 
            password, 
            role, 
            location_coords: coords 
        }),
      });

      const data = await response.json();

      if (response.ok) {
        router.push(`/login/${endpoint}`);
      } else {
        setErrorMessage(data.error || "Registry authorization failed.");
      }
    } catch (err) {
      console.error("Connection failed");
      setErrorMessage("Command Center Unreachable. Check CORS/Backend status.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSignup} className="space-y-6">
      {errorMessage && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-500 text-xs font-mono">
          <AlertCircle size={14} /> {errorMessage.toUpperCase()}
        </div>
      )}

      <div className="space-y-4">
        <input 
          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-blue-500 outline-none transition-all"
          placeholder="Username" 
          value={username} 
          onChange={(e) => setUsername(e.target.value)} 
          required 
        />
        <select 
          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-blue-500 outline-none cursor-pointer"
          value={role} 
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="user">Business User</option>
          <option value="warehouse">Warehouse Manager</option>
        </select>
        <input 
          type="password" 
          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-blue-500 outline-none transition-all"
          placeholder="Password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          required 
        />
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest flex justify-between">
          Verify Physical Location 
          {coords ? <span className="text-blue-500 text-[8px]">COORDINATES LOCKED</span> : <span className="text-red-500 text-[8px]">REQUIRED</span>}
        </label>
        <LocationPicker onLocationSelect={(c) => setCoords(c)} />
      </div>

      <button 
        disabled={!coords || isLoading} 
        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl flex justify-center items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(37,99,235,0.2)]"
      >
        {isLoading ? <Loader2 className="animate-spin" /> : <UserPlus size={18} />}
        {isLoading ? 'ENCRYPTING DATA...' : 'INITIALIZE COMMANDER'}
      </button>
    </form>
  );
}