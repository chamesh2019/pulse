"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import dynamic from 'next/dynamic';

const AudioHandler = dynamic(() => import('@/components/audioHandler'), { ssr: false });
const ScreenSharePlayer = dynamic(() => import('@/components/ScreenSharePlayer'), { ssr: false });

type User = {
    name: string;
    id: string;
    isSpeaking: boolean;
}

export default function MeetingViewer() {
    const { mid } = useParams();

    const [participants, setParticipants] = useState<User[]>([]);
    const [currentUserId] = useState<string>(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('userID') || "";
        }
        return "";
    });
    const [time, setTime] = useState<Date>(() => new Date());

    const [sharingUserId, setSharingUserId] = useState<string | null>(null);
    const screenShareInputRef = useRef<((data: Uint8Array) => void) | null>(null);

    const handleScreenData = useCallback((userId: string, data: Uint8Array) => {
        // If 0 length, it means stop
        if (data.byteLength === 0) {
            setSharingUserId(null);
            return;
        }

        if (sharingUserId !== userId) {
            setSharingUserId(userId);
        }

        // Pass data to player
        if (screenShareInputRef.current) {
            screenShareInputRef.current(data);
        }
    }, [sharingUserId]);

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <main className="h-screen bg-black text-white selection:bg-blue-500/30 flex flex-col overflow-hidden">
            {/* Header */}
            <header className="flex-none h-16 border-b border-white/10 flex justify-between items-center px-6 bg-neutral-900/30 backdrop-blur-md z-10">
                <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>
                    </div>
                    <div>
                        <h1 className="font-bold text-lg tracking-tight">Pulse</h1>
                        <div className="flex items-center gap-2 text-xs text-neutral-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                            <span>{participants.length} Online</span>
                            <span>•</span>
                            <span className="font-mono opacity-50">{mid}</span>
                        </div>
                    </div>
                </div>

                <div className="font-mono text-neutral-500 text-sm">
                    {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden relative">

                {/* Left Panel: Screen Share */}
                {sharingUserId && (
                    <div className="flex-1 bg-neutral-950 flex flex-col relative border-r border-white/10 p-4">
                        <div className="flex-1 relative rounded-2xl overflow-hidden border border-white/5 bg-black shadow-2xl">
                            <ScreenSharePlayer inputRef={screenShareInputRef} />

                            <div className="absolute top-4 left-4 bg-red-500/90 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-2 backdrop-blur-md shadow-lg">
                                <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                                {participants.find(p => p.id === sharingUserId)?.name || 'Unknown'}&apos;s Screen
                            </div>
                        </div>
                    </div>
                )}

                {/* Right Panel / Main View: User List */}
                <div className={`${sharingUserId ? 'w-80 flex-none bg-neutral-900/50' : 'flex-1'} overflow-y-auto transition-all duration-300 p-4 custom-scrollbar`}>
                    <div className={`${sharingUserId ? 'flex flex-col gap-2' : 'grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4'}`}>
                        {participants.map(p => (
                            <div
                                key={p.id}
                                className={`
                                    relative group transition-all duration-300
                                    ${sharingUserId
                                        ? 'flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10'
                                        : 'aspect-square rounded-3xl bg-neutral-900/50 border border-white/10 p-6 flex flex-col justify-between hover:bg-neutral-800'
                                    }
                                `}
                            >
                                {/* Avatar */}
                                <div className={`
                                    rounded-full flex items-center justify-center font-bold relative transition-all
                                    ${sharingUserId ? 'w-10 h-10 text-sm' : 'w-16 h-16 text-xl mb-4'}
                                    ${p.id === currentUserId ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)]' : 'bg-neutral-800 text-neutral-400'}
                                `}>
                                    {p.name.charAt(0)}
                                    {p.isSpeaking && (
                                        <div className="absolute inset-0 rounded-full border-2 border-green-500 animate-ping opacity-50"></div>
                                    )}
                                </div>

                                {/* User Info */}
                                <div className={`${sharingUserId ? 'flex-1 min-w-0' : 'text-center'}`}>
                                    <div className="flex items-center gap-2">
                                        <span className={`truncate font-medium ${p.id === currentUserId ? 'text-white' : 'text-neutral-300'}`}>
                                            {p.name} {p.id === currentUserId && '(You)'}
                                        </span>
                                    </div>
                                    {sharingUserId && (
                                        <div className="text-xs text-neutral-500 truncate">
                                            {p.isSpeaking ? 'Speaking...' : 'Listener'}
                                        </div>
                                    )}
                                </div>

                                {/* Speaking Visualizer (Grid Mode) */}
                                {!sharingUserId && p.isSpeaking && (
                                    <div className="flex justify-center gap-1 h-4 items-end mt-2">
                                        <span className="w-1 bg-green-500 rounded-full animate-[bounce_1s_infinite] h-full"></span>
                                        <span className="w-1 bg-green-500 rounded-full animate-[bounce_1.2s_infinite] h-2/3"></span>
                                        <span className="w-1 bg-green-500 rounded-full animate-[bounce_0.8s_infinite] h-3/4"></span>
                                    </div>
                                )}

                                {/* Speaking Indicator (List Mode) */}
                                {sharingUserId && p.isSpeaking && (
                                    <div className="flex gap-0.5 items-end h-3 w-4 justify-center">
                                        <span className="w-0.5 h-full bg-green-500 animate-pulse"></span>
                                        <span className="w-0.5 h-2/3 bg-green-500 animate-pulse"></span>
                                        <span className="w-0.5 h-full bg-green-500 animate-pulse"></span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <AudioHandler
                roomId={mid as string}
                onUserListChange={setParticipants}
                onScreenData={handleScreenData}
            />
        </main>
    );
}
