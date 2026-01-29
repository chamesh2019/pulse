import { useEffect, useRef, useState, useCallback } from 'react';
import PCMPlayer from 'pcm-player';

export function useAudioController(onAudioData?: (data: Uint8Array) => void) {
    const [isMuted, setIsMuted] = useState(true);

    // Refs
    const audioContextRef = useRef<AudioContext | null>(null);
    const workletNodeRef = useRef<AudioWorkletNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const playerRef = useRef<InstanceType<typeof PCMPlayer> | null>(null);

    // To access current state in event listeners
    const isMutedRef = useRef(isMuted);
    useEffect(() => {
        isMutedRef.current = isMuted;
    }, [isMuted]);

    // Initialize Player
    useEffect(() => {
        // PCMPlayer types may not be complete, cast as needed
        const player = new PCMPlayer({
            inputCodec: 'Int16',
            channels: 1,
            sampleRate: 44100,
            flushTime: 50
        } as ConstructorParameters<typeof PCMPlayer>[0]);
        player.volume(1.0);
        playerRef.current = player;

        return () => {
            if (playerRef.current) {
                playerRef.current.destroy?.();
            }
        };
    }, []);

    const feedAudio = useCallback((buffer: ArrayBuffer) => {
        if (playerRef.current) {
            try {
                playerRef.current.feed(buffer);
            } catch (e) {
                console.error("Playback error", e);
            }
        }
    }, []);

    const stopMicrophone = useCallback(() => {
        if (workletNodeRef.current) {
            workletNodeRef.current.port.onmessage = null;
            workletNodeRef.current.disconnect();
            workletNodeRef.current = null;
        }
        if (sourceRef.current) {
            sourceRef.current.disconnect();
            sourceRef.current = null;
        }
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => {
                track.stop();
            });
            mediaStreamRef.current = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
    }, []);

    const startMicrophone = useCallback(async () => {
        try {
            if (mediaStreamRef.current) return;

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: 44100,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });

            if (isMutedRef.current) {
                console.log("Microphone started but user is muted. Stopping immediately.");
                stream.getTracks().forEach(track => track.stop());
                return;
            }

            mediaStreamRef.current = stream;

            // webkitAudioContext is for Safari compatibility
            const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            const audioContext = new AudioContextClass({ sampleRate: 44100 });
            audioContextRef.current = audioContext;

            await audioContext.audioWorklet.addModule('/audio-processor.js');

            const source = audioContext.createMediaStreamSource(stream);
            sourceRef.current = source;

            const workletNode = new AudioWorkletNode(audioContext, 'audio-processor', {
                processorOptions: {
                    bufferSize: 16384
                }
            });
            workletNodeRef.current = workletNode;

            workletNode.port.onmessage = (event) => {
                const pcmData = new Uint8Array(event.data);
                if (!isMutedRef.current && onAudioData) {
                    onAudioData(pcmData);
                }
            };

            source.connect(workletNode);
            workletNode.connect(audioContext.destination);

        } catch (err) {
            console.error("Microphone error:", err);
            alert("Could not access microphone.");
            setIsMuted(true);
        }
    }, [onAudioData]);

    const toggleMute = useCallback(() => {
        if (isMuted) {
            setIsMuted(false);
            startMicrophone();
        } else {
            setIsMuted(true);
            stopMicrophone();
        }
    }, [isMuted, startMicrophone, stopMicrophone]);

    useEffect(() => {
        return () => {
            stopMicrophone();
        };
    }, [stopMicrophone]);

    return {
        isMuted,
        toggleMute,
        feedAudio
    };
}
