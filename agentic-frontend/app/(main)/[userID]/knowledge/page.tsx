'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { UploadCloud, FileText, CheckCircle2, Loader2 } from 'lucide-react';

export default function SafetyGuidelinesPage() {
  const params = useParams();
  const userID = params.userID;
  const [targetFile, setTargetFile] = useState<File | null>(null);
  const [telemetryLogs, setTelemetryLogs] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [success, setSuccess] = useState(false);

  const AI_API = process.env.NEXT_PUBLIC_AI_SERVICE_URL || process.env.NEXT_PUBLIC_AI_API || 'http://localhost:8001';

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetFile) return;

    setIsUploading(true);
    setSuccess(false);
    setTelemetryLogs([`Initiating upload for "${targetFile.name}"...`]);

    const uploadPayload = new FormData();
    uploadPayload.append('file', targetFile);
    uploadPayload.append('userID', String(userID));

    try {
      setTelemetryLogs(prev => [...prev, `Uploading document to safety advisory database...`]);

      const response = await fetch(`${AI_API}/upload-kb`, {
        method: 'POST',
        body: uploadPayload,
      });

      const data = await response.json();

      if (response.ok) {
        setTelemetryLogs(prev => [
          ...prev,
          `Successfully processed and indexed ${data.chunks} rule sections.`,
          `All future shipments targeting this corridor will automatically check these rules.`
        ]);
        setSuccess(true);
      } else {
        setTelemetryLogs(prev => [...prev, `Upload failed: ${data.detail || 'Service rejected the document'}`]);
      }
    } catch (err) {
      setTelemetryLogs(prev => [...prev, `Connection error: Could not reach the safety analysis service.`]);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Safety & Route Guidelines</h1>
        <p className="text-slate-400 text-sm">
          Upload regional road condition briefs, highway advisories, or safety manuals to automatically screen active dispatches.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <form 
          onSubmit={handleUpload} 
          className="p-8 border border-slate-800 rounded-3xl bg-slate-900/40 backdrop-blur-xl flex flex-col justify-between space-y-6 shadow-xl"
        >
          <div className="border-2 border-dashed border-slate-700 hover:border-blue-500/50 rounded-2xl p-8 text-center transition-all cursor-pointer relative bg-slate-950/40">
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => {
                setTargetFile(e.target.files?.[0] || null);
                setSuccess(false);
              }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="flex flex-col items-center space-y-3">
              <UploadCloud className="text-blue-400" size={40} />
              <div>
                <p className="text-sm font-semibold text-white">
                  {targetFile ? targetFile.name : 'Choose a PDF document to upload'}
                </p>
                <p className="text-xs text-slate-500 mt-1">Accepts PDF guidelines and manuals up to 15MB</p>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isUploading || !targetFile}
            className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
          >
            {isUploading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>INDEXING SAFETY RULES...</span>
              </>
            ) : (
              <span>APPLY SAFETY GUIDELINES</span>
            )}
          </button>
        </form>

        <div className="p-6 border border-slate-800 rounded-3xl bg-slate-950 flex flex-col justify-between shadow-xl">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
              <FileText size={14} className="text-blue-400" /> Processing Log
            </h3>
            <div className="space-y-2 font-mono text-[11px] text-slate-300">
              {telemetryLogs.length === 0 ? (
                <p className="text-slate-600 italic">No document upload initiated yet.</p>
              ) : (
                telemetryLogs.map((log, index) => (
                  <p key={index} className="leading-relaxed">
                    &gt; {log}
                  </p>
                ))
              )}
            </div>
          </div>

          {success && (
            <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs flex items-center gap-2 font-medium">
              <CheckCircle2 size={16} />
              <span>Guidelines applied successfully to active shipments.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}