import { STREAM_TYPE_LENGTH, STREAM_TYPES, USER_ID_LENGTH } from '@/components/constants';

export type User = {
    name: string;
    id: string;
    isSpeaking: boolean;
};

export type ParsedMessage =
    | { type: 'AUDIO'; userId: string; buffer: Uint8Array }
    | { type: 'USER_LIST_UPDATE'; users: User[] }
    | { type: 'SCREEN_SHARE'; userId: string; buffer: Uint8Array }
    | { type: 'SCREEN_SHARE_STOP'; userId: string }
    | { type: 'SCREEN_SHARE_START'; userId: string; mimeType: string }
    | { type: 'UNKNOWN'; userId: string };

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function createJoinMessage(userId: string, username: string): Uint8Array {
    const userIdBytes = encoder.encode(userId);
    const usernameBytes = encoder.encode(username);

    // Packet: [UserId (36)] + [StreamType (1)] + [Username]
    const buffer = new Uint8Array(USER_ID_LENGTH + STREAM_TYPE_LENGTH + usernameBytes.length);
    let offset = 0;

    buffer.set(userIdBytes);
    offset += USER_ID_LENGTH;

    buffer[offset] = STREAM_TYPES.JOIN_REQUEST;
    offset += STREAM_TYPE_LENGTH;

    buffer.set(usernameBytes, offset);

    return buffer;
}

export function createAudioMessage(userId: string, pcmData: Uint8Array): Uint8Array {
    const userIdBytes = encoder.encode(userId);

    // Packet: [UserId (36)] + [StreamType (1)] + [PCM Data]
    const buffer = new Uint8Array(USER_ID_LENGTH + STREAM_TYPE_LENGTH + pcmData.byteLength);

    buffer.set(userIdBytes);
    buffer.set(new Uint8Array([STREAM_TYPES.AUDIO]), USER_ID_LENGTH);
    buffer.set(pcmData, USER_ID_LENGTH + STREAM_TYPE_LENGTH);

    return buffer;
}

export function createScreenShareMessage(userId: string, videoData: Uint8Array): Uint8Array {
    const userIdBytes = encoder.encode(userId);

    // Packet: [UserId (36)] + [StreamType (1)] + [Video Data]
    const buffer = new Uint8Array(USER_ID_LENGTH + STREAM_TYPE_LENGTH + videoData.byteLength);

    buffer.set(userIdBytes);
    buffer.set(new Uint8Array([STREAM_TYPES.SCREEN_SHARE]), USER_ID_LENGTH);
    buffer.set(videoData, USER_ID_LENGTH + STREAM_TYPE_LENGTH);

    return buffer;
}

export function createScreenShareStopMessage(userId: string): Uint8Array {
    const userIdBytes = encoder.encode(userId);

    // Packet: [UserId (36)] + [StreamType (1)]
    const buffer = new Uint8Array(USER_ID_LENGTH + STREAM_TYPE_LENGTH);

    buffer.set(userIdBytes);
    buffer.set(new Uint8Array([STREAM_TYPES.SCREEN_SHARE_STOP]), USER_ID_LENGTH);

    return buffer;
}

export function createScreenShareStartMessage(userId: string, mimeType: string): Uint8Array {
    const userIdBytes = encoder.encode(userId);
    const mimeBytes = encoder.encode(mimeType);

    // Packet: [UserId (36)] + [StreamType (1)] + [MimeType]
    const buffer = new Uint8Array(USER_ID_LENGTH + STREAM_TYPE_LENGTH + mimeBytes.length);

    buffer.set(userIdBytes);
    buffer.set(new Uint8Array([STREAM_TYPES.SCREEN_SHARE_START]), USER_ID_LENGTH);
    buffer.set(mimeBytes, USER_ID_LENGTH + STREAM_TYPE_LENGTH);

    return buffer;
}

export function parseMessage(data: ArrayBuffer): ParsedMessage {
    const bytes = new Uint8Array(data);
    const userIdBytes = bytes.slice(0, USER_ID_LENGTH);
    const streamType = bytes[USER_ID_LENGTH];
    const payload = bytes.slice(USER_ID_LENGTH + STREAM_TYPE_LENGTH);

    const userId = decoder.decode(userIdBytes);

    if (streamType === STREAM_TYPES.AUDIO) {
        return { type: 'AUDIO', userId, buffer: payload };
    } else if (streamType === STREAM_TYPES.USER_LIST_UPDATE) {
        const users = parseUserList(payload);
        return { type: 'USER_LIST_UPDATE', users };
    } else if (streamType === STREAM_TYPES.SCREEN_SHARE) {
        return { type: 'SCREEN_SHARE', userId, buffer: payload };
    } else if (streamType === STREAM_TYPES.SCREEN_SHARE_STOP) {
        return { type: 'SCREEN_SHARE_STOP', userId };
    } else if (streamType === STREAM_TYPES.SCREEN_SHARE_START) {
        const mimeType = decoder.decode(payload);
        return { type: 'SCREEN_SHARE_START', userId, mimeType };
    }

    return { type: 'UNKNOWN', userId };
}

function parseUserList(buffer: Uint8Array): User[] {
    let offset = 0;
    const userCount = buffer[offset];
    offset += 1;

    const users: User[] = [];

    for (let i = 0; i < userCount; i++) {
        const idBytes = buffer.slice(offset, offset + USER_ID_LENGTH);
        offset += USER_ID_LENGTH;
        const id = decoder.decode(idBytes);

        const nameLength = buffer[offset];
        offset += 1;

        const nameBytes = buffer.slice(offset, offset + nameLength);
        offset += nameLength;
        const name = decoder.decode(nameBytes);

        users.push({
            id,
            name,
            isSpeaking: false
        });
    }
    return users;
}
