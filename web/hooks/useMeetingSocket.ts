import { useEffect, useRef, useState, useCallback } from 'react';
import { createJoinMessage, parseMessage, User } from '@/modules/protocol';

interface UseMeetingSocketProps {
    roomId: string;
    userId: string;
    username: string;
    onUserListUpdate?: (users: User[]) => void;
    onAudioData?: (userId: string, data: Uint8Array) => void;
    onScreenData?: (userId: string, data: Uint8Array) => void;
}

export function useMeetingSocket({
    roomId,
    userId,
    username,
    onUserListUpdate,
    onAudioData,
    onScreenData
}: UseMeetingSocketProps) {
    const socketRef = useRef<WebSocket | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    // Use refs for callbacks to avoid re-connecting when they change
    const onUserListUpdateRef = useRef(onUserListUpdate);
    const onAudioDataRef = useRef(onAudioData);
    const onScreenDataRef = useRef(onScreenData);

    useEffect(() => {
        onUserListUpdateRef.current = onUserListUpdate;
        onAudioDataRef.current = onAudioData;
        onScreenDataRef.current = onScreenData;
    }, [onUserListUpdate, onAudioData, onScreenData]);

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
                // We might want to handle stop specifically, or just let the player timeout/handle end?
                // For now, pass empty buffer or handle separately? 
                // Let's pass an empty buffer to signal stop if we want, or add onScreenStop callback.
                // Or just rely on the fact that no more data comes.
                // Actually, let's explicitly nullify if we receive stop?
                // For now, just ignore explicit stop here, rely on parent context if needed.
                // Wait, if we want to remove the player UI, we SHOULD signal stop.
                // Let's assume onScreenData handles it, OR we add a new callback.
                // Simplest: `onScreenData` with 0-length buffer = stop.
                if (parsed.userId !== userId && onScreenDataRef.current) {
                    onScreenDataRef.current(parsed.userId, new Uint8Array(0));
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
