# Pulse

A serverless video call/meeting platform built with Next.js and Cloudflare Workers, using Durable Objects for real-time audio streaming without a dedicated backend server.

## Overview

Pulse is a lightweight, scalable audio meeting platform that leverages Cloudflare's edge infrastructure to provide low-latency audio streaming. Instead of requiring traditional backend servers, it uses Cloudflare Workers and Durable Objects to coordinate audio streams between participants.

## Features

- 🎙️ **Real-time Audio Streaming** - Live audio broadcasting with minimal latency
- 🌐 **Serverless Architecture** - No dedicated backend required, powered by Cloudflare edge network
- 🔒 **Secure Connections** - Encrypted audio transmission
- 📱 **Responsive Design** - Works on desktop and mobile devices
- 🎯 **Simple Meeting Creation** - Join meetings with just a meeting ID
- 👥 **Multi-participant Support** - Host and viewer roles
- 🎨 **Modern UI** - Clean, intuitive interface built with Tailwind CSS

## Technology Stack

### Frontend (Web)
- **Next.js 16** - React framework with Edge Runtime support
- **React 19** - UI library
- **Tailwind CSS 4** - Utility-first CSS framework
- **TypeScript** - Type-safe development
- **MediaRecorder API** - Audio capture and encoding
- **MediaSource API** - Audio playback and streaming

### Backend (Worker)
- **Cloudflare Workers** - Serverless compute at the edge
- **Cloudflare Durable Objects** - Distributed state management
- **WebRTC** - Real-time audio encoding (Opus codec)
- **TypeScript** - Type-safe worker development

## Architecture

Pulse uses a unique serverless architecture:

1. **Cloudflare Workers** act as the entry point, routing requests to appropriate Durable Objects
2. **Durable Objects** maintain the state for each meeting room:
   - Store audio fragments with timestamps
   - Coordinate synchronization between participants
   - Handle initialization segments for proper audio decoding
3. **Web Frontend** handles:
   - Audio capture from microphone (host)
   - Audio playback (participants)
   - WebM/Opus encoding and decoding
   - Real-time synchronization with the server

### How It Works

1. **Host starts a meeting**:
   - Captures audio from microphone using MediaRecorder API
   - Encodes audio as WebM with Opus codec
   - Sends initialization segment (header) and audio chunks to Durable Object
   - Chunks are timestamped for synchronization

2. **Participants join**:
   - Fetch the initialization segment from Durable Object
   - Poll for new audio chunks at regular intervals
   - Use MediaSource API to decode and play audio in real-time
   - Automatically sync with the live stream

3. **Durable Object coordination**:
   - Stores audio fragments in memory with timestamps
   - Serves header and chunks to listeners
   - Tracks latest chunk timestamp for synchronization
   - Each meeting room gets a unique Durable Object instance

## Project Structure

```
pulse/
├── web/                    # Next.js frontend application
│   ├── app/
│   │   ├── page.tsx       # Home/join page
│   │   ├── host/          # Host meeting pages
│   │   │   └── [mid]/
│   │   │       └── page.tsx
│   │   └── meeting/       # Viewer meeting pages
│   │       └── [mid]/
│   │           └── page.tsx
│   ├── components/
│   │   ├── audioListner.tsx    # Microphone capture and recording component
│   │   └── audioPlayback.tsx   # Audio streaming playback component
│   └── package.json
└── worker/                 # Cloudflare Worker
    ├── src/
    │   ├── index.ts       # Worker entry point
    │   └── meetingRoom.ts # Durable Object implementation
    ├── wrangler.toml      # Cloudflare configuration
    └── package.json
```

## Setup and Installation

### Prerequisites

- Node.js 20 or higher
- npm or yarn
- Cloudflare account (for deployment)
- Wrangler CLI (for worker deployment)

### Local Development

1. **Clone the repository**:
   ```bash
   git clone https://github.com/chamesh2019/pulse.git
   cd pulse
   ```

2. **Install dependencies**:
   
   For the web frontend:
   ```bash
   cd web
   npm install
   ```
   
   For the worker:
   ```bash
   cd ../worker
   npm install
   ```

3. **Configure environment variables**:
   
   Create a `.env.local` file in the `web/` directory:
   ```env
   NEXT_PUBLIC_CHUNK_LENGTH=2000
   NEXT_PUBLIC_BUFFER_DELAY=6000
   ```

4. **Start the worker locally**:
   ```bash
   cd worker
   npm run dev
   ```
   This starts the Cloudflare Worker on `http://localhost:8787`

5. **Configure Next.js proxy** (if needed):
   
   Update `web/next.config.ts` to proxy `/worker/*` requests to your local worker.

6. **Start the web application**:
   ```bash
   cd web
   npm run dev
   ```
   Access the application at `http://localhost:3000`

## Deployment

### Deploy Cloudflare Worker

1. **Login to Cloudflare**:
   ```bash
   npx wrangler login
   ```

2. **Deploy the worker**:
   ```bash
   cd worker
   npm run deploy
   ```
   Note the deployed worker URL.

3. **Configure the worker binding**:
   - The worker is configured in `wrangler.toml`
   - Durable Object binding is named `MEETING_ROOM`

### Deploy Web Frontend

Deploy the Next.js application to your preferred platform:

**Vercel** (Recommended):
```bash
cd web
npx vercel --prod
```

**Cloudflare Pages**:
```bash
cd web
npm run build
npx wrangler pages deploy .next
```

**Other platforms**:
- Netlify
- AWS Amplify
- Any platform supporting Next.js

### Environment Configuration

Set the following environment variables in your deployment platform:
- `NEXT_PUBLIC_CHUNK_LENGTH`: Duration of each audio chunk in milliseconds (default: 2000)
- `NEXT_PUBLIC_BUFFER_DELAY`: Buffer delay for synchronization in milliseconds (default: 6000)
- Update API endpoints to point to your deployed Cloudflare Worker

## Usage

### Hosting a Meeting

1. Navigate to the home page
2. Enter your name and a meeting ID
3. Click "Join Meeting"
4. Navigate to `/host/{meeting-id}` to start as a host
5. Click the microphone button to start broadcasting
6. Share the meeting ID with participants

### Joining as a Participant

1. Navigate to the home page
2. Enter your name and the meeting ID
3. Click "Join Meeting"
4. Navigate to `/meeting/{meeting-id}` to join as a listener
5. Audio will start playing automatically once the host begins broadcasting

## Configuration

### Audio Settings

Adjust these settings in the environment variables:

- **NEXT_PUBLIC_CHUNK_LENGTH**: Controls how often audio chunks are sent to the server (default: 2000ms)
  - Lower values = lower latency but more network requests
  - Higher values = fewer requests but higher latency

- **NEXT_PUBLIC_BUFFER_DELAY**: How far behind the live stream listeners should be (default: 6000ms)
  - Provides buffer to handle network jitter
  - Adjust based on network conditions

### Codec Support

The application uses WebM container with Opus audio codec:
- Supported in Chrome, Firefox, Edge
- Safari may require different codec configuration

## Development

### Running Tests

```bash
cd web
npm run lint
```

### Building for Production

Frontend:
```bash
cd web
npm run build
```

Worker:
```bash
cd worker
npm run deploy
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the MIT License.

## Acknowledgments

- Built with [Cloudflare Workers](https://workers.cloudflare.com/)
- Powered by [Next.js](https://nextjs.org/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
