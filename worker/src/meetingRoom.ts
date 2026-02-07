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

    hostKey: string | null = null;

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

        const url = new URL(request.url);
        const key = url.searchParams.get("key");

        // Room Existence / Creation Logic
        if (this.sessions.size === 0) {
            // Room is empty.
            if (key) {
                // Key provided -> Create Room (Host)
                this.hostKey = key;
                console.log("Room created by host with key");
            } else {
                // No key -> Reject (Room doesn't exist)
                console.log("Rejecting guest join for empty room");
                // We can accept the WebSocket but immediately close it with a specific code.
                // Or we can return 404/403 HTTP response (but WebSocket clients might not handle non-101 well).
                // Best practice for strict WebSocket is accept then close.
                const { 0: client, 1: server } = new WebSocketPair();
                server.accept();
                server.close(4004, "Room not found");
                return new Response(null, { status: 101, webSocket: client });
            }
        }

        // If room exists (isActive), we allow connection. 
        // We *could* validate key again if provided, to mark them as "Host" in the user list,
        // but for now the requirement is just existence check.

        const { 0: client, 1: server } = new WebSocketPair();

        this.handleSession(server);

        return new Response(null, {
            status: 101,
            webSocket: client,
        });
    }

    screenShareInitSegment: Uint8Array | null = null;
    activeScreenShareUserId: string | null = null;
    activeScreenShareMimeType: string | null = null;

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

                if (this.activeScreenShareUserId) {
                    const encoder = new TextEncoder();
                    const senderIdBytes = encoder.encode(this.activeScreenShareUserId);

                    if (this.activeScreenShareMimeType) {
                        const mimeBytes = encoder.encode(this.activeScreenShareMimeType!);
                        const startMsg = new Uint8Array(USER_ID_LENGTH + STREAM_TYPE_LENGTH + mimeBytes.length);
                        startMsg.set(senderIdBytes);
                        startMsg[USER_ID_LENGTH] = STREAM_TYPES.SCREEN_SHARE_START;
                        startMsg.set(mimeBytes, USER_ID_LENGTH + STREAM_TYPE_LENGTH);
                        session.send(startMsg);
                    }

                    if (this.screenShareInitSegment) {
                        const initMsg = new Uint8Array(USER_ID_LENGTH + STREAM_TYPE_LENGTH + this.screenShareInitSegment.length);
                        initMsg.set(senderIdBytes);
                        initMsg[USER_ID_LENGTH] = STREAM_TYPES.SCREEN_SHARE; // Ensure correct type
                        initMsg.set(this.screenShareInitSegment, USER_ID_LENGTH + STREAM_TYPE_LENGTH);

                        console.log("Sending cached screen share init segment to new user");
                        session.send(initMsg);
                    }
                }

                this.broadcastUserList();
            } else if (streamType === STREAM_TYPES.SCREEN_SHARE) {
                if (this.activeScreenShareUserId !== userId) {
                    console.log("New screen share started by", userId);
                    this.activeScreenShareUserId = userId;
                    this.screenShareInitSegment = buffer;
                } else if (this.activeScreenShareUserId === userId && !this.screenShareInitSegment) {
                    this.screenShareInitSegment = buffer;
                }
            } else if (streamType === STREAM_TYPES.SCREEN_SHARE_START) {
                const mimeType = decoder.decode(buffer);
                console.log("Screen share started by", userId, "with mime", mimeType);
                this.activeScreenShareUserId = userId;
                this.activeScreenShareMimeType = mimeType;
                this.screenShareInitSegment = null;

            } else if (streamType === STREAM_TYPES.SCREEN_SHARE_STOP) {
                if (this.activeScreenShareUserId === userId) {
                    console.log("Screen share stopped by", userId);
                    this.activeScreenShareUserId = null;
                    this.activeScreenShareMimeType = null;
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
            const user = this.users.get(session);
            if (user && user.userID === this.activeScreenShareUserId) {
                console.log("Active sharer disconnected:", user.userID);
                this.activeScreenShareUserId = null;
                this.screenShareInitSegment = null;

                const encoder = new TextEncoder();
                const userIdBytes = encoder.encode(user.userID);
                const stopMsg = new Uint8Array(USER_ID_LENGTH + STREAM_TYPE_LENGTH);
                stopMsg.set(userIdBytes);
                stopMsg[USER_ID_LENGTH] = STREAM_TYPES.SCREEN_SHARE_STOP;

                this.sessions.forEach(ws => {
                    if (ws !== session && ws.readyState === WebSocket.OPEN) {
                        ws.send(stopMsg);
                    }
                });
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

