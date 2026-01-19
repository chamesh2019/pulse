import { DurableObject } from "cloudflare:workers";

export interface Env {
    MEETING_ROOM: DurableObjectNamespace;
}

export class MeetingRoom extends DurableObject {

    sessions: Set<WebSocket> = new Set();

    constructor(ctx: DurableObjectState, env: Env) {
        super(ctx, env);
    }

    async fetch(request: Request): Promise<Response> {
        if (request.method === "OPTIONS") {
            return new Response(null, {
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type",
                }
            });
        }

        if (request.headers.get("Upgrade") !== "websocket") {
            return new Response("Method not allowed", { status: 405 });
        }

        const { 0: client, 1: server } = new WebSocketPair();

        this.handleSession(server);

        return new Response(null, {
            status: 101,
            webSocket: client,
        });
    }

    handleSession(session: WebSocket) {
        session.accept();
        this.sessions.add(session);

        session.addEventListener("message", (event) => {
            this.sessions.forEach((ws) => {
                if (ws !== session) {
                    ws.send(event.data);
                }
            });
        });

        session.addEventListener("close", () => {
            this.sessions.delete(session);
        });
    }
}

