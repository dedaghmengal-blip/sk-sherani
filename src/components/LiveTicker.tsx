import React from 'react';
import { MatchState } from '../types';
import { Trophy, Radio } from 'lucide-react';

interface LiveTickerProps {
  matchState: MatchState;
}

export default function LiveTicker({ matchState }: LiveTickerProps) {
  const { teamA, teamB, battingTeamIndex, bowlingTeamIndex, runs, wickets, overs, balls, strikerName, nonStrikerName, currentBowlerName, target, recentBalls, matchTitle } = matchState;

  if (!teamA.isRegistered || !teamB.isRegistered) {
    return (
      <div className="w-full bg-[#0a0a0a] border-t border-white/10 py-4 px-6 flex items-center justify-between text-white/70 font-sans shadow-lg text-xs">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse"></span>
          <span className="font-mono uppercase tracking-wider">Awaiting matches & players configuration...</span>
        </div>
        <div className="text-[10px] text-white/30 font-mono tracking-widest uppercase">SK CRICKET STADIUM NETWORKS</div>
      </div>
    );
  }

  const battingTeam = battingTeamIndex === 0 ? teamA : teamB;
  const bowlingTeam = bowlingTeamIndex === 0 ? teamA : teamB;

  // Retrieve player stats
  const striker = battingTeam.squad.find(p => p.name === strikerName);
  const nonStriker = battingTeam.squad.find(p => p.name === nonStrikerName);
  const bowler = bowlingTeam.squad.find(p => p.name === currentBowlerName);

  // Calculate target requirements
  const runsNeeded = target ? (target - runs) : 0;
  const totalBallsInInnings = 120; // 20 overs match
  const ballsBowledSoFar = (overs * 6) + balls;
  const ballsRemaining = Math.max(0, totalBallsInInnings - ballsBowledSoFar);

  return (
    <div className="w-full bg-[#050505] font-sans shadow-2xl border-t border-white/10 text-white select-none overflow-hidden" id="live-sport-ticker">
      {/* Top Main Scoreboard Bar */}
      <div className="flex flex-col md:flex-row items-stretch bg-black border-b border-white/10 text-xs">
        {/* Live indicator (Slanted background) */}
        <div className="bg-red-600 px-4 py-2.5 flex items-center justify-center gap-2 font-black tracking-widest text-center text-[10px] md:text-xs">
          <Radio className="w-4 h-4 animate-pulse text-white" />
          <span className="animate-pulse">LIVE</span>
        </div>
        
        {/* TV Slanted Score Block */}
        <div className="bg-green-600 h-full px-6 py-2.5 flex items-center font-black italic text-base skew-x-[-12deg] -ml-2 text-white shadow-lg relative z-10">
          <span className="skew-x-[12deg] uppercase tracking-tighter flex items-center gap-2">
            <span>{battingTeam.name.substring(0, 3).toUpperCase()}</span>
            <span>{runs}/{wickets}</span>
            <span className="text-[11px] font-mono text-white/80 font-normal ml-1">({overs}.{balls} OVS)</span>
          </span>
        </div>

        {/* Current Batsmen Stats with modern tags */}
        <div className="flex items-center gap-6 px-6 py-2.5 bg-black border-r border-white/10 overflow-x-auto min-w-[280px] scrollbar-none">
          {striker ? (
            <div className="flex items-center gap-1.5 text-xs shrink-0 font-mono">
              <span className="text-green-400 font-bold">*</span>
              <span className="text-white font-bold">{striker.name.toUpperCase()}</span>
              <span className="font-mono text-green-400 font-black bg-white/5 px-1.5 py-0.5 rounded ml-1 border border-white/10">
                {striker.runsScored}<span className="text-[10px] text-white/50 font-normal">({striker.ballsFaced})</span>
              </span>
            </div>
          ) : (
            <span className="text-white/40 text-[10px] uppercase font-mono italic">Awaiting Striker...</span>
          )}

          {nonStriker ? (
            <div className="flex items-center gap-1.5 text-xs shrink-0 border-l border-white/10 pl-6 font-mono">
              <span className="text-white/60 font-bold">{nonStriker.name.toUpperCase()}</span>
              <span className="font-mono text-white/60 bg-white/5 px-1.5 py-0.5 rounded ml-1 border border-white/10">
                {nonStriker.runsScored}<span className="text-[10px] text-white/40 font-normal">({nonStriker.ballsFaced})</span>
              </span>
            </div>
          ) : (
            <span className="text-white/40 text-[10px] uppercase font-mono italic border-l border-white/10 pl-6">Awaiting Batsman...</span>
          )}
        </div>

        {/* Bowler Details */}
        <div className="flex items-center gap-3 px-5 py-2.5 bg-[#0a0a0a] border-r border-white/10 min-w-[200px] font-mono">
          {bowler ? (
            <span className="text-xs text-white/70 flex items-center gap-1.5">
              <span className="text-white/30 uppercase tracking-tight text-[10px]">Ovs Bowler:</span>
              <strong className="text-white font-extrabold">{bowler.name.toUpperCase()}</strong>
              <span className="font-mono bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-yellow-400 font-bold">
                {bowler.wicketsTaken}-{bowler.runsConceded}
                <span className="text-[9px] text-white/40 ml-1">({bowler.oversBowled}.{bowler.ballsBowledInOver})</span>
              </span>
            </span>
          ) : (
            <span className="text-white/40 text-[10px] uppercase font-mono italic">Awaiting Bowler...</span>
          )}
        </div>

        {/* Target condition / status */}
        <div className="flex-1 px-5 py-2.5 bg-black flex items-center justify-between text-xs font-mono font-semibold text-yellow-500">
          {target ? (
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-400 animate-pulse" />
              <span className="uppercase tracking-wider">
                TARGET: <strong className="text-white text-sm">{target}</strong> | Need {runsNeeded} runs in {ballsRemaining} balls
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-white/40">
              <Trophy className="w-4 h-4 text-white/20" />
              <span className="uppercase tracking-widest text-[10px]">1st Innings | Project Score: {overs > 0 ? Math.round((runs / (overs + balls/6)) * 20) : "N/A"}</span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom ticker scrolling message bar & Recent Balls */}
      <div className="bg-white/10 text-white flex items-stretch h-8 select-none text-[10px] md:text-xs">
        {/* Mini Label */}
        <div className="bg-green-600 font-black px-4 flex items-center justify-center tracking-widest text-[9px] uppercase border-r border-white/10 italic">
          DELIVERIES STATUS
        </div>

        {/* Recent ball tags layout */}
        <div className="flex items-center gap-1.5 px-3 bg-black text-white min-w-[220px] font-mono font-bold tracking-tighter border-r border-white/10">
          {recentBalls.length === 0 ? (
            <span className="text-white/30 italic text-[10px] px-1 font-sans font-normal uppercase">Wait for bowls</span>
          ) : (
            recentBalls.map((b, idx) => {
              let bg = "bg-white/5 text-white border-white/10";
              if (b === "W") bg = "bg-red-600 text-white border-red-500 animate-pulse";
              if (b === "4") bg = "bg-blue-600 text-white border-blue-500";
              if (b === "6") bg = "bg-green-600 text-white border-green-500";
              if (b === "Wd" || b === "Nb") bg = "bg-yellow-600/25 text-yellow-500 border-yellow-500/50";
              return (
                <span key={idx} className={`w-5 h-5 flex items-center justify-center rounded text-[10px] font-black border shadow ${bg}`}>
                  {b}
                </span>
              );
            })
          )}
        </div>

        {/* Beautiful sports-ticker news ribbon */}
        <div className="flex-1 overflow-hidden relative flex items-center bg-[#070707] font-semibold tracking-widest">
          <div className="whitespace-nowrap flex items-center gap-16 absolute animate-[marquee_25s_linear_infinite] pl-4 text-white/65 font-bold uppercase text-[10px] tracking-[0.16em]">
            <span>★ {matchTitle.toUpperCase()} BROADCASTED BY SK SHERRANI LIVE STADIUM NETWORKS •</span>
            <span>ENGAGE WITH PUBLIC CHAT SYSTEM POWERED BY SK AI CHATBOT OR LEAVE CRICKET ANALYSIS BELOW •</span>
            <span>ADMINISTRATIVE CONTROL COMPASS MANAGED BY SECURITY TEAM • ENERGETIC UPDATES INSTANTLY TRANSMITTED •</span>
            <span>★ RUN RATIO AND RECORDINGS CONTINUOUSLY INDEXED TO SERVER Playbacks ★</span>
          </div>
        </div>
      </div>
    </div>
  );
}
