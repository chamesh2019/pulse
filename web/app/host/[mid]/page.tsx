"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import AudioHandler from "@/components/audioListner";

export default function MeetingRoom() {
    const { mid } = useParams();
    const [isMuted, setIsMuted] = useState(false);

    // Mock participants for UI demonstration
    const [participants] = useState([
        { id: 1, name: "You (Host)", isSpeaking: true },
        { id: 2, name: "Alice Smith", isSpeaking: false },
        { id: 3, name: "Bob Jones", isSpeaking: false },
    ]);



    const toggleMute = () => setIsMuted(!isMuted);

    return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-neutral-950 p-4 relative overflow-hidden">
            {/* Background decoration - matching homepage */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-4xl opacity-20 pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500 rounded-full blur-[128px]" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500 rounded-full blur-[128px]" />
            </div>

            <div className="relative z-10 w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-6 h-[80vh]">

                {/* Main Controls Area */}
                <div className="md:col-span-2 flex flex-col items-center justify-center space-y-8 bg-neutral-900/30 backdrop-blur-xl rounded-3xl border border-white/5 p-8 shadow-2xl">

                    <div className="text-center space-y-2">
                        <div className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium mb-4">
                            <span className="relative flex h-2 w-2 mr-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                            </span>
                            Live Session
                        </div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">
                            Meeting Room
                        </h1>
                        <p className="text-neutral-500 font-mono text-sm">
                            ID: {mid}
                        </p>
                    </div>

                    <div className="flex items-center justify-center">
                        <AudioHandler roomId={mid as string} />
                    </div>
                </div>

                {/* Participants List */}
                <div className="md:col-span-1 bg-neutral-900/50 backdrop-blur-xl rounded-3xl border border-white/5 flex flex-col overflow-hidden">
                    <div className="p-6 border-b border-white/5 bg-white/5">
                        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500">
                                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </svg>
                            Participants
                            <span className="ml-auto text-xs font-mono bg-neutral-800 px-2 py-0.5 rounded text-neutral-400">
                                {participants.length}
                            </span>
                        </h2>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                        {participants.map((p) => (
                            <div key={p.id} className="group flex items-center justify-between p-3 rounded-xl bg-neutral-800/30 hover:bg-neutral-800/50 transition-colors border border-transparent hover:border-white/5">
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${p.id === 1 ? 'bg-blue-600 text-white' : 'bg-neutral-700 text-neutral-300'}`}>
                                        {p.name.charAt(0)}
                                    </div>
                                    <span className={`text-sm ${p.id === 1 ? 'font-medium text-white' : 'text-neutral-300'}`}>
                                        {p.name}
                                    </span>
                                </div>

                                {p.isSpeaking && (
                                    <div className="flex gap-0.5 items-end h-3">
                                        <span className="w-0.5 h-full bg-green-500 animate-[pulse_0.5s_ease-in-out_infinite]"></span>
                                        <span className="w-0.5 h-2/3 bg-green-500 animate-[pulse_0.7s_ease-in-out_infinite]"></span>
                                        <span className="w-0.5 h-full bg-green-500 animate-[pulse_0.6s_ease-in-out_infinite]"></span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </main>
    );
}
