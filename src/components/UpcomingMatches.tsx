import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UpcomingMatch } from '../types';
import { Calendar, Clock, MapPin, Bell, BellOff, RefreshCw, Trophy, ShieldAlert, Sparkles, Plus, Trash2 } from 'lucide-react';
import { getApiUrl } from '../utils/api';
import { triggerHaptic } from '../utils/vibrate';

interface UpcomingMatchesProps {
  isAdminView?: boolean;
}

export default function UpcomingMatches({ isAdminView = false }: UpcomingMatchesProps) {
  const [matches, setMatches] = useState<UpcomingMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // User notifications subscribed state (using local localStorage to persist subscriber interactions)
  const [subscribedIds, setSubscribedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('sk_subscribed_matches');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Fetch match list
  const fetchUpcomingMatches = async (isRef = false) => {
    if (isRef) setRefreshing(true);
    else setLoading(true);
    
    setError(null);
    try {
      const res = await fetch(getApiUrl('/api/match/upcoming'));
      if (res.ok) {
        const data = await res.json();
        setMatches(data);
      } else {
        setError("Unable to grab scheduled list from Pakistan stadium sync servers.");
      }
    } catch (err) {
      console.error(err);
      setError("Network timeout. Stadium calendar is offline.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUpcomingMatches();
  }, []);

  // Toggle local notification subscription
  const handleToggleSubscribe = (matchId: string, teamA: string, teamB: string) => {
    triggerHaptic(40);
    let updated;
    const isSubbed = subscribedIds.includes(matchId);
    if (isSubbed) {
      updated = subscribedIds.filter(id => id !== matchId);
    } else {
      updated = [...subscribedIds, matchId];
    }
    setSubscribedIds(updated);
    localStorage.setItem('sk_subscribed_matches', JSON.stringify(updated));
  };

  const handleManualRefresh = () => {
    triggerHaptic(25);
    fetchUpcomingMatches(true);
  };

  // Helper to format date beautifully
  const formatDate = (dateStr: string) => {
    try {
      const options: Intl.DateTimeFormatOptions = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr; 
      return d.toLocaleDateString('en-US', options);
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="bg-[#0b0b0c] border border-white/5 rounded-2xl p-4 sm:p-6 space-y-6 shadow-2xl relative overflow-hidden" id="upcoming-matches-hub">
      
      {/* Background ambient details */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/[0.02] rounded-full blur-3xl pointer-events-none"></div>
      
      {/* Header section with refresh triggers */}
      <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 font-mono text-[10px] text-emerald-400 font-bold uppercase tracking-widest">
            <Sparkles className="w-3 h-3 text-emerald-400 animate-pulse" />
            <span>Stadium Almanac</span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-white tracking-tight uppercase">
            Upcoming Battles <span className="text-zinc-500 font-normal">({matches.length})</span>
          </h2>
          <p className="text-[11px] text-zinc-400 leading-normal max-w-xl">
            Prepare your squads lala. Subscribed matches will instantly highlight and notify you when our live mobile cameras go live in cantonment fields!
          </p>
        </div>

        <button
          onClick={handleManualRefresh}
          disabled={loading || refreshing}
          className="p-2 sm:p-2.5 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10 text-white/80 active:scale-95 transition disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
          title="Refresh Stadium Dates"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${refreshing || loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline font-mono text-[9px] font-bold uppercase tracking-wider">Sync Dates</span>
        </button>
      </div>

      {/* Main upcoming grid list */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3 font-mono text-xs text-white/40">
          <div className="w-8 h-8 rounded-full border-t-2 border-r-2 border-emerald-500 animate-spin"></div>
          <p className="uppercase tracking-widest text-[9px]">Syncing cantonment database...</p>
        </div>
      ) : error ? (
        <div className="bg-red-950/20 border border-red-900/30 p-6 rounded-xl flex items-center justify-center flex-col text-center space-y-3">
          <ShieldAlert className="w-8 h-8 text-red-500" />
          <p className="text-xs text-red-400 font-medium">{error}</p>
          <button
            onClick={() => fetchUpcomingMatches()}
            className="px-4 py-1.5 bg-red-900/30 text-red-300 font-mono text-[10px] border border-red-800/40 rounded uppercase font-bold hover:bg-red-900/50 transition cursor-pointer"
          >
            Retry Sync
          </button>
        </div>
      ) : matches.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-3 border border-dashed border-white/5 rounded-xl bg-white/[0.01]">
          <Calendar className="w-8 h-8 text-zinc-600" />
          <p className="text-xs text-zinc-400 select-none">No scheduled matches logged on the stadium almanac right now.</p>
          <span className="text-[10px] uppercase tracking-wider text-zinc-600 font-mono">Check back prior to next game day!</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {matches.map((item, index) => {
              const isSubscribed = subscribedIds.includes(item.id);
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.35, delay: index * 0.05 }}
                  className={`relative flex flex-col justify-between bg-black/40 rounded-xl p-4 border transition-all duration-300 overflow-hidden ${
                    isSubscribed 
                      ? 'border-emerald-500/40 bg-emerald-950/5 shadow-[0_4px_24px_rgba(16,185,129,0.08)]' 
                      : 'border-white/5 hover:border-white/10 hover:bg-black/60 shadow-lg'
                  }`}
                >
                  {/* Decorative glowing gradient for subbed matches */}
                  {isSubscribed && (
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/[0.03] rounded-full blur-xl pointer-events-none"></div>
                  )}

                  {/* Top layout metadata bar */}
                  <div className="flex items-center justify-between gap-2.5 mb-3.5">
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black font-mono uppercase bg-white/5 border border-white/10 text-white/50 tracking-wider">
                      {item.matchType}
                    </span>
                    
                    {/* Persistent date badges */}
                    <div className="flex items-center gap-1.5 text-zinc-400 font-mono text-[10px] font-medium">
                      <Clock className="w-3 h-3 text-zinc-500" />
                      <span>{item.time}</span>
                    </div>
                  </div>

                  {/* Teams battle board */}
                  <div className="space-y-2.5 select-none my-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded bg-zinc-700 font-mono shrink-0"></div>
                      <h4 className="text-sm font-black text-white/95 uppercase tracking-tight truncate" title={item.teamA}>
                        {item.teamA}
                      </h4>
                    </div>

                    <div className="flex items-center gap-1.5 pl-3">
                      <div className="w-[1px] h-2 bg-zinc-800"></div>
                      <span className="text-[10px] text-zinc-600 font-black italic uppercase tracking-widest select-none">VS</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded bg-zinc-500 font-mono shrink-0"></div>
                      <h4 className="text-sm font-black text-white/95 uppercase tracking-tight truncate" title={item.teamB}>
                        {item.teamB}
                      </h4>
                    </div>
                  </div>

                  {/* Venue location information and divider */}
                  <div className="border-t border-white/5 pt-3.5 mt-3 space-y-3">
                    <div className="flex items-start gap-1.5 text-[10px] text-zinc-400 leading-normal font-mono">
                      <MapPin className="w-3.5 h-3.5 text-zinc-500 shrink-0 mt-0.5" />
                      <span className="truncate" title={item.venue}>{item.venue}</span>
                    </div>

                    {item.notes && (
                      <p className="text-[10.5px] font-sans text-zinc-500 italic truncate pl-1">
                        "{item.notes}"
                      </p>
                    )}

                    <div className="flex gap-2 pt-1">
                      {/* Subscription notification toggle */}
                      <button
                        type="button"
                        onClick={() => handleToggleSubscribe(item.id, item.teamA, item.teamB)}
                        className={`flex-1 py-2 px-3 rounded-lg text-[10px] font-semibold font-mono uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer ${
                          isSubscribed 
                            ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/25 shadow-lg shadow-emerald-500/5' 
                            : 'bg-white/5 border border-white/10 text-white/70 hover:border-white/20 hover:bg-white/10'
                        }`}
                      >
                        {isSubscribed ? (
                          <>
                            <BellOff className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span className="truncate">Active Alert</span>
                          </>
                        ) : (
                          <>
                            <Bell className="w-3.5 h-3.5 text-zinc-400 group-hover:animate-bounce shrink-0" />
                            <span className="truncate">Set Alert</span>
                          </>
                        )}
                      </button>

                      {/* Display human-friendly status or alert counts */}
                      <div className="flex items-center gap-1.5 bg-black/40 border border-white/5 px-2.5 rounded-lg text-[9px] font-mono text-zinc-500 select-none">
                        <Calendar className="w-3 h-3 text-zinc-600" />
                        <span>{formatDate(item.date)}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
