import { DurableObject } from "cloudflare:workers";
import { STREAM_TYPE_LENGTH, STREAM_TYPES, USER_ID_LENGTH } from "./constants";

export interface Env {
    MEETING_ROOM: DurableObjectNamespace;
}

export class MeetingRoom extends DurableObject {

    sessions: Set<WebSocket> = new Set();
    users: Map<WebSocket, { userID: string, username: string }> = new Map();

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

    screenShareInitSegment: Uint8Array | null = null;
    activeScreenShareUserId: string | null = null;

    handleSession(session: WebSocket) {
        session.accept();
        this.sessions.add(session);

        session.addEventListener("message", (event) => {
            const data = new Uint8Array(event.data as ArrayBuffer);

            const userIdBytes = data.slice(0, USER_ID_LENGTH);
            const streamType = data[USER_ID_LENGTH];
            const buffer = data.slice(USER_ID_LENGTH + STREAM_TYPE_LENGTH);

            const decoder = new TextDecoder();
            const userId = decoder.decode(userIdBytes);

            // console.log("Received message from", userId, "type", streamType);

            if (streamType === STREAM_TYPES.JOIN_REQUEST) {
                const username = decoder.decode(buffer);
                this.users.set(session, { userID: userId, username });

                console.log("User joined", userId, username);

                // If there is an active screen share, send the cached init segment to the new user
                if (this.activeScreenShareUserId && this.screenShareInitSegment) {
                    // We need to reconstruct the message with the original sender ID
                    const encoder = new TextEncoder();
                    const senderIdBytes = encoder.encode(this.activeScreenShareUserId);

                    const initMsg = new Uint8Array(USER_ID_LENGTH + STREAM_TYPE_LENGTH + this.screenShareInitSegment.length);
                    initMsg.set(senderIdBytes);
                    initMsg[USER_ID_LENGTH] = STREAM_TYPES.SCREEN_SHARE; // Ensure correct type
                    initMsg.set(this.screenShareInitSegment, USER_ID_LENGTH + STREAM_TYPE_LENGTH);

                    console.log("Sending cached screen share init segment to new user");
                    session.send(initMsg);
                }

                this.broadcastUserList();
            } else if (streamType === STREAM_TYPES.SCREEN_SHARE) {
                // If this is a new share (or restart), cache the first chunk (Init Segment)
                if (this.activeScreenShareUserId !== userId) {
                    console.log("New screen share started by", userId);
                    this.activeScreenShareUserId = userId;
                    this.screenShareInitSegment = buffer;
                    // Assume first chunk is init segment. 
                    // Ideally we check if it is, but MediaRecorder usually sends it first.
                } else if (this.activeScreenShareUserId === userId && !this.screenShareInitSegment) {
                    // Just in case it was null
                    this.screenShareInitSegment = buffer;
                }
            } else if (streamType === STREAM_TYPES.SCREEN_SHARE_STOP) {
                if (this.activeScreenShareUserId === userId) {
                    console.log("Screen share stopped by", userId);
                    this.activeScreenShareUserId = null;
                    this.screenShareInitSegment = null;
                }
            }

            this.sessions.forEach((ws) => {
                if (ws !== session) {
                    ws.send(event.data);
                }
            });
        });

        session.addEventListener("close", () => {
            // Handle if sharer leaves
            const user = this.users.get(session);
            if (user && user.userID === this.activeScreenShareUserId) {
                this.activeScreenShareUserId = null;
                this.screenShareInitSegment = null;
            }

            this.sessions.delete(session);
            this.users.delete(session);
            this.broadcastUserList();
        });
    }

    broadcastUserList() {
        const users = Array.from(this.users.values());
        const encoder = new TextEncoder();

        console.log("Broadcasting user list to", this.users.size, "users");

        let totalSize = USER_ID_LENGTH + STREAM_TYPE_LENGTH + 1;
        let userBuffers: { id: Uint8Array, nameBytes: Uint8Array }[] = [];

        for (const u of users) {
            userBuffers.push({
                id: encoder.encode(u.userID),
                nameBytes: encoder.encode(u.username)
            });
        }

        for (const u of userBuffers) {
            totalSize += USER_ID_LENGTH + 1 + u.nameBytes.length;
        }

        const response = new Uint8Array(totalSize);
        let offset = 0;

        const systemId = new Uint8Array(USER_ID_LENGTH);

        response.set(systemId, offset);
        offset += USER_ID_LENGTH;

        response[offset] = STREAM_TYPES.USER_LIST_UPDATE;
        offset += STREAM_TYPE_LENGTH;

        response[offset] = users.length;
        offset += 1;

        for (const u of users) {
            let idBytes: Uint8Array = encoder.encode(u.userID);

            response.set(idBytes, offset);
            offset += USER_ID_LENGTH;

            const nameBytes = encoder.encode(u.username);
            response[offset] = nameBytes.length;
            offset += 1;

            response.set(nameBytes, offset);
            offset += nameBytes.length;
        }

        this.sessions.forEach(ws => {
            ws.send(response);
        });
    }
}

