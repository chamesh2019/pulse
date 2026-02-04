import { useState, useRef, useCallback, useEffect } from 'react';
import { createScreenShareMessage, createScreenShareStopMessage, createScreenShareStartMessage } from '@/modules/protocol';

export type VideoQuality = 'performance' | 'balance' | 'quality' | 'custom';

interface UseScreenShareProps {
    userId: string;
    onData: (data: Uint8Array) => void;
    videoQuality?: VideoQuality;
    customBitrate?: number;
}

export function useScreenShare({ userId, onData, videoQuality = 'balance', customBitrate = 3000000 }: UseScreenShareProps) {
    const [isSharing, setIsSharing] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const VIDEO_QUALITY_OPTIONS = {
        performance: {
            videoBitsPerSecond: 500000,
            frameRate: 15,
        },
        balance: {
            videoBitsPerSecond: 1000000,
            frameRate: 24,
        },
        quality: {
            videoBitsPerSecond: 2500000,
            frameRate: 30,
        },
        custom: {
            videoBitsPerSecond: customBitrate,
            frameRate: 30,
        }
    }

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
            const qualityConfig = VIDEO_QUALITY_OPTIONS[videoQuality];

            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    frameRate: { max: qualityConfig.frameRate }
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

            console.log(`Starting Screen Share with Quality: ${videoQuality}`, qualityConfig);

            const options = {
                mimeType: selectedMimeType,
                videoBitsPerSecond: qualityConfig.videoBitsPerSecond,
                audioBitsPerSecond: 128000
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
    }, [userId, onData, stopScreenShare, videoQuality, customBitrate]);

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
