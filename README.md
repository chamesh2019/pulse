# Pulse

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Next.js](https://img.shields.io/badge/Next.js-16.1.2-black)
![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38bdf8)

**Pulse** is a high-performance, serverless audio meeting platform. It leverages the global edge network of **Cloudflare Workers** and **Durable Objects** to deliver low-latency, real-time audio streaming without the need for traditional backend servers.

## 🚀 Features

- **🎙️ Ultra-Low Latency Audio**: Powered by WebRTC concepts and optimized WebSocket streams.
- **⚡ Serverless Architecture**: Runs entirely on Cloudflare's Edge, ensuring scalability and speed.
- **🔒 Secure & Private**: Ephemeral meeting rooms with no persistent audio storage.
- **🎨 Modern Aesthetic**: beautifully designed UI with Glassmorphism and Tailwind CSS 4.
- **🛠️ Tech Forward**: Built with the latest Next.js 16 and React 19.

## 🛠️ Technology Stack

### Frontend (Web)
- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Language**: TypeScript
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Audio Capture**: [RecordRTC](https://recordrtc.org/) (WAV/MediaStream)
- **Audio Playback**: [pcm-player](https://www.npmjs.com/package/pcm-player) (raw PCM data)
- **Communication**: WebSockets

### Backend (Worker)
- **Runtime**: [Cloudflare Workers](https://workers.cloudflare.com/)
- **State Management**: [Cloudflare Durable Objects](https://developers.cloudflare.com/durable-objects/)
- **Protocol**: WebSocket (Binary/ArrayBuffer transmission)

## 🏗️ Architecture

Pulse uses a unique architecture where the "server" is distributed effectively across Cloudflare's network:

1.  **Client (Host)** captures microphone input using `RecordRTC`.
2.  Audio is processed into raw PCM data (stripping WAV headers) and sent via WebSocket.
3.  **Cloudflare Worker** routes the request to a specific **Durable Object** instance based on the `roomId`.
4.  **Durable Object** acts as a broadcast relay, instantly forwarding audio chunks to all connected listeners in that room.
5.  **Client (Listener)** receives raw binary data and plays it immediately using `pcm-player`.

## 📂 Project Structure

```bash
pulse/
├── web/                      # Next.js Frontend
│   ├── app/
│   │   ├── meeting/[mid]/    # Listener Interface
│   │   └── page.tsx          # Landing/Join Page
│   ├── components/
│   │   └── audioHandler.tsx  # Core Audio Logic (Capture, Visualizer, WebSocket)
│   └── package.json
└── worker/                   # Cloudflare Worker Backend
    ├── src/
    │   ├── index.ts          # Worker Entry & Router
    │   └── meetingRoom.ts    # Durable Object Class (Room Logic)
    ├── wrangler.toml         # Cloudflare Config
    └── package.json
```

## ⚡ Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v20+)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) (`npm install -g wrangler`)
- Cloudflare Account

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/chamesh2019/pulse.git
    cd pulse
    ```

2.  **Setup Backend (Worker)**
    ```bash
    cd worker
    npm install
    
    # Start local development server
    npm run dev
    ```
    The worker will start at `http://localhost:8787`.

3.  **Setup Frontend (Web)**
    Open a new terminal:
    ```bash
    cd web
    npm install
    ```

4.  **Configure Environment**
    Create a `.env.local` file in the `web` directory:
    ```env
    NEXT_PUBLIC_API_URL=ws://localhost:8787
    ```

5.  **Start Frontend**
    ```bash
    npm run dev
    ```
    Visit `http://localhost:3000`.

## 🚀 Deployment

### Backend
Deploy your worker to Cloudflare:
```bash
cd worker
npx wrangler deploy
```

### Frontend
Deploy your Next.js app (Vercel, Cloudflare Pages, etc.). Ensure you update the `NEXT_PUBLIC_API_URL` environment variable in your production deployment to point to your deployed Worker URL (e.g., `wss://pulse-worker.yourname.workers.dev`).

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.
