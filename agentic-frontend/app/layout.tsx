import React from 'react';
// File: frontend/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import 'leaflet/dist/leaflet.css';
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Guardian Command Center",
  description: "Agentic Supply Chain Intelligence",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-slate-950 text-slate-200 min-h-screen`}>
        {/* GLOBAL HEADER: Renders Website Name and Logo everywhere */}
        <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg shadow-[0_0_15px_rgba(37,99,235,0.5)] flex items-center justify-center font-bold text-white">
                G
              </div>
              <h1 className="text-xl font-bold tracking-tight text-white uppercase">
                Agentic <span className="text-blue-500">Guardian</span>
              </h1>
            </div>
            <div className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.2em]">
              Autonomous Logistics v1.0
            </div>
          </div>
        </header>

        {/* This is where (auth) or (main) content is injected */}
        {children}
      </body>
    </html>
  );
}
