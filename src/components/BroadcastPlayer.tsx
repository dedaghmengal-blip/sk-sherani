import React, { useState, useEffect, useRef } from 'react';
import { MatchState, MatchRecording } from '../types';
import LiveTicker from './LiveTicker';
import { Play, Tv, Video, Award, Film, Radio, Volume2, Shield, Maximize2, Minimize2, Sparkles, X } from 'lucide-react';

interface BroadcastPlayerProps {
  matchState: MatchState;
}

export default function BroadcastPlayer({ matchState }: BroadcastPlayerProps) {
  const [activeTab, setActiveTab] = useState<'stream' | 'recordings'>('stream');
  const [selectedPlayback, setSelectedPlayback] = useState<MatchRecording | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Synchronize fullscreen mode with browser native events
  useEffect(() => {
    const handleFsChange = () => {
      const isCurrentlyFs = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      setIsFullScreen(isCurrentlyFs);
    };

    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    document.addEventListener('mozfullscreenchange', handleFsChange);
    document.addEventListener('MSFullscreenChange', handleFsChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
      document.removeEventListener('mozfullscreenchange', handleFsChange);
      document.removeEventListener('MSFullscreenChange', handleFsChange);
    };
  }, []);

  const toggleFullScreen = async () => {
    if (!containerRef.current) return;

    try {
      if (!isFullScreen) {
        const elem = containerRef.current;
        if (elem.requestFullscreen) {
          await elem.requestFullscreen();
        } else if ((elem as any).webkitRequestFullscreen) {
          await (elem as any).webkitRequestFullscreen();
        } else if ((elem as any).msRequestFullscreen) {
          await (elem as any).msRequestFullscreen();
        } else {
          setIsFullScreen(true);
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        } else if ((document as any).msExitFullscreen) {
          await (document as any).msExitFullscreen();
        } else {
          setIsFullScreen(false);
        }
      }
    } catch (err) {
      console.warn("Fullscreen API failed, using virtual fullscreen toggle:", err);
      setIsFullScreen(!isFullScreen);
    }
  };

  // Auto-switch back to stream view if match goes live
  useEffect(() => {
    if (matchState.isLive) {
      setActiveTab('stream');
      setSelectedPlayback(null);
    }
  }, [matchState.isLive]);

  const selectRecording = (rec: MatchRecording) => {
    setSelectedPlayback(rec);
    setActiveTab('recordings');
  };

  return (
    <div className="bg-[#0a0a0a] border border-white/10 rounded-xl overflow-hidden font-sans" id="sk-broadcast-theater">
      {/* Viewer Screen Section Header */}
      <div className="bg-[#0c0c0c] p-4 border-b border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 font-sans">
        <div className="flex items-center gap-2.5">
          <div className="bg-red-650 bg-red-600/10 p-2 rounded text-red-500">
            <Tv className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h2 className="font-extrabold text-sm text-white tracking-tight uppercase flex items-center gap-1.5">
              SK LIVE SPECTATOR FEED
              {matchState.isLive && (
                <span className="bg-red-600 text-white font-mono font-bold text-[9px] px-2 py-0.5 rounded uppercase animate-pulse flex items-center gap-1 tracking-wider">
                  LIVE
                </span>
              )}
            </h2>
            <p className="text-[10px] text-white/40">Broadcasting match transmission and highlights</p>
          </div>
        </div>

        {/* Option toggles styled matching our template */}
        <div className="flex bg-black p-1 rounded border border-white/10 text-[11px] font-bold">
          <button
            onClick={() => {
              setActiveTab('stream');
              setSelectedPlayback(null);
            }}
            className={`px-3 py-1.5 rounded transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'stream' && !selectedPlayback
                ? 'bg-green-650 bg-green-600 text-white font-black'
                : 'text-white/40 hover:text-white'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            LIVE PITCH
          </button>
          
          <button
            onClick={() => {
              setActiveTab('recordings');
              if (matchState.recordings.length > 0 && !selectedPlayback) {
                setSelectedPlayback(matchState.recordings[0]);
              }
            }}
            className={`px-3 py-1.5 rounded transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'recordings' || selectedPlayback
                ? 'bg-green-655 bg-green-600 text-white font-black'
                : 'text-white/40 hover:text-white'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            REPLAY LIST ({matchState.recordings?.length || 0})
          </button>
        </div>
      </div>

      {/* Main Screen Viewport */}
      <div 
        ref={containerRef}
        className={`bg-black flex flex-col justify-between overflow-hidden group transition-all duration-300 ${
          isFullScreen 
            ? 'fixed inset-0 z-[9999] h-screen w-screen' 
            : 'relative w-full aspect-video'
        }`}
      >
        {/* Floating Universal Controls Overlay */}
        <div className="absolute top-3 right-3 z-30 flex items-center gap-2">
          {/* Status Badge */}
          {activeTab === 'stream' && (
            <div className="flex bg-black/80 backdrop-blur-md border border-white/10 font-bold font-mono text-[9px] text-white/95 px-2.5 py-1.5 rounded-lg shadow-lg uppercase tracking-wider items-center gap-1.5 select-none animate-in fade-in duration-300">
              <span className={`w-1.5 h-1.5 rounded-full ${matchState.isLive ? 'bg-red-500 animate-pulse' : 'bg-yellow-500'}`}></span>
              <span>
                {matchState.streamType === 'fb_stream' ? 'Facebook Stream' : 'Live Camera'}
              </span>
            </div>
          )}

          {/* Full Screen Toggle Button */}
          <button
            type="button"
            onClick={toggleFullScreen}
            className="bg-black/80 hover:bg-black/95 backdrop-blur-md text-white border border-white/15 p-1.5 sm:p-2 rounded-lg hover:border-white/30 transition shadow-xl active:scale-95 cursor-pointer flex items-center gap-1.5 select-none font-mono text-[9px] font-black uppercase tracking-wider"
          >
            {isFullScreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Exit Full</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span>Watch Fullscreen 📺</span>
              </>
            )}
          </button>
        </div>
        
        {/* VIEW 1: Recorded Matches Playback */}
        {selectedPlayback ? (
          <div className="absolute inset-0 flex flex-col bg-black">
            {/* Quick banner */}
            <div className="bg-[#0c0c0c] text-[10px] px-4 py-2 flex justify-between text-white/50 border-b border-white/10 z-10 font-mono">
              <span className="flex items-center gap-1 text-green-400 font-bold">
                <Film className="w-3.5 h-3.5 text-green-500" /> PLAYING BROADCAST HIGHLIGHT: {selectedPlayback.title}
              </span>
              <span>REPLAY TIME: {selectedPlayback.date}</span>
            </div>
 
            {/* Video or base64 renderer */}
            <div className="flex-1 w-full bg-black flex items-center justify-center relative">
              {selectedPlayback.videoUrl.startsWith('data:video/') ? (
                <video
                  src={selectedPlayback.videoUrl}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                />
              ) : (
                /* Fallback replay simulation */
                <div className="flex flex-col items-center justify-center p-6 text-center select-none text-white/30">
                  <Play className="w-12 h-12 text-white/20 animate-pulse mb-3" />
                  <p className="text-sm font-semibold text-white/70">Replaying Segment: {selectedPlayback.title}</p>
                  <p className="text-xs text-white/40 mt-1">Duration: {selectedPlayback.duration} • Venue: Quetta Arena</p>
                  <span className="text-[10px] bg-white/5 border border-white/10 text-green-400 font-mono mt-4 px-2.5 py-1 rounded">
                    Playing highlight reel from cache
                  </span>
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'stream' && matchState.streamType === 'fb_stream' ? (
          
          /* VIEW 4: Facebook Live Stream Video Embed */
          <div className="absolute inset-0 w-full h-full bg-black flex flex-col items-center justify-center">
            {matchState.fbStreamUrl ? (
              <div className="w-full h-full flex flex-col justify-between">
                <div className="flex-1 w-full relative">
                  <iframe
                    src={matchState.fbStreamUrl.trim().startsWith('<iframe') 
                      ? (matchState.fbStreamUrl.match(/src="([^"]+)"/)?.[1] || matchState.fbStreamUrl)
                      : matchState.fbStreamUrl.trim()
                    }
                    width="100%"
                    height="100%"
                    style={{ border: 'none', overflow: 'hidden', position: 'absolute', top: 0, left: 0 }}
                    scrolling="no"
                    frameBorder="0"
                    allowFullScreen={true}
                    allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                    className="w-full h-full"
                  ></iframe>
                </div>
                
                {/* Fallback watch button in case iframe is sandboxed */}
                <div className="bg-[#0b0b0b] p-2 border-t border-white/10 flex items-center justify-between px-3 text-[10px] select-none font-mono z-10 shrink-0">
                  <span className="text-blue-400 font-extrabold flex items-center gap-1.5 uppercase text-[9px]">
                    <span className="w-1.5.bg-blue-500 w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping"></span>
                    FB Live Video Stream Connected
                  </span>
                  
                  <a
                    href={matchState.fbStreamUrl.trim().startsWith('<iframe') 
                      ? (matchState.fbStreamUrl.match(/src="([^"]+)"/)?.[1] || "https://www.facebook.com")
                      : matchState.fbStreamUrl.trim()
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 font-bold rounded flex items-center gap-1 uppercase tracking-tight text-[9px]"
                  >
                    Watch on FB App 📲
                  </a>
                </div>
              </div>
            ) : (
              <div className="p-4 text-center">
                <p className="text-xs text-white/50">Facebook Live stream link has not been set yet by Admin.</p>
              </div>
            )}
          </div>
        ) : activeTab === 'stream' && matchState.isLive && matchState.currentFrame && matchState.streamType !== 'fb_stream' ? (
          
          /* VIEW 2: Active Camera Streaming from Admin Applet */
          <div className="absolute inset-0 w-full h-full bg-black flex items-center justify-center">
            <img
              src={matchState.currentFrame}
              alt="Live Match Stream"
              className="w-full h-full object-contain filter brightness-110"
              referrerPolicy="no-referrer"
            />
            
            {/* Live Camera Indicators Overlay */}
            <div className="absolute top-4 left-4 flex items-center gap-1.5 bg-red-600 font-bold font-mono text-[9px] text-white px-2.5 py-1 rounded shadow-md uppercase z-10 tracking-widest leading-none">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
              Live Feed
            </div>

            <div className="absolute bottom-16 left-4 bg-black/90 backdrop-blur-xl border border-white/10 p-2 rounded z-10 hidden sm:block font-mono">
              <p className="text-[9px] text-white/40 uppercase tracking-tight">Active Striker</p>
              <p className="text-xs text-white font-bold">{matchState.strikerName || 'Select Striker'}</p>
            </div>
          </div>
        ) : (
          
          /* VIEW 3: Stadium Scoreboard Graphic Fallback */
          <div className="absolute inset-0 bg-black flex flex-col justify-center items-center p-6 text-center z-0">
            {/* Subtle stadium texture gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-green-950/20 via-transparent to-transparent z-0 pointer-events-none"></div>
            
            <div className="z-10 max-w-sm w-full bg-[#0c0c0c]/90 border border-white/15 p-6 rounded relative shadow-2xl">
              <Award className="w-10 h-10 text-green-500 mx-auto mb-3 animate-pulse" />
              
              {!matchState.teamA?.isRegistered ? (
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider mb-2 font-mono">
                    Awaiting Stadium Init
                  </h3>
                  <p className="text-[11px] text-white/50 leading-normal max-w-xs mx-auto mb-4">
                    Assalamu alaykum! The live cricket transmission scoreboard is sleeping. Set up matches in the administrative scoring panel above.
                  </p>
                  <div className="inline-flex items-center gap-1.5 text-[9px] bg-black border border-white/10 px-3 py-1.5 rounded text-white/60 font-mono font-bold">
                    <Shield className="w-3.5 h-3.5 text-green-500" />
                    ADMIN: NAVEEDMENGAL970@GMAIL.COM
                  </div>
                </div>
              ) : (
                <div>
                  <h3 className="text-base font-black text-white uppercase tracking-wider mb-1 font-mono">
                    {matchState.matchTitle.toUpperCase()}
                  </h3>
                  <p className="text-[10px] text-green-500 font-mono font-black mb-4 uppercase tracking-widest">
                    PITCH STREAM IS CURRENTLY STANDBY
                  </p>
                  
                  {/* Score graphic display panel styled in high fidelity TV layout */}
                  <div className="bg-black rounded p-3 border border-white/10 grid grid-cols-2 divide-x divide-white/10 font-mono">
                    <div className="text-center">
                      <p className="text-[9px] text-white/40 uppercase font-black">STADIUM SCORE</p>
                      <p className="text-xl font-black text-white mt-1 leading-none">{matchState.runs}/{matchState.wickets}</p>
                      <p className="text-[10px] text-white/50 mt-1">Overs {matchState.overs}.{matchState.balls}</p>
                    </div>
                    <div className="text-center flex flex-col justify-center">
                      <p className="text-[9px] text-white/40 uppercase font-black">RUN RATE</p>
                      <p className="text-xl font-bold text-yellow-500 mt-1 leading-none">
                        {matchState.overs > 0 ? (matchState.runs / (matchState.overs + matchState.balls/6)).toFixed(2) : "0.00"}
                      </p>
                      <p className="text-[10px] text-white/50 mt-1">
                        {matchState.target ? `Target: ${matchState.target}` : 'First Innings'}
                      </p>
                    </div>
                  </div>
                  
                  <p className="text-[9px] text-white/40 italic mt-4 font-sans leading-normal">
                    * Interactive TV Scoreboard elements on image frames will synchronize instantly when stream boots up.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Integrated TV Scoring Scroll Ticker at bottom */}
        <div className="w-full z-15">
          <LiveTicker matchState={matchState} />
        </div>
      </div>

      {/* Directory list of past recorded matches */}
      {activeTab === 'recordings' && (
        <div className="bg-black p-4 border-t border-white/10 scrollbar-none">
          <h4 className="text-[11px] font-bold text-white/40 mb-3 uppercase flex items-center gap-1 font-mono">
            PAST MATCH RECODE ARCHIVES ({matchState.recordings?.length || 0})
          </h4>
          
          {matchState.recordings && matchState.recordings.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {matchState.recordings.map((rec) => (
                <div
                  key={rec.id}
                  onClick={() => selectRecording(rec)}
                  className={`p-3 rounded border text-left cursor-pointer transition flex items-start gap-2.5 ${
                    selectedPlayback?.id === rec.id
                      ? 'bg-green-600/10 border-green-500 text-white'
                      : 'bg-[#0f0f0f] border-white/10 hover:border-white/25 text-white/80'
                  }`}
                >
                  <div className="w-12 h-12 bg-black border border-white/10 p-2 rounded flex flex-col items-center justify-center shrink-0 font-mono">
                    <Video className="w-4 h-4 text-green-500 animate-pulse" />
                    <span className="text-[8px] text-white/50 mt-1">
                      {rec.duration}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold line-clamp-1 text-white">{rec.title}</p>
                    <p className="text-[9px] text-white/40 font-mono mt-0.5">Recorded: {rec.date}</p>
                    <span className="inline-block mt-1 text-[9px] text-green-400 font-bold hover:underline">
                      PLAY HIGHLIGHT REPLAY
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center p-6 bg-[#0a0a0a] rounded border border-white/10">
              <Film className="w-5 h-5 text-white/20 mx-auto mb-1.5 animate-pulse" />
              <p className="text-[11px] text-white/50">No replay clips listed. Clips are posted instantly when camera is shut down by Naveed.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
