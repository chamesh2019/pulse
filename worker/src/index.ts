import { Env, MeetingRoom } from "./meetingRoom";

export default {
    async fetch(request: Request, env: Env): Promise<Response> {

        const url = new URL(request.url);
        const roomName = url.pathname.split("/").filter(Boolean).pop() || "default-room";

        console.log(url)
        const id = env.MEETING_ROOM.idFromName(roomName);
        const stub = env.MEETING_ROOM.get(id);

        return stub.fetch(request);
    }
}

export { MeetingRoom }