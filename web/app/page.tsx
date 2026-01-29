"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from 'uuid';

export default function Home() {
  const router = useRouter();
  const [meetingId, setMeetingId] = useState("");
  const [username, setUsername] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('username') || "";
    }
    return "";
  });

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (meetingId.trim()) {
      console.log("Joining meeting:", meetingId);
      router.push(`/meeting/${meetingId}`);
    }
  };

  useEffect(() => {
    // Ensure userID exists in localStorage
    const userID = localStorage.getItem('userID');
    if (!userID) {
      localStorage.setItem('userID', uuidv4());
    }
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-neutral-950 p-4 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-4xl opacity-20 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500 rounded-full blur-[128px]" />
      </div>

      <div className="w-full max-w-md space-y-8 relative z-10">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Pulse
          </h1>
          <p className="text-neutral-400">
            Enter your details to join the meeting.
          </p>
        </div>

        <form onSubmit={handleJoin} className="mt-8 space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="sr-only">
                Your Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  localStorage.setItem('username', e.target.value);
                }}
                className="outline-none block w-full rounded-xl border-0 bg-neutral-900/50 py-4 px-4 text-white shadow-sm ring-1 ring-inset ring-neutral-800 placeholder:text-neutral-500 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm sm:leading-6 backdrop-blur-sm transition-all"
                placeholder="Enter your name"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="meeting-id" className="sr-only">
                Meeting ID
              </label>
              <input
                id="meeting-id"
                name="meetingId"
                type="number"
                required
                value={meetingId}
                onChange={(e) => setMeetingId(e.target.value)}
                className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none block w-full rounded-xl border-0 bg-neutral-900/50 py-4 px-4 text-white shadow-sm ring-1 ring-inset ring-neutral-800 placeholder:text-neutral-500 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm sm:leading-6 backdrop-blur-sm transition-all outline-none"
                placeholder="Enter meeting code"
              />
            </div>
          </div>

          <button
            type="submit"
            className="flex w-full justify-center rounded-xl bg-blue-600 px-3 py-4 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            Join Meeting
          </button>
        </form>

        <div className="text-center">
          <p className="text-xs text-neutral-500">
            Secure & Encrypted Connection
          </p>
        </div>
      </div>
    </main>
  );
}
