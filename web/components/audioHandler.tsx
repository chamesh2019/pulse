'use client';
import { useRef, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { User, createAudioMessage } from '@/modules/protocol';
import { useAudioController } from '@/hooks/useAudioController';
import { useMeetingSocket } from '@/hooks/useMeetingSocket';
import { useScreenShare } from '@/hooks/useScreenShare';

export default function AudioHandler({ roomId, onUserListChange, onScreenData }: {
    roomId: string,
    onUserListChange?: (users: User[]) => void,
    onScreenData?: (userId: string, data: Uint8Array) => void
}) {
    // 1. User Identity
    const getUserId = () => {
        if (typeof window === 'undefined') return '';
        let id = localStorage.getItem('userID');
        if (!id) {
            id = uuidv4();
            localStorage.setItem('userID', id);
        }
        return id;
    };
    const userId = getUserId();
    const username = (typeof window !== 'undefined' ? localStorage.getItem('username') : 'Guest') || 'Guest';

    // 2. Audio Controller & Socket Wrapper
    const sendAudioRef = useRef<((data: Uint8Array) => void) | null>(null);
    const sendScreenRef = useRef<((data: Uint8Array) => void) | null>(null);

    const onAudioDataWrapper = useCallback((pcmData: Uint8Array) => {
        if (sendAudioRef.current) {
            sendAudioRef.current(createAudioMessage(userId, pcmData));
        }
    }, [userId]);

    const onScreenDataWrapper = useCallback((data: Uint8Array) => {
        if (sendScreenRef.current) {
            sendScreenRef.current(data); // Already formatted by hook
        } else {
            console.error("sendScreenRef is null! Cannot send screen data.");
        }
    }, []);

    const { isMuted, toggleMute, feedAudio } = useAudioController(onAudioDataWrapper);
    const { isSharing, startScreenShare, stopScreenShare } = useScreenShare({
        userId,
        onData: onScreenDataWrapper
    });

    // 3. Socket Connection
    const { isConnected, sendMessage } = useMeetingSocket({
        roomId,
        userId,
        username,
        onUserListUpdate: onUserListChange,
        onAudioData: (_senderId, buffer) => {
            feedAudio(buffer.buffer as ArrayBuffer);
        },
        onScreenData: onScreenData
    });

    // Update refs inside useEffect to avoid updating refs during render
    useEffect(() => {
        sendAudioRef.current = sendMessage;
        sendScreenRef.current = sendMessage;
    }, [sendMessage]);

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-neutral-900/80 backdrop-blur-xl border border-white/10 p-2 rounded-full flex items-center gap-4 shadow-2xl z-50">
            {/* Screen Share Button */}
            <button
                onClick={isSharing ? stopScreenShare : startScreenShare}
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
                onClick={toggleMute}
                className={`group flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300 ${isMuted ? 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700' : 'bg-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.5)] hover:scale-105 active:scale-95'}`}
            >
                {isMuted ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path><path d="M17 16.95A7 7 0 0 1 5 12v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
                )}
            </button>

            {/* Status & Info */}
            <div className="flex flex-col pr-4">
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