'use client';
import { useEffect, useRef, useState } from 'react';

export default function AudioHandler({ roomId, username = 'Guest' }: { roomId: string, username?: string }) {
    const socketRef = useRef<WebSocket | null>(null);
    const sourceBufferRef = useRef<SourceBuffer | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null); // Keep ref to stop it later

    // CRITICAL FIX 1: Use a Ref for mute state so the event listener sees the LIVE value
    const isMutedRef = useRef(true);

    const [isConnected, setIsConnected] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const [audioData, setAudioData] = useState<number[]>(new Array(5).fill(0));

    // Sync state with ref
    useEffect(() => {
        isMutedRef.current = isMuted;
    }, [isMuted]);

    useEffect(() => {
        const WS_HOST = process.env.NEXT_PUBLIC_API_URL || 'ws://localhost:8788';
        // Use wss:// if on https (production safety)
        const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
        const wsUrl = `${WS_HOST.replace('http', 'ws')}/room/${roomId}`;

        const socket = new WebSocket(wsUrl);
        socketRef.current = socket;

        socket.onopen = () => setIsConnected(true);
        socket.onclose = () => setIsConnected(false);

        // Initialize MediaSource for PLAYBACK
        const mediaSource = new MediaSource();
        if (audioRef.current) {
            audioRef.current.src = URL.createObjectURL(mediaSource);
        }

        mediaSource.addEventListener("sourceopen", () => {
            // CRITICAL FIX 2: Use the correct MimeType (WebM/Opus), not MP3
            const mimeType = 'audio/webm;codecs=opus';

            if (MediaSource.isTypeSupported(mimeType)) {
                const sourceBuffer = mediaSource.addSourceBuffer(mimeType);
                sourceBufferRef.current = sourceBuffer;
                sourceBuffer.mode = 'sequence';

                socket.onmessage = async (event) => {
                    try {
                        // Only play if buffer is ready
                        if (sourceBuffer.updating || mediaSource.readyState !== 'open') return;

                        const arrayBuffer = await event.data.arrayBuffer();
                        sourceBuffer.appendBuffer(arrayBuffer);
                    } catch (e) {
                        console.error("Playback error", e);
                    }
                };
            } else {
                console.error("Browser does not support audio/webm;codecs=opus");
            }
        });

        return () => {
            socket.close();
            if (mediaStreamRef.current) {
                mediaStreamRef.current.getTracks().forEach(track => track.stop());
            }
            if (audioContextRef.current) audioContextRef.current.close();
        };
    }, [roomId]);

    const stopMicrophone = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
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
            // We can suspend instead of close to reuse, or close and recreate.
            // Closing is safer to clear hardware indicator fully in some browsers.
            audioContextRef.current.close().catch(console.error);
            audioContextRef.current = null;
        }
    };

    const startMicrophone = async () => {
        try {
            // Unlock Audio Context (Browser Policy)
            if (audioRef.current?.paused) {
                await audioRef.current.play().catch(e => console.log("Autoplay prevented:", e));
            }

            if (!mediaStreamRef.current) {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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

                // Setup Recorder
                // CRITICAL FIX 3: Explicitly ask for Opus to match receiver
                const mimeType = 'audio/webm;codecs=opus';
                if (!MediaRecorder.isTypeSupported(mimeType)) {
                    console.error("Browser does not support audio/webm;codecs=opus");
                    alert("Your browser does not support the required audio format.");
                    return;
                }

                const mediaRecorder = new MediaRecorder(stream, { mimeType });
                mediaRecorderRef.current = mediaRecorder;

                mediaRecorder.ondataavailable = (event) => {
                    // Use ref to check current mute state immediately
                    if (event.data.size > 0 && socketRef.current?.readyState === WebSocket.OPEN && !isMutedRef.current) {
                        socketRef.current.send(event.data);
                    }
                };

                // Start recording with 100ms chunks
                mediaRecorder.start(100);
            }

            // Visualizer Loop
            const updateVisualizer = () => {
                if (isMutedRef.current) {
                    setAudioData(new Array(5).fill(0.1));
                    return; // Stop loop if muted to save CPU
                }

                if (analyserRef.current) {
                    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
                    analyserRef.current.getByteFrequencyData(dataArray);
                    const sampled = [dataArray[0], dataArray[2], dataArray[4], dataArray[6], dataArray[8]].map(v => v / 255);
                    setAudioData(sampled);
                    requestAnimationFrame(updateVisualizer);
                }
            };

            // Start the loop
            requestAnimationFrame(updateVisualizer);

        } catch (err) {
            console.error("Microphone error:", err);
            alert("Could not access microphone. Please ensure permissions are granted.");
            setIsMuted(true); // Revert UI to muted if failed
        }
    };

    const toggleMute = () => {
        if (isMuted) {
            // Unmuting: Start mic and update state
            setIsMuted(false);
            // We need to wait for state update in startMicrophone? 
            // Actually startMicrophone relies on mediaStreamRef, not state, so it's fine.
            // But verify isMutedRef sync.
            startMicrophone();
        } else {
            // Muting: Stop everything
            setIsMuted(true);
            stopMicrophone();
        }
    };

    return (
        <div className="bg-neutral-900/50 backdrop-blur-md border border-white/5 p-6 rounded-3xl flex flex-col items-center gap-6 w-full max-w-sm shadow-xl">
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