'use client';
import React, { useState, useEffect } from 'react';

export default function NeuralLoader() {
  const [text, setText] = useState("");
  const [visible, setVisible] = useState(true);
  const fullText = "AGENTIC GUARDIAN";

  useEffect(() => {
    let i = 0;
    const timer = setInterval(() => {
      setText(fullText.slice(0, i));
      i++;
      if (i > fullText.length) {
        clearInterval(timer);
        setTimeout(() => setVisible(false), 1000);
      }
    }, 100);
    return () => clearInterval(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-100 bg-slate-950 flex flex-col items-center justify-center">
      <div className="text-2xl font-black tracking-[0.5em] text-blue-500 animate-pulse">
        {text}<span className="animate-ping">_</span>
      </div>
    </div>
  );
}