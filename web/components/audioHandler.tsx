'use client';
import { SidePanelMode } from '@/app/meeting/[mid]/page';
import { useState } from 'react';

interface AudioHandlerProps {
    isMuted: boolean;
    onToggleMute: () => void;
    isSharing: boolean;
    onStartScreenShare: () => void;
    onStopScreenShare: () => void;
    isConnected: boolean;
    sidePanelMode: SidePanelMode;
    onSetSidePanelMode: (mode: SidePanelMode) => void;
    showSidePanelControls: boolean;
    videoQuality: 'performance' | 'balance' | 'quality' | 'custom';
    onSetVideoQuality: (quality: 'performance' | 'balance' | 'quality' | 'custom') => void;
    customBitrate?: number;
    onSetCustomBitrate?: (bitrate: number) => void;
}

export default function AudioHandler({
    isMuted,
    onToggleMute,
    isSharing,
    onStartScreenShare,
    onStopScreenShare,
    isConnected,
    sidePanelMode,
    onSetSidePanelMode,
    showSidePanelControls,
    videoQuality,
    onSetVideoQuality,
    customBitrate,
    onSetCustomBitrate
}: AudioHandlerProps) {
    const [showSettings, setShowSettings] = useState(false);
    const [showQualityMenu, setShowQualityMenu] = useState(false);
    const [showCustomBitrateModal, setShowCustomBitrateModal] = useState(false);
    const [tempBitrate, setTempBitrate] = useState<string>('');

    const handleCustomBitrateClick = () => {
        setTempBitrate((customBitrate || 3000000).toString());
        setShowCustomBitrateModal(true);
        setShowSettings(false); // Close main menu
    }

    const applyCustomBitrate = () => {
        const val = parseInt(tempBitrate, 10);
        if (!isNaN(val) && val > 0 && onSetCustomBitrate) {
            onSetCustomBitrate(val);
            onSetVideoQuality('custom');
        }
        setShowCustomBitrateModal(false);
    }

    // Close menu when clicking outside (conceptually, but simple toggle for now)

    return (
        <>
            {/* Custom Bitrate Modal */}
            {showCustomBitrateModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center">
                    <div className="bg-neutral-900 border border-white/10 rounded-2xl p-6 shadow-2xl w-80">
                        <h3 className="text-lg font-bold text-white mb-4">Pro Bitrate</h3>
                        <p className="text-xs text-neutral-400 mb-4">
                            Enter target bitrate in bits per second (bps).<br />
                            Example: 5000000 = 5 Mbps.
                        </p>
                        <input
                            type="number"
                            value={tempBitrate}
                            onChange={(e) => setTempBitrate(e.target.value)}
                            className="w-full bg-neutral-800 border-none rounded-lg px-4 py-2 text-white placeholder-neutral-500 focus:ring-2 focus:ring-blue-600 outline-none mb-6 font-mono"
                            placeholder="3000000"
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowCustomBitrateModal(false)}
                                className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white py-2 rounded-lg font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={applyCustomBitrate}
                                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg font-medium transition-colors"
                            >
                                Apply
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-neutral-900/80 backdrop-blur-xl border border-white/10 p-2 rounded-full flex items-center gap-4 shadow-2xl z-50">
                {/* Screen Share Button */}
                <button
                    onClick={isSharing ? onStopScreenShare : onStartScreenShare}
                    className={`group flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300 ${isSharing ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'}`}
                    title="Share Screen"
                >
                    {isSharing ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="9" x2="15" y2="15"></line><line x1="15" y1="9" x2="9" y2="15"></line></svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 3H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-3"></path><path d="M8 21h8"></path><path d="M12 17v4"></path><path d="M17 8l5-5"></path><path d="M17 3h5v5"></path></svg>
                    )}
                </button>

                {/* Mute Button */}
                <button
                    onClick={onToggleMute}
                    className={`group flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300 ${isMuted ? 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700' : 'bg-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.5)] hover:scale-105 active:scale-95'}`}
                >
                    {isMuted ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path><path d="M17 16.95A7 7 0 0 1 5 12v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
                    )}
                </button>

                {/* Settings Button */}
                <div className="relative">
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className={`group flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300 ${showSettings ? 'bg-neutral-700 text-white' : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'}`}
                        title="Settings"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="3"></circle>
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                        </svg>
                    </button>

                    {/* Settings Menu */}
                    {showSettings && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-60 bg-neutral-900 border border-white/10 rounded-2xl p-2 shadow-xl flex flex-col gap-1 overflow-visible z-50">
                            {/* Video Quality Item (Hover Group) */}
                            <div
                                className="relative"
                                onMouseEnter={() => setShowQualityMenu(true)}
                                onMouseLeave={() => setShowQualityMenu(false)}
                            >
                                <button className="flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm text-neutral-300 hover:bg-white/5 transition-colors">
                                    <div className="flex items-center gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 7l-7 5 7 5V7z"></path><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
                                        <span>Video Quality</span>
                                    </div>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                                </button>

                                {/* Nested Submenu */}
                                {showQualityMenu && (
                                    <div className="absolute left-full bottom-0 ml-2 w-48 bg-neutral-900 border border-white/10 rounded-xl p-2 shadow-2xl flex flex-col gap-1 z-50">
                                        {(['performance', 'balance', 'quality'] as const).map((option) => (
                                            <button
                                                key={option}
                                                onClick={() => {
                                                    onSetVideoQuality(option);
                                                    setShowSettings(false); // Close all
                                                }}
                                                className={`flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm transition-colors ${videoQuality === option ? 'bg-blue-600/20 text-blue-400' : 'text-neutral-300 hover:bg-white/5'}`}
                                            >
                                                <span className="capitalize">{option}</span>
                                                {videoQuality === option && (
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                                )}
                                            </button>
                                        ))}
                                        <div className="h-px bg-white/10 my-1"></div>
                                        <button
                                            onClick={handleCustomBitrateClick}
                                            className={`flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm transition-colors ${videoQuality === 'custom' ? 'bg-purple-600/20 text-purple-400' : 'text-neutral-300 hover:bg-white/5'}`}
                                        >
                                            <span className="capitalize">Custom</span>
                                            {videoQuality === 'custom' && (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Side Panel Toggles (Visible when sharing) */}
                {showSidePanelControls && (
                    <>
                        <div className="w-px h-8 bg-white/10 mx-1"></div>
                        <div className="flex bg-neutral-800/50 rounded-full p-1 border border-white/5">
                            <button
                                onClick={() => onSetSidePanelMode('users')}
                                className={`p-2 rounded-full transition-all ${sidePanelMode === 'users' ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-white'}`}
                                title="Users"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                            </button>
                            <button
                                onClick={() => onSetSidePanelMode('chat')}
                                className={`p-2 rounded-full transition-all ${sidePanelMode === 'chat' ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-white'}`}
                                title="Chat"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                            </button>
                        </div>
                    </>
                )}

                {/* Status & Info */}
                <div className="flex flex-col pr-4 pl-2">
                    <span className="text-xs font-semibold text-white">
                        {isMuted ? 'Muted' : 'Speaking'}
                    </span>
                    <div className="flex items-center gap-1.5">
                        <div className={`h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500'}`}></div>
                        <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">
                            {isConnected ? 'LIVE' : 'OFFLINE'}
                        </span>
                    </div>
                </div>
            </div>
        </>
    );
}