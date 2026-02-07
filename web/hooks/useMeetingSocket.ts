import { useEffect, useRef, useState, useCallback } from 'react';
import { createJoinMessage, parseMessage, User, ParsedMessage } from '@/modules/protocol';

interface UseMeetingSocketProps {
    roomId: string;
    userId: string;
    username: string;
    onUserListUpdate?: (users: User[]) => void;
    onAudioData?: (userId: string, data: Uint8Array) => void;
    onScreenData?: (userId: string, data: Uint8Array) => void;
    onScreenShareStart?: (userId: string, mimeType: string) => void;
    onChatData?: (message: ParsedMessage & { type: 'CHAT' }) => void;
}

export function useMeetingSocket({
    roomId,
    userId,
    username,
    hostKey,
    onUserListUpdate,
    onAudioData,
    onScreenData,
    onScreenShareStart,
    onChatData
}: UseMeetingSocketProps & { hostKey?: string | null }) {
    const socketRef = useRef<WebSocket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [connectionError, setConnectionError] = useState<{ code: number, reason: string } | null>(null);

    // Use refs for callbacks to avoid re-connecting when they change
    const onUserListUpdateRef = useRef(onUserListUpdate);
    const onAudioDataRef = useRef(onAudioData);
    const onScreenDataRef = useRef(onScreenData);
    const onScreenShareStartRef = useRef(onScreenShareStart);
    const onChatDataRef = useRef(onChatData);

    const hasConnectedRef = useRef(false);

    useEffect(() => {
        onUserListUpdateRef.current = onUserListUpdate;
        onAudioDataRef.current = onAudioData;
        onScreenDataRef.current = onScreenData;
        onScreenShareStartRef.current = onScreenShareStart;
        onChatDataRef.current = onChatData;
    }, [onUserListUpdate, onAudioData, onScreenData, onScreenShareStart, onChatData]);

    useEffect(() => {
        const WS_HOST = process.env.NEXT_PUBLIC_API_URL || 'ws://localhost:8787';
        let wsBase = WS_HOST;
        if (wsBase.startsWith('http')) {
            wsBase = wsBase.replace('http', 'ws');
        }

        let wsUrl = `${wsBase}/room/${roomId}`;
        if (hostKey) {
            wsUrl += `?key=${hostKey}`;
        }

        console.log("Connecting to:", wsUrl);
        hasConnectedRef.current = false;

        const socket = new WebSocket(wsUrl);
        socketRef.current = socket;
        socket.binaryType = 'arraybuffer';

        socket.onopen = () => {
            setIsConnected(true);
            setConnectionError(null);
            hasConnectedRef.current = true;
            const joinMessage = createJoinMessage(userId, username);
            socket.send(joinMessage);
        };

        socket.onclose = (event) => {
            setIsConnected(false);
            console.log("Socket closed", event.code, event.reason);
            if (event.code === 4004) {
                setConnectionError({ code: 4004, reason: 'Room not found or not started.' });
            } else if (event.code !== 1000 && hasConnectedRef.current) {
                // Only show 'Connection Lost' if we were ever connected.
                // If we never connected, it might be a network error or initial load glitch.
                setConnectionError({ code: event.code, reason: 'Connection lost.' });
            }
        };

        socket.onmessage = (event) => {
            const parsed = parseMessage(event.data);

            if (parsed.type === 'AUDIO') {
                if (parsed.userId !== userId && onAudioDataRef.current) {
                    onAudioDataRef.current(parsed.userId, parsed.buffer);
                }
            } else if (parsed.type === 'USER_LIST_UPDATE') {
                if (onUserListUpdateRef.current) {
                    onUserListUpdateRef.current(parsed.users);
                }
            } else if (parsed.type === 'SCREEN_SHARE') {
                if (parsed.userId !== userId && onScreenDataRef.current) {
                    onScreenDataRef.current(parsed.userId, parsed.buffer);
                }
            } else if (parsed.type === 'SCREEN_SHARE_STOP') {
                if (parsed.userId !== userId && onScreenDataRef.current) {
                    onScreenDataRef.current(parsed.userId, new Uint8Array(0));
                }
            } else if (parsed.type === 'SCREEN_SHARE_START') {
                if (parsed.userId !== userId && onScreenShareStartRef.current) {
                    onScreenShareStartRef.current(parsed.userId, parsed.mimeType);
                }
            } else if (parsed.type === 'CHAT') {
                if (onChatDataRef.current) {
                    onChatDataRef.current(parsed);
                }
            }
        };

        return () => {
            socket.close();
            socketRef.current = null;
        };
    }, [roomId, userId, username, hostKey]); // Added hostKey dependency

    const sendMessage = useCallback((data: Uint8Array) => {
        if (socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send(data);
        }
    }, []);

    return {
        isConnected,
        connectionError,
        sendMessage
    };
}
