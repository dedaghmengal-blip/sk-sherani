import React, { useState } from 'react';
import { Scroll, Trophy, Settings, ShieldAlert, Check } from 'lucide-react';
import { getApiUrl } from '../utils/api';
import { triggerHaptic } from '../utils/vibrate';
import { MatchState } from '../types';

interface InitializeMatchModalProps {
  onInitialized: (state: MatchState) => void;
}

export default function InitializeMatchModal({ onInitialized }: InitializeMatchModalProps) {
  const [matchTitle, setMatchTitle] = useState("Sardar Sherrani Premier League");
  const [groundName, setGroundName] = useState("Sherrani Cricket Stadium, Quetta");
  const [teamAName, setTeamAName] = useState("Sherrani Royals");
  const [teamBName, setTeamBName] = useState("Quetta Gladiators Local");
  const [maxOvers, setMaxOvers] = useState(20);
  const [inningsCount, setInningsCount] = useState(1);
  const [showAdvancedSquad, setShowAdvancedSquad] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [tossWinner, setTossWinner] = useState<'teamA' | 'teamB'>('teamA');
  const [tossDecision, setTossDecision] = useState<'bat' | 'bowl'>('bat');

  const [teamASquadText, setTeamASquadText] = useState(
    "Naveed Mengal\nSardar Sherrani\nLala Mengal\nZahid Shah\nAsif Ali\nMustafa Khan\nHamid Riaz\nIrfan Ullah\nBilal Ahmed\nAdnan Karim\nKamran Khan"
  );
  
  const [teamBSquadText, setTeamBSquadText] = useState(
    "Sherrani Bowler 1\nSherrani Bowler 2\nSikandar Khan\nJahangeer Khan\nMalik Mengal\nAbid Ali\nSami Ullah\nNajeeb Khan\nRana Khan\nRiaz Ahmed\nZia Khan"
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic(50);
    setIsSubmitting(true);
    setErrorText("");

    const squadAList = teamASquadText.split('\n').map(name => name.trim()).filter(Boolean);
    const squadBList = teamBSquadText.split('\n').map(name => name.trim()).filter(Boolean);

    try {
      const resp = await fetch(getApiUrl('/api/admin/match/init'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamAName: teamAName.trim(),
          teamBName: teamBName.trim(),
          teamASquad: squadAList,
          teamBSquad: squadBList,
          matchTitle: matchTitle.trim(),
          groundName: groundName.trim(),
          maxOvers: maxOvers,
          inningsCount: inningsCount,
          tossWinner: tossWinner,
          tossDecision: tossDecision
        })
      });

      if (resp.ok) {
        const data = await resp.json();
        onInitialized(data);
      } else {
        const err = await resp.json();
        setErrorText(err.error || "Failed to initialize match scoreboard.");
      }
    } catch (err: any) {
      console.error(err);
      setErrorText("Network connection failed. Please ensure server is running lala!");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto" id="init-match-setup-modal">
      <div className="bg-[#0c0c0c] border border-white/10 rounded-2xl w-full max-w-lg p-5 sm:p-7 shadow-2xl relative overflow-hidden transition-all duration-300">
        
        {/* Decorative ambient backdrop */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>

        {/* Modal Header */}
        <div className="flex gap-3 mb-6 relative z-10 border-b border-white/5 pb-4">
          <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <Trophy className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wider font-mono">
              Match Setup Dashboard
            </h2>
            <p className="text-[10px] text-white/50 tracking-wide uppercase font-semibold">
              Kicstart Sardar Sherrani Premier League Scores
            </p>
          </div>
        </div>

        {errorText && (
          <div className="bg-red-950/20 text-red-400 border border-red-900/40 p-3 rounded-lg text-xs flex items-center gap-2 mb-4">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span className="font-semibold">{errorText}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-left relative z-10">
          
          {/* Match Title */}
          <div className="space-y-1">
            <label className="text-[10px] text-slate-400 font-extrabold uppercase font-mono tracking-wider">
              Match / Tournament Name
            </label>
            <input
              type="text"
              required
              className="w-full bg-slate-950/80 hover:bg-slate-900 border border-white/10 focus:border-emerald-500 text-white rounded-lg px-3 py-2 text-xs font-medium focus:outline-none transition"
              value={matchTitle}
              onChange={(e) => setMatchTitle(e.target.value)}
              placeholder="e.g. Sardar Sherrani Premier League"
            />
          </div>

          {/* Ground Name */}
          <div className="space-y-1">
            <label className="text-[10px] text-emerald-400 font-extrabold uppercase font-mono tracking-wider">
              🏟️ Stadium / Ground Name
            </label>
            <input
              type="text"
              required
              className="w-full bg-slate-950/80 hover:bg-slate-900 border border-white/10 focus:border-emerald-500 text-white rounded-lg px-3 py-2 text-xs font-medium focus:outline-none transition"
              value={groundName}
              onChange={(e) => setGroundName(e.target.value)}
              placeholder="e.g. Sherrani Cricket Stadium, Quetta"
            />
          </div>

          {/* Quick Config Row: Total Overs & Innings count */}
          <div className="grid grid-cols-2 gap-4">
            
            {/* Total Overs Configuration */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 font-extrabold uppercase font-mono tracking-wider block">
                Total Overs
              </label>
              <div className="flex select-none gap-1 bg-black p-1 rounded-lg border border-white/5">
                {[5, 10, 20].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => {
                      triggerHaptic(20);
                      setMaxOvers(num);
                    }}
                    className={`flex-1 py-1 text-[10px] font-mono font-black rounded transition ${
                      maxOvers === num
                        ? 'bg-emerald-500 text-slate-950'
                        : 'text-white/40 hover:text-white'
                    }`}
                  >
                    {num} Ov
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[9px] text-white/30 font-medium">Custom Over:</span>
                <input
                  type="number"
                  min="1"
                  max="100"
                  className="w-14 bg-black border border-white/10 rounded py-0.5 text-center text-[10px] font-mono text-white focus:outline-none focus:border-emerald-500"
                  value={maxOvers}
                  onChange={(e) => setMaxOvers(parseInt(e.target.value) || 20)}
                />
              </div>
            </div>

            {/* Innings Count Configuration */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 font-extrabold uppercase font-mono tracking-wider block">
                Starting Innings
              </label>
              <div className="flex select-none gap-1 bg-black p-1 rounded-lg border border-white/5">
                {[1, 2].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => {
                      triggerHaptic(20);
                      setInningsCount(num);
                    }}
                    className={`flex-1 py-1 text-[10px] font-mono font-black rounded transition ${
                      inningsCount === num
                        ? 'bg-emerald-500 text-slate-950'
                        : 'text-white/40 hover:text-white'
                    }`}
                  >
                    Inn {num}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[9px] text-white/30 font-medium">Custom Inn:</span>
                <input
                  type="number"
                  min="1"
                  max="4"
                  className="w-12 bg-black border border-white/10 rounded py-0.5 text-center text-[10px] font-mono text-white focus:outline-none focus:border-emerald-500"
                  value={inningsCount}
                  onChange={(e) => setInningsCount(parseInt(e.target.value) || 1)}
                />
              </div>
            </div>

          </div>

          {/* Team Names configuration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] text-emerald-400 font-extrabold uppercase font-mono tracking-wider">
                Batting Team (Team A)
              </label>
              <input
                type="text"
                required
                className="w-full bg-slate-950 border border-white/10 text-white rounded-lg px-3 py-2 text-xs font-bold focus:outline-none focus:border-emerald-500 transition"
                value={teamAName}
                onChange={(e) => setTeamAName(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-amber-500 font-extrabold uppercase font-mono tracking-wider">
                Bowling Team (Team B)
              </label>
              <input
                type="text"
                required
                className="w-full bg-slate-950 border border-white/10 text-white rounded-lg px-3 py-2 text-xs font-bold focus:outline-none focus:border-emerald-500 transition"
                value={teamBName}
                onChange={(e) => setTeamBName(e.target.value)}
              />
            </div>
          </div>

          {/* Toss Selection Panel */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 space-y-3">
            <h3 className="text-[10px] text-amber-500 font-extrabold uppercase font-mono tracking-widest flex items-center gap-1.5">
              <span>🪙 Coin Toss Setup Panel</span>
            </h3>
            
            <div className="grid grid-cols-2 gap-3">
              {/* Toss Winner selection */}
              <div className="space-y-1.5">
                <span className="text-[9px] text-white/40 uppercase tracking-wider block font-bold font-mono">Toss Won By:</span>
                <div className="flex bg-black p-0.5 rounded-lg border border-white/5 gap-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic(20);
                      setTossWinner('teamA');
                    }}
                    className={`flex-1 py-1.5 px-2 text-[10px] font-bold rounded truncate transition cursor-pointer select-none ${
                      tossWinner === 'teamA'
                        ? 'bg-amber-500 text-slate-950 font-black'
                        : 'text-white/50 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {teamAName || 'Team A'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic(20);
                      setTossWinner('teamB');
                    }}
                    className={`flex-1 py-1.5 px-2 text-[10px] font-bold rounded truncate transition cursor-pointer select-none ${
                      tossWinner === 'teamB'
                        ? 'bg-amber-500 text-slate-950 font-black'
                        : 'text-white/50 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {teamBName || 'Team B'}
                  </button>
                </div>
              </div>

              {/* Toss Decision selection */}
              <div className="space-y-1.5">
                <span className="text-[9px] text-white/40 uppercase tracking-wider block font-bold font-mono">Selected To:</span>
                <div className="flex bg-black p-0.5 rounded-lg border border-white/5 gap-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic(20);
                      setTossDecision('bat');
                    }}
                    className={`flex-1 py-1.5 px-2 text-[10px] font-bold rounded transition cursor-pointer select-none ${
                      tossDecision === 'bat'
                        ? 'bg-emerald-500 text-slate-950 font-black'
                        : 'text-white/50 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    🏏 Bat first
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic(20);
                      setTossDecision('bowl');
                    }}
                    className={`flex-1 py-1.5 px-2 text-[10px] font-bold rounded transition cursor-pointer select-none ${
                      tossDecision === 'bowl'
                        ? 'bg-emerald-500 text-slate-950 font-black'
                        : 'text-white/50 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    ⚾ Bowl first
                  </button>
                </div>
              </div>
            </div>

            {/* Explanation card */}
            <div className="bg-[#050505] p-2 rounded border border-white/5 text-[9px] text-white/60 font-mono text-center">
              👉 <strong className="text-amber-400 font-extrabold">{tossWinner === 'teamA' ? teamAName : teamBName}</strong> won the toss and elected to <strong className="text-emerald-400 font-extrabold">{tossDecision === 'bat' ? 'BAT' : 'BOWL'}</strong> first.
              <div className="text-[8px] text-white/40 uppercase mt-1 tracking-wider">
                First Innings Batsmen: <strong className="text-white">{(tossWinner === 'teamA' && tossDecision === 'bat') || (tossWinner === 'teamB' && tossDecision === 'bowl') ? teamAName : teamBName}</strong>
              </div>
            </div>
          </div>

          {/* Expandable Squad Details Selection */}
          <div className="border-t border-white/5 pt-3">
            <button
              type="button"
              onClick={() => {
                triggerHaptic(15);
                setShowAdvancedSquad(!showAdvancedSquad);
              }}
              className="text-[10px] text-emerald-400 font-bold uppercase font-mono tracking-wider hover:underline flex items-center gap-1.5 cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5" />
              {showAdvancedSquad ? "Hide Player Squad Text Fields" : "Edit Initial Player Squad Lists (11 squad list)"}
            </button>

            {showAdvancedSquad && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 animate-in fade-in duration-200">
                <div className="space-y-1">
                  <label className="text-[9px] text-slate-500 font-bold uppercase font-mono">
                    Team A Squad (one per line)
                  </label>
                  <textarea
                    rows={4}
                    className="w-full bg-black border border-white/10 text-white p-2 rounded-lg text-[10px] font-mono focus:outline-none focus:border-emerald-500"
                    value={teamASquadText}
                    onChange={(e) => setTeamASquadText(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] text-slate-500 font-bold uppercase font-mono">
                    Team B Squad (one per line)
                  </label>
                  <textarea
                    rows={4}
                    className="w-full bg-black border border-white/10 text-white p-2 rounded-lg text-[10px] font-mono focus:outline-none focus:border-emerald-500"
                    value={teamBSquadText}
                    onChange={(e) => setTeamBSquadText(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Initialization triggers */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-emerald-555 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3 rounded-xl text-xs uppercase tracking-widest transition cursor-pointer active:scale-98 flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {isSubmitting ? (
              <span>Initializing Server State lala...</span>
            ) : (
              <>
                <Check className="w-4 h-4 text-slate-950 stroke-[3]" />
                <span>Initialize Match Scoreboard</span>
              </>
            )}
          </button>
          
        </form>

        <div className="text-center mt-4">
          <p className="text-[8px] text-white/20 uppercase tracking-[0.2em] font-mono">
            Secure broadcast dashboard • authorised sessions only
          </p>
        </div>

      </div>
    </div>
  );
}
