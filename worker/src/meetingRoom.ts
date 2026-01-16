import { DurableObject } from "cloudflare:workers";

export interface Env {
    MEETING_ROOM: DurableObjectNamespace;
}

export class MeetingRoom extends DurableObject {

    fragments: Map<string, Uint8Array>;
    lastActivity: number;

    constructor(ctx: DurableObjectState, env: Env) {
        super(ctx, env);
        this.fragments = new Map();
        this.lastActivity = Date.now();
    }

    async fetch(request: Request): Promise<Response> {
        if (request.method === "GET") {
            const url = new URL(request.url);
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
            const url = new URL(request.url);
            const timestamp = url.searchParams.get("ts");

            if (!timestamp) {
                return new Response("Missing timestamp", { status: 400 });
            }

            const chunk = await request.arrayBuffer();
            this.fragments.set(timestamp, new Uint8Array(chunk));
            this.lastActivity = Date.now();

            return new Response("OK", { status: 200 });
        }

        return new Response("Method not allowed", { status: 405 });
    }
}

