import React, { useState, useRef, useEffect } from 'react';
import { MatchState, Player } from '../types';
import { getApiUrl } from '../utils/api';
import { triggerHaptic } from '../utils/vibrate';
import StadiumScorecard from './StadiumScorecard';
import { 
  Lock, CheckCircle, Video, Play, Square, Award, AlertCircle, RotateCcw, 
  UserPlus, Scroll, RefreshCw, Undo, Plus, Shuffle, Settings, ShieldCheck, Mail,
  Trash2, Edit3, Save, Users, Zap, Tv, Sparkles
} from 'lucide-react';

interface AdminPanelProps {
  matchState: MatchState;
  onStateUpdated: (newState: MatchState) => void;
}

export default function AdminPanel({ matchState, onStateUpdated }: AdminPanelProps) {
  // Authentication status
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [scorerRole, setScorerRole] = useState<'super_admin' | 'main_scorer' | 'wickets_highlights' | 'broadcast_media'>('super_admin');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');

  // Initialization setup state
  const [matchTitleInput, setMatchTitleInput] = useState(matchState.matchTitle);
  const [groundNameInput, setGroundNameInput] = useState(matchState.groundName || "Sherrani Cricket Stadium, Quetta");
  const [maxOversInput, setMaxOversInput] = useState(matchState.maxOvers || 20);
  const [teamANameInput, setTeamANameInput] = useState("Lions Cricket Club");
  const [teamBNameInput, setTeamBNameInput] = useState("Warriors Club");
  const [teamASquadText, setTeamASquadText] = useState("Naveed Mengal\nSardar Sherrani\nLala Mengal\nZahid Shah\nAsif Ali\nMustafa Khan\nHamid Riaz\nIrfan Ullah\nBilal Ahmed\nAdnan Karim\nKamran Khan");
  const [teamBSquadText, setTeamBSquadText] = useState("Quetta Gem\nKhan Pathan\nSher Shah\nSami Ullah\nNasir Jan\nRahman Khan\nAmir Sohail\nFaisal Qureshi\nYounis Khan\nImran Ali\nSajid Mehmood");

  // Sync states when match state changes
  useEffect(() => {
    if (matchState.groundName) {
      setGroundNameInput(matchState.groundName);
    }
  }, [matchState.groundName]);

  const handleUpdateGroundName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groundNameInput.trim()) return;
    try {
      const resp = await fetch(getApiUrl('/api/admin/match/update-ground'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groundName: groundNameInput.trim() })
      });
      if (resp.ok) {
        const data = await resp.json();
        onStateUpdated(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Dynamic player squad additions on-the-fly
  const [newPlayerNameA, setNewPlayerNameA] = useState('');
  const [newPlayerNameB, setNewPlayerNameB] = useState('');

  // Squad sizes customization parameters
  const [customSquadLimitA, setCustomSquadLimitA] = useState(11);
  const [customSquadLimitB, setCustomSquadLimitB] = useState(11);

  // Synchronize limits with living state if already initialized
  useEffect(() => {
    if (matchState.teamA?.isRegistered) {
      setCustomSquadLimitA(matchState.teamA.totalSquadSize || matchState.teamA.squad.length);
    }
    if (matchState.teamB?.isRegistered) {
      setCustomSquadLimitB(matchState.teamB.totalSquadSize || matchState.teamB.squad.length);
    }
  }, [matchState.teamA?.isRegistered, matchState.teamB?.isRegistered]);

  // Camera stream capturing state
  const [streamActive, setStreamActive] = useState(false);
  const [cameraPermissionGranted, setCameraPermissionGranted] = useState(false);
  const [streamError, setStreamError] = useState('');

  // Stream settings management
  const [streamType, setStreamType] = useState<'camera' | 'fb_stream'>(matchState.streamType || 'camera');
  const [fbStreamUrl, setFbStreamUrl] = useState(matchState.fbStreamUrl || 'https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Fwww.facebook.com%2Ffacebook%2Fvideos%2F10153231379948893%2F&show_text=0');

  useEffect(() => {
    if (matchState.streamType) {
      setStreamType(matchState.streamType);
    }
    if (matchState.fbStreamUrl) {
      setFbStreamUrl(matchState.fbStreamUrl);
    }
  }, [matchState.streamType, matchState.fbStreamUrl]);

  const handleUpdateStreamSettings = async (type: 'camera' | 'fb_stream', url: string) => {
    try {
      const resp = await fetch(getApiUrl('/api/admin/match/stream-settings'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ streamType: type, fbStreamUrl: url })
      });
      if (resp.ok) {
        const data = await resp.json();
        onStateUpdated(data);
        triggerHaptic(40);
      }
    } catch (err) {
      console.error("Failed saving stream settings:", err);
    }
  };

  // Wicket detailed options modal
  const [showWicketModal, setShowWicketModal] = useState(false);
  const [wicketType, setWicketType] = useState<string>('caught');
  const [selectedFielder, setSelectedFielder] = useState<string>('');
  const [customWicketText, setCustomWicketText] = useState<string>('');
  const [unlockInitForm, setUnlockInitForm] = useState(false);
  
  // Media Recorder state for actual recording of live segment with audio
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingStartTimeRef = useRef<number>(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamTimerRef = useRef<number | null>(null);

  // Authenticate Admin Email, Role & password
  const handleAuthenticate = (e: React.FormEvent) => {
    e.preventDefault();
    const targetedEmail = adminEmail.trim().toLowerCase();
    const targetedPassword = adminPassword.trim();

    if (!targetedEmail) {
      setAuthError('Please enter a valid email address.');
      return;
    }

    const emailToPassword: { [key: string]: string } = {
      'naveedmengal970@gmail.com': 'naveedmengal80313',
      'zuhtummengal@gmail.com': 'zuhtummengal80313',
      'dedaghmengal@gmail.com': 'dedaghmengal80313'
    };

    if (!emailToPassword[targetedEmail] || emailToPassword[targetedEmail] !== targetedPassword) {
      setAuthError('Access Denied! Incorrect administrator email or matching security passcode.');
      return;
    }

    // Grant full control instantly to administrators
    setScorerRole('super_admin');
    setIsAuthenticated(true);
    setAuthError('');
  };

  // 1. Initialize match squads
  const handleInitializeMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamANameInput.trim() || !teamBNameInput.trim()) return;

    const squadAList = teamASquadText.split('\n').map(s => s.trim()).filter(s => s !== "");
    const squadBList = teamBSquadText.split('\n').map(s => s.trim()).filter(s => s !== "");

    try {
      const resp = await fetch(getApiUrl('/api/admin/match/init'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamAName: teamANameInput,
          teamBName: teamBNameInput,
          teamASquad: squadAList,
          teamBSquad: squadBList,
          matchTitle: matchTitleInput,
          maxOvers: maxOversInput
        })
      });

      if (resp.ok) {
        const data = await resp.json();
        onStateUpdated(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 2. Camera Streaming capturing loops
  const startCameraBroadcast = async () => {
    try {
      setStreamError('');
      // Prompt camera & microphone permission safely
      let localStream: MediaStream;
      try {
        localStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 480, height: 360, frameRate: 15 },
          audio: true
        });
      } catch (audioErr) {
        console.warn("Failed to get audio and video, trying video-only stream:", audioErr);
        try {
          localStream = await navigator.mediaDevices.getUserMedia({
            video: { width: 480, height: 360, frameRate: 15 },
            audio: false
          });
        } catch (videoErr: any) {
          throw new Error(videoErr.message || "Camera permission was denied");
        }
      }

      setCameraPermissionGranted(true);
      setStreamActive(true);

      // Bind to hidden video element
      if (videoRef.current) {
        videoRef.current.srcObject = localStream;
        videoRef.current.play();
      }

      // Notify server of streaming status
      await fetch(getApiUrl('/api/admin/match/stream-toggle'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ live: true })
      });

      // Start Recording segment option
      recordingChunksRef.current = [];
      recordingStartTimeRef.current = Date.now();
      try {
        const hasAudio = localStream.getAudioTracks().length > 0;
        const options = hasAudio 
          ? { mimeType: 'video/webm;codecs=vp8,opus' } 
          : { mimeType: 'video/webm;codecs=vp8' };
        
        let mediaRecorder: MediaRecorder;
        try {
          mediaRecorder = new MediaRecorder(localStream, options);
        } catch (mimeErr) {
          console.warn("MimeType not supported, falling back to default constructor:", mimeErr);
          mediaRecorder = new MediaRecorder(localStream);
        }
        mediaRecorderRef.current = mediaRecorder;
        mediaRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            recordingChunksRef.current.push(event.data);
          }
        };
        mediaRecorder.start(1000); // chunk every second
        setIsRecording(true);
      } catch (recErr) {
        console.warn("Media recorder with VP8 not supported in this iframe environment. Running frame transmission only.", recErr);
      }

      // Start capturing frames at 3 frames per second to avoid overfilling networks
      const canvas = canvasRef.current || document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 240;
      const ctx = canvas.getContext('2d');

      const captureFrame = async () => {
        if (!videoRef.current || videoRef.current.paused || videoRef.current.ended) return;
        if (ctx) {
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.6); // compress jpeg at 60% quality
          
          await fetch(getApiUrl('/api/admin/match/stream-frame'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ frame: dataUrl })
          });
        }
      };

      const timerId = window.setInterval(captureFrame, 400);
      streamTimerRef.current = timerId;

    } catch (err: any) {
      console.error(err);
      setStreamError(`Microphone or webcam denied in iframe: ${err.message || 'Verification failed'}. Open app in new tab to permit browser cameras.`);
    }
  };

  const stopCameraBroadcast = async () => {
    setStreamActive(false);
    setIsRecording(false);

    // Stop streams
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }

    if (streamTimerRef.current) {
      clearInterval(streamTimerRef.current);
      streamTimerRef.current = null;
    }

    // Stop recording and save past recorded matches
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      
      setTimeout(async () => {
        const totalDurationSec = Math.round((Date.now() - recordingStartTimeRef.current) / 1000);
        const minutes = Math.floor(totalDurationSec / 60).toString().padStart(2, '0');
        const seconds = (totalDurationSec % 60).toString().padStart(2, '0');

        const blob = new Blob(recordingChunksRef.current, { type: 'video/webm' });
        
        // Convert to dataURL or blob url to let users playback past match list directly
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Video = reader.result as string;
          await fetch(getApiUrl('/api/admin/match/save-recording'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: `${matchState.matchTitle} - Match Highlight Playback`,
              duration: `${minutes}:${seconds}`,
              videoUrl: base64Video
            })
          });
          // Update parent state
          const updatedState = await fetch(getApiUrl('/api/match/state')).then(r => r.json());
          onStateUpdated(updatedState);
        };
        reader.readAsDataURL(blob);
      }, 500);
    }

    // Notify server stream offline
    await fetch(getApiUrl('/api/admin/match/stream-toggle'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ live: false })
    });

    const updatedState = await fetch(getApiUrl('/api/match/state')).then(r => r.json());
    onStateUpdated(updatedState);
  };

  // Cleanup stream intervals
  useEffect(() => {
    return () => {
      if (streamTimerRef.current) clearInterval(streamTimerRef.current);
    };
  }, []);

  // 2a. Real-time Squad and Player management helpers
  const handleAddPlayer = async (teamIndex: number, name: string) => {
    if (!name.trim()) return;
    try {
      const resp = await fetch(getApiUrl('/api/admin/match/add-player'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamIndex, name: name.trim() })
      });
      if (resp.ok) {
        const data = await resp.json();
        onStateUpdated(data);
        if (teamIndex === 0) setNewPlayerNameA('');
        else setNewPlayerNameB('');
      } else {
        const errData = await resp.json();
        alert(errData.error || "Failed to add player.");
      }
    } catch (err) {
      console.error("Failed adding player:", err);
    }
  };

  const handleEditPlayerName = async (teamIndex: number, oldName: string) => {
    const newName = window.prompt(`Edit name for player "${oldName}":`, oldName);
    if (!newName || !newName.trim() || newName.trim() === oldName) return;
    try {
      const resp = await fetch(getApiUrl('/api/admin/match/edit-player'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamIndex, oldName, newName: newName.trim() })
      });
      if (resp.ok) {
        const data = await resp.json();
        onStateUpdated(data);
      } else {
        const errData = await resp.json();
        alert(errData.error || "Failed to edit player.");
      }
    } catch (err) {
      console.error("Failed editing player:", err);
    }
  };

  const handleDeletePlayer = async (teamIndex: number, name: string) => {
    if (!window.confirm(`Are you sure you want to remove "${name}" from this team?`)) return;
    try {
      const resp = await fetch(getApiUrl('/api/admin/match/delete-player'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamIndex, name })
      });
      if (resp.ok) {
        const data = await resp.json();
        onStateUpdated(data);
      } else {
        const errData = await resp.json();
        alert(errData.error || "Failed to remove player.");
      }
    } catch (err) {
      console.error("Failed deleting player:", err);
    }
  };

  const handleSetSquadSizeLimit = async (teamIndex: number, size: number) => {
    if (size <= 0 || isNaN(size)) return;
    try {
      const resp = await fetch(getApiUrl('/api/admin/match/set-squad-size'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamIndex, size })
      });
      if (resp.ok) {
        const data = await resp.json();
        onStateUpdated(data);
        alert(`Successfully defined total squad parameter limit to ${size}.`);
      } else {
        const errData = await resp.json();
        alert(errData.error || "Failed to set squad size.");
      }
    } catch (err) {
      console.error("Failed updating squad limit:", err);
    }
  };


  // 3. Score administration helpers
  const handleScoreAction = async (action: string, value: string = '', detail: string = '', rawData: any = null) => {
    triggerHaptic(35);
    try {
      const resp = await fetch(getApiUrl('/api/admin/match/update-score'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          value,
          detail,
          data: rawData
        })
      });

      if (resp.ok) {
        const resData = await resp.json();
        onStateUpdated(resData);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Undo recent mistake action
  const handleUndoRecent = async () => {
    triggerHaptic(35);
    try {
      const resp = await fetch(getApiUrl('/api/admin/match/undo'), { method: 'POST' });
      if (resp.ok) {
        const resData = await resp.json();
        onStateUpdated(resData);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Switch Innings
  const handleSwitchInnings = async () => {
    if (!window.confirm("Lala, are you sure you want to declare over/innings and set the target score for the next team?")) return;
    triggerHaptic(50);
    try {
      const resp = await fetch(getApiUrl('/api/admin/match/switch-innings'), { method: 'POST' });
      if (resp.ok) {
        const resData = await resp.json();
        onStateUpdated(resData);
      }
    } catch (err) {
      console.error(err);
    }
  };

  /* RENDER 1: Access Verification Form */
  if (!isAuthenticated) {
    return (
      <div className="bg-[#0a0a0a] border border-white/10 rounded-sm p-6 shadow-xl max-w-md mx-auto text-center font-sans mt-4" id="admin-lockout-form">
        <Lock className="w-12 h-12 text-amber-500 mx-auto mb-3 animate-pulse" />
        <h3 className="text-base font-black text-white uppercase tracking-wider mb-1">
          SK Scorer Desk Authentication
        </h3>
        <p className="text-[11px] text-white/50 mb-5 leading-relaxed">
          Log in dynamically using your personal email address. Choose your specific match segment role to coordinate scoring simultaneously lala!
        </p>

        <form onSubmit={handleAuthenticate} className="space-y-4">
          
          {/* Match Segment Role dropdown selector */}
          <div className="text-left space-y-1">
            <span className="text-[8px] uppercase tracking-widest text-amber-400 font-mono font-bold block mb-1">Choose Scorers Segment Role:</span>
            <select
              value={scorerRole}
              onChange={(e) => {
                setScorerRole(e.target.value as any);
                setAuthError('');
              }}
              className="w-full bg-black text-xs text-white p-3 rounded-sm border border-white/10 font-bold focus:outline-none focus:border-green-500 cursor-pointer"
            >
              <option value="super_admin">🏆 Super Admin / Match Controller (سپر ایڈمن)</option>
              <option value="main_scorer">🏏 Runs & Balls Score Recorder (سکورر)</option>
              <option value="wickets_highlights">🔴 Wickets & Commentary Recorder (وکٹ کمنٹیٹر)</option>
              <option value="broadcast_media">🏟️ Live Broadcast Media Manager (براڈ کاسٹر)</option>
            </select>
          </div>

          <div className="relative text-left">
            <span className="text-[8px] uppercase tracking-widest text-white/30 font-mono font-semibold block mb-1">Enter your email:</span>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-white/30" />
              <input
                type="email"
                placeholder="Specific Email (e.g. scorer1@gmail.com)"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                className="w-full bg-black text-xs text-white placeholder-white/30 pl-11 pr-4 py-3.5 rounded-sm border border-white/10 focus:outline-none focus:border-green-500 font-mono tracking-tight"
                required
              />
            </div>
          </div>

          <div className="relative text-left">
            <span className="text-[8px] uppercase tracking-widest text-white/30 font-mono font-semibold block mb-1">Enter Segment Security Passcode:</span>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-white/30" />
              <input
                type="password"
                placeholder="Access Passcode"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="w-full bg-black text-xs text-white placeholder-white/30 pl-11 pr-4 py-3.5 rounded-sm border border-white/10 focus:outline-none focus:border-green-500 font-mono tracking-tight"
                required
              />
            </div>
          </div>



          {authError && (
            <div className="text-[10px] text-red-500 bg-red-950/20 p-2.5 rounded-sm border border-red-900/30 flex items-start gap-1 text-left font-semibold">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 animate-bounce" />
              <span>{authError}</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-green-600 hover:bg-green-500 text-black font-extrabold py-3.5 rounded-sm text-xs uppercase tracking-widest transition active:scale-98 cursor-pointer flex items-center justify-center gap-2"
          >
            <ShieldCheck className="w-4 h-4" /> Authenticate Segment
          </button>
        </form>
        <span className="block text-[8px] text-white/20 mt-4 uppercase font-mono tracking-widest">Secured by SK SHERRANI networks</span>
      </div>
    );
  }

  const battingTeam = matchState.battingTeamIndex === 0 ? matchState.teamA : matchState.teamB;
  const bowlingTeam = matchState.bowlingTeamIndex === 0 ? matchState.teamA : matchState.teamB;

  // Role permissions flags
  const isSuperAdmin = scorerRole === 'super_admin';
  const isRunsAllowed = scorerRole === 'super_admin' || scorerRole === 'main_scorer';
  const isWicketsAllowed = scorerRole === 'super_admin' || scorerRole === 'wickets_highlights';
  const isBroadcastAllowed = scorerRole === 'super_admin' || scorerRole === 'broadcast_media';
  const isSquadManagerAllowed = scorerRole === 'super_admin' || scorerRole === 'main_scorer';

  // Find out if strikers or bowlers are missing from pitch
  const isStrikerMissing = !matchState.strikerName;
  const isNonStrikerMissing = !matchState.nonStrikerName;
  const isBowlerMissing = !matchState.currentBowlerName;

  /* RENDER 2: Complete administrative scoring room */
  return (
    <div className="bg-[#0a0a0a] border border-white/10 rounded-sm shadow-2xl p-4 sm:p-6 font-sans space-y-6" id="admin-control-desk">
      {/* Header Panel */}
      <div className="border-b border-white/10 pb-4 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-green-600 text-black p-2.5 rounded-sm font-bold shadow-lg shadow-green-600/10 shrink-0">
            <Settings className="w-4 h-4 animate-spin-slow text-black" />
          </div>
          <div>
            <h2 className="font-extrabold text-sm text-white uppercase tracking-wider flex items-center gap-2">
              Live Field Controller Console <span className="bg-green-500/15 text-green-400 text-[8px] font-mono tracking-widest px-2 py-0.5 rounded-none border border-green-500/25 uppercase">SYS-AUTH</span>
            </h2>
            <p className="text-[10px] text-white/50 tracking-tight">Match score managers, camera capture, and squad settings</p>
          </div>
        </div>

        {/* Administration Status indicator with role segments and quick switcher */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 bg-black border border-white/10 p-2.5 rounded text-[10px] font-mono font-bold text-green-400 w-full xl:w-auto">
          <div className="flex items-center gap-1.5 px-1 truncate">
            <ShieldCheck className="w-4 h-4 text-green-500 shrink-0" />
            <span className="truncate">ACTIVE: <strong className="text-white normal-case">{adminEmail ? adminEmail.toLowerCase().trim() : "naveedmengal970@gmail.com"}</strong></span>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/30 text-amber-500 px-2 py-1 text-[9px] uppercase font-sans tracking-wider rounded-sm font-bold text-center shrink-0">
            {scorerRole === 'super_admin' && "🏆 Super Admin"}
            {scorerRole === 'main_scorer' && "🏏 Runs Access"}
            {scorerRole === 'wickets_highlights' && "🔴 Wickets/Commentary"}
            {scorerRole === 'broadcast_media' && "🏟️ Broadcast Space"}
          </div>
          <button
            onClick={() => {
              triggerHaptic(50);
              setIsAuthenticated(false);
              setAdminPassword('');
            }}
            className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 py-1 px-2.5 rounded transition uppercase font-sans font-bold text-center text-[9px] shrink-0"
            title="Sign out or switch segments"
          >
            Switch Segment
          </button>
        </div>
      </div>

      {/* Grid with 2 columns: Left for score manual controls, right for cameras / setup */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* SECTION A: Scoring Scoreboard Controls (7 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          
          {!matchState.matchActive ? (
            /* Warning if match hasn't started yet */
            <div className="bg-slate-950 border border-slate-850 rounded-xl p-6 text-center">
              <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3 animate-pulse" />
              <p className="text-xs text-white uppercase font-black tracking-wider mb-1">Awaiting Match setup</p>
              <p className="text-[11px] text-gray-400 max-w-sm mx-auto">
                Lala, matches are not started yet. Use the "Match Squad Initializer" panel on the right to register the teams and initialize squads.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* STATUS CARD 1: RUNS & WICKETS LARGE DISPLAY */}
              <div className="bg-slate-950 rounded-xl p-4 border border-slate-850 flex items-center justify-between">
                <div>
                  <span className="text-[9px] text-slate-400 font-mono uppercase bg-slate-900 border border-slate-850 px-2 py-0.5 rounded">Active Innings Scoring</span>
                  <h4 className="text-sm font-bold text-slate-300 mt-2 uppercase">{battingTeam.name} Batting</h4>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold text-white font-mono">{matchState.runs}/{matchState.wickets}</span>
                  <span className="text-xs text-slate-400 font-mono">({matchState.overs}.{matchState.balls} Ovs)</span>
                </div>
              </div>

              {/* LIVE DIGITAL SCORE SHEET RECORD FOR ADMIN VISIBILITY */}
              <StadiumScorecard matchState={matchState} />

              {/* URGENT ALERTS OR ACTIONS (Select missing batsman or bowler) */}
              {(isStrikerMissing || isNonStrikerMissing || isBowlerMissing) && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase">
                    <AlertCircle className="w-4 h-4 animate-bounce" />
                    <span>Scoring Action Required! Players configuration missing:</span>
                  </div>

                  {isStrikerMissing && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-slate-950 p-2.5 rounded border border-slate-850 text-xs text-white">
                      <span>⚠️ Select batsman on **Striker** position:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {battingTeam.squad.filter(p => !p.isOut && p.name !== matchState.nonStrikerName).map(p => (
                          <button
                            key={p.name}
                            onClick={() => handleScoreAction('set-batsman', '', '', { position: 'striker', name: p.name })}
                            className="bg-amber-500 text-slate-950 font-bold px-2.5 py-1 rounded text-[10px] hover:bg-amber-400 transition"
                          >
                            + {p.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {isNonStrikerMissing && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-slate-950 p-2.5 rounded border border-slate-850 text-xs text-white">
                      <span>⚠️ Select batsman on **Non-Striker** position:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {battingTeam.squad.filter(p => !p.isOut && p.name !== matchState.strikerName).map(p => (
                          <button
                            key={p.name}
                            onClick={() => handleScoreAction('set-batsman', '', '', { position: 'non-striker', name: p.name })}
                            className="bg-slate-800 text-gray-200 border border-slate-700 font-bold px-2.5 py-1 rounded text-[10px] hover:bg-slate-700 transition"
                          >
                            + {p.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {isBowlerMissing && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-slate-950 p-2.5 rounded border border-slate-850 text-xs text-white">
                      <span>⚠️ Select next **Bowler** to bowl over {matchState.overs + 1}:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {bowlingTeam.squad.map(p => (
                          <button
                            key={p.name}
                            onClick={() => handleScoreAction('set-bowler', p.name)}
                            className="bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600 hover:text-white transition font-bold px-2.5 py-1 rounded text-[10px]"
                          >
                            Bowl {p.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
                    {/* MAIN SCORING INTERACTION KEYBOARD */}
              {!isRunsAllowed ? (
                <div className="bg-slate-950/80 border border-slate-850 rounded-xl p-6 text-center shadow flex flex-col items-center justify-center py-8">
                  <Lock className="w-7 h-7 text-amber-500 mb-2 animate-pulse" />
                  <p className="text-xs uppercase font-black tracking-wider text-amber-400 mb-1">Runs & Deliveries Panels Restricted</p>
                  <p className="text-[10px] text-gray-400 max-w-xs leading-relaxed font-sans">
                    This section is locked for your current scorer profile. Log in as <strong className="text-green-400 font-sans">Main Runs Scorer</strong> or <strong className="text-green-400 font-sans">Super Admin</strong> to enter manual ball-by-ball updates.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* LIVE REAL-TIME OPERATOR SCOREBOARD */}
                  {(() => {
                    const striker = battingTeam.squad.find(p => p.name === matchState.strikerName);
                    const nonStriker = battingTeam.squad.find(p => p.name === matchState.nonStrikerName);
                    const bowler = bowlingTeam.squad.find(p => p.name === matchState.currentBowlerName);
                    const totalBalls = (matchState.overs * 6) + matchState.balls;
                    const crr = totalBalls > 0 ? ((matchState.runs * 6) / totalBalls).toFixed(2) : '0.00';

                    return (
                      <div className="bg-black border border-white/10 rounded-lg p-3.5 space-y-3.5 shadow-lg relative overflow-hidden">
                        {/* Dynamic blinking background ribbon */}
                        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-red-600 via-green-500 to-amber-500 animate-pulse"></div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-ping"></span>
                            <span className="text-[9px] uppercase font-mono tracking-widest text-white/50">Operator Live Monitor</span>
                          </div>
                          <div className="font-mono text-[9px] text-zinc-400">
                            CRR: <strong className="text-amber-500 font-bold">{crr}</strong>
                          </div>
                        </div>

                        <div className="flex items-center justify-between bg-zinc-950 px-3 py-2 border border-zinc-900 rounded">
                          <div>
                            <p className="text-[10px] text-zinc-400 font-sans tracking-tight uppercase font-semibold">{battingTeam.name}</p>
                            <div className="flex items-baseline gap-1.5 mt-0.5">
                              <span className="text-2xl font-black text-green-400 font-mono tracking-tighter">{matchState.runs}/{matchState.wickets}</span>
                              <span className="text-xs text-zinc-400 font-mono font-bold">({matchState.overs}.{matchState.balls} OVs)</span>
                            </div>
                          </div>
                          
                          {matchState.target ? (
                            <div className="text-right font-mono text-[9px] bg-yellow-500/5 px-2 py-1 rounded border border-yellow-500/10 text-yellow-500">
                              <div>TARGET: <strong className="text-white font-bold">{matchState.target}</strong></div>
                              <div className="mt-0.5 text-zinc-350">Need <strong className="text-yellow-400 font-bold">{matchState.target - matchState.runs}</strong> runs to win</div>
                            </div>
                          ) : (
                            <div className="text-right font-mono text-[8px] uppercase tracking-wide text-zinc-400 bg-white/5 px-2 py-1 rounded">
                              First Innings Scoring
                            </div>
                          )}
                        </div>

                        {/* Strikers and Bowlers info */}
                        <div className="grid grid-cols-2 gap-3.5 border-t border-zinc-900 pt-3 text-[11px] font-mono">
                          {/* Batters Column */}
                          <div className="space-y-1.5 border-r border-zinc-950 pr-3">
                            <span className="text-[8px] uppercase tracking-wide text-zinc-500 font-sans block font-semibold">BATSMEN:</span>
                            
                            {/* Striker */}
                            <div className="flex items-center justify-between">
                              <span className="flex items-center gap-1 text-white font-bold truncate">
                                <span className="text-emerald-400 font-black animate-pulse">🏏</span>
                                <span className="truncate">{striker ? striker.name : 'No Striker'}</span>
                              </span>
                              <span className="text-green-400 font-bold shrink-0">
                                {striker ? `${striker.runsScored} (${striker.ballsFaced})` : '0 (0)'}
                              </span>
                            </div>

                            {/* Non-Striker */}
                            <div className="flex items-center justify-between opacity-70">
                              <span className="flex items-center gap-1 text-zinc-300 truncate">
                                <span className="text-zinc-500">🛡️</span>
                                <span className="truncate">{nonStriker ? nonStriker.name : 'No Non-Striker'}</span>
                              </span>
                              <span className="text-zinc-300 shrink-0">
                                {nonStriker ? `${nonStriker.runsScored} (${nonStriker.ballsFaced})` : '0 (0)'}
                              </span>
                            </div>
                          </div>

                          {/* Bowler Column */}
                          <div className="space-y-1.5 flex flex-col justify-start">
                            <span className="text-[8px] uppercase tracking-wide text-zinc-500 font-sans block font-semibold">BOWLER:</span>
                            {bowler ? (
                              <div className="space-y-1">
                                <p className="text-white font-bold truncate">{bowler.name}</p>
                                <div className="flex items-center justify-between text-[10px] text-zinc-400">
                                  <span>Spell: {bowler.oversBowled}.{bowler.ballsBowledInOver} Ovs</span>
                                  <span className="text-yellow-500 font-bold font-mono bg-yellow-500/10 border border-yellow-500/20 px-1 rounded-sm text-[9px]">
                                    {bowler.wicketsTaken}-{bowler.runsConceded}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <p className="text-zinc-500 italic text-[10px]">No bowler active</p>
                            )}
                          </div>
                        </div>

                        {/* Over deliveries ticker badge tracker */}
                        <div className="bg-[#050505] p-2 rounded border border-zinc-900/50 flex items-center justify-between text-[10px]">
                          <span className="text-zinc-500 font-bold uppercase tracking-wider text-[8px] font-sans">THIS OVER:</span>
                          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none font-bold">
                            {matchState.recentBalls.length === 0 ? (
                              <span className="text-zinc-600 italic text-[9px]">Starting new over...</span>
                            ) : (
                              matchState.recentBalls.map((b, idx) => {
                                let badgeBg = "bg-zinc-900 text-zinc-300 border-zinc-800";
                                if (b === "W") badgeBg = "bg-red-600 text-white border-red-500 animate-pulse";
                                if (b === "4") badgeBg = "bg-blue-600/20 text-blue-400 border-blue-500/30";
                                if (b === "6") badgeBg = "bg-green-600/20 text-green-400 border-green-500/30";
                                if (b === "Wd" || b === "Nb") badgeBg = "bg-yellow-600/10 text-yellow-500 border-yellow-500/20";
                                return (
                                  <span key={idx} className={`w-5 h-5 flex items-center justify-center rounded text-[9px] font-mono border ${badgeBg}`}>
                                    {b}
                                  </span>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wide">Manual Run Admissions</h3>
                  
                  {/* 1. Runs panel */}
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
                    {[
                      { label: "0 Runs (Dot)", val: "0" },
                      { label: "+1 Run off bat", val: "1" },
                      { label: "+2 Runs", val: "2" },
                      { label: "+3 Runs", val: "3" },
                      { label: "4 (Boundary)", val: "4" },
                      { label: "6 (Sixer)", val: "6" }
                    ].map((btn, i) => (
                      <button
                        key={i}
                        disabled={isStrikerMissing || isBowlerMissing}
                        onClick={() => handleScoreAction('run', btn.val)}
                        className="bg-slate-950 hover:bg-slate-850 text-white font-bold py-3.5 border border-slate-850 rounded-lg text-sm transition active:scale-95 disabled:opacity-40 select-none shadow"
                      >
                        <span className="block text-base leading-none mb-1 font-mono text-amber-400 font-extrabold">{btn.val}</span>
                        <span className="block text-[9px] text-gray-500 font-sans tracking-tight font-light">{btn.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* 2. Extras panels */}
                  <div>
                    <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wide mb-2">Extras / Deliveries Actions</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <button
                        disabled={isBowlerMissing}
                        onClick={() => handleScoreAction('extra', 'wide', '1')}
                        className="bg-slate-950 hover:bg-amber-500/10 border border-slate-850 py-2.5 text-xs font-bold text-amber-500 rounded-lg transition"
                      >
                        Wide Ball (+1)
                      </button>
                      <button
                        disabled={isBowlerMissing || isStrikerMissing}
                        onClick={() => handleScoreAction('extra', 'noball', '1')}
                        className="bg-slate-950 hover:bg-amber-500/10 border border-slate-850 py-2.5 text-xs font-bold text-amber-500 rounded-lg transition"
                      >
                        No-ball (+1)
                      </button>
                      <button
                        disabled={isBowlerMissing || isStrikerMissing}
                        onClick={() => handleScoreAction('extra', 'bye', '1')}
                        className="bg-slate-950 hover:bg-slate-800 border border-slate-850 py-2.5 text-xs font-semibold text-gray-300 rounded-lg transition"
                      >
                        Byes (+1 Run)
                      </button>
                      <button
                        disabled={isBowlerMissing || isStrikerMissing}
                        onClick={() => handleScoreAction('extra', 'legbye', '1')}
                        className="bg-slate-950 hover:bg-slate-800 border border-slate-850 py-2.5 text-xs font-semibold text-gray-300 rounded-lg transition"
                      >
                        Leg Byes (+1 Run)
                      </button>
                    </div>
                  </div>

                  {/* 3. Wicket out and field management buttons */}
                  <div>
                    <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wide mb-2">Wicket (Dismissal) & Innings Declarations</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {/* WICKET BUTTON (Red Alert) */}
                      <button
                        disabled={isStrikerMissing || isBowlerMissing}
                        onClick={() => {
                          setWicketType('caught');
                          if (bowlingTeam.squad && bowlingTeam.squad.length > 0) {
                            setSelectedFielder(bowlingTeam.squad[0].name);
                          } else {
                            setSelectedFielder('');
                          }
                          setCustomWicketText('');
                          setShowWicketModal(true);
                        }}
                        className="bg-red-600 hover:bg-red-500 text-white font-black py-3 rounded-lg text-xs uppercase tracking-wider transition active:scale-95 disabled:opacity-40 cursor-pointer"
                      >
                        🔴 WICKET (OUT!)
                      </button>

                      {/* MANUALLY DECLARE OVER */}
                      <button
                        disabled={isBowlerMissing || isStrikerMissing || matchState.balls === 0}
                        onClick={() => handleScoreAction('declare-over')}
                        className="bg-slate-950 hover:bg-slate-855 border border-slate-850 py-3 text-xs font-bold text-slate-300 rounded-lg transition"
                      >
                        🔚 Declare Over Complete
                      </button>

                      {/* INNINGS CHANGE */}
                      <button
                        onClick={handleSwitchInnings}
                        className="bg-slate-950 hover:bg-emerald-500 hover:text-slate-950 border border-emerald-500/20 text-emerald-400 font-black py-3 rounded-lg text-xs uppercase tracking-wider transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        🏏 Innings Change (Swap & Reset)
                      </button>
                    </div>
                  </div>

                  {/* 4. UTILITIES AND UNDO PREVIOUS */}
                  <div className="border-t border-slate-800 pt-4 flex flex-wrap gap-2.5">
                    <button
                      disabled={isStrikerMissing || isNonStrikerMissing}
                      onClick={() => handleScoreAction('switch-strike')}
                      className="bg-slate-950 hover:bg-slate-850 border border-slate-850 px-4 py-2 rounded text-[11px] font-bold text-slate-300 flex items-center gap-1.5 transition active:scale-95 disabled:opacity-40"
                    >
                      <Shuffle className="w-3.5 h-3.5 text-amber-500" />
                      Manually Switch Batsmen Strike
                    </button>

                    <button
                      onClick={handleUndoRecent}
                      className="bg-slate-950 hover:bg-red-500/10 border border-slate-850 px-4 py-2 rounded text-[11px] font-bold text-red-500 flex items-center gap-1.5 transition active:scale-95"
                    >
                      <Undo className="w-3.5 h-3.5" />
                      Undo Recent Score Mistake
                    </button>
                  </div>
                </div>
              )}

              {/* ADMIN LIGHTNING KEY HIGHLIGHTS DESK */}
              {!isWicketsAllowed ? (
                <div className="bg-slate-950/80 border border-slate-850 rounded-xl p-6 text-center shadow flex flex-col items-center justify-center py-8">
                  <Lock className="w-7 h-7 text-red-505 text-red-500 mb-2 animate-pulse" />
                  <p className="text-xs uppercase font-black tracking-wider text-red-400 mb-1">Wickets & Highlights Restricted</p>
                  <p className="text-[10px] text-gray-400 max-w-xs leading-relaxed font-sans">
                    Commentary timestamping, wicket details, and pinning moments can only be registered by the <strong className="text-green-400 font-sans">Wickets & Highlights Scorer</strong> or <strong className="text-green-400 font-sans">Super Admin</strong>.
                  </p>
                </div>
              ) : (
                <div className="bg-slate-950 rounded-xl p-4 border border-slate-850 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                    <span className="text-[10px] text-amber-400 font-extrabold uppercase bg-amber-950/20 border border-amber-900/35 px-2 py-0.5 rounded flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 animate-pulse" />
                      Live Key Highlights desk
                    </span>
                    <span className="text-[9px] text-slate-500 font-mono">Capture and mark timestamps</span>
                  </div>

                  <div className="flex flex-col gap-2.5">
                    <p className="text-[10px] text-slate-400 leading-normal">
                      Mark special wickets, outstanding catches, field run outs / arguments, or spectacular actions instantly. Select from templates or draft custom.
                    </p>
                    
                    {/* Quick templates preset selection list */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-1">
                      {[
                        { text: "Spectacular catching lala!", type: "wicket" },
                        { text: "Incredible direct hit run out!", type: "wicket" },
                        { text: "Fantastic dive boundary save!", type: "custom" },
                        { text: "Terrific bowling bouncer delivery!", type: "custom" },
                        { text: "Crowd is cheering wild lala!", type: "custom" },
                        { text: "Umpire review / discussion", type: "custom" }
                      ].map((temp, index) => (
                        <button
                          key={index}
                          onClick={async () => {
                            try {
                              const res = await fetch(getApiUrl('/api/admin/match/add-highlight'), {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ text: temp.text, type: temp.type })
                              });
                              if (res.ok) {
                                const updatedState = await res.json();
                                onStateUpdated(updatedState);
                                alert(`Highlight captured: "${temp.text}" lala!`);
                              }
                            } catch (err) {
                              console.error(err);
                            }
                          }}
                          className="bg-slate-900 hover:bg-slate-855 text-slate-300 hover:text-white px-2 py-1.5 rounded text-[9px] font-sans border border-slate-850/60 transition text-left truncate cursor-pointer active:scale-98"
                          title={temp.text}
                        >
                          ⚡ {temp.text}
                        </button>
                      ))}
                    </div>

                    {/* Manual input box for anything else */}
                    <form 
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const form = e.currentTarget;
                        const textInput = form.elements.namedItem('customHighlightText') as HTMLInputElement;
                        const typeSelect = form.elements.namedItem('customHighlightType') as HTMLSelectElement;
                        if (!textInput || !textInput.value.trim()) return;

                        const valText = textInput.value.trim();
                        const valType = typeSelect.value;
                        
                        try {
                          const res = await fetch(getApiUrl('/api/admin/match/add-highlight'), {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ text: valText, type: valType })
                          });
                          if (res.ok) {
                            const updatedState = await res.json();
                            onStateUpdated(updatedState);
                            textInput.value = '';
                            alert(`Custom moment highlight pinned: "${valText}"!`);
                          }
                        } catch (err) {
                          console.error(err);
                        }
                      }}
                      className="flex flex-col sm:flex-row gap-2 mt-2 pt-2 border-t border-slate-900"
                    >
                      <input
                        name="customHighlightText"
                        type="text"
                        required
                        placeholder="Write custom highlight lala..."
                        className="flex-1 bg-slate-900 text-white placeholder-slate-500 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500/50 border border-slate-800"
                      />
                      <div className="flex gap-1.5">
                        <select
                          name="customHighlightType"
                          className="bg-slate-900 text-slate-300 rounded px-1.5 py-1.5 text-[10px] focus:outline-none border border-slate-800"
                        >
                          <option value="custom">Custom</option>
                          <option value="six">Sixer</option>
                          <option value="four">Four</option>
                          <option value="wicket">Wicket Out</option>
                          <option value="innings_break">Break</option>
                        </select>
                        <button
                          type="submit"
                          className="bg-amber-500 hover:bg-amber-400 text-black font-extrabold px-3 py-1.5 rounded text-[10px] uppercase tracking-wider transition shrink-0 cursor-pointer flex items-center gap-1"
                        >
                          <span>Pin Moment</span>
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* STADIUM / GROUND NAME UPDATES */}
              <div className="bg-black border border-white/10 rounded-sm p-4 text-xs space-y-2.5">
                <h4 className="font-extrabold text-white uppercase font-mono tracking-wider flex items-center gap-1.5">
                  🏟️ Stadium/Ground name
                </h4>
                <form onSubmit={handleUpdateGroundName} className="flex gap-2">
                  <input
                    type="text"
                    value={groundNameInput}
                    onChange={(e) => setGroundNameInput(e.target.value)}
                    placeholder="Enter Stadium / Ground Name..."
                    className="flex-1 bg-slate-900 border border-white/10 rounded px-2.5 py-1.5 text-white placeholder-slate-500 font-mono text-[11px] focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="submit"
                    className="bg-amber-500 hover:bg-amber-400 text-black font-extrabold px-3 py-1.5 rounded text-[10px] uppercase tracking-wider transition cursor-pointer shrink-0"
                  >
                    Update Ground
                  </button>
                </form>
              </div>

              {/* ACTIVE PITCH DETAILS - INTERACTIVE LINEUP MODIFIER */}
              <div className="bg-black border border-white/10 rounded-sm p-4 space-y-4 shadow-lg">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <h4 className="font-extrabold text-white text-xs uppercase font-mono tracking-wider flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" /> Active Pitch Lineup (اوپنرز اور بولر)
                  </h4>
                  <span className="text-[9px] text-green-400 font-mono font-bold bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/20">LIVE CONTROL</span>
                </div>

                <div className="space-y-3.5 text-xs">
                  {/* Select Striker */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-white/50 font-bold uppercase tracking-wide">Striker Batsman (کھیلنے والا):</span>
                      <span className="text-[9px] text-amber-400 font-mono font-bold">{matchState.strikerName || "Unassigned"}</span>
                    </div>
                    <select
                      value={matchState.strikerName || ""}
                      onChange={(e) => {
                        const selectedName = e.target.value;
                        if (selectedName) {
                          handleScoreAction('set-batsman', '', '', { position: 'striker', name: selectedName });
                        }
                      }}
                      className="w-full bg-slate-900 border border-white/10 p-2.5 rounded text-white text-xs font-mono font-bold focus:border-amber-505 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                    >
                      <option value="" disabled>-- Choose Striker --</option>
                      {battingTeam.squad.filter(p => !p.isOut).map(p => (
                        <option key={p.name} value={p.name}>
                          🏏 {p.name} {p.name === matchState.nonStrikerName ? " (Non-Striker)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Select Non-Striker */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-white/50 font-bold uppercase tracking-wide">Non-Striker Batsman:</span>
                      <span className="text-[9px] text-amber-400 font-mono font-bold">{matchState.nonStrikerName || "Unassigned"}</span>
                    </div>
                    <select
                      value={matchState.nonStrikerName || ""}
                      onChange={(e) => {
                        const selectedName = e.target.value;
                        if (selectedName) {
                          handleScoreAction('set-batsman', '', '', { position: 'non-striker', name: selectedName });
                        }
                      }}
                      className="w-full bg-slate-900 border border-white/10 p-2.5 rounded text-white text-xs font-mono font-bold focus:border-amber-505 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                    >
                      <option value="" disabled>-- Choose Non-Striker --</option>
                      {battingTeam.squad.filter(p => !p.isOut).map(p => (
                        <option key={p.name} value={p.name}>
                          🏏 {p.name} {p.name === matchState.strikerName ? " (Striker)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Select Bowler */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-white/50 font-bold uppercase tracking-wide">Attack Bowler (بولنگ کرنے والا):</span>
                      <span className="text-[9px] text-emerald-400 font-mono font-bold">{matchState.currentBowlerName || "Unassigned"}</span>
                    </div>
                    <select
                      value={matchState.currentBowlerName || ""}
                      onChange={(e) => {
                        const selectedName = e.target.value;
                        if (selectedName) {
                          handleScoreAction('set-bowler', selectedName);
                        }
                      }}
                      className="w-full bg-slate-900 border border-white/10 p-2.5 rounded text-emerald-400 text-xs font-mono font-bold focus:border-emerald-505 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                    >
                      <option value="" disabled>-- Choose Bowler --</option>
                      {bowlingTeam.squad.map(p => (
                        <option key={p.name} value={p.name}>
                          ⚾ {p.name} (Ovs: {p.oversBowled}.{p.ballsBowledInOver})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* LIVE SQUAD PLAYER MANAGEMENT & SIZES SECTION */}
              {!isSquadManagerAllowed && (
                <div className="bg-slate-950/80 border border-slate-850 rounded-xl p-6 text-center shadow flex flex-col items-center justify-center py-8">
                  <Lock className="w-7 h-7 text-green-500 mb-2 animate-pulse" />
                  <p className="text-xs uppercase font-black tracking-wider text-green-400 mb-1">Squad Modifier Restricted</p>
                  <p className="text-[10px] text-gray-400 max-w-xs leading-relaxed font-sans">
                    Adding/removing players on the fly is restricted to the <strong className="text-green-400 font-sans">Main Runs Scorer</strong> or <strong className="text-green-400 font-sans">Super Admin</strong>.
                  </p>
                </div>
              )}

              {isSquadManagerAllowed && (
                <div className="bg-black/60 rounded-sm p-4 border border-white/10 space-y-4 shadow-lg shadow-black/35">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <h4 className="font-extrabold text-xs text-white uppercase font-mono tracking-wider flex items-center gap-2">
                      <Users className="w-4 h-4 text-green-500 animate-pulse" /> Live Squads & Player Management
                    </h4>
                    <span className="text-[9px] text-white/40 uppercase font-mono">Dynamic On-The-Fly Updates</span>
                  </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Team A Management Column */}
                  <div className="space-y-3 bg-[#0a0a0a] p-3 rounded-sm border border-white/5">
                    <div className="flex items-center justify-between">
                      <h5 className="font-bold text-[11px] text-green-400 uppercase truncate max-w-[120px]">{matchState.teamA.name}</h5>
                      <div className="flex items-center gap-1.5">
                        <label className="text-[8px] text-white/40 uppercase font-mono">Squad Size:</label>
                        <input
                          type="number"
                          value={customSquadLimitA}
                          onChange={(e) => setCustomSquadLimitA(parseInt(e.target.value) || 0)}
                          className="w-10 bg-black text-[10px] text-white text-center py-0.5 border border-white/10 rounded-sm focus:outline-none focus:border-green-500 font-mono"
                        />
                        <button
                          onClick={() => handleSetSquadSizeLimit(0, customSquadLimitA)}
                          className="bg-white/5 hover:bg-green-600 hover:text-black border border-white/10 px-1.5 py-0.5 text-[8px] font-mono rounded-sm transition uppercase font-bold"
                          title="Update squad size limit parameter"
                        >
                          Set
                        </button>
                      </div>
                    </div>

                    {/* Add Player Inline Form */}
                    <div className="flex gap-1">
                      <input
                        type="text"
                        placeholder="New player..."
                        value={newPlayerNameA}
                        onChange={(e) => setNewPlayerNameA(e.target.value)}
                        className="flex-1 bg-black text-[10px] text-white px-2 py-1 border border-[#1b1b1b] rounded-sm focus:outline-none focus:border-green-500"
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddPlayer(0, newPlayerNameA); }}
                      />
                      <button
                        onClick={() => handleAddPlayer(0, newPlayerNameA)}
                        className="bg-green-600 hover:bg-green-500 text-black px-2.5 py-1 text-[10px] uppercase tracking-wider font-extrabold rounded-sm transition active:scale-95 flex items-center gap-0.5"
                      >
                        <Plus className="w-3" />
                      </button>
                    </div>

                    {/* Squad list scroll box */}
                    <div className="max-h-48 overflow-y-auto space-y-1 pr-1 text-[10px] font-mono scrollbar-thin">
                      {matchState.teamA.squad.length === 0 ? (
                        <div className="text-center text-white/30 py-4 italic text-[9px]">No players in squad.</div>
                      ) : (
                        matchState.teamA.squad.map((player, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-black/60 px-2 py-1.5 rounded-sm border border-[#151515] hover:border-white/10 transition">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-white/30 text-[8px] w-4">{idx + 1}.</span>
                              <span className={`truncate font-medium text-white ${player.isOut ? 'line-through text-white/45' : ''}`}>
                                {player.name} {player.isCurrentlyBatting && <span className="text-green-500 text-[8px] font-bold ml-1">★</span>}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => handleEditPlayerName(0, player.name)}
                                className="text-white/30 hover:text-green-400 p-0.5 transition"
                                title="Edit Player Name"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDeletePlayer(0, player.name)}
                                className="text-white/30 hover:text-red-500 p-0.5 transition"
                                title="Remove Player"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Team B Management Column */}
                  <div className="space-y-3 bg-[#0a0a0a] p-3 rounded-sm border border-white/5">
                    <div className="flex items-center justify-between">
                      <h5 className="font-bold text-[11px] text-green-400 uppercase truncate max-w-[120px]">{matchState.teamB.name}</h5>
                      <div className="flex items-center gap-1.5">
                        <label className="text-[8px] text-white/40 uppercase font-mono">Squad Size:</label>
                        <input
                          type="number"
                          value={customSquadLimitB}
                          onChange={(e) => setCustomSquadLimitB(parseInt(e.target.value) || 0)}
                          className="w-10 bg-black text-[10px] text-white text-center py-0.5 border border-white/10 rounded-sm focus:outline-none focus:border-green-500 font-mono"
                        />
                        <button
                          onClick={() => handleSetSquadSizeLimit(1, customSquadLimitB)}
                          className="bg-white/5 hover:bg-green-600 hover:text-black border border-white/10 px-1.5 py-0.5 text-[8px] font-mono rounded-sm transition uppercase font-bold"
                          title="Update squad size limit parameter"
                        >
                          Set
                        </button>
                      </div>
                    </div>

                    {/* Add Player Inline Form */}
                    <div className="flex gap-1">
                      <input
                        type="text"
                        placeholder="New player..."
                        value={newPlayerNameB}
                        onChange={(e) => setNewPlayerNameB(e.target.value)}
                        className="flex-1 bg-black text-[10px] text-white px-2 py-1 border border-[#1b1b1b] rounded-sm focus:outline-none focus:border-green-500"
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddPlayer(1, newPlayerNameB); }}
                      />
                      <button
                        onClick={() => handleAddPlayer(1, newPlayerNameB)}
                        className="bg-green-600 hover:bg-green-500 text-black px-2.5 py-1 text-[10px] uppercase tracking-wider font-extrabold rounded-sm transition active:scale-95 flex items-center gap-0.5"
                      >
                        <Plus className="w-3" />
                      </button>
                    </div>

                    {/* Squad list scroll box */}
                    <div className="max-h-48 overflow-y-auto space-y-1 pr-1 text-[10px] font-mono scrollbar-thin">
                      {matchState.teamB.squad.length === 0 ? (
                        <div className="text-center text-white/30 py-4 italic text-[9px]">No players in squad.</div>
                      ) : (
                        matchState.teamB.squad.map((player, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-black/60 px-2 py-1.5 rounded-sm border border-[#151515] hover:border-white/10 transition">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-white/30 text-[8px] w-4">{idx + 1}.</span>
                              <span className={`truncate font-medium text-white ${player.isOut ? 'line-through text-white/45' : ''}`}>
                                {player.name} {player.isCurrentlyBatting && <span className="text-green-500 text-[8px] font-bold ml-1">★</span>}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => handleEditPlayerName(1, player.name)}
                                className="text-white/30 hover:text-green-400 p-0.5 transition"
                                title="Edit Player Name"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDeletePlayer(1, player.name)}
                                className="text-white/30 hover:text-red-500 p-0.5 transition"
                                title="Remove Player"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
              )}

            </div>
          )}

        </div>

        {/* SECTION B: Live Broadcasting (Webcam Frame streaming) & Setup Teams (4 Cols) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* STREAM CONFIGURATION SETUP CARD */}
          <div className="bg-slate-950 rounded-xl p-4 border border-white/10 space-y-4">
            <h3 className="text-xs font-black text-amber-500 uppercase tracking-wider flex items-center gap-1.5 font-mono">
              <Tv className="w-4 h-4 text-amber-500" /> Live Stream Source Setup
            </h3>
            
            <p className="text-[11px] text-slate-400 leading-normal">
              Select what broadcast spectators will watch. You can direct them to your Facebook Page Stream OR broadcast using your mobile/webcam.
            </p>

            <div className="grid grid-cols-2 gap-2 text-[10px] font-bold font-mono">
              <button
                type="button"
                onClick={() => {
                  setStreamType('camera');
                  handleUpdateStreamSettings('camera', fbStreamUrl);
                }}
                className={`py-2 px-1 rounded flex flex-col items-center justify-center gap-1.5 transition whitespace-nowrap cursor-pointer border ${
                  streamType === 'camera'
                    ? 'bg-amber-500/10 border-amber-500 text-amber-400 font-extrabold'
                    : 'bg-black/40 border-white/5 text-white/40 hover:text-white/60'
                }`}
              >
                <span>📷 MOBILE CAMERA</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setStreamType('fb_stream');
                  handleUpdateStreamSettings('fb_stream', fbStreamUrl);
                }}
                className={`py-2 px-1 rounded flex flex-col items-center justify-center gap-1.5 transition whitespace-nowrap cursor-pointer border ${
                  streamType === 'fb_stream'
                    ? 'bg-blue-500/10 border-blue-500 text-blue-400 font-extrabold'
                    : 'bg-black/40 border-white/5 text-white/40 hover:text-white/60'
                }`}
              >
                <span>🏟️ FACEBOOK / LINK</span>
              </button>
            </div>

            {streamType === 'fb_stream' && (
              <div className="space-y-2 animate-in fade-in duration-200">
                <label className="text-[9px] text-slate-400 font-bold uppercase block">Facebook Embed / Watch Link</label>
                <textarea
                  rows={3}
                  value={fbStreamUrl}
                  onChange={(e) => setFbStreamUrl(e.target.value)}
                  placeholder="Paste Facebook video embed URL, Page Watch Url, or custom iFrame source link here..."
                  className="w-full bg-black text-[10px] font-mono text-zinc-300 p-2 rounded border border-white/10 focus:outline-none focus:border-blue-500 leading-normal"
                />
                
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setFbStreamUrl("https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Fwww.facebook.com%2Ffacebook%2Fvideos%2F10153231379948893%2F&show_text=0");
                    }}
                    className="text-[8px] font-mono text-blue-400 bg-blue-950/20 px-1.5 py-1 rounded border border-blue-900/35 hover:bg-blue-950/40 whitespace-nowrap"
                  >
                    Set Demo FB Live URL
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateStreamSettings('fb_stream', fbStreamUrl)}
                    className="flex-1 text-[9px] font-bold uppercase tracking-wider text-black bg-blue-500 hover:bg-blue-400 py-1 rounded cursor-pointer transition text-center"
                  >
                    Save Link
                  </button>
                </div>

                <div className="text-[9px] text-slate-500 leading-relaxed bg-[#0c0c0c] p-2 rounded border border-white/5 font-sans">
                  💡 <strong>Tip:</strong> Spectators will watch this stream inside a high-definition video frame with an automated direct watch fallback button.
                </div>
              </div>
            )}
          </div>
          
          {/* CAMERA CLIENT CARD */}
          {!isBroadcastAllowed ? (
            <div className="bg-slate-950/80 border border-slate-850 rounded-xl p-6 text-center shadow flex flex-col items-center justify-center py-8">
              <Lock className="w-6 h-6 text-red-500 mb-1.5 animate-pulse" />
              <p className="text-[11px] uppercase font-black tracking-wider text-red-400 mb-1">Camera Stream Restricted</p>
              <p className="text-[10px] text-gray-500 max-w-xs leading-relaxed font-sans">
                Only the <strong className="text-green-400">Broadcast Manager</strong> or <strong className="text-green-400 font-sans">Super Admin</strong> can start a webcam broadcast.
              </p>
            </div>
          ) : (
            <div className="bg-slate-950 rounded-xl p-4 border border-slate-850 space-y-4">
              <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5 font-mono">
                <Video className="w-4 h-4 text-red-500" /> Administrative Camera Capture
              </h3>
              
              <p className="text-[11px] text-slate-400 leading-normal">
                Broadcasting your camera turns on live stream for match spectators recursively on standard canvas images.
              </p>

              {/* Hidden video & Canvas elements */}
              <video ref={videoRef} className="hidden" playsInline muted></video>
              <canvas ref={canvasRef} className="hidden"></canvas>

              {/* Video preview Monitor box */}
              {streamActive ? (
                <div className="w-full aspect-video rounded bg-black relative overflow-hidden border border-red-500/35">
                  <div className="absolute top-2 left-2 bg-red-600 font-mono font-bold text-[8px] px-1.5 py-0.5 rounded text-white tracking-widest animate-pulse flex items-center gap-1">
                    🔴 ACTIVE LIVE BROADCASTING
                  </div>
                  {isRecording && (
                    <div className="absolute top-2 right-2 bg-slate-950/80 font-mono text-[8px] text-amber-500 px-1.5 py-0.5 rounded border border-amber-500/20">
                      📼 RECORDING TO SERVER
                    </div>
                  )}
                  {/* Render preview locally on a monitor */}
                  <div className="w-full h-full flex items-center justify-center bg-slate-900 border border-slate-800 text-xs text-slate-500 italic">
                    Live Stream capture active...
                  </div>
                </div>
              ) : (
                <div className="w-full aspect-video rounded-lg bg-slate-900 border border-slate-850 flex flex-col items-center justify-center text-center p-4">
                  <Video className="w-8 h-8 text-slate-700 animate-pulse mb-1.5" />
                  <span className="text-[10px] text-slate-500 font-mono tracking-tight">Camera Feed is Offline</span>
                </div>
              )}

              {streamError && (
                <div className="text-[9px] text-amber-500 bg-amber-950/40 p-2 rounded border border-amber-900/30 font-semibold leading-relaxed">
                  <span>{streamError}</span>
                </div>
              )}

              <div className="flex gap-2">
                {!streamActive ? (
                  <button
                    onClick={startCameraBroadcast}
                    className="flex-1 bg-red-600 hover:bg-red-500 text-white font-extrabold py-2.5 rounded text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition active:scale-95 shadow"
                  >
                    <Play className="w-3.5 h-3.5" /> Start Live Stream & Record
                  </button>
                ) : (
                  <button
                    onClick={stopCameraBroadcast}
                    className="flex-1 bg-slate-855 hover:bg-slate-750 text-white border border-slate-800 font-extrabold py-2.5 rounded text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition active:scale-95 shadow"
                  >
                    <Square className="w-3.5 h-3.5 text-amber-500" /> Stop Broadcast & Save WebM
                  </button>
                )}
              </div>
            </div>
          )}

          {/* SQUADS INITIALIZATION AND REGISTER CARD */}
          {!isSuperAdmin ? (
            <div className="bg-slate-950/85 border border-slate-850 rounded-xl p-6 text-center shadow flex flex-col items-center justify-center py-8">
              <Lock className="w-6 h-6 text-amber-500 mb-1.5 animate-pulse" />
              <p className="text-[11px] uppercase font-black tracking-wider text-amber-400 mb-1">Squad Setup Restricted</p>
              <p className="text-[10px] text-gray-500 max-w-xs leading-relaxed font-sans">
                Match Setup/Rebuilding is restricted to the <strong className="text-green-400 font-sans">Super Admin</strong> profile only. Scorer profiles cannot override team state.
              </p>
            </div>
          ) : (
            <div className="bg-slate-950 rounded-xl p-4 border border-slate-850 space-y-4">
              <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5 font-mono">
                <Scroll className="w-4 h-4 text-amber-500" /> Match Squad Initializer
              </h3>

              {matchState.matchActive && !unlockInitForm ? (
                <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl text-center space-y-3">
                  <AlertCircle className="w-8 h-8 text-amber-500 mx-auto animate-pulse" />
                  <p className="text-[11px] text-white font-black uppercase font-mono tracking-wider">⚠️ Match Is Currently Active</p>
                  <p className="text-[10px] text-slate-400 leading-normal font-sans">
                    Scoreboard state size, player details, and runs are actively counting. To avoid deleting this live session, creation options are locked.
                  </p>
                  <div className="pt-2">
                    <label className="flex items-center justify-center gap-2 text-amber-400 text-[10px] uppercase font-mono font-black tracking-wide bg-black/45 py-2 px-1.5 rounded border border-white/5 cursor-pointer selection:bg-none">
                      <input
                        type="checkbox"
                        checked={unlockInitForm}
                        onChange={(e) => {
                          triggerHaptic(50);
                          setUnlockInitForm(e.target.checked);
                        }}
                        className="w-3.5 h-3.5 accent-amber-500"
                      />
                      <span>Force Unlock Rebuild</span>
                    </label>
                  </div>
                </div>
              ) : (
                <>
                  {matchState.matchActive && (
                    <div className="bg-red-500/15 border border-red-500/25 p-2 rounded text-[10px] text-red-400 font-mono text-center">
                      🚨 Warning: Submitting this form will completely reset the active game score!
                    </div>
                  )}

                  <p className="text-[11px] text-slate-500 leading-normal">
                    Register team names and player list line-by-line. First batting first initially.
                  </p>

                  <form 
                    onSubmit={(e) => {
                      handleInitializeMatch(e);
                      // Auto lock form again after setup
                      setUnlockInitForm(false);
                    }} 
                    className="space-y-4 text-xs select-none"
                  >
                    
                    {/* Match Title */}
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-bold uppercase">Match title / Season name</label>
                      <input
                        type="text"
                        placeholder="e.g. Sardar Sherrani Premier League"
                        value={matchTitleInput}
                        onChange={(e) => setMatchTitleInput(e.target.value)}
                        className="w-full bg-slate-900 text-white p-2.5 rounded border border-slate-800 focus:outline-none focus:border-amber-500 font-medium"
                        required
                      />
                    </div>

                    {/* Total Match Overs Selection */}
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-bold uppercase">Total Match Overs</label>
                      <div className="grid grid-cols-5 gap-1.5">
                        {[1, 2, 5, 10, 20].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setMaxOversInput(num)}
                            className={`py-2 text-[10px] font-mono rounded font-extrabold transition border cursor-pointer ${
                              maxOversInput === num
                                ? "bg-amber-500 text-slate-950 border-amber-500 font-black scale-102"
                                : "bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700"
                            }`}
                          >
                            {num} {num === 1 ? "Over" : "Ovs"}
                          </button>
                        ))}
                      </div>
                      <div className="mt-2 flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-500">Or manually enter:</span>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={maxOversInput}
                          onChange={(e) => setMaxOversInput(parseInt(e.target.value) || 20)}
                          className="w-16 bg-slate-900 text-white text-center py-1 rounded border border-slate-800 text-[10px] font-mono focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>

                    {/* Team A setup */}
                    <div className="space-y-2">
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-bold uppercase">TEAM A NAME (BATTING TEAM)</label>
                        <input
                          type="text"
                          value={teamANameInput}
                          onChange={(e) => setTeamANameInput(e.target.value)}
                          className="w-full bg-slate-900 text-white p-2.5 rounded border border-slate-800 focus:outline-none focus:border-amber-500 font-bold"
                          required
                        />
                      </div>
                      <div className="space-y-1 text-left">
                        <label className="text-[10px] text-slate-500 font-bold uppercase">Team A Squad (One Name per line)</label>
                        <textarea
                          rows={4}
                          value={teamASquadText}
                          onChange={(e) => setTeamASquadText(e.target.value)}
                          className="w-full bg-slate-900 text-[11px] text-white p-2 rounded border border-slate-850 font-mono focus:outline-none focus:border-amber-500"
                          placeholder="Enter names"
                          required
                        />
                      </div>
                    </div>

                    {/* Team B setup */}
                    <div className="space-y-2">
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-bold uppercase">TEAM B NAME (BOWLING TEAM)</label>
                        <input
                          type="text"
                          value={teamBNameInput}
                          onChange={(e) => setTeamBNameInput(e.target.value)}
                          className="w-full bg-slate-900 text-white p-2.5 rounded border border-slate-800 focus:outline-none focus:border-amber-500 font-bold"
                          required
                        />
                      </div>
                      <div className="space-y-1 text-left">
                        <label className="text-[10px] text-slate-500 font-bold uppercase">Team B Squad (One Name per line)</label>
                        <textarea
                          rows={4}
                          value={teamBSquadText}
                          onChange={(e) => setTeamBSquadText(e.target.value)}
                          className="w-full bg-slate-900 text-[11px] text-white p-2 rounded border border-slate-850 font-mono focus:outline-none focus:border-amber-500"
                          placeholder="Enter names"
                          required
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-amber-505 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-2.5 rounded-lg text-xs uppercase tracking-wider transition active:scale-98 cursor-pointer flex items-center justify-center gap-1"
                    >
                      <Scroll className="w-3.5 h-3.5" /> Initialize & Setup Match
                    </button>
                  </form>
                </>
              )}
            </div>
          )}

        </div>

      </div>

      {/* ================= MODAL: INTERACTIVE WICKET DISMISSAL OPTIONS ================= */}
      {showWicketModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-sans select-none overflow-y-auto">
          <div className="bg-zinc-950 border border-red-500/30 rounded-xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in scale-in duration-150 text-left">
            
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🔴</span>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">
                    Wicket Selection & Dismissal Detail
                  </h3>
                  <p className="text-[10px] text-red-400 font-mono">وکٹ آؤٹ ہونے کی تفصیلات کا اندراج</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowWicketModal(false)}
                className="text-white/40 hover:text-white px-2 py-1 text-xs font-mono font-bold hover:bg-white/5 rounded"
              >
                ✕ CLOSE
              </button>
            </div>

            <div className="space-y-4">
              {/* Active Batsman & Bowler Indicators */}
              <div className="grid grid-cols-2 gap-3 text-[11px] bg-red-950/20 p-2.5 rounded border border-red-900/20">
                <div>
                  <span className="text-white/40 uppercase text-[9px] block">Batsman Out (بلے باز):</span>
                  <strong className="text-white text-xs font-bold font-mono">{matchState.strikerName}</strong>
                </div>
                <div>
                  <span className="text-white/40 uppercase text-[9px] block">Bowler (بولر):</span>
                  <strong className="text-white text-xs font-bold font-mono">{matchState.currentBowlerName}</strong>
                </div>
              </div>

              {/* 1. Select Dismissal Type */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Select Dismissal Mode (آؤٹ ہونے کا طریقہ بتائیں)
                </label>
                <div className="grid grid-cols-2 gap-1.5 text-[11.5px] font-mono">
                  {[
                    { id: 'caught', label: 'Caught (کیچ آؤٹ)' },
                    { id: 'bowled', label: 'Bowled (بولڈ ہوا)' },
                    { id: 'stumped', label: 'Stumped (سٹمپ آؤٹ)' },
                    { id: 'run_out', label: 'Run Out (رن آؤٹ ہوا)' },
                    { id: 'lbw', label: 'L.B.W. (ایل بی ڈبیلو)' },
                    { id: 'caught_bowled', label: 'Caught  Bowled' },
                    { id: 'hit_wicket', label: 'Hit Wicket' },
                    { id: 'others', label: 'Others / Custom' },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setWicketType(mode.id)}
                      className={`py-2.5 px-2 rounded-lg border text-left flex flex-col justify-center transition cursor-pointer ${
                        wicketType === mode.id
                          ? 'bg-red-500/10 border-red-500 text-white font-extrabold'
                          : 'bg-black/50 border-white/5 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span className="font-sans font-bold">{mode.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Select Fielder / Assistant based on selection */}
              {(wicketType === 'caught' || wicketType === 'stumped' || wicketType === 'run_out') && (
                <div className="space-y-2 animate-in fade-in slide-in duration-200">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    {wicketType === 'caught' 
                      ? 'Who took the catch? (کیچ کس نے پکڑا؟)' 
                      : wicketType === 'stumped' 
                      ? 'Who did the stumping? (سٹمپ کس نے کیا؟)' 
                      : 'Who made the run out? (رن آؤٹ کس نے کیا؟)'}
                  </label>
                  
                  {bowlingTeam.squad && bowlingTeam.squad.length > 0 ? (
                    <div className="space-y-1.5">
                      <select
                        value={selectedFielder}
                        onChange={(e) => setSelectedFielder(e.target.value)}
                        className="w-full bg-black text-xs text-white p-2.5 rounded border border-white/10 font-mono focus:outline-none focus:border-red-500 cursor-pointer"
                      >
                        {bowlingTeam.squad.map((p) => (
                          <option key={p.name} value={p.name}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                      
                      {/* Flex direct buttons for quick selection */}
                      <div className="flex flex-wrap gap-1 pt-1 max-h-24 overflow-y-auto p-1 bg-black/40 rounded border border-white/5">
                        {bowlingTeam.squad.map((p) => (
                          <button
                            key={p.name}
                            type="button"
                            onClick={() => setSelectedFielder(p.name)}
                            className={`text-[9px] font-mono px-2 py-1 rounded transition whitespace-nowrap cursor-pointer ${
                              selectedFielder === p.name
                                ? 'bg-red-600 text-white font-extrabold shadow-sm'
                                : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
                            }`}
                          >
                            👤 {p.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-[10px] text-amber-500 bg-amber-500/5 p-2 rounded border border-amber-500/10 font-sans">
                      ⚠️ No fielding squad members loaded. Please initialize team squad lists first down below.
                    </p>
                  )}
                </div>
              )}

              {/* 3. Custom freeform fallback */}
              {wicketType === 'others' && (
                <div className="space-y-1.5 animate-in fade-in duration-200">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Enter Custom Dismissal / Reason (دیگر تفصیلات لکھیں)
                  </label>
                  <input
                    type="text"
                    value={customWicketText}
                    onChange={(e) => setCustomWicketText(e.target.value)}
                    placeholder="e.g., Retired Hurt, Timed Out, Handled ball"
                    className="w-full bg-black text-xs text-zinc-200 p-2.5 rounded border border-white/10 focus:outline-none focus:border-red-500 font-mono"
                  />
                </div>
              )}

            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 border-t border-white/10 pt-4 font-bold uppercase tracking-wider text-xs">
              <button
                type="button"
                onClick={() => setShowWicketModal(false)}
                className="flex-1 bg-stone-900 text-slate-300 py-3 rounded-lg hover:bg-stone-850 cursor-pointer transition text-center"
              >
                Cancel (کینسل)
              </button>
              
              <button
                type="button"
                onClick={() => {
                  let outHowStr = "Caught";
                  const bowlerName = matchState.currentBowlerName || "Bowler";
                  
                  if (wicketType === 'bowled') {
                    outHowStr = `Bowled ${bowlerName}`;
                  } else if (wicketType === 'caught') {
                    outHowStr = selectedFielder 
                      ? `c ${selectedFielder} b ${bowlerName}` 
                      : `Caught b ${bowlerName}`;
                  } else if (wicketType === 'stumped') {
                    outHowStr = selectedFielder 
                      ? `st ${selectedFielder} b ${bowlerName}` 
                      : `Stumped b ${bowlerName}`;
                  } else if (wicketType === 'run_out') {
                    outHowStr = selectedFielder 
                      ? `Run Out (${selectedFielder})` 
                      : `Run Out`;
                  } else if (wicketType === 'lbw') {
                    outHowStr = `lbw b ${bowlerName}`;
                  } else if (wicketType === 'caught_bowled') {
                    outHowStr = `c & b ${bowlerName}`;
                  } else if (wicketType === 'hit_wicket') {
                    outHowStr = `Hit Wicket b ${bowlerName}`;
                  } else if (wicketType === 'others') {
                    outHowStr = customWicketText.trim() || "Out";
                  }

                  handleScoreAction('wicket', '', outHowStr);
                  setShowWicketModal(false);
                }}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white py-3 rounded-lg cursor-pointer transition text-center"
              >
                Confirm Out! (آؤٹ ہوا)
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
