import { useEffect, useRef } from "react";

type InputFn = (data: Uint8Array) => void;

const MIME = 'video/webm; codecs="vp8"';
const TARGET_LATENCY = 0.5; // Target buffer size in seconds
const MAX_SPEED = 1.5;
const MIN_SPEED = 0.8;

export default function ScreenSharePlayer({
    inputRef,
    mimeType = 'video/webm; codecs="vp8"'
}: {
    inputRef: React.MutableRefObject<InputFn | null>;
    mimeType?: string;
}) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const mediaSourceRef = useRef<MediaSource | null>(null);
    const sourceBufferRef = useRef<SourceBuffer | null>(null);
    const queueRef = useRef<Uint8Array[]>([]);
    const isAppendingRef = useRef(false);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const mediaSource = new MediaSource();
        const objectUrl = URL.createObjectURL(mediaSource);
        mediaSourceRef.current = mediaSource;
        video.src = objectUrl;

        const onSourceOpen = () => {
            if (!MediaSource.isTypeSupported(mimeType)) {
                console.error("Unsupported MIME:", mimeType);
                return;
            }

            if (mediaSource.sourceBuffers.length > 0) return;

            const sb = mediaSource.addSourceBuffer(mimeType);
            sb.mode = "sequence";
            sourceBufferRef.current = sb;

            sb.addEventListener("updateend", appendNext);
            appendNext();
        };

        mediaSource.addEventListener("sourceopen", onSourceOpen);

        inputRef.current = (data: Uint8Array) => {
            queueRef.current.push(data);
            appendNext();
        };

        return () => {
            inputRef.current = null;

            const sb = sourceBufferRef.current;
            if (sb) {
                try {
                    sb.abort();
                } catch { }
            }

            if (mediaSource.readyState === "open") {
                try {
                    mediaSource.endOfStream();
                } catch { }
            }

            mediaSource.removeEventListener("sourceopen", onSourceOpen);
            URL.revokeObjectURL(objectUrl);

            sourceBufferRef.current = null;
            mediaSourceRef.current = null;
            queueRef.current.length = 0;
            queueRef.current.length = 0;
        };
    }, [mimeType]);

    /** Append loop with backpressure */
    const appendNext = () => {
        const sb = sourceBufferRef.current;
        const ms = mediaSourceRef.current;

        if (
            !sb ||
            !ms ||
            ms.readyState !== "open" ||
            sb.updating ||
            isAppendingRef.current ||
            queueRef.current.length === 0
        ) {
            adjustPlaybackSpeed();
            return;
        }

        const chunk = queueRef.current.shift();
        if (!chunk) return;

        try {
            isAppendingRef.current = true;
            sb.appendBuffer(chunk.slice().buffer);
        } catch (err) {
            console.error("appendBuffer failed:", err);
        } finally {
            isAppendingRef.current = false;
        }

        adjustPlaybackSpeed();
    };

    /** Dynamic latency-based speed control */
    const adjustPlaybackSpeed = () => {
        const video = videoRef.current;
        if (!video || video.buffered.length === 0) return;

        const bufferedEnd = video.buffered.end(video.buffered.length - 1);
        const latency = bufferedEnd - video.currentTime;

        let targetRate = 1.0;

        if (latency < TARGET_LATENCY / 2) {
            // Dangerously low buffer, slow down significantly
            targetRate = MIN_SPEED;
        } else if (latency < TARGET_LATENCY) {
            // Slightly low, minor slowdown
            targetRate = 0.95;
        } else if (latency > TARGET_LATENCY * 2) {
            // Too much latency, speed up
            // Proportional speed up: for every second over target, add 0.1x
            const extra = latency - (TARGET_LATENCY * 2);
            targetRate = Math.min(1.0 + 0.1 + (extra * 0.2), MAX_SPEED);
        }

        // Smooth rate change could be added here, but direct assignment is usually fine
        if (Math.abs(video.playbackRate - targetRate) > 0.05) {
            video.playbackRate = targetRate;
        }

        // Auto-play if stuck
        if (video.paused && latency > TARGET_LATENCY) {
            video.play().catch(() => { });
        }
    };

    return (
        <div className="w-full h-full flex items-center justify-center bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/10 relative group">
            <video
                ref={videoRef}
                className="w-full h-full object-contain"
                autoPlay
                playsInline
                muted
                controls={false}
            />
            <div className="absolute top-4 right-4 bg-red-600 px-3 py-1 rounded-full text-xs font-bold text-white uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
                Live Screen
            </div>
        </div>
    );
}
