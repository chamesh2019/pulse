'use client';

import { useEffect, useRef, useState } from 'react';

export default function AudioPlayer({ roomId, username }: { roomId: string, username?: string }) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const mediaSourceRef = useRef<MediaSource | null>(null);
    const sourceBufferRef = useRef<SourceBuffer | null>(null);
    const [status, setStatus] = useState("Initializing...");

    // Configuration
    const CHUNK_DURATION = Number(process.env.NEXT_PUBLIC_CHUNK_LENGTH);
    const BUFFER_DELAY = Number(process.env.NEXT_PUBLIC_BUFFER_DELAY);

    useEffect(() => {
        if (!audioRef.current) return;

        const mediaSource = new MediaSource();
        mediaSourceRef.current = mediaSource;
        audioRef.current.src = URL.createObjectURL(mediaSource);

        let intervalId: NodeJS.Timeout;

        const handleSourceOpen = async () => {
            // Must match the Recorder's MimeType exactly!
            const mimeType = 'audio/webm; codecs=opus';

            if (!MediaSource.isTypeSupported(mimeType)) {
                setStatus("Error: Browser doesn't support this audio format");
                return;
            }

            try {
                const sourceBuffer = mediaSource.addSourceBuffer(mimeType);
                sourceBufferRef.current = sourceBuffer;
                sourceBuffer.mode = 'sequence';

                setStatus("Connecting...");

                // 1. Fetch the Initialization Segment (Header)
                try {
                    const headerResponse = await fetch(`/worker/room/${roomId}?type=header`);
                    if (headerResponse.ok) {
                        const headerChunk = await headerResponse.arrayBuffer();
                        sourceBuffer.appendBuffer(headerChunk);
                        setStatus("Header received. Buffering...");

                        // Wait for header to be appended before starting stream
                        await new Promise<void>((resolve) => {
                            if (!sourceBuffer.updating) resolve();
                            sourceBuffer.addEventListener('updateend', () => resolve(), { once: true });
                        });
                    } else {
                        console.warn("Header not found, stream might fail if not started from beginning.");
                    }
                } catch (e) {
                    console.error("Failed to fetch header", e);
                }

                // 2. Sync with Server and Start Streaming
                let nextTimestamp = Date.now() - BUFFER_DELAY;

                try {
                    const syncResponse = await fetch(`/worker/room/${roomId}?type=sync`);
                    if (syncResponse.ok) {
                        const syncData = await syncResponse.json();
                        // If stream is active (ts > 0), use that. Else default to local time.
                        if (syncData.ts > 0) {
                            console.log("Synced with server. Latest TS:", syncData.ts);
                            // Start playing from a few seconds ago to ensure buffering
                            nextTimestamp = syncData.ts - BUFFER_DELAY;
                        }
                    }
                } catch (e) {
                    console.error("Sync failed, falling back to local time", e);
                }

                // Align to chunk duration
                nextTimestamp = Math.floor(nextTimestamp / CHUNK_DURATION) * CHUNK_DURATION;

                const fetchNextChunk = async () => {
                    if (mediaSource.readyState !== 'open') return;

                    try {
                        const response = await fetch(
                            `/worker/room/${roomId}?ts=${nextTimestamp}`
                        );

                        if (response.ok) {
                            const chunk = await response.arrayBuffer();

                            if (mediaSource.readyState === 'open' && sourceBuffer && !sourceBuffer.updating) {
                                try {
                                    sourceBuffer.appendBuffer(chunk);
                                    setStatus(`Playing: ${new Date(nextTimestamp).toLocaleTimeString()}`);
                                } catch (e) {
                                    console.error("Append Error", e);
                                }
                            }
                        }
                        // Increment timestamp regardless of success to keep up with live
                        nextTimestamp += CHUNK_DURATION;

                    } catch (err) {
                        console.error("Stream Error", err);
                        nextTimestamp += CHUNK_DURATION;
                    }
                };

                intervalId = setInterval(fetchNextChunk, CHUNK_DURATION);

            } catch (e) {
                console.error("SourceBuffer Error", e);
            }
        };

        mediaSource.addEventListener('sourceopen', handleSourceOpen);

        return () => {
            if (intervalId) clearInterval(intervalId);
            mediaSource.removeEventListener('sourceopen', handleSourceOpen);

            if (mediaSource.readyState === 'open') {
                try {
                    mediaSource.endOfStream();
                } catch (e) {
                    // Ignore
                }
            }
            if (audioRef.current) {
                audioRef.current.src = '';
                audioRef.current.load();
            }
        };
    }, [roomId]);

    return (
        <div className="w-full max-w-sm mx-auto bg-neutral-900/50 backdrop-blur-xl rounded-2xl border border-white/5 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <span className="absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-20 animate-ping"></span>
                        <div className="relative inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M2 10v3" />
                                <path d="M6 6v11" />
                                <path d="M10 3v18" />
                                <path d="M14 8v7" />
                                <path d="M18 5v13" />
                                <path d="M22 10v3" />
                            </svg>
                        </div>
                    </div>
                    <div>
                        <h3 className="text-white font-medium text-sm">Live Audio</h3>
                        <p className="text-xs text-neutral-400 font-mono">Channel: {roomId}</p>
                    </div>
                </div>

                <div className={`px-2 py-0.5 rounded text-[10px] font-medium border ${status.includes("Playing")
                    ? "bg-green-500/10 text-green-400 border-green-500/20"
                    : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                    }`}>
                    {status.includes("Playing") ? "LIVE" : "BUFFERING"}
                </div>
            </div>

            {/* Visualizer Placeholder */}
            <div className="h-16 flex items-center justify-center gap-1 mb-4 opacity-50">
                {[...Array(20)].map((_, i) => (
                    <div
                        key={i}
                        className="w-1 bg-gradient-to-t from-blue-500 to-purple-500 rounded-full animate-pulse"
                        style={{
                            height: `${Math.max(20, Math.random() * 100)}%`,
                            animationDelay: `${i * 0.1}s`,
                            animationDuration: '0.8s'
                        }}
                    />
                ))}
            </div>

            <div className="bg-neutral-950/50 rounded-lg p-3 border border-white/5">
                <p className="text-xs text-neutral-500 font-mono truncate">
                    status: {status}
                </p>
            </div>

            {/* Hidden audio element but controls available for debugging if needed (via inspect) */}
            <audio
                ref={audioRef}
                autoPlay
                className="hidden"
            />
        </div>
    );
}