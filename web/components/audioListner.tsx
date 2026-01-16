'use client';

import { useState, useRef } from 'react';

export default function Microphone({ roomId }: { roomId: string }) {
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksCountRef = useRef<number>(0);

    const startRecording = async () => {
        try {
            chunksCountRef.current = 0;
            // 1. Get Microphone Permission
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // 2. Setup Recorder with "Opus" codec (High quality, low bandwidth)
            // Note: Safari might need 'audio/mp4' instead, but most support webm now.
            const options = { mimeType: 'audio/webm;codecs=opus' };
            const recorder = new MediaRecorder(stream, options);
            mediaRecorderRef.current = recorder;

            // 3. THE MAGIC: Handle the "Slice"
            // This runs every time the timeslice interval (set below) finishes.
            recorder.ondataavailable = async (event) => {
                if (event.data.size > 0) {
                    if (chunksCountRef.current === 0) {
                        await uploadHeader(event.data);
                    }
                    chunksCountRef.current++;

                    // Generate the exact timestamp for this fragment
                    const timestamp = Math.floor(Date.now() / 1000) * 1000;
                    await uploadFragment(event.data, timestamp);
                }
            };

            // 4. Start Recording with a 1000ms (1 second) slice
            // Change this to 200 for lower latency (but more requests)
            recorder.start(1000);
            setIsRecording(true);

        } catch (err) {
            console.error("Error accessing microphone:", err);
            alert("Could not access microphone. Please allow permissions.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            setIsRecording(false);
        }
    };

    const uploadHeader = async (blob: Blob) => {
        try {
            await fetch(`${process.env.NEXT_PUBLIC_WORKER_URL}/room/${roomId}?type=header`, {
                method: 'POST',
                body: blob,
            });
            console.log("Uploaded header");
        } catch (error) {
            console.error("Header upload failed", error);
        }
    };

    // 5. The Upload Logic
    const uploadFragment = async (blob: Blob, timestamp: number) => {
        try {
            await fetch(`${process.env.NEXT_PUBLIC_WORKER_URL}/room/${roomId}?ts=${timestamp}`, {
                method: 'POST',
                body: blob,
            });
            console.log(`Uploaded fragment: ${timestamp} (${blob.size} bytes)`);
        } catch (error) {
            console.error("Upload failed", error);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center gap-6">
            <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`
                relative group flex items-center justify-center w-32 h-32 rounded-full transition-all duration-300
                ${isRecording
                        ? "bg-white text-neutral-900 hover:scale-105 shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)]"
                        : "bg-red-500/10 text-red-500 ring-1 ring-red-500/50 hover:bg-red-500/20"
                    }
              `}
            >
                {isRecording ? (
                    // Mic Icon (Active/Unmuted)
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                        <line x1="12" x2="12" y1="19" y2="22" />
                        <line x1="8" x2="16" y1="22" y2="22" />
                    </svg>
                ) : (
                    // Mic Off Icon (Muted)
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="2" y1="2" x2="22" y2="22" />
                        <path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2" />
                        <path d="M5 10v2a7 7 0 0 0 12 5" />
                        <path d="M15 9.34V5a3 3 0 0 0-5.68-1.33" />
                        <path d="M9 9v3a3 3 0 0 0 5.12 2.12" />
                        <line x1="12" x2="12" y1="19" y2="22" />
                        <line x1="8" x2="16" y1="22" y2="22" />
                    </svg>
                )}

                <span className="absolute -bottom-10 text-sm font-medium tracking-wide text-neutral-400 group-hover:text-white transition-colors">
                    {isRecording ? "Mute" : "Unmute"}
                </span>
            </button>

            <div className="flex items-center gap-2 mt-4">
                <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                <p className="text-xs font-mono text-neutral-500">
                    {isRecording ? 'Broadcasting audio...' : 'Microphone off'}
                </p>
            </div>
        </div>
    );
}