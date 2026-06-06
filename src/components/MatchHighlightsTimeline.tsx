import React from 'react';
import { MatchState, MatchHighlight } from '../types';
import { 
  Zap, Trophy, Flame, ChevronRight, Play, Radio,
  Award, RefreshCw, Calendar, ArrowUpRight, HelpCircle
} from 'lucide-react';

interface MatchHighlightsTimelineProps {
  matchState: MatchState;
}

export default function MatchHighlightsTimeline({ matchState }: MatchHighlightsTimelineProps) {
  const highlights = matchState.highlights || [];

  const getEventStyles = (type: string) => {
    switch (type) {
      case 'six':
        return {
          bgColor: 'bg-amber-950/40 border-amber-500/30 text-amber-400',
          indicatorColor: 'bg-amber-500',
          iconName: '🚀',
          label: 'SIXER'
        };
      case 'four':
        return {
          bgColor: 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400',
          indicatorColor: 'bg-emerald-500',
          iconName: '💥',
          label: 'BOUNDARY'
        };
      case 'wicket':
        return {
          bgColor: 'bg-red-950/40 border-red-500/30 text-red-400',
          indicatorColor: 'bg-red-500',
          iconName: '🔴',
          label: 'WICKET'
        };
      case 'innings_break':
        return {
          bgColor: 'bg-blue-950/40 border-blue-500/30 text-blue-400',
          indicatorColor: 'bg-blue-500',
          iconName: '🏏',
          label: 'INNINGS'
        };
      case 'init':
        return {
          bgColor: 'bg-stone-900/60 border-white/15 text-stone-200',
          indicatorColor: 'bg-white',
          iconName: '🏟️',
          label: 'START'
        };
      default:
        return {
          bgColor: 'bg-zinc-900/50 border-zinc-500/20 text-zinc-300',
          indicatorColor: 'bg-zinc-400',
          iconName: '⚡',
          label: 'ADMIN UPDATE'
        };
    }
  };

  return (
    <div className="bg-[#0c0c0c] border border-white/10 rounded-xl overflow-hidden font-sans p-4 space-y-4 shadow-lg text-left" id="match-broadcast-highlights-section">
      
      {/* 1. Header Section */}
      <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-amber-500/20 flex items-center justify-center text-amber-500">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div>
            <h4 className="text-[11px] font-extrabold text-white tracking-widest uppercase font-mono">
              MATCH KEY HIGHLIGHTS TIMELINE
            </h4>
            <p className="text-[9px] text-white/40">Chronological moments captured live in real-time lala</p>
          </div>
        </div>
        
        <div className="flex items-center gap-1.5 bg-black border border-white/5 px-2 py-0.5 rounded text-[8px] font-mono animate-pulse text-green-400 font-extrabold">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
          <span>STADIUM FEED</span>
        </div>
      </div>

      {/* 2. Timeline Core Panel */}
      {highlights.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed border-white/5 rounded-lg space-y-1.5">
          <HelpCircle className="w-6 h-6 text-white/20" />
          <p className="text-[10px] text-white/50 uppercase font-mono font-bold tracking-wider">No highlights recorded yet</p>
          <p className="text-[9px] text-white/35 max-w-xs">Admin triggers and big boundaries or wickets will register chronological events here!</p>
        </div>
      ) : (
        <div className="relative pl-6 space-y-4 max-h-[350px] overflow-y-auto scrollbar-thin scrollbar-thumb-stone-800 pr-2">
          
          {/* Vertical spine line */}
          <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-white/5 border-l border-white/5"></div>

          {highlights.map((item, index) => {
            const styles = getEventStyles(item.type);
            const isLatest = index === 0;

            return (
              <div 
                key={item.id} 
                className="relative flex flex-col md:flex-row md:items-start justify-between gap-2.5 animate-in slide-in-from-top-3 duration-200"
              >
                {/* Custom dot icon locator */}
                <div className={`absolute -left-[22px] top-1.5 w-3.5 h-3.5 rounded-full flex items-center justify-center border ${styles.indicatorColor} z-10 transition-all ${
                  isLatest ? 'ring-4 ring-green-600/20' : 'bg-[#0a0a0a]'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${styles.indicatorColor}`}></span>
                </div>

                {/* Left hand details text */}
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-1.5 text-[9px] font-mono">
                    <span className="text-white/40">{item.timestamp}</span>
                    <span className="text-white/25">•</span>
                    <span className={`px-1.5 py-0.2 rounded-sm font-extrabold uppercase border text-[8px] tracking-wider ${styles.bgColor}`}>
                      {styles.iconName} {styles.label}
                    </span>
                    <span className="text-white/25">•</span>
                    <span className="text-amber-500 font-bold">Overs: {item.over}.{item.balls}</span>
                  </div>
                  
                  <p className={`text-[11px] font-sans leading-relaxed ${isLatest ? 'text-slate-100 font-medium' : 'text-slate-400'}`}>
                    {item.text}
                  </p>
                </div>

                {/* Right hand score info block */}
                <div className="flex items-center gap-1.5 shrink-0 self-start mt-1 select-none font-mono text-[9px]">
                  <span className="text-white/30">Score:</span>
                  <span className="text-stone-300 font-bold bg-[#141414] border border-white/5 px-2 py-0.5 rounded">
                    {item.runs}/{item.wickets}
                  </span>
                </div>
              </div>
            );
          })}

        </div>
      )}

      {/* 3. Timeline Legend / Footer Guide */}
      <div className="bg-[#080808] border border-white/5 p-2 rounded-lg text-[9px] text-white/35 flex items-center justify-between font-mono">
        <span className="flex items-center gap-1">
          <Trophy className="w-3 h-3 text-amber-500" />
          Live Timeline captures the pulse of the match
        </span>
        <span className="hidden sm:inline">Last update: {highlights[0]?.timestamp || 'None'}</span>
      </div>

    </div>
  );
}
