import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MatchState } from '../types';
import { ChevronDown, ChevronUp, Radio, Trophy, User, Sparkles } from 'lucide-react';
import { triggerHaptic } from '../utils/vibrate';

interface BottomStickyScoreboardProps {
  matchState: MatchState;
  showAdmin: boolean;
}

export default function BottomStickyScoreboard({ matchState, showAdmin }: BottomStickyScoreboardProps) {
  const [isMinimized, setIsMinimized] = useState(false);

  // If match has not commenced or user is in admin scoring view, do not display overlay
  if (showAdmin || !matchState || !matchState.teamA?.isRegistered) {
    return null;
  }

  const {
    teamA,
    teamB,
    battingTeamIndex,
    bowlingTeamIndex,
    runs,
    wickets,
    overs,
    balls,
    strikerName,
    nonStrikerName,
    currentBowlerName,
    target,
    recentBalls,
    matchTitle,
    maxOvers
  } = matchState;

  const battingTeam = battingTeamIndex === 0 ? teamA : teamB;
  const bowlingTeam = bowlingTeamIndex === 0 ? teamA : teamB;

  // Locate active player objects dynamically
  const striker = battingTeam.squad?.find(p => p.name === strikerName);
  const nonStriker = battingTeam.squad?.find(p => p.name === nonStrikerName);
  const bowler = bowlingTeam.squad?.find(p => p.name === currentBowlerName);

  // Math equations
  const currentOverFloat = overs + (balls / 6);
  const totalOversLimit = maxOvers || 20;
  const currentRunRate = currentOverFloat > 0 ? (runs / currentOverFloat) : 0;
  const targetRequired = target ? target : 0;
  const runsNeeded = targetRequired ? (targetRequired - runs) : 0;
  const totalInningsBalls = totalOversLimit * 6;
  const ballsBowled = (overs * 6) + balls;
  const ballsRemaining = Math.max(0, totalInningsBalls - ballsBowled);
  const requiredRunRate = (ballsRemaining > 0 && runsNeeded > 0) ? ((runsNeeded / ballsRemaining) * 6) : 0;

  const handleToggleMinimize = () => {
    triggerHaptic(20);
    setIsMinimized(!isMinimized);
  };

  return (
    <div className="fixed bottom-16 md:bottom-0 left-0 right-0 z-[49] pointer-events-none px-2 sm:px-4 pb-2">
      <div className="max-w-7xl mx-auto w-full flex justify-end pointer-events-auto">
        <div className="w-full bg-[#0a0a0ae6] backdrop-blur-xl border border-white/10 rounded-xl shadow-[0_-12px_40px_rgba(0,0,0,0.85)] overflow-hidden transition-all duration-300 pointer-events-auto">
          
          {/* Main Top Strip */}
          <div className="flex items-center justify-between px-3.5 py-2 border-b border-white/5 bg-black/40">
            <div className="flex items-center gap-2 font-black select-none">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
              </span>
              <span className="text-[10px] text-red-500 uppercase tracking-widest font-mono animate-pulse">Live Tracker</span>
              <span className="text-white/20">|</span>
              <span className="text-[9px] sm:text-[10px] text-white/50 uppercase font-mono truncate max-w-[150px] sm:max-w-xs">{matchTitle}</span>
            </div>

            {/* Collapse Trigger Button */}
            <button
              onClick={handleToggleMinimize}
              className="p-1 rounded bg-white/5 border border-white/10 hover:border-white/20 transition cursor-pointer select-none text-white/70"
              title={isMinimized ? "Expand scoreboard" : "Minimize scoreboard"}
            >
              {isMinimized ? (
                <div className="flex items-center gap-1.5 px-1.5 py-0.5">
                  <span className="text-[10px] font-mono font-bold tracking-tight text-amber-400">
                    {battingTeam.name.substring(0, 3).toUpperCase()} {runs}/{wickets} ({overs}.{balls} Ovs)
                  </span>
                  <ChevronUp className="w-3.5 h-3.5 text-white" />
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-1 font-mono text-[9px] uppercase tracking-wider text-white/60">
                  <span>Hide Layout</span>
                  <ChevronDown className="w-3.5 h-3.5 text-white/80" />
                </div>
              )}
            </button>
          </div>

          <AnimatePresence initial={false}>
            {!isMinimized && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                {/* Score Grid Info Dashboard */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 p-3 text-xs">
                  
                  {/* Col A: Heavy IPL-style score box (Span 3) */}
                  <div className="md:col-span-3 flex items-center justify-between md:justify-start gap-4 bg-[#14291c] border border-green-900/30 rounded-lg p-2.5 shadow-lg select-none">
                    <div>
                      <h4 className="text-[10px] font-mono font-bold text-green-400 uppercase tracking-widest">Batting Team</h4>
                      <h3 className="text-sm font-black text-white uppercase tracking-tight truncate max-w-[140px] md:max-w-[180px] mt-0.5 font-sans">
                        {battingTeam.name}
                      </h3>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-mono font-black text-white leading-none">
                        {runs}/{wickets}
                      </div>
                      <div className="text-[10px] text-zinc-300 font-mono mt-0.5">
                        Over: {overs}.{balls} <span className="text-white/20">/</span> {totalOversLimit}
                      </div>
                    </div>
                  </div>

                  {/* Col B: Current Batsman Pair Details (Span 4) */}
                  <div className="md:col-span-4 bg-black/45 border border-white/5 rounded-lg p-2 flex flex-col justify-center gap-1.5">
                    {/* Batsman 1 (Striker) */}
                    <div className="flex items-center justify-between font-mono text-[11px] px-1">
                      <div className="flex items-center gap-1.5 font-bold text-white truncate max-w-[150px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-[pulse_1s_infinite]"></span>
                        <span className="truncate">{strikerName || 'Striker'}</span>
                      </div>
                      <div className="font-bold flex items-center gap-1">
                        <span className="text-emerald-400">{striker ? striker.runsScored : 0}</span>
                        <span className="text-white/40 text-[9px]">({striker ? striker.ballsFaced : 0}b)</span>
                        <div className="flex items-center gap-0.5 text-[9px] text-white/30 ml-2">
                          <span>{striker?.boundaries4 || 0}x4</span>
                          <span>{striker?.boundaries6 || 0}x6</span>
                        </div>
                      </div>
                    </div>

                    {/* Batsman 2 (Non-Striker) */}
                    <div className="flex items-center justify-between font-mono text-[11px] px-1 border-t border-white/5 pt-1.5">
                      <div className="flex items-center gap-1.5 text-white/60 truncate max-w-[150px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-600"></span>
                        <span className="truncate">{nonStrikerName || 'Non-Striker'}</span>
                      </div>
                      <div className="font-medium flex items-center gap-1">
                        <span className="text-white/80">{nonStriker ? nonStriker.runsScored : 0}</span>
                        <span className="text-white/40 text-[9px]">({nonStriker ? nonStriker.ballsFaced : 0}b)</span>
                        <div className="flex items-center gap-0.5 text-[9px] text-white/20 ml-2">
                          <span>{nonStriker?.boundaries4 || 0}x4</span>
                          <span>{nonStriker?.boundaries6 || 0}x6</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Col C: Current Bowler Details & Run Rates (Span 3) */}
                  <div className="md:col-span-3 bg-black/45 border border-white/5 rounded-lg p-2.5 flex flex-col justify-center gap-1">
                    <div className="flex items-center justify-between font-mono text-[11px]">
                      <span className="text-white/40 uppercase text-[9px] tracking-tight">Bowler</span>
                      <strong className="text-[#e2b036] font-extrabold truncate max-w-[100px]">{currentBowlerName || 'Active'}</strong>
                      <span className="font-black text-amber-500 bg-white/5 border border-white/10 px-1 py-0.5 rounded leading-none text-[10px]">
                        {bowler ? bowler.wicketsTaken : 0} - {bowler ? bowler.runsConceded : 0}
                        <span className="text-[9px] text-white/40 font-normal ml-1">({bowler ? bowler.oversBowled : 0}.{bowler ? bowler.ballsBowledInOver : 0})</span>
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1 text-[10px] font-mono text-zinc-400 border-t border-white/5 pt-1">
                      <span>CRR: <strong className="text-white">{currentRunRate.toFixed(2)}</strong></span>
                      {targetRequired ? (
                        <span>RRR: <strong className="text-amber-400">{requiredRunRate.toFixed(2)}</strong></span>
                      ) : (
                        <span>Proj: <strong className="text-emerald-400">{Math.round(currentRunRate * totalOversLimit)}</strong></span>
                      )}
                    </div>
                  </div>

                  {/* Col D: Over delivery summary pills & Trophy requirement (Span 2) */}
                  <div className="md:col-span-2 bg-[#121213] border border-white/5 rounded-lg p-2 flex flex-col justify-between gap-1.5 select-none font-mono">
                    <span className="text-[8px] text-white/40 uppercase tracking-widest">This Over State</span>
                    <div className="flex items-center gap-1 flex-wrap min-h-5">
                      {recentBalls.length === 0 ? (
                        <span className="text-[9px] text-white/30 italic font-sans leading-none uppercase">Let's bowl lala</span>
                      ) : (
                        recentBalls.map((b, idx) => {
                          let bg = "bg-white/5 text-white border-white/10";
                          if (b === "W") bg = "bg-red-600 text-white border-red-500 animate-pulse";
                          if (b === "4") bg = "bg-blue-600 text-white border-blue-500";
                          if (b === "6") bg = "bg-green-600 text-white border-green-500";
                          if (b === "Wd" || b === "Nb") bg = "bg-yellow-600/25 text-yellow-500 border-yellow-500/50";
                          return (
                            <span key={idx} className={`w-4 h-4 flex items-center justify-center rounded-[3px] text-[8px] font-black border leading-none shadow-sm ${bg}`}>
                              {b}
                            </span>
                          );
                        })
                      )}
                    </div>
                    
                    {/* Target Condition */}
                    {targetRequired ? (
                      <div className="text-[9px] text-amber-400 font-bold tracking-tight bg-amber-500/10 border border-amber-500/20 px-1 py-0.5 rounded flex items-center gap-1 justify-center">
                        <Trophy className="w-2.5 h-2.5 shrink-0" />
                        <span className="truncate">Need {runsNeeded} of {ballsRemaining} Balls</span>
                      </div>
                    ) : (
                      <div className="text-[8px] text-emerald-400 font-bold tracking-widest bg-emerald-500/10 border border-emerald-500/20 px-1 py-0.5 rounded uppercase flex items-center gap-1 justify-center">
                        <Sparkles className="w-2.5 h-2.5 shrink-0" />
                        <span>Innings 1</span>
                      </div>
                    )}
                  </div>

                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </div>
  );
}
