'use client';
import { SidePanelMode } from '@/app/meeting/[mid]/page';

interface AudioHandlerProps {
    isMuted: boolean;
    onToggleMute: () => void;
    isSharing: boolean;
    onStartScreenShare: () => void;
    onStopScreenShare: () => void;
    isConnected: boolean;
    sidePanelMode: SidePanelMode;
    onSetSidePanelMode: (mode: SidePanelMode) => void;
    showSidePanelControls: boolean;
}

export default function AudioHandler({
    isMuted,
    onToggleMute,
    isSharing,
    onStartScreenShare,
    onStopScreenShare,
    isConnected,
    sidePanelMode,
    onSetSidePanelMode,
    showSidePanelControls
}: AudioHandlerProps) {

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-neutral-900/80 backdrop-blur-xl border border-white/10 p-2 rounded-full flex items-center gap-4 shadow-2xl z-50">
            {/* Screen Share Button */}
            <button
                onClick={isSharing ? onStopScreenShare : onStartScreenShare}
                className={`group flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300 ${isSharing ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'}`}
                title="Share Screen"
            >
                {isSharing ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="9" x2="15" y2="15"></line><line x1="15" y1="9" x2="9" y2="15"></line></svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 3H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-3"></path><path d="M8 21h8"></path><path d="M12 17v4"></path><path d="M17 8l5-5"></path><path d="M17 3h5v5"></path></svg>
                )}
            </button>

            {/* Mute Button */}
            <button
                onClick={onToggleMute}
                className={`group flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300 ${isMuted ? 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700' : 'bg-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.5)] hover:scale-105 active:scale-95'}`}
            >
                {isMuted ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path><path d="M17 16.95A7 7 0 0 1 5 12v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
                )}
            </button>

            {/* Side Panel Toggles (Visible when sharing) */}
            {showSidePanelControls && (
                <>
                    <div className="w-px h-8 bg-white/10 mx-1"></div>
                    <div className="flex bg-neutral-800/50 rounded-full p-1 border border-white/5">
                        <button
                            onClick={() => onSetSidePanelMode('users')}
                            className={`p-2 rounded-full transition-all ${sidePanelMode === 'users' ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-white'}`}
                            title="Users"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                        </button>
                        <button
                            onClick={() => onSetSidePanelMode('chat')}
                            className={`p-2 rounded-full transition-all ${sidePanelMode === 'chat' ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-white'}`}
                            title="Chat"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                        </button>
                    </div>
                </>
            )}

            {/* Status & Info */}
            <div className="flex flex-col pr-4 pl-2">
                <span className="text-xs font-semibold text-white">
                    {isMuted ? 'Muted' : 'Speaking'}
                </span>
                <div className="flex items-center gap-1.5">
                    <div className={`h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500'}`}></div>
                    <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">
                        {isConnected ? 'LIVE' : 'OFFLINE'}
                    </span>
                </div>
            </div>
        </div>
    );
}