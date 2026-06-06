import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { MatchState, MatchComment } from './types';
import BroadcastPlayer from './components/BroadcastPlayer';
import StadiumScorecard from './components/StadiumScorecard';
import MatchHighlightsTimeline from './components/MatchHighlightsTimeline';
import SkChatbot from './components/SkChatbot';
import ViewerCommentPanel from './components/ViewerCommentPanel';
import AdminPanel from './components/AdminPanel';
import SplashScreen from './components/SplashScreen';
import InitializeMatchModal from './components/InitializeMatchModal';
import MilestoneConfetti from './components/MilestoneConfetti';
import { getApiUrl } from './utils/api';
import { triggerHaptic } from './utils/vibrate';
import { Trophy, Radio, Shield, Settings, Sparkles, HelpCircle, User, Tv, MessageSquare, Volume2, VolumeX, Share2 } from 'lucide-react';

export default function App() {
  const [matchState, setMatchState] = useState<MatchState | null>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('sk_last_match_state');
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch (e) {
          return null;
        }
      }
    }
    return null;
  });

  const [speechEnabled, setSpeechEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const val = localStorage.getItem('sk_speech_enabled');
      return val === 'true'; // lets user turn it on
    }
    return false;
  });

  const [shareToastText, setShareToastText] = useState<string | null>(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [errorLoading, setErrorLoading] = useState(false);
  const [activeMobileTab, setActiveMobileTab] = useState<'stadium' | 'scorecard' | 'comments'>('scorecard');
  const [activeDesktopTab, setActiveDesktopTab] = useState<'stadium' | 'watch_live'>('watch_live');
  const [splashLoading, setSplashLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });

  const prevStateRef = useRef<MatchState | null>(null);

  const [runsPulse, setRunsPulse] = useState(false);
  const prevRunsRef = useRef<number | undefined>(undefined);
  const matchRuns = matchState?.runs;

  useEffect(() => {
    if (matchRuns !== undefined) {
      if (prevRunsRef.current !== undefined && prevRunsRef.current !== matchRuns) {
        setRunsPulse(true);
        const timer = setTimeout(() => setRunsPulse(false), 800);
        return () => clearTimeout(timer);
      }
      prevRunsRef.current = matchRuns;
    }
  }, [matchRuns]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const goOnline = () => {
      setIsOnline(true);
      fetchMatchState();
    };
    const goOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  const handleShare = () => {
    triggerHaptic(20);
    const title = "SK Cricket Live Match Status";
    const statusText = matchState 
      ? `LIVE Scoring: ${matchState.runs}/${matchState.wickets} in ${matchState.overs}.${matchState.balls} overs` 
      : "Live Cricket Scoring";
    const text = `🏏 Follow SK Sherrani Live! Status: ${statusText}. Track live scoreboard and commentary lala!`;
    const url = typeof window !== 'undefined' ? window.location.href : "";

    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({
        title,
        text,
        url
      }).then(() => {
        setShareToastText("Shared successfully! 🏏");
        setTimeout(() => setShareToastText(null), 2500);
      }).catch((err) => {
        if (err.name !== 'AbortError') {
          navigator.clipboard.writeText(url);
          setShareToastText("Link copied to clipboard! 📋");
          setTimeout(() => setShareToastText(null), 2500);
        }
      });
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setShareToastText("Link copied to clipboard! 📋");
      setTimeout(() => setShareToastText(null), 2500);
    }
  };

  // Safe TTS function
  const speakText = (text: string) => {
    if (!speechEnabled) return;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.05; // natural premium sports speed lala
        utterance.pitch = 1.05;
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn("TTS speak failed silently", err);
      }
    }
  };

  // Speaks key updates
  const detectAndSpeakUpdates = (oldState: MatchState | null, newState: MatchState) => {
    if (!oldState) return;

    // A. Wicket fell change detection
    if (newState.wickets > oldState.wickets) {
      speakText("Wicket! A vital wicket has fallen! Sardar Sherrani team celebrates!");
      return;
    }

    // B. Check batting landmarks (50 / 100 runs)
    const checkBattingMilestones = (newT: any, oldT: any) => {
      if (!newT || !oldT) return;
      newT.squad?.forEach((newP: any) => {
        const oldP = oldT.squad?.find((p: any) => p.name === newP.name);
        if (oldP) {
          if (oldP.runs < 50 && newP.runs >= 50) {
            speakText(`Superb innings! ${newP.name} has reached a brilliant half-century!`);
          } else if (oldP.runs < 100 && newP.runs >= 100) {
            speakText(`Sensational century! ${newP.name} marks a glorious hundred runs on the scoreboard!`);
          }
        }
      });
    };
    checkBattingMilestones(newState.teamA, oldState.teamA);
    checkBattingMilestones(newState.teamB, oldState.teamB);

    // C. Boundary triggers
    const runsDiff = newState.runs - oldState.runs;
    const ballsDiff = (newState.overs * 6 + newState.balls) - (oldState.overs * 6 + oldState.balls);
    if (ballsDiff > 0 && newState.wickets === oldState.wickets) {
      if (runsDiff === 4) {
        speakText(`Shot! Beautiful boundary for four runs!`);
      } else if (runsDiff === 6) {
        speakText(`Huge six! Massive blow over the ropes into the stands!`);
      }
    }

    // D. New batter arrival
    const oldOnCrease = [oldState.strikerName, oldState.nonStrikerName].filter(Boolean);
    const newOnCrease = [newState.strikerName, newState.nonStrikerName].filter(Boolean);
    const brandNewBatters = newOnCrease.filter(name => !oldOnCrease.includes(name));
    if (brandNewBatters.length > 0 && newState.balls === 0 && newState.overs > 0) {
      speakText(`New batter, ${brandNewBatters[0]}, is taking guard at the crease.`);
    }
  };

  const fetchMatchState = async () => {
    try {
      const resp = await fetch(getApiUrl('/api/match/state'));
      if (resp.ok) {
        const data = await resp.json();
        
        // Detect updates to speak
        if (prevStateRef.current) {
          detectAndSpeakUpdates(prevStateRef.current, data);
        }
        prevStateRef.current = data;

        setMatchState(data);
        setErrorLoading(false);
        setSplashLoading(false);

        // Cache state in localstorage safely
        if (typeof window !== 'undefined') {
          localStorage.setItem('sk_last_match_state', JSON.stringify(data));
        }
      } else {
        setErrorLoading(true);
        setSplashLoading(false);
      }
    } catch (err) {
      console.error("Failed fetching live match state:", err);
      setErrorLoading(true);
      setSplashLoading(false);
    }
  };

  useEffect(() => {
    fetchMatchState();
    const interval = setInterval(fetchMatchState, 1200);
    return () => clearInterval(interval);
  }, [speechEnabled]);

  const handleStateUpdated = (newState: MatchState) => {
    setMatchState(newState);
    prevStateRef.current = newState;
    if (typeof window !== 'undefined') {
      localStorage.setItem('sk_last_match_state', JSON.stringify(newState));
    }
  };

  const handleCommentAdded = (updatedComments: MatchComment[]) => {
    if (matchState) {
      const updated = {
        ...matchState,
        comments: updatedComments
      };
      setMatchState(updated);
      if (typeof window !== 'undefined') {
        localStorage.setItem('sk_last_match_state', JSON.stringify(updated));
      }
    }
  };

  if (showSplash) {
    return (
      <SplashScreen 
        isLoading={splashLoading || !matchState} 
        onFinished={() => setShowSplash(false)} 
      />
    );
  }

  if (matchState && !matchState.teamA?.isRegistered) {
    return (
      <InitializeMatchModal onInitialized={handleStateUpdated} />
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col font-sans" id="sk-cricket-app-root">
      
      {/* Milestone Confetti Celebration Canvas Overlay */}
      <MilestoneConfetti matchState={matchState} />

      {/* Toast Notification */}
      {shareToastText && (
        <div className="fixed top-20 right-4 z-[999] bg-[#0c0c0c] border border-amber-500/40 text-amber-400 font-mono text-[10px] font-bold uppercase tracking-wider py-2.5 px-4 rounded-lg shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-300">
          <Sparkles className="w-4 h-4 text-amber-500 animate-[spin_3s_linear_infinite]" />
          <span>{shareToastText}</span>
        </div>
      )}

      {/* 1. Immersive Global Header Bar */}
      <header className="h-16 border-b border-white/10 bg-[#0a0a0a] sticky top-0 z-50 flex items-center shadow-md">
        <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 flex items-center justify-between gap-2 sm:gap-4">
          
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="w-8 h-8 bg-red-600 rounded-full animate-pulse flex items-center justify-center shadow-lg shadow-red-600/25 shrink-0">
              <div className="w-3 h-3 bg-white rounded-full"></div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-extrabold text-xs sm:text-lg text-white tracking-tighter uppercase whitespace-nowrap">
                  SK <span className="text-green-500">SHERRANI</span>
                </h1>
                {matchState?.isLive && (
                  <span className="bg-red-600 text-white font-mono font-black text-[7px] tracking-widest px-1 sm:px-1.5 py-0.5 rounded uppercase animate-pulse flex items-center shrink-0">
                    LIVE
                  </span>
                )}
              </div>
              <p className="text-[8px] sm:text-[10px] text-amber-400 tracking-tight font-mono font-black whitespace-nowrap flex items-center gap-1">
                <span className="shrink-0 animate-bounce">🏟️</span> {matchState?.groundName || "Sherrani Cricket Stadium, Quetta"}
              </p>
            </div>
          </div>

          {/* Quick Score banner for fast visibility */}
          {matchState?.teamA.isRegistered && (
            <div className="hidden lg:flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2 rounded text-xs font-mono font-semibold">
              <span className="text-white/60">{matchState.teamA.name.toUpperCase()} VS {matchState.teamB.name.toUpperCase()}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
              <motion.span
                animate={runsPulse ? { scale: [1, 1.25, 1], textShadow: "0 0 12px rgba(74, 222, 128, 0.8)" } : { scale: 1 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="text-green-400 font-extrabold select-none inline-block origin-center"
              >
                {matchState.runs}/{matchState.wickets}
              </motion.span>
              <span className="text-white/40">({matchState.overs}.{matchState.balls} OVS)</span>
              {matchState.target && (
                <>
                  <span className="text-white/20">|</span>
                  <span className="text-yellow-500 text-[10px]">TARGET: {matchState.target}</span>
                </>
              )}
            </div>
          )}

          {/* Administrator Status & Switch buttons */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            
            {/* Live Audio Commentary / Voice Alert Switch */}
            <button
              onClick={() => {
                triggerHaptic(30);
                const newVal = !speechEnabled;
                setSpeechEnabled(newVal);
                if (typeof window !== 'undefined') {
                  localStorage.setItem('sk_speech_enabled', String(newVal));
                }
                // Speak confirmation
                if (newVal) {
                  setTimeout(() => {
                    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                      try {
                        window.speechSynthesis.cancel();
                        const utterance = new SpeechSynthesisUtterance("Voice Alerts Activated! Watch SK Sherrani Live Lala!");
                        utterance.rate = 1.05;
                        window.speechSynthesis.speak(utterance);
                      } catch (err) {
                        console.warn("Speech synthesis confirmation blocked in this environment:", err);
                      }
                    }
                  }, 100);
                }
              }}
              className={`p-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer border ${
                speechEnabled 
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/20' 
                  : 'bg-[#151515] border-white/5 text-white/40 hover:bg-white/5'
              }`}
              title={speechEnabled ? "Mute Match Announcements" : "Enable Match Voice Alerts"}
            >
              {speechEnabled ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400 animate-[pulse_1.5s_infinite]" />
                  <span className="text-[9px] font-black uppercase tracking-wider hidden sm:inline text-emerald-400">Voice On</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-white/30" />
                  <span className="text-[9px] font-black uppercase tracking-wider hidden sm:inline text-white/40">Voice Off</span>
                </>
              )}
            </button>

            {/* Share Match Action Button */}
            <button
              onClick={handleShare}
              className="p-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border bg-amber-500/10 border-amber-500/35 text-amber-400 hover:bg-amber-500/20 active:scale-95 shrink-0"
              title="Share Live Score status"
            >
              <Share2 className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[9px] font-black uppercase tracking-wider hidden sm:inline">Share Match</span>
            </button>

            <div className="hidden sm:block text-right">
              <div className="text-[9px] text-white/40 uppercase tracking-widest font-mono">Admin Session</div>
              <div className="text-[10px] text-green-400 font-bold font-mono tracking-wider">SECURED OPERATOR TRACE</div>
            </div>
            
            <button
              onClick={() => {
                triggerHaptic(30);
                setShowAdmin(!showAdmin);
              }}
              className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded text-[10px] sm:text-xs font-bold tracking-wider flex items-center gap-1.5 transition cursor-pointer active:scale-95 border ${
                showAdmin
                  ? 'bg-green-600 border-green-500 text-slate-950 font-black shadow-lg shadow-green-500/10'
                  : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
              }`}
            >
              <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin-slow text-green-400" />
              <span>{showAdmin ? 'Viewer Pitch' : 'Scoring'}</span>
            </button>
          </div>

        </div>
      </header>

      {/* 2. Main Page Layout Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
        
        {!isOnline && (
          <div className="bg-amber-950/40 text-amber-400 border border-amber-500/20 p-4 rounded-xl text-xs flex items-center gap-2.5 animate-pulse" id="sk-offline-feed-panel">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-ping shrink-0"></div>
            <span className="font-mono font-bold tracking-wide uppercase">🏟️ STADIUM OFFLINE FEED: Showing last synchronized scoreboard data in local browser memory. Reconnecting lala...</span>
          </div>
        )}

        {errorLoading && isOnline && (
          <div className="bg-red-950/20 text-red-400 border border-red-900/30 p-4 rounded text-xs flex items-center gap-2">
            <Radio className="w-4 h-4 animate-ping text-red-500" />
            <span>Synchronizing regional stadium latency... Reconnecting to live feed. Please wait lala.</span>
          </div>
        )}

        {!matchState ? (
          /* Elegant immersive skeleton loading */
          <div className="flex flex-col items-center justify-center text-center p-32 space-y-4">
            <div className="w-10 h-10 rounded-full border-t-2 border-r-2 border-green-500 animate-spin"></div>
            <p className="text-xs text-white/40 font-mono uppercase tracking-widest">Warming Up Boundary Lines...</p>
          </div>
        ) : showAdmin ? (
          /* RENDER: Administrator Portal Panel */
          <div className="animate-in fade-in duration-300">
            <AdminPanel
              matchState={matchState}
              onStateUpdated={handleStateUpdated}
            />
          </div>
        ) : (() => {
          const battingTeam = matchState.battingTeamIndex === 0 ? matchState.teamA : matchState.teamB;
          return (
            /* RENDER: Public Spectator Stadium Layout (Bento structure on Desktop, Mobile Tabs on Phone) */
            <div className="space-y-6 animate-in fade-in duration-300 pb-20 md:pb-6">
              
              {/* Desktop Immersive View Alternator Tabs */}
              <div className="hidden md:flex items-center gap-1.5 bg-[#0a0a0a] p-1.5 rounded-xl border border-white/10 max-w-lg mx-auto font-sans text-zs font-black select-none">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic(20);
                    setActiveDesktopTab('watch_live');
                  }}
                  className={`flex-1 py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition cursor-pointer text-[11px] uppercase tracking-wider ${
                    activeDesktopTab === 'watch_live'
                      ? 'bg-red-600 text-white shadow-lg shadow-red-600/10 font-bold'
                      : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04]'
                  }`}
                >
                  <Tv className="w-4 h-4 text-white animate-pulse" />
                  <span>📺 WATCH LIVE MATCH SCREEN (بلا واسطہ لائیو)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic(20);
                    setActiveDesktopTab('stadium');
                  }}
                  className={`flex-1 py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition cursor-pointer text-[11px] uppercase tracking-wider ${
                    activeDesktopTab === 'stadium'
                      ? 'bg-green-600 text-slate-950 font-bold'
                      : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04]'
                  }`}
                >
                  <Trophy className="w-4 h-4 text-slate-950" />
                  <span>📊 SCORECARD & STATS HUB (سکور کارڈ)</span>
                </button>
              </div>

              {/* 1. Desktop Experience (Hidden on Mobile) */}
              <div className="hidden md:block space-y-6">
                {activeDesktopTab === 'watch_live' ? (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-300">
                    {/* Immersive Streaming & Playback Theater */}
                    <div className="lg:col-span-8 space-y-6">
                      <BroadcastPlayer matchState={matchState} />
                      <MatchHighlightsTimeline matchState={matchState} />
                    </div>

                    {/* Quick Live commentary and chatbot sidecar */}
                    <div className="lg:col-span-4 flex flex-col gap-6">
                      <ViewerCommentPanel
                        comments={matchState.comments}
                        onCommentAdded={handleCommentAdded}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6 animate-in fade-in duration-300">
                    <StadiumScorecard matchState={matchState} />
                  </div>
                )}
              </div>

              {/* 2. Mobile Native-App Experience (Hidden on Desktop) */}
              <div className="block md:hidden space-y-4">
                
                {/* Mobile Quick Live Header Card */}
                {matchState.teamA.isRegistered && (
                  <div className="bg-[#0f0f0f] border border-white/10 rounded-xl p-4 font-mono shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full blur-2xl pointer-events-none"></div>
                    <div className="flex justify-between items-center text-[9px] text-white/50 mb-2 uppercase tracking-wider">
                      <span className="font-bold truncate max-w-[150px]">{matchState.matchTitle}</span>
                      <span className="text-red-500 animate-pulse font-black uppercase bg-red-950/40 border border-red-900/30 px-2 py-0.5 rounded text-[8px] flex items-center gap-1">
                        ● LIVE MATCH
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="text-sm font-extrabold text-white truncate max-w-[200px] flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded bg-green-500"></span>
                          {battingTeam.name.toUpperCase()}
                        </h4>
                        <p className="text-[9px] text-white/40 mt-1 uppercase font-semibold">Currently Batting</p>
                      </div>
                      <div className="text-right">
                        <motion.div
                          animate={runsPulse ? { scale: [1, 1.25, 1], textShadow: "0 0 12px rgba(245, 158, 11, 0.8)" } : { scale: 1 }}
                          transition={{ duration: 0.4, ease: "easeOut" }}
                          className="text-2xl font-black text-amber-400 font-mono tracking-tight origin-right inline-block select-none"
                        >
                          {matchState.runs}/{matchState.wickets}
                        </motion.div>
                        <div className="text-[10px] text-white/60 font-mono mt-0.5 font-bold">
                          {matchState.overs}.{matchState.balls} <span className="text-white/30">/</span> {matchState.maxOvers || 20} Ovs
                        </div>
                      </div>
                    </div>
                    {matchState.target && (
                      <div className="mt-3 pt-3 border-t border-white/5 text-[10px] leading-relaxed flex flex-col justify-center gap-1 bg-white/[0.01] -mx-4 px-4 pb-1 rounded-b">
                        <div className="flex justify-between font-sans">
                          <span className="text-amber-500 font-bold font-mono uppercase bg-amber-950/25 px-1.5 py-0.5 border border-amber-900/20 rounded">
                            TARGET: {matchState.target} Runs
                          </span>
                          <span className="text-zinc-300 font-bold font-mono">
                            Need {matchState.target - matchState.runs} runs in {((matchState.maxOvers || 20) * 6) - ((matchState.overs * 6) + matchState.balls)} balls
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Render Selected View on Mobile Screens */}
                {activeMobileTab === 'stadium' && (
                  <div className="space-y-4 animate-in fade-in duration-300">
                    <BroadcastPlayer matchState={matchState} />
                    <MatchHighlightsTimeline matchState={matchState} />
                  </div>
                )}

                {activeMobileTab === 'scorecard' && (
                  <div className="animate-in fade-in duration-300">
                    <StadiumScorecard matchState={matchState} />
                  </div>
                )}

                {activeMobileTab === 'comments' && (
                  <div className="animate-in fade-in duration-300">
                    <ViewerCommentPanel
                      comments={matchState.comments}
                      onCommentAdded={handleCommentAdded}
                    />
                  </div>
                )}

              </div>

              {/* Mobile Persistent Bottom Bar Navigation Menu */}
              <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#070707] border-t border-white/10 py-2.5 px-3 flex justify-around items-center z-50 shadow-[0_-8px_24px_rgba(0,0,0,0.8)] backdrop-blur-md">
                <button
                  onClick={() => {
                    triggerHaptic(20);
                    setActiveMobileTab('stadium');
                  }}
                  className={`flex flex-col items-center gap-1.5 transition text-[9px] font-bold uppercase tracking-wider cursor-pointer ${
                    activeMobileTab === 'stadium' ? 'text-amber-500 scale-102 font-extrabold' : 'text-white/40'
                  }`}
                >
                  <Tv className={`w-5 h-5 ${activeMobileTab === 'stadium' ? 'text-amber-500' : 'text-white/30'}`} />
                  <span>Video</span>
                </button>

                <button
                  onClick={() => {
                    triggerHaptic(20);
                    setActiveMobileTab('scorecard');
                  }}
                  className={`flex flex-col items-center gap-1.5 transition text-[9px] font-bold uppercase tracking-wider cursor-pointer ${
                    activeMobileTab === 'scorecard' ? 'text-amber-500 scale-102 font-extrabold' : 'text-white/40'
                  }`}
                >
                  <Trophy className={`w-5 h-5 ${activeMobileTab === 'scorecard' ? 'text-amber-500' : 'text-white/30'}`} />
                  <span>Scorecard</span>
                </button>

                <button
                  onClick={() => {
                    triggerHaptic(25);
                    setActiveMobileTab('comments');
                  }}
                  className={`flex flex-col items-center gap-1.5 transition text-[9px] font-bold uppercase tracking-wider cursor-pointer ${
                    activeMobileTab === 'comments' ? 'text-amber-500 scale-102 font-extrabold' : 'text-white/40'
                  }`}
                >
                  <MessageSquare className={`w-5 h-5 ${activeMobileTab === 'comments' ? 'text-amber-500' : 'text-white/30'}`} />
                  <span>Forum</span>
                </button>
              </div>

            </div>
          );
        })()}

      </main>

      {/* Global Bot floating overlay widget */}
      {matchState && <SkChatbot matchState={matchState} />}

      {/* 3. Immersive Layout Footer */}
      <footer className="h-10 bg-black border-t border-white/10 px-6 flex items-center justify-between text-[10px] text-white/40 uppercase tracking-widest font-mono">
        <div className="flex items-center gap-1.5">
          <span>Server status:</span>
          <span className="text-green-500 font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> Optimal
          </span>
        </div>
        <div>Broadcast Mode: Live Mobile Capture</div>
        <div>Latency: 18ms</div>
      </footer>

    </div>
  );
}
