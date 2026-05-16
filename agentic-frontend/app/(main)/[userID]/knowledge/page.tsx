// agentic-frontend/app/(main)/[userID]/knowledge/page.tsx
'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { UploadCloud, FileText, Cpu, Terminal } from 'lucide-react';

export default function KnowledgeIndexerTerminal() {
  const params = useParams();
  const userID = params.userID;
  const [targetFile, setTargetFile] = useState<File | null>(null);
  const [telemetryLogs, setTelemetryLogs] = useState<string>('');
  const [isCompiling, setIsCompiling] = useState(false);

  const BACKEND_AI_URL = "http://localhost:8001";

  const executeVectorIngestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetFile) return;

    setIsCompiling(true);
    setTelemetryLogs(`[CONNECTING]: Initiating multi-part buffer stream directly to AI service container...\n`);

    const uploadPayload = new FormData();
    uploadPayload.append('file', targetFile);
    uploadPayload.append('userID', String(userID)); // Bind this document partition strictly to this operator id

    try {
      const response = await fetch(`${BACKEND_AI_URL}/upload-kb`, {
        method: 'POST',
        body: uploadPayload,
      });
      const data = await response.json();

      if (response.ok) {
        setTelemetryLogs(prev => prev + `[SUCCESS]: Vector database isolation target locked: ${data.target_silo}\n[COMPILED]: Vectorized and committed ${data.chunks} custom semantic fragments to physical storage arrays.\n`);
      } else {
        setTelemetryLogs(prev => prev + `[REJECTED]: Compilation node server initialization failed: ${data.detail}\n`);
      }
    } catch (err) {
      setTelemetryLogs(prev => prev + `[CONNECTION REFUSED]: Could not resolve AI service container parameters bounds.\n`);
    } finally {
      setIsCompiling(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto font-mono text-xs text-slate-300 space-y-6">
      <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
        <Cpu className="text-blue-500 animate-pulse" size={24} />
        <div>
          <h1 className="text-base font-bold text-slate-100">GUARDIAN KNOWLEDGE INDEXER CORE</h1>
          <p className="text-slate-500 text-[11px]">Dynamic document vector isolation stack bound to User Segment ID: #{userID}.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <form onSubmit={executeVectorIngestion} className="md:col-span-2 space-y-4 bg-slate-900/40 p-6 border border-slate-800 rounded-xl">
          <div className="border-2 border-dashed border-slate-800 hover:border-blue-500/40 rounded-lg p-8 bg-slate-950 text-center relative transition-all">
            <input 
              type="file" 
              accept=".pdf" 
              onChange={(e) => setTargetFile(e.target.files?.[0] || null)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <FileText className="mx-auto text-slate-700 mb-2" size={32} />
            <span className="block font-bold text-slate-400">
              {targetFile ? targetFile.name : 'DRAG & DROP CUSTOM LOGISTICS SOP GUIDELINES (PDF)'}
            </span>
            <span className="block text-[10px] text-slate-600 mt-1">
              Dynamic operator uploads take precedence over default system baseline profiles
            </span>
          </div>

          <button
            type="submit"
            disabled={isCompiling || !targetFile}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-40 shadow-[0_0_15px_rgba(37,99,235,0.2)]"
          >
            {isCompiling ? 'COMPILING VECTOR CORRELATION INDICES...' : 'RE-INDEX OPERATOR PARAMETERS'}
          </button>
        </form>

        <div className="bg-black border border-slate-800 rounded-xl p-4 flex flex-col h-full min-h-50">
          <div className="text-slate-500 border-b border-slate-900 pb-2 mb-2 flex items-center gap-2">
            <Terminal size={12} className="text-emerald-500" /> System Processing Stream:
          </div>
          <div className="text-emerald-400 font-mono text-[11px] overflow-y-auto flex-1 whitespace-pre-wrap leading-relaxed">
            {telemetryLogs || "Awaiting incoming unstructured intelligence maps..."}
          </div>
        </div>
      </div>
    </div>
  );
}