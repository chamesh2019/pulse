import { useState, useRef, useCallback, useEffect } from 'react';
import { createScreenShareMessage, createScreenShareStopMessage } from '@/modules/protocol';

interface UseScreenShareProps {
    userId: string;
    onData: (data: Uint8Array) => void;
}

export function useScreenShare({ userId, onData }: UseScreenShareProps) {
    const [isSharing, setIsSharing] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const stopScreenShare = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }

        setIsSharing(false);
        // Send stop signal
        onData(createScreenShareStopMessage(userId));
    }, [userId, onData]);

    const startScreenShare = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    frameRate: { max: 30 }
                },
                audio: false
            });

            streamRef.current = stream;
            setIsSharing(true);

            stream.getVideoTracks()[0].onended = () => {
                stopScreenShare();
            };

            console.log("Stream started", stream);

            const options = { mimeType: 'video/webm; codecs=vp8' };

            // Check support
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                console.warn(`${options.mimeType} is not supported, trying default`);
            }

            const mediaRecorder = new MediaRecorder(stream, MediaRecorder.isTypeSupported(options.mimeType) ? options : undefined);
            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    event.data.arrayBuffer().then(buffer => {
                        const message = createScreenShareMessage(userId, new Uint8Array(buffer));
                        onData(message);
                    });
                }
            };

            // Start recording with 100ms timeslice for low latency
            mediaRecorder.start(100);

        } catch (err) {
            console.error("Error starting screen share:", err);
            setIsSharing(false);
        }
    }, [userId, onData, stopScreenShare]);

    useEffect(() => {
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
            }
        };
    }, []);

    return {
        isSharing,
        startScreenShare,
        stopScreenShare
    };
}
