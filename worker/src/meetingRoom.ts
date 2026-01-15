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

    fetch(request: Request): Response | Promise<Response> {
        return new Response("Hello, world!");
    }
}

