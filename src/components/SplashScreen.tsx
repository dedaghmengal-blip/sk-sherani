import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Trophy, Activity, Radio } from 'lucide-react';

interface SplashScreenProps {
  isLoading: boolean;
  onFinished: () => void;
}

export default function SplashScreen({ isLoading, onFinished }: SplashScreenProps) {
  const [greeting, setGreeting] = useState("Assalamu Alaykum Jawaan...");
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const greetings = [
      "Assalamu Alaykum Jawaan...",
      "Khush Amdeed lala! Preparing the stadium...",
      "Setting up camera feeds & scoreboards...",
      "SK Sherrani Live Broadcast initializing...",
      "Zabardast matches are loading!"
    ];
    let currentIndex = 0;
    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % greetings.length;
      setGreeting(greetings[currentIndex]);
    }, 1800);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isLoading) {
      // Small graceful delay to let user experience the branding splash
      const timer = setTimeout(() => {
        setFadeOut(true);
        const finishTimer = setTimeout(() => {
          onFinished();
        }, 600); // match fade-out duration
        return () => clearTimeout(finishTimer);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isLoading, onFinished]);

  return (
    <div
      className={`fixed inset-0 z-100 bg-[#070707] flex flex-col items-center justify-center transition-all duration-700 ease-out p-6 ${
        fadeOut ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
      id="sk-branded-splash-screen"
    >
      {/* Background Cinematic Gradients */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-amber-500/5 rounded-full blur-[120px]" />
        {/* Stadium light visual simulator at the top center */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[350px] h-[3px] bg-gradient-to-r from-transparent via-emerald-500/80 to-transparent blur-[1px]" />
      </div>

      <div className="max-w-md w-full text-center space-y-8 relative z-10">
        
        {/* Animated Icon Ring */}
        <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
          {/* Pulsing ring */}
          <div className="absolute inset-0 rounded-full border border-emerald-500/20 animate-ping" />
          {/* Outer Rotating dashes */}
          <div className="absolute inset-[-4px] rounded-full border-2 border-dashed border-emerald-500/40 animate-[spin_12s_linear_infinite]" />
          {/* Inner Glowing Ring */}
          <div className="absolute inset-2 rounded-full bg-slate-900 border border-slate-800 shadow-2xl flex items-center justify-center">
            <Radio className="w-10 h-10 text-emerald-400 animate-pulse" />
          </div>
          {/* Live badge corner overlay */}
          <span className="absolute bottom-0 right-0 bg-red-600 text-white font-mono font-black text-[8px] px-2 py-0.5 rounded shadow-lg animate-bounce">
            LIVE
          </span>
        </div>

        {/* Brand Text Cluster */}
        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold text-white tracking-widest leading-none select-none">
            SK <span className="text-emerald-500 text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-green-500">SHERRANI</span>
          </h1>
          <p className="text-[10px] text-white/45 tracking-[0.3em] font-mono font-bold uppercase">
            Sport Broadcasting Network
          </p>
        </div>

        {/* Divider Deco line */}
        <div className="flex items-center justify-center gap-2 max-w-[200px] mx-auto">
          <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-white/10" />
          <Trophy className="w-3.5 h-3.5 text-amber-500 animate-spin-slow" />
          <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-white/10" />
        </div>

        {/* Tactile Live Indicator Feedback panel */}
        <div className="bg-slate-950/60 border border-white/5 rounded-xl p-4 max-w-sm mx-auto backdrop-blur">
          <div className="flex items-center justify-center gap-2 text-xs text-white">
            <Activity className="w-3.5 h-3.5 text-emerald-400 animate-[pulse_1s_infinite]" />
            <span className="font-mono text-[11px] font-semibold tracking-tight text-white/80 shrink-0">
              {greeting}
            </span>
          </div>

          {/* Loading Progress Bar */}
          <div className="w-full bg-white/5 h-1.5 rounded-full mt-3.5 overflow-hidden border border-white/[0.02]">
            <div className="bg-gradient-to-r from-emerald-500 to-green-400 h-full rounded-full transition-all duration-300 animate-[shimmer_2s_infinite]" style={{ width: isLoading ? '70%' : '100%' }} />
          </div>

          <p className="mt-3 text-[9px] text-white/30 uppercase tracking-widest font-mono select-none">
            Sardar Sherrani Premier League lala
          </p>
        </div>

      </div>

      {/* Styled animation keyframes inside style tag to avoid bundler quirks */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200px 0; }
          100% { background-position: 200px 0; }
        }
        .animate-spin-slow {
          animation: spin 6s linear infinite;
        }
      `}</style>
    </div>
  );
}
