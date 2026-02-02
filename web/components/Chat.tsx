import { useState, useRef, useEffect } from "react";
import { User, createChatTextMessage, createChatImageMessage } from "@/modules/protocol";

export type ChatMessage = {
    senderId: string;
    senderName: string;
    subType: 'TEXT' | 'IMAGE';
    text?: string;
    image?: Uint8Array; // Raw bytes
    imageUrl?: string; // Blob URL for rendering
    timestamp: number;
    isSelf: boolean;
};

interface ChatProps {
    className?: string;
    messages: ChatMessage[];
    onSendMessage: (text: string) => void;
    onSendImage: (image: Uint8Array) => void;
}

export default function Chat({ className, messages, onSendMessage, onSendImage }: ChatProps) {
    const [inputValue, setInputValue] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputValue.trim()) {
            onSendMessage(inputValue.trim());
            setInputValue("");
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (evt) => {
                if (evt.target?.result instanceof ArrayBuffer) {
                    const uint8Array = new Uint8Array(evt.target.result);
                    onSendImage(uint8Array);
                }
            };
            reader.readAsArrayBuffer(file);
        }
        // Reset
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    return (
        <div className={`flex flex-col bg-neutral-900 border-l border-white/10 ${className}`}>
            {/* Header */}
            <div className="p-4 border-b border-white/10 font-semibold text-neutral-200">
                Chat
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {messages.length === 0 && (
                    <div className="text-center text-neutral-500 mt-10 text-sm">
                        No messages yet. Say hello!
                    </div>
                )}
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex flex-col ${msg.isSelf ? 'items-end' : 'items-start'}`}>
                        <div className="text-xs text-neutral-500 mb-1 px-1">
                            {msg.senderName} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className={`
                            max-w-[85%] rounded-2xl p-3 text-sm
                            ${msg.isSelf
                                ? 'bg-blue-600 text-white rounded-tr-none'
                                : 'bg-neutral-800 text-neutral-200 rounded-tl-none border border-white/5'}
                        `}>
                            {msg.subType === 'TEXT' && (
                                <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                            )}
                            {msg.subType === 'IMAGE' && msg.imageUrl && (
                                <img
                                    src={msg.imageUrl}
                                    alt="Shared image"
                                    className="rounded-lg max-w-full cursor-pointer hover:opacity-90 transition-opacity"
                                    onClick={() => window.open(msg.imageUrl, '_blank')}
                                />
                            )}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-4 border-t border-white/10 bg-neutral-900/50">
                <div className="flex gap-2 items-end bg-neutral-800 rounded-xl p-2 border border-white/5 focus-within:border-blue-500/50 transition-colors">
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 text-neutral-400 hover:text-white transition-colors"
                        title="Attach Image"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        accept="image/*"
                        className="hidden"
                    />

                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 outline-none bg-transparent border-none focus:ring-0 text-white placeholder-neutral-500 py-2 min-h-[40px] max-h-32 resize-none" // Using input for simplicity, could be textarea
                    />

                    <button
                        type="submit"
                        disabled={!inputValue.trim()}
                        className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                    </button>
                </div>
            </form>
        </div>
    );
}
