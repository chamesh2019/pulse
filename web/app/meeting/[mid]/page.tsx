"use client";

export const runtime = 'edge';

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import dynamic from 'next/dynamic';
import { v4 as uuidv4 } from 'uuid';
import { useMeetingSocket } from "@/hooks/useMeetingSocket";
import { useAudioController } from "@/hooks/useAudioController";
import { useScreenShare, VideoQuality } from "@/hooks/useScreenShare";
import { User, createAudioMessage, createScreenShareMessage, createScreenShareStopMessage, createScreenShareStartMessage, createChatTextMessage, createChatImageMessage, ParsedMessage } from "@/modules/protocol";
import Chat, { ChatMessage } from "@/components/Chat";
import { USER_ID_LENGTH, STREAM_TYPE_LENGTH, STREAM_TYPES } from '@/components/constants';

const AudioHandler = dynamic(() => import('@/components/audioHandler'), { ssr: false });
const ScreenSharePlayer = dynamic(() => import('@/components/ScreenSharePlayer'), { ssr: false });

export type SidePanelMode = 'users' | 'chat';

// Helper to get Blob URL for image
const getImageBlobUrl = (data: Uint8Array) => {
    const blob = new Blob([data as any], { type: 'image/png' });
    return URL.createObjectURL(blob);
};

export default function MeetingViewer() {
    const { mid } = useParams();
    const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const hostKey = searchParams?.get('key');

    // --- State ---
    const [participants, setParticipants] = useState<User[]>([]);
    const [currentUserId] = useState<string>(() => {
        if (typeof window !== 'undefined') {
            let id = localStorage.getItem('userID');
            if (!id) {
                id = uuidv4();
                localStorage.setItem('userID', id);
            }
            return id;
        }
        return "";
    });
    const [username] = useState<string>(() => (typeof window !== 'undefined' ? localStorage.getItem('username') : 'Guest') || 'Guest');
    const [time, setTime] = useState<Date>(() => new Date());

    const [sharingUserId, setSharingUserId] = useState<string | null>(null);
    const [screenShareMimeType, setScreenShareMimeType] = useState<string>('video/webm; codecs="vp8"'); // Default
    const screenShareInputRef = useRef<((data: Uint8Array) => void) | null>(null);

    // New Video Quality State
    const [videoQuality, setVideoQuality] = useState<VideoQuality>('balance');
    const [customBitrate, setCustomBitrate] = useState<number>(3000000);

    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [sidePanelMode, setSidePanelMode] = useState<SidePanelMode>('users');

    // --- Refs for sending data via Socket (hook return) ---
    const sendSocketMessageRef = useRef<((data: Uint8Array) => void) | null>(null);

    // --- Callbacks for Hooks ---

    // 1. Audio Data
    const onAudioDataWrapper = useCallback((pcmData: Uint8Array) => {
        if (sendSocketMessageRef.current) {
            sendSocketMessageRef.current(createAudioMessage(currentUserId, pcmData));
        }
    }, [currentUserId]);

    // 2. Screen Data
    const onScreenDataWrapper = useCallback((data: Uint8Array) => {
        if (sendSocketMessageRef.current) {
            sendSocketMessageRef.current(data); // Send to server

            // Parse locally to handle loopback correctly
            const streamType = data[USER_ID_LENGTH];
            const payload = data.slice(USER_ID_LENGTH + STREAM_TYPE_LENGTH);

            if (streamType === STREAM_TYPES.SCREEN_SHARE_START) {
                const textDecoder = new TextDecoder();
                const mimeType = textDecoder.decode(payload);
                console.log("[Page] Local Screen Share Started with Mime:", mimeType);
                setScreenShareMimeType(mimeType);
                setSharingUserId(currentUserId);
            } else if (streamType === STREAM_TYPES.SCREEN_SHARE) {
                if (screenShareInputRef.current) {
                    screenShareInputRef.current(payload);
                }
                setSharingUserId(current => current === currentUserId ? current : currentUserId);
            } else if (streamType === STREAM_TYPES.SCREEN_SHARE_STOP) {
                console.log("[Page] Local Screen Share Stopped");
                setSharingUserId(null);
            }
        }
    }, [currentUserId]);

    // 3. Socket Callbacks
    const handleUserListUpdate = useCallback((users: User[]) => {
        setParticipants(users);
    }, []);

    const handleScreenDataIncoming = useCallback((userId: string, data: Uint8Array) => {
        if (data.byteLength === 0) {
            setSharingUserId(null);
            return;
        }

        if (sharingUserId !== userId) {
            setSharingUserId(userId);
        }

        if (screenShareInputRef.current) {
            screenShareInputRef.current(data);
        }
    }, [sharingUserId]);

    const handleScreenShareStartIncoming = useCallback((userId: string, mimeType: string) => {
        console.log(`[Page] Screen Share Started by ${userId} with Mime: ${mimeType}`);
        setSharingUserId(userId);
        setScreenShareMimeType(mimeType);
        // Default to showing user list or chat? User didn't specify. Let's keep logic.
    }, []);

    const handleChatDataIncoming = useCallback((msg: ParsedMessage & { type: 'CHAT' }) => {
        setChatMessages(prev => {
            // Avoid duplicates if timestamp logic reused? Messages are ephemeral.
            const newMsg: ChatMessage = {
                senderId: msg.userId,
                senderName: participants.find(p => p.id === msg.userId)?.name || 'Unknown',
                subType: msg.subType,
                text: msg.subType === 'TEXT' ? msg.text : undefined,
                image: msg.subType === 'IMAGE' ? msg.image : undefined,
                imageUrl: msg.subType === 'IMAGE' ? getImageBlobUrl(msg.image) : undefined,
                timestamp: msg.timestamp,
                isSelf: msg.userId === currentUserId
            };
            return [...prev, newMsg];
        });
    }, [currentUserId, participants]);

    // --- Hooks ---

    const { feedAudio, isMuted, toggleMute } = useAudioController(onAudioDataWrapper);

    const { isSharing, startScreenShare, stopScreenShare } = useScreenShare({
        userId: currentUserId,
        onData: onScreenDataWrapper,
    });

    const { sendMessage, isConnected, connectionError } = useMeetingSocket({
        roomId: mid as string,
        userId: currentUserId,
        username,
        hostKey: hostKey,
        onUserListUpdate: handleUserListUpdate,
        onAudioData: (_senderId, buffer) => feedAudio(buffer.buffer as ArrayBuffer),
        onScreenData: handleScreenDataIncoming,
        onScreenShareStart: handleScreenShareStartIncoming,
        onChatData: handleChatDataIncoming
    });

    // Update ref
    useEffect(() => {
        sendSocketMessageRef.current = sendMessage;
    }, [sendMessage]);

    // Clock
    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // --- Handlers ---
    const handleSendMessage = (text: string) => {
        if (sendSocketMessageRef.current) {
            const msg = createChatTextMessage(currentUserId, text);
            sendSocketMessageRef.current(msg);
            // Optimistic update
            const newMsg: ChatMessage = {
                senderId: currentUserId,
                senderName: 'You',
                subType: 'TEXT',
                text: text,
                timestamp: Date.now(),
                isSelf: true
            };
            setChatMessages(prev => [...prev, newMsg]);
        }
    };

    const handleSendImage = (image: Uint8Array) => {
        if (sendSocketMessageRef.current) {
            const msg = createChatImageMessage(currentUserId, image);
            sendSocketMessageRef.current(msg);
            // Optimistic update
            const newMsg: ChatMessage = {
                senderId: currentUserId,
                senderName: 'You',
                subType: 'IMAGE',
                image: image,
                imageUrl: getImageBlobUrl(image),
                timestamp: Date.now(),
                isSelf: true
            };
            setChatMessages(prev => [...prev, newMsg]);
        }
    }


    // --- Render Logic ---

    // Layout Logic:
    // 1. Not Sharing: Main = User Grid. Sidebar = Chat (Always).
    // 2. Sharing: Main = Screen. Sidebar = (User List OR Chat) based on sidePanelMode.

    return (
        <main className="h-screen bg-black text-white selection:bg-blue-500/30 flex flex-col overflow-hidden relative">

            {/* Connection Error Overlay */}
            {connectionError && (
                <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
                    <div className="max-w-md w-full bg-neutral-900 border border-white/10 p-8 rounded-3xl shadow-2xl">
                        <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                        </div>
                        <h2 className="text-2xl font-bold mb-2">
                            {connectionError.code === 4004 ? "Meeting Not Found" : "Connection Lost"}
                        </h2>
                        <p className="text-neutral-400 mb-8">
                            {connectionError.code === 4004
                                ? "This meeting doesn't exist or hasn't been started yet. Please check the ID or ask the host to start the meeting."
                                : "You have been disconnected from the meeting server."
                            }
                        </p>

                        <div className="flex gap-4 justify-center">
                            <button
                                onClick={() => window.location.href = '/'}
                                className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 transition text-sm font-semibold"
                            >
                                Go Home
                            </button>
                            {connectionError.code !== 4004 && (
                                <button
                                    onClick={() => window.location.reload()}
                                    className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 transition text-sm font-semibold text-white shadow-lg shadow-blue-500/20"
                                >
                                    Reconnect
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <header className="flex-none h-16 border-b border-white/10 flex justify-between items-center px-6 bg-neutral-900/30 backdrop-blur-md z-10">
                <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>
                    </div>
                    <div>
                        <h1 className="font-bold text-lg tracking-tight">Pulse</h1>
                        <div className="flex items-center gap-2 text-xs text-neutral-400">
                            <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
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

            {/* Main Content Area */}
            <div className="flex-1 flex overflow-hidden relative">

                {/* Center / Main View */}
                {sharingUserId ? (
                    // Sharing Mode: Screen is Main
                    <div className="flex-1 bg-neutral-950 flex flex-col relative border-r border-white/10 p-4">
                        <div className="flex-1 relative rounded-2xl overflow-hidden border border-white/5 bg-black shadow-2xl">
                            <ScreenSharePlayer inputRef={screenShareInputRef} mimeType={screenShareMimeType} />

                            <div className="absolute top-4 left-4 bg-red-500/90 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-2 backdrop-blur-md shadow-lg">
                                <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                                {participants.find(p => p.id === sharingUserId)?.name || 'Unknown'}&apos;s Screen
                            </div>
                        </div>
                    </div>
                ) : (
                    // Not Sharing Mode: User Grid is Main
                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-neutral-900/50">
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {participants.map(p => (
                                <div
                                    key={p.id}
                                    className={`
                                        relative group transition-all duration-300
                                        aspect-square rounded-3xl bg-neutral-900/50 border border-white/10 p-6 flex flex-col justify-between hover:bg-neutral-800
                                    `}
                                >
                                    {/* Avatar */}
                                    <div className={`
                                        rounded-full flex items-center justify-center font-bold relative transition-all w-16 h-16 text-xl mb-4
                                        ${p.id === currentUserId ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)]' : 'bg-neutral-800 text-neutral-400'}
                                    `}>
                                        {p.name.charAt(0)}
                                        {p.isSpeaking && (
                                            <div className="absolute inset-0 rounded-full border-2 border-green-500 animate-ping opacity-50"></div>
                                        )}
                                    </div>

                                    {/* User Info */}
                                    <div className="text-center">
                                        <div className="flex items-center gap-2 justify-center">
                                            <span className={`truncate font-medium ${p.id === currentUserId ? 'text-white' : 'text-neutral-300'}`}>
                                                {p.name} {p.id === currentUserId && '(You)'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Speaking Visualizer */}
                                    {p.isSpeaking && (
                                        <div className="flex justify-center gap-1 h-4 items-end mt-2">
                                            <span className="w-1 bg-green-500 rounded-full animate-[bounce_1s_infinite] h-full"></span>
                                            <span className="w-1 bg-green-500 rounded-full animate-[bounce_1.2s_infinite] h-2/3"></span>
                                            <span className="w-1 bg-green-500 rounded-full animate-[bounce_0.8s_infinite] h-3/4"></span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}


                {/* Side Panel / Sidebar */}
                {/* 
                    If Sharing: Show Side Panel IF (something is selected? Or just standard sidebar?)
                    User said: "when someone is sharing the dock will get 2 icons to show chat and show userlist."
                    This implies Side Panel is dynamic. 
                    
                    If Not Sharing: "chat as that list" -> Main is Grid, Sidebar is Chat.
                */}

                <div className={`
                    bg-neutral-900 border-l border-white/10 flex flex-col transition-all duration-300
                    ${sharingUserId ? 'w-80' : 'w-96'} 
                `}>
                    {(!sharingUserId) ? (
                        // Not Sharing: Always Chat
                        <Chat
                            className="h-full"
                            messages={chatMessages}
                            onSendMessage={handleSendMessage}
                            onSendImage={handleSendImage}
                        />
                    ) : (
                        // Sharing: Toggled
                        sidePanelMode === 'chat' ? (
                            <Chat
                                className="h-full"
                                messages={chatMessages}
                                onSendMessage={handleSendMessage}
                                onSendImage={handleSendImage}
                            />
                        ) : (
                            // User List
                            <div className="flex flex-col h-full overflow-hidden">
                                <div className="p-4 border-b border-white/10 font-semibold text-neutral-200">
                                    Participants ({participants.length})
                                </div>
                                <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                                    {participants.map(p => (
                                        <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10">
                                            <div className={`
                                                w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs
                                                ${p.id === currentUserId ? 'bg-blue-600 text-white' : 'bg-neutral-800 text-neutral-400'}
                                           `}>
                                                {p.name.charAt(0)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-medium text-neutral-200 truncate">
                                                    {p.name} {p.id === currentUserId && '(You)'}
                                                </div>
                                                <div className="text-xs text-neutral-500">
                                                    {p.isSpeaking ? 'Speaking...' : 'Listener'}
                                                </div>
                                            </div>
                                            {p.isSpeaking && (
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
                        )
                    )}
                </div>

            </div>

            {/* Dock / Controls */}
            <AudioHandler
                isMuted={isMuted}
                onToggleMute={toggleMute}
                isSharing={isSharing}
                onStartScreenShare={startScreenShare}
                onStopScreenShare={stopScreenShare}
                isConnected={isConnected}
                sidePanelMode={sidePanelMode}
                onSetSidePanelMode={setSidePanelMode}
                showSidePanelControls={!!sharingUserId}
            />
        </main>
    );
}
