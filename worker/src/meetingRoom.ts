import { DurableObject } from "cloudflare:workers";

export interface Env {
    MEETING_ROOM: DurableObjectNamespace;
}

export class MeetingRoom extends DurableObject {

    fragments: Map<string, Uint8Array>;
    header: Uint8Array | null;
    lastActivity: number;
    latestChunkTS: number;

    constructor(ctx: DurableObjectState, env: Env) {
        super(ctx, env);
        this.fragments = new Map();
        this.header = null;
        this.lastActivity = Date.now();
        this.latestChunkTS = 0;
    }

    async fetch(request: Request): Promise<Response> {
        const url = new URL(request.url);
        const type = url.searchParams.get("type");

        // Handle Header (Initialization Segment)
        if (type === "header") {
            if (request.method === "POST") {
                const data = await request.arrayBuffer();
                this.header = new Uint8Array(data);
                return new Response("Header stored", { status: 200 });
            }

            if (request.method === "GET") {
                if (!this.header) {
                    return new Response("Header not found", { status: 404 });
                }
                return new Response(this.header, {
                    headers: {
                        "Content-Type": "audio/webm",
                        "Cache-Control": "public, max-age=31536000, immutable",
                    }
                });
            }
        }

        // Handle Sync (Get latest timestamp)
        if (type === "sync") {
            return new Response(JSON.stringify({
                ts: this.latestChunkTS,
                serverTime: Date.now()
            }), {
                headers: { "Content-Type": "application/json" }
            });
        }

        if (request.method === "GET") {
            const timestamp = url.searchParams.get("ts");

            if (!timestamp) {
                return new Response("Missing timestamp", { status: 400 });
            }

            const chunk = this.fragments.get(timestamp);

            if (!chunk) {
                return new Response("Not found yet", { status: 404 });
            }

            return new Response(chunk, {
                headers: {
                    "Content-Type": "audio/webm",
                    "Cache-Control": "public, max-age=31536000, immutable",
                }
            });
        }

        if (request.method === "POST") {
            const timestamp = url.searchParams.get("ts");

            if (!timestamp) {
                return new Response("Missing timestamp", { status: 400 });
            }

            const chunk = await request.arrayBuffer();
            this.fragments.set(timestamp, new Uint8Array(chunk));
            this.lastActivity = Date.now();

            // Track the latest chunk info
            const tsVal = parseInt(timestamp);
            if (!isNaN(tsVal) && tsVal > this.latestChunkTS) {
                this.latestChunkTS = tsVal;
            }

            return new Response("OK", { status: 200 });
        }

        if (request.method === "OPTIONS") {
            return new Response(null, {
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type",
                }
            });
        }

        return new Response("Method not allowed", { status: 405 });
    }
}

