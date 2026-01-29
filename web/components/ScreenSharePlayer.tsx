import { useEffect, useRef } from 'react';

export default function ScreenSharePlayer({ inputRef }: { inputRef: React.MutableRefObject<((data: Uint8Array) => void) | null> }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const mediaSourceRef = useRef<MediaSource | null>(null);
    const sourceBufferRef = useRef<SourceBuffer | null>(null);
    const queueRef = useRef<Uint8Array[]>([]);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        let mediaSource: MediaSource | null = new MediaSource();
        let objectUrl: string | null = URL.createObjectURL(mediaSource);
        let sourceBuffer: SourceBuffer | null = null;
        const isMounted = { current: true };

        mediaSourceRef.current = mediaSource;
        video.src = objectUrl;

        const onSourceOpen = () => {
            if (!isMounted.current || !mediaSource) return;

            const mime = 'video/webm; codecs="vp8"';
            if (MediaSource.isTypeSupported(mime)) {
                try {
                    // Check if sourceBuffer already exists to prevent duplicate addSourceBuffer
                    if (mediaSource.sourceBuffers.length > 0) return;

                    sourceBuffer = mediaSource.addSourceBuffer(mime);
                    sourceBufferRef.current = sourceBuffer;
                    sourceBuffer.mode = 'sequence';

                    sourceBuffer.addEventListener('updateend', () => {
                        processQueue();
                    });

                    console.log("SourceBuffer created successfully");
                } catch (e) {
                    console.error("Error creating SourceBuffer:", e);
                }
            } else {
                console.error("MIME type not supported:", mime);
            }
        };

        mediaSource.addEventListener('sourceopen', onSourceOpen);

        // Define the feed function
        inputRef.current = (data: Uint8Array) => {
            // console.log("Player received chunk", data.byteLength);
            queueRef.current.push(data);
            processQueue();
        };

        return () => {
            isMounted.current = false;

            // Clean up inputRef immediately to stop accepting new data
            inputRef.current = null;

            if (sourceBuffer) {
                try {
                    // Remove event listener
                    // Cannot remove anonymous function easily, but object is being destroyed.
                    // Actually, removing explicit listener is good practice.
                    // But we defined clean logic via closure.
                    sourceBuffer.abort();
                } catch { /* Silently ignore cleanup errors */ }
            }

            if (mediaSource) {
                mediaSource.removeEventListener('sourceopen', onSourceOpen);
                if (mediaSource.readyState === 'open') {
                    try {
                        mediaSource.endOfStream();
                    } catch { /* Silently ignore cleanup errors */ }
                }
            }

            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }

            mediaSourceRef.current = null;
            sourceBufferRef.current = null;
            sourceBuffer = null;
            mediaSource = null;
            objectUrl = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const processQueue = () => {
        const sb = sourceBufferRef.current;
        const ms = mediaSourceRef.current;

        if (!sb || !ms || ms.readyState !== 'open') return;

        if (!sb.updating && queueRef.current.length > 0) {
            const chunk = queueRef.current.shift();
            if (chunk) {
                try {
                    sb.appendBuffer(chunk.buffer as ArrayBuffer);
                } catch (e) {
                    console.error("Error appending buffer:", e);
                    // If error is "SourceBuffer removed", we should probably stop trying.
                }
            }
        }
    };

    return (
        <div className="w-full h-full flex items-center justify-center bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/10 relative group">
            <video
                ref={videoRef}
                className="w-full h-full object-contain"
                autoPlay
                playsInline
                controls={false} // Custom controls maybe?
            />
            <div className="absolute top-4 right-4 bg-red-600 px-3 py-1 rounded-full text-xs font-bold text-white uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
                Live Screen
            </div>
        </div>
    );
}
