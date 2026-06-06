import React, { useState } from 'react';
import { MatchState, Team, Player } from '../types';
import { triggerHaptic } from '../utils/vibrate';
import { getApiUrl } from '../utils/api';
import { 
  User, Trophy, Activity, Award, Shield, CheckCircle, 
  TrendingUp, X, Loader, HelpCircle, ArrowRight, Zap,
  Users, Sparkles
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

interface StadiumScorecardProps {
  matchState: MatchState;
}

export default function StadiumScorecard({ matchState }: StadiumScorecardProps) {
  const { 
    teamA, teamB, battingTeamIndex, bowlingTeamIndex, runs, wickets, 
    overs, balls, strikerName, nonStrikerName, currentBowlerName, target,
    teamAOversHistory = [], teamBOversHistory = []
  } = matchState;

  const [activeTab, setActiveTab] = useState<'current_innings' | 'run_rate_chart' | 'player_comparison' | 'team_a' | 'team_b'>('current_innings');
  const [selectedPlayer, setSelectedPlayer] = useState<(Player & { teamName: string }) | null>(null);
  const [loadingPlayer, setLoadingPlayer] = useState<boolean>(false);
  const [player1Name, setPlayer1Name] = useState<string>('');
  const [player2Name, setPlayer2Name] = useState<string>('');

  if (!teamA.isRegistered || !teamB.isRegistered) {
    return null;
  }

  const battingTeam = battingTeamIndex === 0 ? teamA : teamB;
  const bowlingTeam = bowlingTeamIndex === 0 ? teamA : teamB;

  // Compute stats
  const totalOversVal = matchState.maxOvers || 20;
  const totalBallsInInnings = totalOversVal * 6; // dynamic overs
  const ballsBowledSoFar = (overs * 6) + balls;
  const ballsRemaining = Math.max(0, totalBallsInInnings - ballsBowledSoFar);
  const runsNeeded = target ? (target - runs) : 0;
  const currentRunRate = overs > 0 || balls > 0 ? (runs / (overs + balls / 6)).toFixed(2) : '0.00';
  const requiredRunRate = target && ballsRemaining > 0 ? ((runsNeeded / ballsRemaining) * 6).toFixed(2) : '0.00';

  // Live Win Predictor Engine
  const calculateWinProbability = () => {
    const totalOvers = matchState.maxOvers || 20;
    const totalBalls = totalOvers * 6;
    const currentBallsPlayed = (overs * 6) + balls;
    const ballsRemaining = Math.max(0, totalBalls - currentBallsPlayed);
    const opponentTeam = battingTeamIndex === 0 ? teamB : teamA;

    if (!target) {
      // ---- FIRST INNINGS ----
      let batProb = 50;
      const crr = currentBallsPlayed > 0 ? (runs / (currentBallsPlayed / 6)) : 7.2;
      const wicketsWeight = (10 - wickets) / 10; 
      const projectedAdditional = (ballsRemaining / 6) * (crr * 0.7 + 7.5 * 0.3) * wicketsWeight;
      const projectedFinalScore = Math.round(runs + projectedAdditional);
      const difference = projectedFinalScore - 150;
      batProb += difference * 0.4;
      batProb = Math.max(10, Math.min(90, Math.round(batProb)));
      
      const teamAChance = battingTeamIndex === 0 ? batProb : (100 - batProb);
      const teamBChance = battingTeamIndex === 0 ? (100 - batProb) : batProb;
      
      let reason = "";
      if (projectedFinalScore > 175) {
        reason = `${battingTeam.name} is batting aggressively, projecting a massive ~${projectedFinalScore} runs.`;
      } else if (projectedFinalScore < 125) {
        reason = `${opponentTeam.name}'s bowling has pinned down ${battingTeam.name} to a projected ~${projectedFinalScore} runs.`;
      } else {
        reason = `Evenly matched contest. ${battingTeam.name} is on pace to set a par target of around ${projectedFinalScore} runs.`;
      }
      
      return { teamAChance, teamBChance, reason };
    } else {
      // ---- SECOND INNINGS ----
      const runsNeeded = target - runs;
      const wicketsRemaining = 10 - wickets;
      
      if (runsNeeded <= 0) {
        return { 
          teamAChance: battingTeamIndex === 0 ? 100 : 0, 
          teamBChance: battingTeamIndex === 0 ? 0 : 100, 
          reason: `${battingTeam.name} has crossed the finish line and successfully chased down the target!`
        };
      }
      
      if (wicketsRemaining <= 0 || (ballsRemaining <= 0 && runsNeeded > 1)) {
        return { 
          teamAChance: battingTeamIndex === 0 ? 0 : 100, 
          teamBChance: battingTeamIndex === 0 ? 100 : 0, 
          reason: `${opponentTeam.name} dominates and successfully defended the target!`
        };
      }
      
      const requiredRunRate = (runsNeeded / Math.max(1, ballsRemaining)) * 6;
      const crr = currentBallsPlayed > 0 ? (runs / (currentBallsPlayed / 6)) : 0;
      let batProb = 50;
      
      const rateDiff = requiredRunRate - 8.0;
      batProb -= rateDiff * 8; 
      
      const wicketsLostFactor = (10 - wicketsRemaining) * 4.5;
      batProb -= wicketsLostFactor;
      
      const wicketsBuffer = wicketsRemaining - (runsNeeded / 20);
      batProb += wicketsBuffer * 4;
      
      if (ballsRemaining < 30) {
        const tightDiff = requiredRunRate - crr;
        if (tightDiff > 1) {
          batProb -= (30 - ballsRemaining) * 0.8 * tightDiff;
        }
      }
      
      batProb = Math.max(2, Math.min(98, Math.round(batProb)));
      
      const teamAChance = battingTeamIndex === 0 ? batProb : (100 - batProb);
      const teamBChance = battingTeamIndex === 0 ? (100 - batProb) : batProb;
      
      let reason = "";
      if (requiredRunRate > 12) {
        reason = `${opponentTeam.name} is highly favored as required run rate spikes to ${requiredRunRate.toFixed(2)} RPO.`;
      } else if (wicketsRemaining <= 2 && runsNeeded > 20) {
        reason = `${opponentTeam.name} owns the pitch with only ${wicketsRemaining} wickets left for the chasing team.`;
      } else if (requiredRunRate < 6) {
        reason = `${battingTeam.name} is cruising comfortably at ${requiredRunRate.toFixed(2)} needed RPO.`;
      } else {
        reason = `Outstanding climax! ${battingTeam.name} needs ${runsNeeded} runs in ${ballsRemaining} balls (Req RPO: ${requiredRunRate.toFixed(2)}).`;
      }
      
      return { teamAChance, teamBChance, reason };
    }
  };

  const winProb = calculateWinProbability();

  // Find Man of the Match candidate based on performance formula: Runs + (Wickets * 25) + matching boundaries lala
  const getManOfTheMatchCandidate = () => {
    let bestPlayer: Player | null = null;
    let bestTeamName = "";
    let maxPt = 0;

    const calcPoints = (p: Player) => {
      let pt = 0;
      pt += p.runsScored;
      pt += p.boundaries4 * 1;
      pt += p.boundaries6 * 2;
      pt += p.wicketsTaken * 25;
      if (p.runsScored >= 50) pt += 15;
      if (p.runsScored >= 100) pt += 30;
      return pt;
    };

    teamA.squad.forEach(p => {
      const pt = calcPoints(p);
      if (pt > maxPt) {
        maxPt = pt;
        bestPlayer = p;
        bestTeamName = teamA.name;
      }
    });

    teamB.squad.forEach(p => {
      const pt = calcPoints(p);
      if (pt > maxPt) {
        maxPt = pt;
        bestPlayer = p;
        bestTeamName = teamB.name;
      }
    });

    return { player: bestPlayer, teamName: bestTeamName, points: maxPt };
  };

  const motm = getManOfTheMatchCandidate();

  // Fetch individual player stats on hover or click
  const handlePlayerClick = async (playerName: string, teamName: string) => {
    triggerHaptic(25);
    setLoadingPlayer(true);
    // Pre-populate with current local copy to remain snappy.
    const localTeam = teamName === teamA.name ? teamA : teamB;
    const localPlayer = localTeam.squad.find(p => p.name === playerName);
    if (localPlayer) {
      setSelectedPlayer({ ...localPlayer, teamName });
    }

    try {
      // Real fetch to verify absolute synchronization
      const resp = await fetch(getApiUrl('/api/match/state'));
      if (resp.ok) {
        const freshState = await resp.json();
        const freshTeam = teamName === freshState.teamA.name ? freshState.teamA : freshState.teamB;
        const freshPlayer = freshTeam.squad.find((p: Player) => p.name === playerName);
        if (freshPlayer) {
          setSelectedPlayer({ ...freshPlayer, teamName });
        }
      }
    } catch (err) {
      console.warn("Could not sync fresher player stats, utilizing local cache.", err);
    } finally {
      setLoadingPlayer(false);
    }
  };

  // Recharts Run Rate progression compiler
  const compileChartData = () => {
    // Generate combined run rate data for the line chart
    const maxOvers = Math.max(teamAOversHistory.length, teamBOversHistory.length, 1);
    const dataPoints = [];

    // Always start with Over 0
    dataPoints.push({
      over: 0,
      overLabel: "Start",
      [teamA.name]: 0,
      [teamB.name]: 0,
      [teamA.name + "_score"]: "0/0",
      [teamB.name + "_score"]: "0/0"
    });

    for (let i = 1; i <= maxOvers; i++) {
      const aRec = teamAOversHistory.find(h => h.over === i);
      const bRec = teamBOversHistory.find(h => h.over === i);

      // If there are stats, plot them. If not, don't set value so the line terminates gracefully.
      dataPoints.push({
        over: i,
        overLabel: `Ov ${i}`,
        [teamA.name]: aRec ? aRec.runRate : undefined,
        [teamB.name]: bRec ? bRec.runRate : undefined,
        [teamA.name + "_score"]: aRec ? `${aRec.runs}/${aRec.wickets}` : undefined,
        [teamB.name + "_score"]: bRec ? `${bRec.runs}/${bRec.wickets}` : undefined
      });
    }

    return dataPoints;
  };

  const compileWinProbabilityChartData = () => {
    const maxOvers = Math.max(teamAOversHistory.length, teamBOversHistory.length, 1);
    const dataPoints = [];

    // Always start with 50-50
    dataPoints.push({
      over: 0,
      overLabel: "Start",
      [teamA.name]: 50,
      [teamB.name]: 50,
    });

    for (let i = 1; i <= maxOvers; i++) {
      const aRec = teamAOversHistory.find(h => h.over === i);
      const bRec = teamBOversHistory.find(h => h.over === i);

      // Map runs, wickets progression to dynamic dominance probability
      let probA = 50;
      let probB = 50;

      if (aRec) {
        const rpo = aRec.runs / Math.max(1, i);
        const overWickets = aRec.wickets;
        // Dominance grows with RPO (> 6.0 runs per over) and shrinks with wickets fell
        probA = Math.round(50 + (rpo - 6.5) * 8 - (overWickets * 5));
        probA = Math.max(10, Math.min(90, probA));
      }

      if (bRec) {
        const rpo = bRec.runs / Math.max(1, i);
        const overWickets = bRec.wickets;
        probB = Math.round(50 + (rpo - 6.5) * 8 - (overWickets * 5));
        probB = Math.max(10, Math.min(90, probB));
      }

      dataPoints.push({
        over: i,
        overLabel: `Ov ${i}`,
        [teamA.name]: aRec ? probA : undefined,
        [teamB.name]: bRec ? probB : undefined,
      });
    }

    return dataPoints;
  };

  const renderBatsmanTable = (team: Team) => {
    return (
      <div className="overflow-x-auto rounded-lg border border-white/10 bg-black min-w-full">
        <table className="min-w-full divide-y divide-white/10 text-[11px] font-mono select-none">
          <thead className="bg-[#0f0f0f] text-white/50 uppercase text-[9px] tracking-wider font-extrabold text-left">
            <tr>
              <th className="px-4 py-2.5 font-bold">BATSMAN (Click to inspect)</th>
              <th className="px-4 py-2.5 font-bold text-center">STATUS</th>
              <th className="px-4 py-2.5 font-bold text-right text-green-400">R</th>
              <th className="px-4 py-2.5 font-bold text-right">B</th>
              <th className="px-4 py-2.5 font-bold text-right">4s</th>
              <th className="px-4 py-2.5 font-bold text-right">6s</th>
              <th className="px-4 py-2.5 font-bold text-right text-yellow-500">SR</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 bg-[#050505]">
            {team.squad.map((player) => {
              const isStriker = player.name === strikerName;
              const isNonStriker = player.name === nonStrikerName;
              const isActive = (isStriker || isNonStriker) && matchState.battingTeamIndex === (team === battingTeam ? battingTeamIndex : 1 - battingTeamIndex);
              const strikeRate = player.ballsFaced > 0 ? ((player.runsScored / player.ballsFaced) * 100).toFixed(1) : "0.0";

              return (
                <tr 
                  key={player.name}
                  className={`transition group border-b border-white/[0.02] ${
                    isActive 
                      ? 'bg-green-600/10 text-white border-l-2 border-l-green-500' 
                      : 'hover:bg-white/5 text-white/80'
                  }`}
                >
                  <td className="px-4 py-3 font-bold truncate max-w-[150px]">
                    <button 
                      onClick={() => handlePlayerClick(player.name, team.name)}
                      className="text-left font-bold focus:outline-none flex items-center gap-1.5 transition text-slate-100 hover:text-green-400 hover:underline cursor-pointer"
                    >
                      {isActive && <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shrink-0"></span>}
                      <span className={isStriker ? 'text-green-400' : ''}>
                        {player.name} {isStriker && '*'}
                      </span>
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center text-white/40 max-w-[120px] truncate">
                    {player.isOut ? (
                      <span className="text-red-400 text-[10px] bg-red-950/25 border border-red-900/35 px-1.5 py-0.5 rounded">
                        {player.outHow || 'Out'}
                      </span>
                    ) : isActive ? (
                      <span className="text-green-400 text-[10px] bg-green-950/25 border border-green-900/35 px-1.5 py-0.5 rounded font-black animate-pulse">
                        Batting
                      </span>
                    ) : player.runsScored > 0 || player.ballsFaced > 0 ? (
                      <span className="text-white/40">Not Out</span>
                    ) : (
                      <span className="text-white/20 select-none">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-black text-xs text-green-400">
                    {player.runsScored}
                  </td>
                  <td className="px-4 py-3 text-right text-white/60">
                    {player.ballsFaced}
                  </td>
                  <td className="px-4 py-3 text-right text-white/45">
                    {player.boundaries4}
                  </td>
                  <td className="px-4 py-3 text-right text-white/45">
                    {player.boundaries6}
                  </td>
                  <td className="px-4 py-3 text-right text-yellow-500 font-extrabold">
                    {strikeRate}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const renderBowlerTable = (team: Team) => {
    return (
      <div className="overflow-x-auto rounded-lg border border-white/10 bg-black min-w-full">
        <table className="min-w-full divide-y divide-white/10 text-[11px] font-mono select-none">
          <thead className="bg-[#0f0f0f] text-white/50 uppercase text-[9px] tracking-wider font-extrabold text-left">
            <tr>
              <th className="px-4 py-2.5 font-bold">BOWLER (Click to inspect)</th>
              <th className="px-4 py-2.5 font-bold text-center">OVER.BALLS</th>
              <th className="px-4 py-2.5 font-bold text-right text-red-400">W</th>
              <th className="px-4 py-2.5 font-bold text-right font-semibold">RUNS CONC.</th>
              <th className="px-4 py-2.5 font-bold text-right text-yellow-500">ECON</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 bg-[#050505]">
            {team.squad.map((player) => {
              const isActive = player.name === currentBowlerName && matchState.bowlingTeamIndex === (team === battingTeam ? battingTeamIndex : 1 - battingTeamIndex);
              const econNumerator = player.runsConceded;
              const econDenominator = player.oversBowled + (player.ballsBowledInOver / 6);
              const economy = econDenominator > 0 ? (econNumerator / econDenominator).toFixed(2) : "0.00";

              // Show players with bowling action history or active stats first
              if (player.oversBowled === 0 && player.ballsBowledInOver === 0 && !isActive) {
                return null; // hide non-bowlers for clarity, we'll list them below
              }

              return (
                <tr 
                  key={player.name}
                  className={`transition group border-b border-white/[0.02] ${
                    isActive 
                      ? 'bg-blue-600/10 text-white border-l-2 border-l-blue-500' 
                      : 'hover:bg-white/5 text-white/80'
                  }`}
                >
                  <td className="px-4 py-3 font-bold truncate">
                    <button 
                      onClick={() => handlePlayerClick(player.name, team.name)}
                      className="text-left font-bold focus:outline-none flex items-center gap-1.5 transition text-slate-100 hover:text-blue-400 hover:underline cursor-pointer"
                    >
                      {isActive && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shrink-0"></span>}
                      <span className={isActive ? 'text-blue-400' : ''}>
                        {player.name} {isActive && '(Active)'}
                      </span>
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-white/80">
                    {player.oversBowled}.{player.ballsBowledInOver}
                  </td>
                  <td className="px-4 py-3 text-right font-black text-red-400 text-xs">
                    {player.wicketsTaken}
                  </td>
                  <td className="px-4 py-3 text-right text-white/60">
                    {player.runsConceded}
                  </td>
                  <td className="px-4 py-3 text-right text-yellow-500 font-extrabold">
                    {economy}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const allPlayersList = [
    ...teamA.squad.map(p => ({ ...p, teamName: teamA.name })),
    ...teamB.squad.map(p => ({ ...p, teamName: teamB.name }))
  ];

  const defaultP1 = strikerName || teamA.squad[0]?.name || '';
  const defaultP2 = currentBowlerName || teamB.squad[0]?.name || teamA.squad[1]?.name || '';

  const activeP1Name = player1Name || defaultP1;
  const activeP2Name = player2Name || defaultP2;

  const player1Obj = allPlayersList.find(p => p.name === activeP1Name);
  const player2Obj = allPlayersList.find(p => p.name === activeP2Name);

  const renderComparisonRow = (label: string, val1: number | string, val2: number | string) => {
    const num1 = parseFloat(val1.toString()) || 0;
    const num2 = parseFloat(val2.toString()) || 0;
    
    // Find percentage distribution
    const sum = num1 + num2;
    let percent1 = 50;
    let percent2 = 50;
    if (sum > 0) {
      percent1 = (num1 / sum) * 100;
      percent2 = (num2 / sum) * 100;
    }
    
    const isEcon = label.toLowerCase().includes('econ') || label.toLowerCase().includes('economy');
    const isBetter1 = isEcon 
      ? (num1 > 0 && (num2 === 0 || num1 < num2)) 
      : (num1 > num2);
    const isBetter2 = isEcon 
      ? (num2 > 0 && (num1 === 0 || num2 < num1)) 
      : (num2 > num1);

    return (
      <div className="space-y-1">
        <div className="flex justify-between items-center text-[10px] font-mono select-none">
          <span className={`w-24 text-left font-bold transition truncate ${isBetter1 ? 'text-amber-400 scale-102 font-black' : 'text-white/60'}`}>
            {val1} {isBetter1 && '🏆'}
          </span>
          <span className="text-white/40 uppercase text-[9px] font-semibold tracking-wide text-center">
            {label}
          </span>
          <span className={`w-24 text-right font-bold transition truncate ${isBetter2 ? 'text-amber-400 scale-102 font-black' : 'text-white/60'}`}>
            {isBetter2 && '🏆'} {val2}
          </span>
        </div>
        
        <div className="h-1.5 rounded-full bg-stone-950 overflow-hidden flex border border-white/[0.03]">
          <div 
            style={{ width: `${percent1}%` }} 
            className={`transition-all duration-300 h-full ${isBetter1 ? 'bg-amber-500' : 'bg-stone-800'}`}
          />
          <div 
            style={{ width: `${percent2}%` }} 
            className={`transition-all duration-300 h-full ${isBetter2 ? 'bg-amber-500' : 'bg-stone-800'}`}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="bg-[#0a0a0a] border border-white/10 rounded-xl overflow-hidden font-sans shadow-xl text-left" id="live-innings-scorecard-section">
      
      {/* 1. Header & Navigation Toggles */}
      <div className="bg-[#0c0c0c] p-4 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="bg-green-600/10 p-2 rounded text-green-500">
            <Activity className="w-5 h-5 text-green-500 animate-pulse" />
          </div>
          <div>
            <h3 className="font-extrabold text-xs text-white tracking-wider uppercase">
              LIVE SCOREBOARD & INNINGS RECORDS
            </h3>
            <p className="text-[10px] text-white/40">Complete deliveries records and player scorecards</p>
          </div>
        </div>

        {/* Options tabs selector */}
        <div className="flex bg-black p-1 rounded border border-white/10 text-[9px] sm:text-[10px] font-bold self-stretch md:self-auto shrink-0 overflow-x-auto max-w-full whitespace-nowrap gap-1 scrollbar-thin">
          <button
            onClick={() => {
              triggerHaptic(20);
              setActiveTab('current_innings');
            }}
            className={`px-3 py-1.5 rounded transition uppercase flex items-center gap-1 cursor-pointer shrink-0 ${
              activeTab === 'current_innings'
                ? 'bg-green-600 text-white font-black'
                : 'text-white/40 hover:text-white'
            }`}
          >
            <Trophy className="w-3 h-3" />
            Live Inning
          </button>

          <button
            onClick={() => {
              triggerHaptic(20);
              setActiveTab('run_rate_chart');
            }}
            className={`px-3 py-1.5 rounded transition uppercase flex items-center gap-1 cursor-pointer shrink-0 ${
              activeTab === 'run_rate_chart'
                ? 'bg-green-600 text-white font-black'
                : 'text-white/40 hover:text-white'
            }`}
          >
            <TrendingUp className="w-3 h-3" />
            📈 Run Rates
          </button>
          
          <button
            onClick={() => {
              triggerHaptic(20);
              setActiveTab('team_a');
            }}
            className={`px-3 py-1.5 rounded transition uppercase flex items-center gap-1 cursor-pointer shrink-0 ${
              activeTab === 'team_a'
                ? 'bg-green-600 text-white font-black'
                : 'text-white/40 hover:text-white'
            }`}
          >
            {teamA.name.substring(0, 10).toUpperCase()}..
          </button>

          <button
            onClick={() => {
              triggerHaptic(20);
              setActiveTab('team_b');
            }}
            className={`px-3 py-1.5 rounded transition uppercase flex items-center gap-1 cursor-pointer shrink-0 ${
              activeTab === 'team_b'
                ? 'bg-green-600 text-white font-black'
                : 'text-white/40 hover:text-white'
            }`}
          >
            {teamB.name.substring(0, 10).toUpperCase()}..
          </button>

          <button
            onClick={() => {
              triggerHaptic(20);
              setActiveTab('player_comparison');
            }}
            className={`px-3 py-1.5 rounded transition uppercase flex items-center gap-1 cursor-pointer shrink-0 ${
              activeTab === 'player_comparison'
                ? 'bg-green-600 text-white font-black'
                : 'text-white/40 hover:text-white'
            }`}
          >
            <Users className="w-3 h-3" />
            Compare Players
          </button>
        </div>
      </div>

      {/* 2. Mini Television Info Bar */}
      <div className="bg-[#050505] px-6 py-3 border-b border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-white/5 font-mono text-[11px]">
        
        <div className="pt-2 sm:pt-0">
          <span className="text-white/30 uppercase text-[9px] block">Current Batting</span>
          <span className="text-white font-bold block truncate">{battingTeam.name.toUpperCase()}</span>
          <span className="text-green-400 font-extrabold text-base mt-1 block">
            {runs}/{wickets} <span className="text-[11px] text-white/50 font-normal">({overs}.{balls} Ovs)</span>
          </span>
        </div>

        <div className="pl-0 sm:pl-4 pt-2 sm:pt-0">
          <span className="text-white/30 uppercase text-[9px] block">Run Ratio Rate (CRR)</span>
          <span className="text-yellow-500 font-extrabold text-base mt-2 block">{currentRunRate}</span>
        </div>

        <div className="pl-0 sm:pl-4 pt-2 sm:pt-0">
          {target ? (
            <>
              <span className="text-white/30 uppercase text-[9px] block">Target Requirements</span>
              <span className="text-white font-bold block">TARGET: {target}</span>
              <span className="text-green-400 font-extrabold text-[10px] block mt-1">Need {runsNeeded} runs in {ballsRemaining} deliveries</span>
            </>
          ) : (
            <>
              <span className="text-white/30 uppercase text-[9px] block">Estimated Total Score</span>
              <span className="text-white/70 block mt-1">Projecting 20 Ovs:</span>
              <span className="text-green-500 font-extrabold text-base block font-mono">
                {overs > 0 ? Math.round((runs / (overs + balls/6)) * 20) : "N/A"}
              </span>
            </>
          )}
        </div>

        <div className="pl-0 sm:pl-4 pt-2 sm:pt-0">
          {target ? (
            <>
              <span className="text-white/30 uppercase text-[9px] block">Required Runtempo (RRR)</span>
              <span className="text-red-400 font-extrabold text-base mt-2 block">{requiredRunRate}</span>
            </>
          ) : (
            <>
              <span className="text-white/30 uppercase text-[9px] block">Innings Session</span>
              <span className="text-green-500 font-extrabold text-xs mt-2 block font-mono flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5 text-green-500" /> {matchState.inningsCount === 2 ? "Second Innings" : matchState.inningsCount === 3 ? "Third Innings" : matchState.inningsCount === 4 ? "Fourth Innings" : `Innings ${matchState.inningsCount || 1}`} Active
              </span>
            </>
          )}
        </div>
      </div>

      {/* 2.5 Toss Notification Banner */}
      {matchState.tossText && (
        <div className="bg-[#0c0c0c] border-b border-white/10 px-6 py-2.5 flex items-center gap-2 font-mono text-[10px] select-none text-amber-400">
          <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0 animate-pulse" />
          <span className="font-extrabold uppercase text-[9px] tracking-widest text-amber-500">Toss Result:</span>
          <span className="text-white/90 font-sans font-medium">{matchState.tossText}</span>
        </div>
      )}

      {/* 3. Detailed Sheets / Progress Chart Display */}
      <div className="p-4 bg-black/60 space-y-6">

        {/* Live Analytics Dashboard: Live Win Predictor & Man of the Match Candidate */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Column 1: Dynamic Win Predictor Bar */}
          <div className="bg-[#0c0c0c] border border-white/10 rounded-xl p-4 space-y-3 font-mono flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-amber-400 font-extrabold uppercase flex items-center gap-1.5 tracking-wider">
                  <TrendingUp className="w-4 h-4 text-amber-500" />
                  LIVE MATCH WIN PROBABILITY
                </span>
                <span className="text-[9px] bg-[#fbbf24]/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded uppercase font-black tracking-widest animate-pulse">
                  Predictor Eye
                </span>
              </div>

              <div className="space-y-1.5">
                <div className="h-3 rounded-full bg-stone-900 overflow-hidden flex border border-white/5">
                  <div 
                    style={{ width: `${winProb.teamAChance}%` }} 
                    className="bg-emerald-500 transition-all duration-500 ease-out h-full"
                    title={`${teamA.name}: ${winProb.teamAChance}%`}
                  />
                  <div 
                    style={{ width: `${winProb.teamBChance}%` }} 
                    className="bg-blue-500 transition-all duration-500 ease-out h-full"
                    title={`${teamB.name}: ${winProb.teamBChance}%`}
                  />
                </div>
                
                <div className="flex justify-between items-center text-[10px] font-bold">
                  <span className="text-emerald-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded bg-emerald-500"></span>
                    {teamA.name.toUpperCase()}: {winProb.teamAChance}%
                  </span>
                  <span className="text-blue-400 flex items-center gap-1">
                    {teamB.name.toUpperCase()}: {winProb.teamBChance}%
                    <span className="w-2 h-2 rounded bg-blue-500 ml-1"></span>
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-black/65 p-3 rounded-lg border border-white/5 text-[11px] text-zinc-300 leading-relaxed font-sans flex items-start gap-2.5 mt-3">
              <span className="text-amber-500 text-sm mt-0.5 shrink-0">🤖</span>
              <div>
                <span className="font-bold text-amber-400 block sm:inline mr-1">Predictive Analysis:</span> 
                <span>{winProb.reason}</span>
              </div>
            </div>
          </div>

          {/* Column 2: Man of the Match Candidate Tracker */}
          <div className="bg-[#0c0c0c] border border-white/10 rounded-xl p-4 space-y-3 font-mono flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-yellow-500 font-extrabold uppercase flex items-center gap-1.5 tracking-wider">
                  <Award className="w-4 h-4 text-yellow-500 animate-[pulse_1.5s_infinite]" />
                  MAN OF THE MATCH NOMINEE
                </span>
                <span className="text-[9px] bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 px-2 py-0.5 rounded uppercase font-black tracking-widest">
                  Live Nominee
                </span>
              </div>

              {motm.player ? (
                <div className="flex items-center gap-3.5 bg-black/40 p-3 rounded-lg border border-white/5">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-yellow-500/20 to-amber-600/30 border border-yellow-500/30 flex items-center justify-center shrink-0 shadow-lg shadow-yellow-500/5">
                    <Trophy className="w-5 h-5 text-yellow-500 animate-bounce" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-white tracking-tight truncate flex items-center gap-1.5">
                      {motm.player.name}
                      <span className="text-[7.5px] font-black uppercase tracking-widest px-1.5 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 py-0.5 rounded">
                        {motm.points} pts
                      </span>
                    </div>
                    <div className="text-[9px] text-white/50 uppercase tracking-widest mt-0.5 truncate0">
                      🏏 {motm.teamName}
                    </div>
                    
                    <div className="flex items-center gap-3 mt-2 text-[10px] font-mono text-zinc-400">
                      {motm.player.runsScored > 0 && (
                        <span>Bat: <strong className="text-white">{motm.player.runsScored}</strong>r ({motm.player.ballsFaced}b)</span>
                      )}
                      {motm.player.wicketsTaken > 0 && (
                        <span>Bowl: <strong className="text-green-400">{motm.player.wicketsTaken}</strong>w</span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-black/30 p-4 border border-dashed border-white/10 rounded-lg text-center py-5 space-y-1.5">
                  <Sparkles className="w-5 h-5 text-stone-500 mx-auto" />
                  <p className="text-[11px] text-stone-400 font-sans">
                    Match updates are analyzing... 
                  </p>
                  <p className="text-[9px] text-stone-600 uppercase tracking-widest font-mono">
                    Nominees appear when score actions begin lala!
                  </p>
                </div>
              )}
            </div>

            <div className="bg-black/65 p-3 rounded-lg border border-white/5 text-[11px] text-zinc-300 leading-relaxed font-sans flex items-start gap-2.5 mt-3">
              <span className="text-yellow-500 text-sm mt-0.5 shrink-0">📊</span>
              <div>
                <span className="font-bold text-yellow-400 block sm:inline mr-1">Nomination Formula:</span>
                <span className="text-zinc-400 text-[10.5px]">
                  Points computed using Runs (+1), boundaries (+1/+2 BONUS), boundaries milestones, and Wickets (+25)!
                </span>
              </div>
            </div>
          </div>

        </div>
        
        {activeTab === 'current_innings' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Active Batting statistics (8 cols) */}
            <div className="lg:col-span-7 space-y-3">
              <div className="flex items-center justify-between border-b border-white/5 pb-1">
                <h4 className="text-[10px] font-extrabold text-green-400 uppercase tracking-widest font-mono">
                  {battingTeam.name.toUpperCase()} BATTING CARD
                </h4>
                <span className="text-[9px] font-mono text-white/35">Click player to inspect detailed performance card</span>
              </div>
              {renderBatsmanTable(battingTeam)}
            </div>

            {/* Active Bowling statistics (5 cols) */}
            <div className="lg:col-span-5 space-y-3">
              <div className="flex items-center justify-between border-b border-white/5 pb-1">
                <h4 className="text-[10px] font-extrabold text-blue-400 uppercase tracking-widest font-mono">
                  {bowlingTeam.name.toUpperCase()} BOWLING CARD
                </h4>
                <span className="text-[9px] font-mono text-white/35">Overs completed records</span>
              </div>
              {renderBowlerTable(bowlingTeam)}
            </div>
          </div>
        ) : activeTab === 'run_rate_chart' ? (
          /* Recharts visual line graph representer */
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/5 pb-2 gap-2">
              <div>
                <h4 className="text-[10px] font-extrabold text-amber-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-amber-500" />
                  OVER-BY-OVER TEAM RUN RATE ANALYSIS
                </h4>
                <span className="text-[9px] font-mono text-white/40">Visual comparison of batting paces across completed innings</span>
              </div>
              <div className="flex gap-4 text-[10px] uppercase font-mono">
                <span className="flex items-center gap-1.5 font-bold"><span className="w-2.5 h-2.5 rounded bg-green-500 block"></span> {teamA.name} ({teamAOversHistory.length} Ovs)</span>
                <span className="flex items-center gap-1.5 font-bold"><span className="w-2.5 h-2.5 rounded bg-blue-500 block"></span> {teamB.name} ({teamBOversHistory.length} Ovs)</span>
              </div>
            </div>

            {teamAOversHistory.length === 0 && teamBOversHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-16 text-center bg-black/40 border border-white/5 rounded-lg space-y-2">
                <HelpCircle className="w-8 h-8 text-white/25" />
                <p className="text-xs text-white/60 font-bold font-mono uppercase tracking-wider">No completed overs recorded yet</p>
                <p className="text-[10px] text-white/40 max-w-sm">Completed overs stats (run rates per over) will populate the progression lines here as score updates proceed!</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* 1. RUN RATE PROGESSION LINE CHART */}
                <div className="h-72 w-full bg-black/50 p-3 rounded-lg border border-white/5">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={compileChartData()}
                      margin={{ top: 10, right: 30, left: -10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
                      <XAxis 
                        dataKey="overLabel" 
                        stroke="#888888" 
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis 
                        stroke="#888888" 
                        fontSize={10} 
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `${value} r/o`}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            const showA = data[teamA.name] !== undefined || data[teamA.name + "_score"];
                            const showB = data[teamB.name] !== undefined || data[teamB.name + "_score"];
                            return (
                              <div className="bg-neutral-900 border border-white/10 p-3 rounded shadow-xl text-[11px] font-mono text-left max-w-[200px] leading-relaxed">
                                <p className="text-slate-300 font-extrabold mb-1.5 uppercase font-sans tracking-wide">Over {data.over}</p>
                                {showA && (
                                  <div className="space-y-0.5 border-b border-white/5 pb-1 mb-1">
                                    <p className="text-green-400 font-bold flex justify-between items-center whitespace-nowrap gap-4 uppercase text-[10px]">
                                      <span>● {teamA.name.substring(0,10)}..</span>
                                      <span>RR: {data[teamA.name]}</span>
                                    </p>
                                    <p className="text-white/45 text-[9px]">Cumulative: {data[teamA.name + "_score"] || "0/0"}</p>
                                  </div>
                                )}
                                {showB && (
                                  <div className="space-y-0.5">
                                    <p className="text-blue-400 font-bold flex justify-between items-center whitespace-nowrap gap-4 uppercase text-[10px]">
                                      <span>● {teamB.name.substring(0,10)}..</span>
                                      <span>RR: {data[teamB.name]}</span>
                                    </p>
                                    <p className="text-white/45 text-[9px]">Cumulative: {data[teamB.name + "_score"] || "0/0"}</p>
                                  </div>
                                )}
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey={teamA.name} 
                        name={teamA.name}
                        stroke="#10b981" 
                        strokeWidth={3}
                        activeDot={{ r: 6 }} 
                        connectNulls
                      />
                      <Line 
                        type="monotone" 
                        dataKey={teamB.name} 
                        name={teamB.name}
                        stroke="#3b82f6" 
                        strokeWidth={3}
                        activeDot={{ r: 6 }}
                        connectNulls
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* 2. OVER-BY-OVER WIN PROBABILITY (DOMINANCE OVER TIME) CHART */}
                <div className="pt-4 border-t border-white/5 space-y-3">
                  <div>
                    <h4 className="text-[10px] font-extrabold text-[#3b82f6] uppercase tracking-widest font-mono flex items-center gap-1.5 align-middle">
                      <Activity className="w-4 h-4 text-blue-500 animate-[pulse_2s_infinite]" />
                      LIVE MATCH DOMINANCE HISTORY (WIN PROBABILITY PER OVER)
                    </h4>
                    <span className="text-[9px] font-mono text-white/40">Visualizing structural progression swings and pitch momentum per completed over</span>
                  </div>

                  <div className="h-64 w-full bg-black/50 p-3 rounded-lg border border-white/5">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={compileWinProbabilityChartData()}
                        margin={{ top: 10, right: 30, left: -10, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
                        <XAxis 
                          dataKey="overLabel" 
                          stroke="#888888" 
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis 
                          stroke="#888888" 
                          fontSize={10} 
                          tickLine={false}
                          axisLine={false}
                          domain={[10, 90]}
                          tickFormatter={(value) => `${value}%`}
                        />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              const showA = data[teamA.name] !== undefined;
                              const showB = data[teamB.name] !== undefined;
                              return (
                                <div className="bg-neutral-900 border border-white/10 p-3 rounded shadow-xl text-[11px] font-mono text-left max-w-[200px] leading-relaxed">
                                  <p className="text-slate-300 font-extrabold mb-1.5 uppercase font-sans tracking-wide">Over {data.over} Dominance</p>
                                  {showA && (
                                    <p className="text-green-400 font-bold flex justify-between items-center whitespace-nowrap gap-4 uppercase text-[10px] border-b border-white/5 pb-1 mb-1">
                                      <span>● {teamA.name.substring(0,10)}..</span>
                                      <span>{data[teamA.name]}% win chance</span>
                                    </p>
                                  )}
                                  {showB && (
                                    <p className="text-blue-400 font-bold flex justify-between items-center whitespace-nowrap gap-4 uppercase text-[10px]">
                                      <span>● {teamB.name.substring(0,10)}..</span>
                                      <span>{data[teamB.name]}% win chance</span>
                                    </p>
                                  )}
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey={teamA.name} 
                          name={teamA.name}
                          stroke="#10b981" 
                          strokeWidth={3}
                          activeDot={{ r: 6 }} 
                          connectNulls
                        />
                        <Line 
                          type="monotone" 
                          dataKey={teamB.name} 
                          name={teamB.name}
                          stroke="#3b82f6" 
                          strokeWidth={3}
                          activeDot={{ r: 6 }}
                          connectNulls
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>
            )}
          </div>
        ) : activeTab === 'player_comparison' ? (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="border-b border-white/5 pb-2 flex items-center justify-between">
              <div>
                <h4 className="text-[10px] font-extrabold text-amber-500 uppercase tracking-widest font-mono flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-amber-500" />
                  SQUAD DEBATE & PLAYER STATS COMPARISON
                </h4>
                <p className="text-[9px] font-mono text-white/40">Select any two players across teams to compare their stats side by side</p>
              </div>
              <span className="text-[9px] font-mono text-amber-500 bg-amber-950/20 px-2 py-0.5 rounded border border-amber-900/35 uppercase font-bold tracking-wider animate-pulse flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500 fill-amber-500" /> Player comparison
              </span>
            </div>

            {/* Selection bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-stone-900/40 p-3 rounded-lg border border-white/5 space-y-1.5 text-left">
                <span className="text-[9px] text-emerald-400 font-mono font-bold uppercase block tracking-wider">🌟 Challenger A</span>
                <select
                  value={activeP1Name}
                  onChange={(e) => setPlayer1Name(e.target.value)}
                  className="w-full bg-black border border-white/10 text-white font-mono rounded px-3 py-1.5 text-xs focus:ring-1 focus:ring-emerald-500/50 focus:outline-none cursor-pointer"
                >
                  {allPlayersList.map(p => (
                    <option key={`p1-sel-${p.name}`} value={p.name}>
                      [{p.teamName.substring(0,6).toUpperCase()}] {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-stone-900/40 p-3 rounded-lg border border-white/5 space-y-1.5 text-left">
                <span className="text-[9px] text-blue-400 font-mono font-bold uppercase block tracking-wider">🌟 Challenger B</span>
                <select
                  value={activeP2Name}
                  onChange={(e) => setPlayer2Name(e.target.value)}
                  className="w-full bg-black border border-white/10 text-white font-mono rounded px-3 py-1.5 text-xs focus:ring-1 focus:ring-blue-500/50 focus:outline-none cursor-pointer"
                >
                  {allPlayersList.map(p => (
                    <option key={`p2-sel-${p.name}`} value={p.name}>
                      [{p.teamName.substring(0,6).toUpperCase()}] {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Results Grid representation */}
            {player1Obj && player2Obj ? (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 bg-[#030303] p-5 rounded-xl border border-white/5">
                
                {/* Left Challenger Details */}
                <div className="md:col-span-3 bg-stone-950 border border-white/10 rounded-lg p-4 text-center space-y-3 flex flex-col justify-center">
                  <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center border text-xl font-bold bg-emerald-500/10 border-emerald-500/20 text-emerald-400">
                    {player1Obj.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h5 className="font-extrabold text-sm text-white truncate max-w-full">{player1Obj.name}</h5>
                    <p className="text-[9px] uppercase font-mono text-white/40 mt-1">{player1Obj.teamName}</p>
                  </div>
                  <div className="pt-2">
                    <span className="text-[9px] px-2.5 py-0.5 rounded text-emerald-400 bg-emerald-950/20 border border-emerald-900/35 uppercase font-bold tracking-wider">
                      {player1Obj.isOut ? "OUT" : player1Obj.runsScored > 0 || player1Obj.ballsFaced > 0 ? "BATTING" : player1Obj.status || "READY"}
                    </span>
                  </div>
                </div>

                {/* Central Comparative Matrix */}
                <div className="md:col-span-6 space-y-4">
                  <div className="bg-[#090909] border border-white/10 rounded-lg p-4 space-y-4 shadow-inner">
                    
                    <div className="text-[9px] text-white/50 uppercase font-mono border-b border-white/5 pb-1 text-center font-extrabold tracking-widest bg-white/[0.01]">
                      🏏 BATTING STATISTICS
                    </div>
                    {renderComparisonRow("Runs Scored", player1Obj.runsScored, player2Obj.runsScored)}
                    {renderComparisonRow("Balls Faced", player1Obj.ballsFaced, player2Obj.ballsFaced)}
                    {renderComparisonRow("Fours (4s)", player1Obj.boundaries4, player2Obj.boundaries4)}
                    {renderComparisonRow("Sixes (6s)", player1Obj.boundaries6, player2Obj.boundaries6)}
                    {renderComparisonRow(
                      "Strike Rate", 
                      player1Obj.ballsFaced > 0 ? ((player1Obj.runsScored / player1Obj.ballsFaced) * 100).toFixed(1) : "0.0",
                      player2Obj.ballsFaced > 0 ? ((player2Obj.runsScored / player2Obj.ballsFaced) * 100).toFixed(1) : "0.0"
                    )}

                    <div className="text-[9px] text-white/50 uppercase font-mono border-b border-white/5 pb-1 mt-6 text-center font-extrabold tracking-widest bg-white/[0.01]">
                      🛡️ BOWLING STATISTICS
                    </div>
                    {renderComparisonRow(
                      "Overs Bowled", 
                      `${player1Obj.oversBowled}.${player1Obj.ballsBowledInOver}`, 
                      `${player2Obj.oversBowled}.${player2Obj.ballsBowledInOver}`
                    )}
                    {renderComparisonRow("Wickets Taken", player1Obj.wicketsTaken, player2Obj.wicketsTaken)}
                    {renderComparisonRow("Runs Conceded", player1Obj.runsConceded, player2Obj.runsConceded)}
                    {renderComparisonRow(
                      "Economy Rate", 
                      (player1Obj.oversBowled + player1Obj.ballsBowledInOver/6) > 0 
                        ? (player1Obj.runsConceded / (player1Obj.oversBowled + player1Obj.ballsBowledInOver/6)).toFixed(2) 
                        : "0.00",
                      (player2Obj.oversBowled + player2Obj.ballsBowledInOver/6) > 0 
                        ? (player2Obj.runsConceded / (player2Obj.oversBowled + player2Obj.ballsBowledInOver/6)).toFixed(2) 
                        : "0.00"
                    )}

                  </div>
                </div>

                {/* Right Challenger Details */}
                <div className="md:col-span-3 bg-stone-950 border border-white/10 rounded-lg p-4 text-center space-y-3 flex flex-col justify-center">
                  <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center border text-xl font-bold bg-blue-500/10 border-blue-500/20 text-blue-400">
                    {player2Obj.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h5 className="font-extrabold text-sm text-white truncate max-w-full">{player2Obj.name}</h5>
                    <p className="text-[9px] uppercase font-mono text-white/40 mt-1">{player2Obj.teamName}</p>
                  </div>
                  <div className="pt-2">
                    <span className="text-[9px] px-2.5 py-0.5 rounded text-blue-400 bg-blue-950/20 border border-blue-900/35 uppercase font-bold tracking-wider">
                      {player2Obj.isOut ? "OUT" : player2Obj.runsScored > 0 || player2Obj.ballsFaced > 0 ? "BATTING" : player2Obj.status || "READY"}
                    </span>
                  </div>
                </div>

              </div>
            ) : (
              <div className="text-center p-8 bg-neutral-900/10 rounded border border-white/5 text-white/40 font-mono text-xs">
                Challengers state not found. Select players above.
              </div>
            )}
          </div>
        ) : activeTab === 'team_a' ? (
          <div className="space-y-4">
            <h4 className="text-[10px] font-extrabold text-white/50 uppercase tracking-widest font-mono border-b border-white/5 pb-1">
              {teamA.name.toUpperCase()} DETAILED SCORECARD
            </h4>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-2">
                <h5 className="text-[9px] text-green-400 font-bold uppercase tracking-wider font-mono">Squad Batting Records</h5>
                {renderBatsmanTable(teamA)}
              </div>
              <div className="space-y-2">
                <h5 className="text-[9px] text-blue-400 font-bold uppercase tracking-wider font-mono">Squad Bowling Records</h5>
                {renderBowlerTable(teamA)}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <h4 className="text-[10px] font-extrabold text-white/50 uppercase tracking-widest font-mono border-b border-white/5 pb-1">
              {teamB.name.toUpperCase()} DETAILED SCORECARD
            </h4>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-2">
                <h5 className="text-[9px] text-green-400 font-bold uppercase tracking-wider font-mono">Squad Batting Records</h5>
                {renderBatsmanTable(teamB)}
              </div>
              <div className="space-y-2">
                <h5 className="text-[9px] text-blue-400 font-bold uppercase tracking-wider font-mono">Squad Bowling Records</h5>
                {renderBowlerTable(teamB)}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* --- POPUP PLAYER PERFORMANCE OVERLAY --- */}
      {selectedPlayer && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200"
          id="player-perf-overlay-container"
          onClick={() => {
            triggerHaptic(15);
            setSelectedPlayer(null);
          }}
        >
          <div 
            className="w-full max-w-md bg-stone-950 border border-white/10 rounded-xl overflow-hidden shadow-2xl relative p-5 space-y-5 text-sans"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 1. Header with Close Button */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400 shrink-0">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white tracking-wide">{selectedPlayer.name}</h3>
                  <p className="text-[10px] uppercase font-mono text-white/40 tracking-wider font-semibold">{selectedPlayer.teamName}</p>
                </div>
              </div>

              <button 
                onClick={() => {
                  triggerHaptic(15);
                  setSelectedPlayer(null);
                }}
                className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition cursor-pointer"
                aria-label="Close user profile"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Loading Indicator for real-time synchronization */}
            {loadingPlayer && (
              <div className="absolute inset-x-0 top-12 flex justify-center bg-green-950/20 border-b border-green-900/30 py-1 text-[9px] font-mono text-green-400 tracking-wider items-center gap-1 justify-center">
                <Loader className="w-3.5 h-3.5 animate-spin" />
                <span>SYNCHRONIZING PITCH STATS...</span>
              </div>
            )}

            {/* 2. Detailed Performance Statistics Card Grid */}
            <div className="space-y-4">
              
              {/* Batting Card Grid */}
              <div className="bg-black/60 p-3.5 rounded-lg border border-white/5 space-y-3">
                <div className="flex items-center justify-between border-b border-white/5 pb-1">
                  <span className="text-[9px] uppercase font-mono text-green-400 font-extrabold flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-green-500" />
                    Batting Career Card
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded text-white/60 bg-white/5 border border-white/10 text-[9px] font-mono">
                    Status: {selectedPlayer.status.toUpperCase()}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center font-mono">
                  <div className="bg-neutral-900/40 p-2 rounded border border-white/[0.03]">
                    <span className="text-[8px] text-white/30 block uppercase">Runs Struck</span>
                    <span className="text-base font-black text-white block mt-1">{selectedPlayer.runsScored}</span>
                  </div>
                  <div className="bg-neutral-900/40 p-2 rounded border border-white/[0.03]">
                    <span className="text-[8px] text-white/30 block uppercase">Balls Faced</span>
                    <span className="text-base font-bold text-white/80 block mt-1">{selectedPlayer.ballsFaced}</span>
                  </div>
                  <div className="bg-neutral-900/40 p-2 rounded border border-white/[0.03]">
                    <span className="text-[8px] text-white/30 block uppercase">Fours (4s)</span>
                    <span className="text-base font-bold text-white/70 block mt-1">{selectedPlayer.boundaries4}</span>
                  </div>
                  <div className="bg-neutral-900/40 p-2 rounded border border-white/[0.03]">
                    <span className="text-[8px] text-white/30 block uppercase">Sixes (6s)</span>
                    <span className="text-base font-bold text-white/70 block mt-1">{selectedPlayer.boundaries6}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[11px] font-mono pt-1 text-white/60">
                  <span>Strike Rate (SR):</span>
                  <strong className="text-yellow-500 font-extrabold text-xs">
                    {selectedPlayer.ballsFaced > 0 
                      ? ((selectedPlayer.runsScored / selectedPlayer.ballsFaced) * 100).toFixed(2) 
                      : "0.00"}
                  </strong>
                </div>
              </div>

              {/* Bowling Card Grid */}
              <div className="bg-black/60 p-3.5 rounded-lg border border-white/5 space-y-3">
                <div className="flex items-center justify-between border-b border-white/5 pb-1">
                  <span className="text-[9px] uppercase font-mono text-blue-400 font-extrabold flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-blue-500" />
                    Bowling History Card
                  </span>
                  <span className="text-[8px] font-mono text-white/45">Overs completed</span>
                </div>

                <div className="grid grid-cols-3 gap-2.5 text-center font-mono">
                  <div className="bg-neutral-900/40 p-2 rounded border border-white/[0.03]">
                    <span className="text-[8px] text-white/30 block uppercase">Overs Bowled</span>
                    <span className="text-sm font-bold text-white block mt-1">
                      {selectedPlayer.oversBowled}.{selectedPlayer.ballsBowledInOver}
                    </span>
                  </div>
                  <div className="bg-neutral-900/40 p-2 rounded border border-white/[0.03]">
                    <span className="text-[8px] text-white/30 block uppercase">Wickets Taken</span>
                    <span className="text-sm font-black text-red-400 block mt-1">{selectedPlayer.wicketsTaken}</span>
                  </div>
                  <div className="bg-neutral-900/40 p-2 rounded border border-white/[0.03]">
                    <span className="text-[8px] text-white/30 block uppercase">Runs Conceded</span>
                    <span className="text-sm font-bold text-white/80 block mt-1">{selectedPlayer.runsConceded}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[11px] font-mono pt-1 text-white/60">
                  <span>Economy Rate (ECON):</span>
                  <strong className="text-yellow-500 font-extrabold text-xs">
                    {selectedPlayer.oversBowled > 0 || selectedPlayer.ballsBowledInOver > 0 
                      ? (selectedPlayer.runsConceded / (selectedPlayer.oversBowled + selectedPlayer.ballsBowledInOver/6)).toFixed(2) 
                      : "0.00"}
                  </strong>
                </div>
              </div>

              {/* DYNAMIC FORM EVALUATION AND ANALYSIS SUMMARY */}
              {(() => {
                const sr = selectedPlayer.ballsFaced > 0 ? (selectedPlayer.runsScored / selectedPlayer.ballsFaced) * 100 : 0;
                let formAnalysis = "";
                let badgeColor = "text-amber-400 bg-amber-950/25 border-amber-900/35";
                
                if (sr >= 200) {
                  formAnalysis = "🔥 AGGRESSIVE CRUSHER: Smashed bowler setups and striking beautiful boundary configurations lala!";
                  badgeColor = "text-red-400 bg-red-950/25 border-red-900/35";
                } else if (sr > 120 && sr < 200) {
                  formAnalysis = "⚡ PACE ANCHOR: Rotating strike with healthy boundary ratios to secure batting advantage.";
                  badgeColor = "text-emerald-400 bg-emerald-950/25 border-emerald-900/35";
                } else if (sr > 0 && sr <= 120) {
                  formAnalysis = "🏏 SHIELD BUILDER: Accumulating calculated single runs with patient defense postures!";
                  badgeColor = "text-blue-400 bg-blue-950/25 border-blue-950/20";
                } else if (selectedPlayer.runsScored === 0 && selectedPlayer.ballsFaced > 0) {
                  formAnalysis = "🛡️ DEFENSIVE PATIENCE: Absorbing balls pressure and studying pitch swing.";
                } else {
                  formAnalysis = "💤 DUGOUT SENTINEL: Standing by in the squad list, ready to smash boundaries into Quetta sky!";
                }

                // Bowler addons
                let bowlAnalysis = "";
                if (selectedPlayer.wicketsTaken >= 2) {
                  bowlAnalysis = "🎯 WICKET MAGNET: Demolished bat lines with supreme swing variations!";
                } else if (selectedPlayer.runsConceded > 0 && selectedPlayer.oversBowled > 0) {
                  const econ = selectedPlayer.runsConceded / (selectedPlayer.oversBowled + selectedPlayer.ballsBowledInOver / 6);
                  if (econ < 6.0) {
                    bowlAnalysis = "🔒 RUN CONSTRICTOR: Kept target metrics under lock and key.";
                  } else if (econ >= 9.5) {
                    bowlAnalysis = "⚠️ UNDER FIRE: Aggressive opponent batsmen attacking bowler pacing.";
                  }
                }

                return (
                  <div className="bg-stone-900/60 p-3.5 rounded-lg border border-white/5 space-y-2.5 font-sans">
                    <div className="flex items-center justify-between">
                      <span className="text-[9.5px] uppercase font-mono text-amber-500 font-extrabold flex items-center gap-1">
                        ✨ Real-Time Form Analysis
                      </span>
                      <span className={`text-[8.5px] font-mono px-1.5 py-0.5 rounded border uppercase font-medium ${badgeColor}`}>
                        {sr >= 200 ? "Turbo Form" : "Active Form"}
                      </span>
                    </div>

                    <p className="text-[10.5px] leading-relaxed text-zinc-300 font-normal">
                      {formAnalysis}
                    </p>
                    {bowlAnalysis && (
                      <p className="text-[10.5px] leading-relaxed text-cyan-300 border-t border-white/[0.04] pt-2">
                        {bowlAnalysis}
                      </p>
                    )}

                    {/* Milestones Checklist */}
                    <div className="grid grid-cols-3 gap-2 text-[9px] font-mono border-t border-white/[0.04] pt-2 text-zinc-400">
                      <div className="flex items-center gap-1 justify-center bg-stone-950/40 py-1 rounded">
                        <span className="text-yellow-500">🌟</span> 
                        <span>Fifty: {selectedPlayer.runsScored >= 50 ? "✅" : "❌"}</span>
                      </div>
                      <div className="flex items-center gap-1 justify-center bg-stone-950/40 py-1 rounded">
                        <span className="text-yellow-500">💯</span> 
                        <span>Cent: {selectedPlayer.runsScored >= 100 ? "✅" : "❌"}</span>
                      </div>
                      <div className="flex items-center gap-1 justify-center bg-stone-950/40 py-1 rounded">
                        <span className="text-yellow-500">💥</span> 
                        <span>Bnd: {selectedPlayer.boundaries4 + selectedPlayer.boundaries6}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {selectedPlayer.isOut && selectedPlayer.outHow && (
                <div className="bg-red-500/5 p-2 px-3 border border-red-500/10 rounded-lg text-[10px] font-mono text-red-400">
                  <span>How Dismissed:</span> <strong className="text-red-300 font-bold ml-1">{selectedPlayer.outHow}</strong>
                </div>
              )}

            </div>

            {/* 3. Footer Prompt */}
            <div className="border-t border-white/10 pt-3 flex justify-between items-center text-[9px] text-white/30 font-mono">
              <span className="uppercase">Sardar Sherrani Premier League</span>
              <span className="flex items-center gap-1">Authenticated Stats <CheckCircle className="w-3 h-3 text-green-500" /></span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
