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
    onUserListUpdate,
    onAudioData,
    onScreenData,
    onScreenShareStart,
    onChatData
}: UseMeetingSocketProps) {
    const socketRef = useRef<WebSocket | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    // Use refs for callbacks to avoid re-connecting when they change
    const onUserListUpdateRef = useRef(onUserListUpdate);
    const onAudioDataRef = useRef(onAudioData);
    const onScreenDataRef = useRef(onScreenData);
    const onScreenShareStartRef = useRef(onScreenShareStart);
    const onChatDataRef = useRef(onChatData);

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

        const wsUrl = `${wsBase}/room/${roomId}`;
        console.log("Connecting to:", wsUrl);

        const socket = new WebSocket(wsUrl);
        socketRef.current = socket;
        socket.binaryType = 'arraybuffer';

        socket.onopen = () => {
            setIsConnected(true);
            const joinMessage = createJoinMessage(userId, username);
            socket.send(joinMessage);
        };

        socket.onclose = () => {
            setIsConnected(false);
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
    }, [roomId, userId, username]); // Removed callbacks from dependencies

    const sendMessage = useCallback((data: Uint8Array) => {
        if (socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send(data);
        }
    }, []);

    return {
        isConnected,
        sendMessage
    };
}
