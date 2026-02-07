import { useState, useRef, useCallback, useEffect } from 'react';
import { createScreenShareMessage, createScreenShareStopMessage, createScreenShareStartMessage } from '@/modules/protocol';

export type VideoQuality = 'performance' | 'balance' | 'quality' | 'custom';

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
        setTimeout(() => {
            onData(createScreenShareStopMessage(userId));
        }, 100);
    }, [userId, onData]);

    const startScreenShare = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                },
                audio: false
            });

            streamRef.current = stream;
            setIsSharing(true);

            stream.getVideoTracks()[0].onended = () => {
                stopScreenShare();
            };

            console.log("Stream started", stream);

            // Codec selection
            const codecs = [
                'video/webm; codecs="vp9"',
                'video/webm; codecs="vp8"',
                'video/webm; codecs="avc1"', // H.264
                'video/webm' // Fallback
            ];

            let selectedMimeType = "";

            for (const codec of codecs) {
                if (MediaRecorder.isTypeSupported(codec)) {
                    selectedMimeType = codec;
                    break;
                }
            }

            if (!selectedMimeType) {
                console.warn("No supported codecs found in list, letting browser decide default");
            } else {
                console.log("Selected Screen Share Codec:", selectedMimeType);
            }


            const options = {
                mimeType: selectedMimeType,
            };

            const mediaRecorder = new MediaRecorder(stream, options);
            mediaRecorderRef.current = mediaRecorder;

            // Send START message with MimeType
            const usedMimeType = mediaRecorder.mimeType; // Browser might normalize it
            console.log("Actual Recorder MimeType:", usedMimeType);
            onData(createScreenShareStartMessage(userId, usedMimeType));

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    event.data.arrayBuffer().then(buffer => {
                        const message = createScreenShareMessage(userId, new Uint8Array(buffer));
                        onData(message);
                    });
                }
            };

            mediaRecorder.start(500);

        } catch (err) {
            console.error("Error starting screen share:", err);
            setIsSharing(false);
        }
    }, [userId, onData]);

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
