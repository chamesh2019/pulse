"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from 'uuid';
import Head from 'next/head';

// Utility to generate secure meeting ID
async function generateMeetingId() {
  const timestamp = Date.now().toString(36);
  const randomBytes = new Uint8Array(8);
  crypto.getRandomValues(randomBytes);
  const hashBuffer = await crypto.subtle.digest('SHA-256', randomBytes);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return `${timestamp}-${hashHex.substring(0, 6)}`.toUpperCase();
}

export default function Home() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'join' | 'host'>('join');

  // Join State
  const [joinMeetingId, setJoinMeetingId] = useState("");
  const [joinUsername, setJoinUsername] = useState("");
  const [joinPassword, setJoinPassword] = useState("");

  // Host State
  const [hostUsername, setHostUsername] = useState("");
  const [generatedId, setGeneratedId] = useState("");
  const [hostPassword, setHostPassword] = useState(""); // Optional future use

  // Init
  useEffect(() => {
    // Generate an ID immediately just in case they switch to Host
    generateMeetingId().then(setGeneratedId);

    if (typeof window !== 'undefined') {
      const storedName = localStorage.getItem('username');
      if (storedName) {
        setJoinUsername(storedName);
        setHostUsername(storedName);
      }

      if (!localStorage.getItem('userID')) {
        localStorage.setItem('userID', uuidv4());
      }
    }
  }, []);

  const handleJoin = (e: FormEvent) => {
    e.preventDefault();
    if (!joinMeetingId.trim() || !joinUsername.trim()) return;

    // Save username
    localStorage.setItem('username', joinUsername);

    console.log("Joining", joinMeetingId, "with password", joinPassword);
    router.push(`/meeting/${joinMeetingId}`);
  };

  const handleHost = (e: FormEvent) => {
    e.preventDefault();
    if (!hostUsername.trim()) return;

    localStorage.setItem('username', hostUsername);
    console.log("Hosting", generatedId);
    router.push(`/meeting/${generatedId}`);
  };

  return (
    <main className="h-screen w-full bg-black text-white overflow-hidden relative flex items-center justify-center selection:bg-blue-500/30">

      {/* --- Ambient Background --- */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] bg-blue-900/20 rounded-full blur-[120px] animate-pulse duration-10000" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] bg-purple-900/20 rounded-full blur-[120px] animate-pulse duration-7000" />
        <div className="absolute top-[40%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[40vw] h-[40vw] bg-emerald-900/10 rounded-full blur-[100px]" />
      </div>

      {/* --- Grid Pattern Overlay --- */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_70%)] pointer-events-none" />

      {/* --- Content Card --- */}
      <div className="relative z-10 w-full max-w-5xl h-[600px] flex rounded-3xl overflow-hidden border border-white/10 bg-neutral-900/40 backdrop-blur-xl shadow-2xl">

        {/* Left Side: Brand & Visuals */}
        <div className="hidden lg:flex flex-col justify-between w-5/12 p-12 bg-gradient-to-br from-blue-900/40 to-purple-900/40 border-r border-white/5 relative overflow-hidden group">
          {/* Hover glow effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>
              </div>
              <span className="text-2xl font-bold tracking-tight">Pulse</span>
            </div>
            <h2 className="text-4xl font-bold leading-tight bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">
              Seamless secure<br />collaboration.
            </h2>
            <p className="mt-4 text-neutral-400 text-sm leading-relaxed max-w-xs">
              Crystal clear audio, HD screen sharing, and end-to-end interactions for modern teams.
            </p>
          </div>

          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-4 text-sm text-neutral-300">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                Low Latency
              </span>
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                HD Quality
              </span>
            </div>
            <div className="text-xs text-neutral-500 font-mono">
              v0.1.0 • Built and Maintained by <a href="https://github.com/chamesh2019" target="_blank" rel="noopener noreferrer">Chames Dinuka</a>
            </div>
          </div>
        </div>

        {/* Right Side: Interaction Forms */}
        <div className="flex-1 flex flex-col p-8 lg:p-12 relative bg-neutral-900/20">
          {/* Tab Switcher */}
          <div className="flex items-center gap-1 p-1 bg-white/5 rounded-xl self-start mb-8">
            <button
              onClick={() => setActiveTab('join')}
              className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'join' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-neutral-400 hover:text-white hover:bg-white/5'}`}
            >
              Join Meeting
            </button>
            <button
              onClick={() => setActiveTab('host')}
              className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'host' ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/20' : 'text-neutral-400 hover:text-white hover:bg-white/5'}`}
            >
              Host Meeting
            </button>
          </div>

          {/* Forms */}
          <div className="flex-1 relative">

            {/* JOIN FORM */}
            <form
              onSubmit={handleJoin}
              className={`absolute inset-0 flex flex-col transition-all duration-300 transform ${activeTab === 'join' ? 'opacity-100 translate-x-0 pointer-events-auto' : 'opacity-0 -translate-x-8 pointer-events-none'}`}
            >
              <div className="space-y-5 flex-1">
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2 ml-1">Display Name</label>
                  <input
                    value={joinUsername}
                    onChange={(e) => setJoinUsername(e.target.value)}
                    className="w-full bg-neutral-950/50 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-neutral-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                    placeholder="Enter your name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2 ml-1">Meeting ID</label>
                  <input
                    value={joinMeetingId}
                    onChange={(e) => setJoinMeetingId(e.target.value.toUpperCase())}
                    className="w-full bg-neutral-950/50 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-neutral-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all font-mono"
                    placeholder="e.g. K0RX9A-7F2A"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2 ml-1">Password <span className="text-neutral-600 normal-case tracking-normal">(Optional)</span></label>
                  <input
                    type="password"
                    value={joinPassword}
                    onChange={(e) => setJoinPassword(e.target.value)}
                    className="w-full bg-neutral-950/50 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-neutral-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button className="w-full bg-white text-black font-bold text-base py-4 rounded-xl hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2 group mt-6">
                Join Room
                <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
              </button>
            </form>

            {/* HOST FORM */}
            <form
              onSubmit={handleHost}
              className={`absolute inset-0 flex flex-col transition-all duration-300 transform ${activeTab === 'host' ? 'opacity-100 translate-x-0 pointer-events-auto' : 'opacity-0 translate-x-8 pointer-events-none'}`}
            >
              <div className="space-y-6 flex-1">
                <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                  <label className="block text-xs font-semibold text-purple-400 uppercase tracking-wider mb-1">New Meeting ID</label>
                  <div className="font-mono text-xl text-white tracking-widest">{generatedId}</div>
                  <p className="text-xs text-neutral-500 mt-2">This secure ID has been auto-generated for your session.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2 ml-1">Host Name</label>
                  <input
                    value={hostUsername}
                    onChange={(e) => setHostUsername(e.target.value)}
                    className="w-full bg-neutral-950/50 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-neutral-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all"
                    placeholder="Enter your name"
                    required
                  />
                </div>
              </div>

              <button className="w-full bg-purple-600 text-white font-bold text-base py-4 rounded-xl hover:bg-purple-500 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-purple-900/20 mt-6">
                Create & Enter
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
              </button>
            </form>

          </div>
        </div>

      </div>
    </main>
  );
}
