'use client';
import { useEffect, useRef, useState } from 'react';
import RecordRTC, { StereoAudioRecorder } from 'recordrtc';
import PCMPlayer from 'pcm-player';

type User = {
    name: string;
    id: number;
    isSpeaking: boolean;
}

export default function AudioHandler({ roomId, onUserListChange }: { roomId: string, onUserListChange?: (users: User[]) => void }) {
    const socketRef = useRef<WebSocket | null>(null);
    const playerRef = useRef<any>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const recorderRef = useRef<RecordRTC | null>(null);

    const isMutedRef = useRef(true);

    const [isConnected, setIsConnected] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const [audioData, setAudioData] = useState<number[]>(new Array(5).fill(0));

    useEffect(() => {
        isMutedRef.current = isMuted;
    }, [isMuted]);

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
            socket.send(JSON.stringify({ type: 'join', username: localStorage.getItem('username') || 'Guest' }));
        };
        socket.onclose = () => {
            setIsConnected(false);
            stopMicrophone();
        };

        const player = new PCMPlayer({
            inputCodec: 'Int16',
            channels: 1,
            sampleRate: 44100,
            flushTime: 200
        } as any);
        player.volume(1.0);
        playerRef.current = player;

        socket.onmessage = (event) => {

            const isBinary = typeof event.data !== "string";
            let isJson = false;
            if (!isBinary) {
                try {
                    JSON.parse(event.data as string);
                    isJson = true;
                } catch (e) {
                    isJson = false;
                }
            }

            if (isJson) {
                const data = JSON.parse(event.data as string);
                if (data.type === "userlist") {
                    const users = data.users.map((user: string) => {
                        return {
                            name: user,
                            id: Math.random() * 1000000000,
                            isSpeaking: false
                        };
                    });
                    console.log("User list updated:", users);
                    onUserListChange?.(users);
                }
                return;
            }

            try {
                player.feed(event.data);
            } catch (e) {
                console.error("Playback error", e);
            }
        };

        return () => {
            socket.close();
            if (mediaStreamRef.current) {
                mediaStreamRef.current.getTracks().forEach(track => track.stop());
            }
            if (audioContextRef.current) audioContextRef.current.close();
            if (recorderRef.current) {
                recorderRef.current.destroy();
                recorderRef.current = null;
            }
            if (playerRef.current) {
                playerRef.current.destroy && playerRef.current.destroy();
            }
        };
    }, [roomId]);

    const stopMicrophone = () => {
        if (recorderRef.current) {
            recorderRef.current.stopRecording(() => {
            });
            recorderRef.current.destroy();
            recorderRef.current = null;
        }
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => {
                track.stop();
            });
            mediaStreamRef.current = null;
        }
        if (analyserRef.current) {
            analyserRef.current.disconnect();
            analyserRef.current = null;
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close().catch(console.error);
            audioContextRef.current = null;
        }
    };

    const startMicrophone = async () => {
        try {
            if (!mediaStreamRef.current) {
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        sampleRate: 44100,
                        channelCount: 1,
                        echoCancellation: true,
                        noiseSuppression: true
                    }
                });
                mediaStreamRef.current = stream;

                // Setup Analysis
                const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
                const audioContext = new AudioContext();
                audioContextRef.current = audioContext;
                const source = audioContext.createMediaStreamSource(stream);
                const analyser = audioContext.createAnalyser();
                analyser.fftSize = 32;
                source.connect(analyser);
                analyserRef.current = analyser;

                // RecordRTC configuration
                const recorder = new RecordRTC(stream, {
                    type: 'audio',
                    recorderType: StereoAudioRecorder,
                    mimeType: 'audio/wav',
                    timeSlice: 50, // Frequent slices for low latency
                    desiredSampRate: 44100,
                    numberOfAudioChannels: 1,
                    ondataavailable: async (blob) => {
                        if (blob.size > 0 && socketRef.current?.readyState === WebSocket.OPEN && !isMutedRef.current) {
                            // Strip WAV header (44 bytes) for streaming PCM
                            // Note: StereoAudioRecorder with timeSlice usually sends a full WAV file each slice (header + data).
                            // We need to strip the 44-byte header to get raw Int16 PCM.
                            const buffer = await blob.arrayBuffer();
                            if (buffer.byteLength > 44) {
                                const pcmData = buffer.slice(44);
                                socketRef.current.send(pcmData);
                            }
                        }
                    }
                });

                recorder.startRecording();
                recorderRef.current = recorder;
            }

            // Visualizer Loop
            const updateVisualizer = () => {
                if (isMutedRef.current) {
                    setAudioData(new Array(5).fill(0.1));
                    return;
                }

                if (analyserRef.current) {
                    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
                    analyserRef.current.getByteFrequencyData(dataArray);
                    const sampled = [dataArray[0], dataArray[2], dataArray[4], dataArray[6], dataArray[8]].map(v => v / 255);
                    setAudioData(sampled);
                    requestAnimationFrame(updateVisualizer);
                }
            };

            requestAnimationFrame(updateVisualizer);

        } catch (err) {
            console.error("Microphone error:", err);
            alert("Could not access microphone. Please ensure permissions are granted.");
            setIsMuted(true);
        }
    };

    const toggleMute = () => {
        if (isMuted) {
            setIsMuted(false);
            startMicrophone();
        } else {
            setIsMuted(true);
            stopMicrophone();
        }
    };

    return (
        <div className="bg-neutral-900/50 backdrop-blur-md border border-white/5 p-6 rounded-3xl flex flex-col items-center gap-6 w-full max-w-sm shadow-xl">
            {/* Audio element no longer needed for sourcebuffer, but helpful to 'unlock' audio context sometimes. Kept for safety or removed. */}
            <audio ref={audioRef} hidden playsInline />

            {/* Status Indicator */}
            <div className="flex items-center gap-2 mb-2">
                <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`}></div>
                <span className="text-xs font-mono text-neutral-400 uppercase tracking-widest">
                    {isConnected ? 'Signal Active' : 'Disconnected'}
                </span>
            </div>

            {/* Visualizer Bars */}
            <div className="flex items-end justify-center gap-1 h-12 w-full">
                {audioData.map((height, i) => (
                    <div key={i} className={`w-2 rounded-full transition-all duration-75 ${isMuted ? 'bg-neutral-700' : 'bg-blue-500'}`} style={{ height: `${height * 100}%` }} />
                ))}
            </div>

            {/* Mute Button */}
            <button
                onClick={toggleMute}
                className={`relative group flex items-center justify-center w-16 h-16 rounded-full transition-all duration-300 ${isMuted ? 'bg-neutral-800 text-neutral-400' : 'bg-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.5)]'}`}
            >
                {isMuted ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path><path d="M17 16.95A7 7 0 0 1 5 12v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
                )}
            </button>

            <p className="text-xs text-neutral-500 font-mono">
                {!isConnected ? 'Connecting...' : (isMuted ? 'Microphone Off' : 'Transmitting Audio')}
            </p>
        </div>
    );
}