import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import * as dotenv from 'dotenv';
import { MatchState, MatchComment, MatchRecording, Player, UpcomingMatch } from './src/types';

dotenv.config();

// Initialize the Express app
const app = express();
const PORT = 3000;

// Set high limits for uploading recorded cricket matches and webcam frames
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// Shared in-memory cricket match state
let currentMatchState: MatchState = {
  teamA: { name: "Sherrani Royals", squad: [], totalSquadSize: 0, isRegistered: false },
  teamB: { name: "Quetta Gladiators Local", squad: [], totalSquadSize: 0, isRegistered: false },
  battingTeamIndex: 0,
  bowlingTeamIndex: 1,
  runs: 0,
  wickets: 0,
  overs: 0,
  balls: 0,
  maxOvers: 20,
  inningsCount: 1,
  strikerName: undefined,
  nonStrikerName: undefined,
  currentBowlerName: undefined,
  matchActive: false,
  isLive: false,
  currentFrame: undefined,
  streamType: 'camera',
  fbStreamUrl: 'https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Fwww.facebook.com%2Ffacebook%2Fvideos%2F10153231379948893%2F&show_text=0',
  comments: [
    {
      id: "comment-1",
      user: "SK Sherrani",
      text: "As-salamu alaykum! Welcome to the official matches application. Today we will have some amazing local matches. Register the teams to get started!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ],
  recordings: [],
  recentBalls: [],
  matchId: "match-sk-default",
  matchTitle: "Sardar Sherrani Premier League",
  groundName: "Sherrani Cricket Stadium, Quetta",
  teamAOversHistory: [],
  teamBOversHistory: [],
  highlights: [
    {
      id: "init-highlight",
      over: 0,
      balls: 0,
      runs: 0,
      wickets: 0,
      text: "🏟️ Preparation underway at the Sherrani Cricket Ground! Match is ready to begin shortly lala.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'init'
    }
  ]
};

// Undo stack for administration mistakes
let stateUndoStack: string[] = [];

function pushToUndoStack() {
  stateUndoStack.push(JSON.stringify({
    ...currentMatchState,
    comments: undefined // Do not undo user comments
  }));
  // Keep only last 10 states
  if (stateUndoStack.length > 10) {
    stateUndoStack.shift();
  }
}

// Add match highlight helper
function addAutomaticHighlight(text: string, type: 'six' | 'four' | 'wicket' | 'innings_break' | 'custom' | 'init') {
  if (!currentMatchState.highlights) {
    currentMatchState.highlights = [];
  }
  const newHighlight = {
    id: `highlight-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    over: currentMatchState.overs,
    balls: currentMatchState.balls,
    runs: currentMatchState.runs,
    wickets: currentMatchState.wickets,
    text,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    type
  };
  currentMatchState.highlights.unshift(newHighlight);
  if (currentMatchState.highlights.length > 50) {
    currentMatchState.highlights.pop();
  }
}

// Record over history snapshot helper
function recordOverHistory() {
  if (!currentMatchState.teamAOversHistory) currentMatchState.teamAOversHistory = [];
  if (!currentMatchState.teamBOversHistory) currentMatchState.teamBOversHistory = [];

  const overNum = currentMatchState.overs;
  const runs = currentMatchState.runs;
  const wickets = currentMatchState.wickets;
  const runRate = overNum > 0 ? parseFloat((runs / overNum).toFixed(2)) : 0;

  const record = { over: overNum, runs, wickets, runRate };

  if (currentMatchState.battingTeamIndex === 0) {
    currentMatchState.teamAOversHistory = currentMatchState.teamAOversHistory.filter(h => h.over !== overNum);
    currentMatchState.teamAOversHistory.push(record);
  } else {
    currentMatchState.teamBOversHistory = currentMatchState.teamBOversHistory.filter(h => h.over !== overNum);
    currentMatchState.teamBOversHistory.push(record);
  }
}


// Ensure lazy loading / safety for Gemini API operations
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("Warning: GEMINI_API_KEY environment variable is not configured. SK Chatbot will run in mock descriptive mode.");
    return null;
  }
  return new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
};

/* --- API Endpoints --- */

// 1. Health & Configuration check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// 2. Fetch current match state
app.get('/api/match/state', (req, res) => {
  res.json(currentMatchState);
});

// 3. User comment creation
app.post('/api/match/comment', (req, res) => {
  const { user, text } = req.body;
  if (!text) {
    return res.status(400).json({ error: "Comment text is required." });
  }

  const newComment: MatchComment = {
    id: `comment-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    user: user || "Cricket Fan",
    text: text.trim().slice(0, 200),
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };

  currentMatchState.comments.unshift(newComment);
  // Keep last 100 comments
  if (currentMatchState.comments.length > 100) {
    currentMatchState.comments.pop();
  }

  res.json({ success: true, comments: currentMatchState.comments });
});

// --- Upcoming Matches State & Endpoints ---
let upcomingMatches: UpcomingMatch[] = [
  {
    id: "up-1",
    teamA: "SK Sherrani Cricket Club",
    teamB: "Quetta Gladiators Local",
    date: "2026-06-10",
    time: "17:00",
    venue: "Sherrani Cricket Stadium, Quetta",
    matchType: "T20 League Match",
    notes: "Sardar Sherrani Premier League - Group Stage"
  },
  {
    id: "up-2",
    teamA: "Ziarat Panthers",
    teamB: "Chaman Tigers XI",
    date: "2026-06-12",
    time: "15:30",
    venue: "Quetta Cantonment Turf Stadium",
    matchType: "T10 Friendly Cup",
    notes: "High altitude local derby"
  },
  {
    id: "up-3",
    teamA: "Sherrani Royals",
    teamB: "Loralai Super Kings",
    date: "2026-06-15",
    time: "18:00",
    venue: "Sherrani Cricket Stadium, Quetta",
    matchType: "T20 Semi-Final",
    notes: "High pressure knockout live coverage"
  }
];

// Fetch upcoming scheduled matches
app.get('/api/match/upcoming', (req, res) => {
  res.json(upcomingMatches);
});

// Admin: Add an upcoming match
app.post('/api/admin/match/upcoming', (req, res) => {
  const { teamA, teamB, date, time, venue, matchType, notes } = req.body;
  if (!teamA || !teamB || !date || !time || !venue || !matchType) {
    return res.status(400).json({ error: "Missing required properties to schedule a match" });
  }

  const newUpcoming: UpcomingMatch = {
    id: `upcoming-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    teamA: teamA.trim(),
    teamB: teamB.trim(),
    date: date.trim(),
    time: time.trim(),
    venue: venue.trim(),
    matchType: matchType.trim(),
    notes: notes ? notes.trim() : undefined
  };

  upcomingMatches.push(newUpcoming);
  res.json({ success: true, upcomingMatches });
});

// Admin: Delete an upcoming match
app.delete('/api/admin/match/upcoming/:id', (req, res) => {
  const { id } = req.params;
  upcomingMatches = upcomingMatches.filter(m => m.id !== id);
  res.json({ success: true, upcomingMatches });
});

// 4. Admin - Register Teams & Squads (Complete customizable setup with Toss options)
app.post('/api/admin/match/init', (req, res) => {
  const { teamAName, teamBName, teamASquad, teamBSquad, matchTitle, groundName, maxOvers, inningsCount, tossWinner, tossDecision } = req.body;

  if (!teamAName || !teamBName) {
    return res.status(400).json({ error: "Both team names are required." });
  }

  const parsedMaxOvers = parseInt(maxOvers, 10) || 20;
  const parsedInningsCount = parseInt(inningsCount, 10) || 1;

  pushToUndoStack();

  // Helper to map simple string list to Player squad objects
  const mapSquad = (names: string[]): Player[] => {
    return (names || []).filter(name => name.trim() !== "").map(name => ({
      name: name.trim(),
      runsScored: 0,
      ballsFaced: 0,
      boundaries4: 0,
      boundaries6: 0,
      isOut: false,
      oversBowled: 0,
      runsConceded: 0,
      wicketsTaken: 0,
      ballsBowledInOver: 0,
      isCurrentlyBatting: false,
      status: 'bench'
    }));
  };

  const squadA = mapSquad(teamASquad);
  const squadB = mapSquad(teamBSquad);

  // Determine batting index based on Toss
  let battingIndex: 0 | 1 = 0;
  let bowlingIndex: 0 | 1 = 1;

  if (tossWinner === 'teamA') {
    if (tossDecision === 'bowl') {
      battingIndex = 1;
      bowlingIndex = 0;
    } else {
      battingIndex = 0;
      bowlingIndex = 1;
    }
  } else if (tossWinner === 'teamB') {
    if (tossDecision === 'bat') {
      battingIndex = 1;
      bowlingIndex = 0;
    } else {
      battingIndex = 0;
      bowlingIndex = 1;
    }
  }

  const battingSquad = battingIndex === 0 ? squadA : squadB;
  const bowlingSquad = bowlingIndex === 0 ? squadA : squadB;

  // Default first 2 batting players if space is there
  if (battingSquad.length > 0) {
    battingSquad[0].status = 'batting';
    battingSquad[0].isCurrentlyBatting = true;
    if (battingSquad.length > 1) {
      battingSquad[1].status = 'batting';
    }
  }

  const winnerName = tossWinner === 'teamA' ? teamAName.trim() : (tossWinner === 'teamB' ? teamBName.trim() : '');
  const decisionText = tossDecision === 'bat' ? 'bat first' : (tossDecision === 'bowl' ? 'bowl first' : '');
  const tossString = winnerName && decisionText ? `${winnerName} won the toss and elected to ${decisionText}.` : '';

  currentMatchState = {
    ...currentMatchState,
    teamA: {
      name: teamAName.trim(),
      squad: squadA,
      totalSquadSize: squadA.length,
      isRegistered: true
    },
    teamB: {
      name: teamBName.trim(),
      squad: squadB,
      totalSquadSize: squadB.length,
      isRegistered: true
    },
    battingTeamIndex: battingIndex,
    bowlingTeamIndex: bowlingIndex,
    runs: 0,
    wickets: 0,
    overs: 0,
    balls: 0,
    maxOvers: parsedMaxOvers,
    inningsCount: parsedInningsCount,
    strikerName: battingSquad[0]?.name || undefined,
    nonStrikerName: battingSquad[1]?.name || undefined,
    currentBowlerName: bowlingSquad[0]?.name || undefined,
    matchActive: true,
    recentBalls: [],
    matchTitle: (matchTitle || "Local League Match").trim(),
    groundName: (groundName || "Sherrani Cricket Stadium, Quetta").trim(),
    matchId: `match-${Date.now()}`,
    tossWinner: tossWinner || undefined,
    tossDecision: tossDecision || undefined,
    tossText: tossString || undefined
  };

  // Set default bowler status to ready
  if (bowlingSquad.length > 0) {
    bowlingSquad[0].status = 'bench';
  }

  // Log in comments
  currentMatchState.comments.unshift({
    id: `event-${Date.now()}`,
    user: "System",
    text: `🏏 Match Setup Complete! ${tossString ? `${tossString} ` : ''}${currentMatchState.battingTeamIndex === 0 ? currentMatchState.teamA.name : currentMatchState.teamB.name} is batting and ${currentMatchState.bowlingTeamIndex === 0 ? currentMatchState.teamA.name : currentMatchState.teamB.name} is fielding first. Max ${parsedMaxOvers} overs.`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });

  res.json(currentMatchState);
});

// 5. Admin - Manual Score Updates with automatic strike rotation and bowler triggers
app.post('/api/admin/match/update-score', (req, res) => {
  const { action, value, detail } = req.body;
  if (!currentMatchState.matchActive) {
    return res.status(400).json({ error: "No active match initialized. Setup the match first." });
  }

  pushToUndoStack();

  const battingTeam = currentMatchState.battingTeamIndex === 0 ? currentMatchState.teamA : currentMatchState.teamB;
  const bowlingTeam = currentMatchState.bowlingTeamIndex === 0 ? currentMatchState.teamA : currentMatchState.teamB;

  // Find striker, non-striker and bowler references
  const striker = battingTeam.squad.find(p => p.name === currentMatchState.strikerName);
  const bowler = bowlingTeam.squad.find(p => p.name === currentMatchState.currentBowlerName);

  if (action === 'run') {
    // Runs include: 0, 1, 2, 3, 4, 6
    const scoreVal = parseInt(value, 10) || 0;

    currentMatchState.runs += scoreVal;
    currentMatchState.balls += 1;
    currentMatchState.recentBalls.push(scoreVal.toString());

    if (striker) {
      striker.runsScored += scoreVal;
      striker.ballsFaced += 1;
      if (scoreVal === 4) {
        striker.boundaries4 += 1;
        addAutomaticHighlight(`💥 Over ${currentMatchState.overs}.${currentMatchState.balls}: FOUR! Gorgeous boundary struck by ${striker.name} off bowler ${currentMatchState.currentBowlerName || 'the bowler'}.`, 'four');
      }
      if (scoreVal === 6) {
        striker.boundaries6 += 1;
        addAutomaticHighlight(`🚀 Over ${currentMatchState.overs}.${currentMatchState.balls}: SIXER! Smashed high over the boundaries by ${striker.name}! Brilliant batting!`, 'six');
      }
    }

    if (bowler) {
      bowler.runsConceded += scoreVal;
      bowler.ballsBowledInOver += 1;
    }

    // Strike rotation on odd runs
    if (scoreVal % 2 === 1) {
      const temp = currentMatchState.strikerName;
      currentMatchState.strikerName = currentMatchState.nonStrikerName;
      currentMatchState.nonStrikerName = temp;
    }

  } else if (action === 'extra') {
    // Wide, NoBall, Bye, LegBye
    const extraType = value; // 'wide' | 'noball' | 'bye' | 'legbye'
    const penaltyRuns = parseInt(detail, 10) || 1; // standard extra runs addition

    if (extraType === 'wide') {
      currentMatchState.runs += penaltyRuns;
      currentMatchState.recentBalls.push('Wd');
      if (bowler) {
        bowler.runsConceded += penaltyRuns;
      }
    } else if (extraType === 'noball') {
      currentMatchState.runs += penaltyRuns;
      currentMatchState.recentBalls.push('Nb');
      if (striker) {
        striker.ballsFaced += 1;
      }
      if (bowler) {
        bowler.runsConceded += penaltyRuns;
      }
    } else if (extraType === 'bye' || extraType === 'legbye') {
      currentMatchState.runs += penaltyRuns;
      currentMatchState.balls += 1;
      currentMatchState.recentBalls.push(`${penaltyRuns}B`);
      if (striker) {
        striker.ballsFaced += 1;
      }
      if (bowler) {
        bowler.ballsBowledInOver += 1;
        // bowler does not concede runner byes in their statistics
      }
      // Strike rotation for odd byes
      if (penaltyRuns % 2 === 1) {
        const temp = currentMatchState.strikerName;
        currentMatchState.strikerName = currentMatchState.nonStrikerName;
        currentMatchState.nonStrikerName = temp;
      }
    }

  } else if (action === 'wicket') {
    // Out!
    currentMatchState.wickets += 1;
    currentMatchState.balls += 1;
    currentMatchState.recentBalls.push('W');

    if (striker) {
      striker.ballsFaced += 1;
      striker.isOut = true;
      striker.status = 'out';
      striker.isCurrentlyBatting = false;
      striker.outHow = detail || "Caught";
    }

    if (bowler) {
      const lowerDetail = (detail || '').toLowerCase();
      const isRunOutOrRetired = lowerDetail.includes('run out') || lowerDetail.includes('runout') || lowerDetail.includes('retired');
      if (!isRunOutOrRetired) {
        bowler.wicketsTaken += 1;
      }
      bowler.ballsBowledInOver += 1;
    }

    addAutomaticHighlight(`🔴 Over ${currentMatchState.overs}.${currentMatchState.balls}: WICKET! ${striker ? striker.name : 'The batsman'} is dismissed (${detail || 'Caught'}). Superb delivery by ${bowler ? bowler.name : 'the bowler'}!`, 'wicket');

    // Clear striker name so admin has to select the next batsman
    currentMatchState.strikerName = undefined;

  } else if (action === 'switch-strike') {
    const temp = currentMatchState.strikerName;
    currentMatchState.strikerName = currentMatchState.nonStrikerName;
    currentMatchState.nonStrikerName = temp;

    currentMatchState.comments.unshift({
      id: `strike-${Date.now()}`,
      user: "System",
      text: "🔄 Mutual strike change between batsmen.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

  } else if (action === 'set-bowler') {
    currentMatchState.currentBowlerName = value;
    currentMatchState.comments.unshift({
      id: `bowler-${Date.now()}`,
      user: "System",
      text: `⚾ ${value} is now bowling.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

  } else if (action === 'set-batsman') {
    const { position, name } = req.body.data;
    
    // De-register previous player at this position
    const previousPlayerName = position === 'striker' ? currentMatchState.strikerName : currentMatchState.nonStrikerName;
    if (previousPlayerName) {
      const prevP = battingTeam.squad.find(p => p.name === previousPlayerName);
      if (prevP) {
        prevP.isCurrentlyBatting = false;
        prevP.status = 'bench';
      }
    }

    const playerRef = battingTeam.squad.find(p => p.name === name);
    if (playerRef) {
      playerRef.status = 'batting';
      if (position === 'striker') {
        currentMatchState.strikerName = name;
        playerRef.isCurrentlyBatting = true;
      } else {
        currentMatchState.nonStrikerName = name;
      }
      currentMatchState.comments.unshift({
        id: `batsman-${Date.now()}`,
        user: "System",
        text: `🏏 ${name} is selected as ${position}.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    }

  } else if (action === 'declare-over') {
    // Handle manual/auto over end compilation
    if (bowler) {
      bowler.oversBowled += 1;
      bowler.ballsBowledInOver = 0;
    }
    currentMatchState.overs += 1;
    recordOverHistory();
    currentMatchState.balls = 0;
    currentMatchState.recentBalls = [];
    currentMatchState.currentBowlerName = undefined; // trigger next bowler select option

    // Automatic strike swap at over end
    const temp = currentMatchState.strikerName;
    currentMatchState.strikerName = currentMatchState.nonStrikerName;
    currentMatchState.nonStrikerName = temp;

    currentMatchState.comments.unshift({
      id: `over-${Date.now()}`,
      user: "System",
      text: `🔚 Over completed! Score: ${currentMatchState.runs}/${currentMatchState.wickets} after ${currentMatchState.overs} overs. Choose the next bowler.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
  }

  // Automatic over detection
  if (currentMatchState.balls >= 6) {
    if (bowler) {
      bowler.oversBowled += 1;
      bowler.ballsBowledInOver = 0;
    }
    currentMatchState.overs += 1;
    recordOverHistory();
    currentMatchState.balls = 0;
    currentMatchState.recentBalls = [];
    currentMatchState.currentBowlerName = undefined; // trigger bowler select UI

    // Swap strike
    const temp = currentMatchState.strikerName;
    currentMatchState.strikerName = currentMatchState.nonStrikerName;
    currentMatchState.nonStrikerName = temp;

    currentMatchState.comments.unshift({
      id: `over-auto-${Date.now()}`,
      user: "System",
      text: `🔚 Over ended automatically! Score: ${currentMatchState.runs}/${currentMatchState.wickets} in ${currentMatchState.overs} overs.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
  }

  // Unified Switch Innings and End Match Detection
  const maxWickets = Math.max(1, battingTeam.squad.length - 1);
  const isAllOut = currentMatchState.wickets >= maxWickets;
  const isOversCompleted = currentMatchState.overs >= currentMatchState.maxOvers;

  if (!currentMatchState.target) {
    // 1st Innings: Check if all out or overs are done
    if (isAllOut || isOversCompleted) {
      const targetScore = currentMatchState.runs + 1;
      const oldBattingIndex = currentMatchState.battingTeamIndex;

      // Clear previous batting configurations
      battingTeam.squad.forEach(p => {
        p.isCurrentlyBatting = false;
        if (p.status === 'batting') p.status = 'bench';
      });

      // Switch sides
      currentMatchState.battingTeamIndex = oldBattingIndex === 0 ? 1 : 0;
      currentMatchState.bowlingTeamIndex = oldBattingIndex === 0 ? 0 : 1;

      const nextBattingTeam = currentMatchState.battingTeamIndex === 0 ? currentMatchState.teamA : currentMatchState.teamB;
      const nextBowlingTeam = currentMatchState.bowlingTeamIndex === 0 ? currentMatchState.teamA : currentMatchState.teamB;

      // Setup default opener status
      if (nextBattingTeam.squad.length > 0) {
        nextBattingTeam.squad[0].status = 'batting';
        nextBattingTeam.squad[0].isCurrentlyBatting = true;
        currentMatchState.strikerName = nextBattingTeam.squad[0].name;
        if (nextBattingTeam.squad.length > 1) {
          nextBattingTeam.squad[1].status = 'batting';
          currentMatchState.nonStrikerName = nextBattingTeam.squad[1].name;
        } else {
          currentMatchState.nonStrikerName = undefined;
        }
      }

      if (nextBowlingTeam.squad.length > 0) {
        currentMatchState.currentBowlerName = nextBowlingTeam.squad[0].name;
      } else {
        currentMatchState.currentBowlerName = undefined;
      }

      // Reset scores and set target
      currentMatchState.runs = 0;
      currentMatchState.wickets = 0;
      currentMatchState.overs = 0;
      currentMatchState.balls = 0;
      currentMatchState.recentBalls = [];
      currentMatchState.target = targetScore;
      currentMatchState.inningsCount = (currentMatchState.inningsCount || 1) + 1;

      addAutomaticHighlight(`🏏 Innings Ended Automatically! ${battingTeam.name} scored ${targetScore - 1} wickets/runs. ${nextBattingTeam.name} needs ${targetScore} runs to win in ${currentMatchState.maxOvers} overs!`, 'innings_break');

      currentMatchState.comments.unshift({
        id: `auto-innings-break-${Date.now()}`,
        user: "System",
        text: `🏏 1st innings complete. ${battingTeam.name} set a target of ${targetScore}. 2nd innings started! ${nextBattingTeam.name} needs ${targetScore} to win.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    }
  } else {
    // 2nd Innings: Check if chased or innings ended
    if (currentMatchState.runs >= currentMatchState.target) {
      // Batting team won!
      const victoryText = `🎉 ${battingTeam.name} successfully chased the target and won by ${maxWickets + 1 - currentMatchState.wickets} wickets!`;
      
      currentMatchState.matchActive = false;
      currentMatchState.strikerName = undefined;
      currentMatchState.nonStrikerName = undefined;
      currentMatchState.currentBowlerName = undefined;

      addAutomaticHighlight(victoryText, 'custom');
      currentMatchState.comments.unshift({
        id: `victory-${Date.now()}`,
        user: "System",
        text: victoryText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    } else if (isAllOut || isOversCompleted) {
      // Defended or Tied!
      const runsNeeded = currentMatchState.target - currentMatchState.runs;
      let outcomeText = "";
      if (runsNeeded === 1) {
        outcomeText = `🤝 Sensational Tied Match! Scores finished level!`;
      } else {
        outcomeText = `🏆 Defended brilliantly! ${bowlingTeam.name} won by ${runsNeeded - 1} runs!`;
      }

      currentMatchState.matchActive = false;
      currentMatchState.strikerName = undefined;
      currentMatchState.nonStrikerName = undefined;
      currentMatchState.currentBowlerName = undefined;

      addAutomaticHighlight(outcomeText, 'custom');
      currentMatchState.comments.unshift({
        id: `outcome-${Date.now()}`,
        user: "System",
        text: outcomeText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    }
  }

  res.json(currentMatchState);
});

// 6. Admin - Undo
app.post('/api/admin/match/undo', (req, res) => {
  if (stateUndoStack.length === 0) {
    return res.status(400).json({ error: "No undo history available." });
  }

  const previousStateStr = stateUndoStack.pop()!;
  const parsed = JSON.parse(previousStateStr);

  currentMatchState = {
    ...parsed,
    // Preserve current client session comments & video streams to keep continuous chat/playback
    comments: currentMatchState.comments,
    recordings: currentMatchState.recordings,
    isLive: currentMatchState.isLive,
    currentFrame: currentMatchState.currentFrame
  };

  currentMatchState.comments.unshift({
    id: `undo-${Date.now()}`,
    user: "System",
    text: "⚠️ Late scoring mistake undone by the administrator.",
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });

  res.json(currentMatchState);
});

// 7. Admin - Switch Innings (Swap batting/bowling team & set target)
app.post('/api/admin/match/switch-innings', (req, res) => {
  pushToUndoStack();

  const currentBatting = currentMatchState.battingTeamIndex;
  const targetScore = currentMatchState.runs + 1;

  // Clear previous player batting states
  const oldBattingTeam = currentBatting === 0 ? currentMatchState.teamA : currentMatchState.teamB;
  oldBattingTeam.squad.forEach(p => {
    p.isCurrentlyBatting = false;
    if (p.status === 'batting') p.status = 'bench';
  });

  // Toggle batting team
  currentMatchState.battingTeamIndex = currentBatting === 0 ? 1 : 0;
  currentMatchState.bowlingTeamIndex = currentBatting === 0 ? 0 : 1;

  // Update new squad batting statuses
  const newBattingTeam = currentMatchState.battingTeamIndex === 0 ? currentMatchState.teamA : currentMatchState.teamB;
  if (newBattingTeam.squad.length > 0) {
    newBattingTeam.squad[0].status = 'batting';
    newBattingTeam.squad[0].isCurrentlyBatting = true;
    currentMatchState.strikerName = newBattingTeam.squad[0].name;
    if (newBattingTeam.squad.length > 1) {
      newBattingTeam.squad[1].status = 'batting';
      currentMatchState.nonStrikerName = newBattingTeam.squad[1].name;
    } else {
      currentMatchState.nonStrikerName = undefined;
    }
  }

  // Clear bowled states for next inning
  const newBowlingTeam = currentMatchState.bowlingTeamIndex === 0 ? currentMatchState.teamA : currentMatchState.teamB;
  if (newBowlingTeam.squad.length > 0) {
    currentMatchState.currentBowlerName = newBowlingTeam.squad[0].name;
  } else {
    currentMatchState.currentBowlerName = undefined;
  }

  // Reset scores and set target
  currentMatchState.runs = 0;
  currentMatchState.wickets = 0;
  currentMatchState.overs = 0;
  currentMatchState.balls = 0;
  currentMatchState.recentBalls = [];
  currentMatchState.target = targetScore;
  currentMatchState.inningsCount = (currentMatchState.inningsCount || 1) + 1;

  addAutomaticHighlight(`🏏 Innings break! ${oldBattingTeam.name} set a target of ${targetScore} runs. ${newBattingTeam.name} is keying up to bat (Innings ${currentMatchState.inningsCount})!`, 'innings_break');

  currentMatchState.comments.unshift({
    id: `innings-${Date.now()}`,
    user: "System",
    text: `🏏 Innings break! ${newBattingTeam.name} starts batting. Target to win: ${targetScore} runs in ${newBattingTeam.totalSquadSize} wickets.`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });

  res.json(currentMatchState);
});

// 7a. Admin - Add Player to Team Squad
app.post('/api/admin/match/add-player', (req, res) => {
  const { teamIndex, name } = req.body; // teamIndex = 0 (teamA) or 1 (teamB)
  const team = teamIndex === 0 ? currentMatchState.teamA : currentMatchState.teamB;
  if (!team) return res.status(400).json({ error: "Team not found" });
  if (!name || !name.trim()) return res.status(400).json({ error: "Player name is required" });

  pushToUndoStack();

  const newPlayer: Player = {
    name: name.trim(),
    runsScored: 0,
    ballsFaced: 0,
    boundaries4: 0,
    boundaries6: 0,
    isOut: false,
    oversBowled: 0,
    runsConceded: 0,
    wicketsTaken: 0,
    ballsBowledInOver: 0,
    isCurrentlyBatting: false,
    status: 'bench'
  };

  team.squad.push(newPlayer);
  team.totalSquadSize = team.squad.length;

  currentMatchState.comments.unshift({
    id: `add-p-${Date.now()}`,
    user: "System",
    text: `👤 Admin Naveed added player "${newPlayer.name}" to the team squad: ${team.name}.`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });

  res.json(currentMatchState);
});

// 7b. Admin - Edit Player Name
app.post('/api/admin/match/edit-player', (req, res) => {
  const { teamIndex, oldName, newName } = req.body;
  const team = teamIndex === 0 ? currentMatchState.teamA : currentMatchState.teamB;
  if (!team) return res.status(400).json({ error: "Team not found" });
  if (!oldName || !newName || !newName.trim()) return res.status(400).json({ error: "Valid names required" });

  pushToUndoStack();

  const player = team.squad.find(p => p.name === oldName);
  if (!player) return res.status(404).json({ error: "Player not found" });

  player.name = newName.trim();

  // Update active state references if matching
  if (currentMatchState.strikerName === oldName) currentMatchState.strikerName = player.name;
  if (currentMatchState.nonStrikerName === oldName) currentMatchState.nonStrikerName = player.name;
  if (currentMatchState.currentBowlerName === oldName) currentMatchState.currentBowlerName = player.name;

  currentMatchState.comments.unshift({
    id: `edit-p-${Date.now()}`,
    user: "System",
    text: `👤 Admin Naveed renamed player "${oldName}" to "${player.name}" in squad: ${team.name}.`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });

  res.json(currentMatchState);
});

// 7c. Admin - Delete Player from Squad
app.post('/api/admin/match/delete-player', (req, res) => {
  const { teamIndex, name } = req.body;
  const team = teamIndex === 0 ? currentMatchState.teamA : currentMatchState.teamB;
  if (!team) return res.status(400).json({ error: "Team not found" });

  pushToUndoStack();

  team.squad = team.squad.filter(p => p.name !== name);
  team.totalSquadSize = team.squad.length;

  if (currentMatchState.strikerName === name) currentMatchState.strikerName = undefined;
  if (currentMatchState.nonStrikerName === name) currentMatchState.nonStrikerName = undefined;
  if (currentMatchState.currentBowlerName === name) currentMatchState.currentBowlerName = undefined;

  currentMatchState.comments.unshift({
    id: `del-p-${Date.now()}`,
    user: "System",
    text: `🗑️ Admin Naveed removed player "${name}" from team squad: ${team.name}.`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });

  res.json(currentMatchState);
});

// 7d. Admin - Define/Set Total Squad Size
app.post('/api/admin/match/set-squad-size', (req, res) => {
  const { teamIndex, size } = req.body;
  const team = teamIndex === 0 ? currentMatchState.teamA : currentMatchState.teamB;
  if (!team) return res.status(400).json({ error: "Team not found" });

  const numericSize = parseInt(size, 10);
  if (isNaN(numericSize)) return res.status(400).json({ error: "Valid squad size parameter required" });

  pushToUndoStack();

  team.totalSquadSize = numericSize;

  currentMatchState.comments.unshift({
    id: `size-p-${Date.now()}`,
    user: "System",
    text: `⚙️ State Updated: Admin Naveed set total team squad limit for ${team.name} to ${numericSize}.`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });

  res.json(currentMatchState);
});

// 7e. Admin - Update Ground Name on the fly
app.post('/api/admin/match/update-ground', (req, res) => {
  const { groundName } = req.body;
  if (!groundName || !groundName.trim()) {
    return res.status(400).json({ error: "Ground Name is required." });
  }

  pushToUndoStack();

  const oldV = currentMatchState.groundName || "unnamed venue";
  currentMatchState.groundName = groundName.trim();

  currentMatchState.comments.unshift({
    id: `ground-${Date.now()}`,
    user: "System",
    text: `🏟️ Ground changed from "${oldV}" to "${currentMatchState.groundName}" by Admin Naveed.`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });

  res.json(currentMatchState);
});

// 8. Admin - Stream active webcam frame to viewers
app.post('/api/admin/match/stream-frame', (req, res) => {
  const { frame } = req.body;
  if (frame) {
    currentMatchState.currentFrame = frame;
    currentMatchState.isLive = true;
  }
  res.json({ success: true });
});

// 9. Admin - Start / stop visual broadcasting
app.post('/api/admin/match/stream-toggle', (req, res) => {
  const { live } = req.body;
  currentMatchState.isLive = !!live;
  if (!live) {
    currentMatchState.currentFrame = undefined;
  }
  res.json({ success: true, isLive: currentMatchState.isLive });
});

// 9b. Admin - Update stream settings (type and facebook/youtube embed URL)
app.post('/api/admin/match/stream-settings', (req, res) => {
  const { streamType, fbStreamUrl } = req.body;
  
  pushToUndoStack();

  if (streamType === 'camera' || streamType === 'fb_stream') {
    currentMatchState.streamType = streamType;
    if (streamType === 'fb_stream') {
      currentMatchState.isLive = !!(fbStreamUrl || currentMatchState.fbStreamUrl);
    }
  }
  if (fbStreamUrl !== undefined) {
    currentMatchState.fbStreamUrl = fbStreamUrl;
    if (currentMatchState.streamType === 'fb_stream') {
      currentMatchState.isLive = !!fbStreamUrl;
    }
  }

  currentMatchState.comments.unshift({
    id: `stream-config-${Date.now()}`,
    user: "System",
    text: `🖥️ Live stream source configured to ${currentMatchState.streamType === 'fb_stream' ? 'Facebook / Web Page Link' : 'Mobile / Web Camera Input'}.`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });
  
  res.json(currentMatchState);
});

// 10. Save a Recorded Match file link / raw base64 playback payload
app.post('/api/admin/match/save-recording', (req, res) => {
  const { title, duration, videoUrl } = req.body;

  if (!videoUrl) {
    return res.status(400).json({ error: "Recording video data is required." });
  }

  const newRec: MatchRecording = {
    id: `record-${Date.now()}`,
    title: title || `SK Sherrani League Match - Rec ${currentMatchState.recordings.length + 1}`,
    duration: duration || "00:30",
    videoUrl: videoUrl,
    date: new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  };

  currentMatchState.recordings.unshift(newRec);

  currentMatchState.comments.unshift({
    id: `rec-added-${Date.now()}`,
    user: "SK Sherrani",
    text: `📹 New recorded match playback saved in application: "${newRec.title}". Check past matches to view!`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });

  res.json({ success: true, recordings: currentMatchState.recordings });
});

// 10b. Save a Custom Highlight moment marked by Admin
app.post('/api/admin/match/add-highlight', (req, res) => {
  const { text, type } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ error: "Highlight text is required." });
  }

  const cleanText = text.trim();
  const highlightType = type || 'custom';

  const newHighlight = {
    id: `highlight-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    over: currentMatchState.overs,
    balls: currentMatchState.balls,
    runs: currentMatchState.runs,
    wickets: currentMatchState.wickets,
    text: cleanText,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    type: highlightType
  };

  if (!currentMatchState.highlights) {
    currentMatchState.highlights = [];
  }
  currentMatchState.highlights.unshift(newHighlight);

  // Keep last 50 highlights
  if (currentMatchState.highlights.length > 50) {
    currentMatchState.highlights.pop();
  }

  // Also add as system comment for user visibility
  currentMatchState.comments.unshift({
    id: `highlight-com-${Date.now()}`,
    user: "System",
    text: `⚡ HIGHLIGHT: ${cleanText}`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });

  res.json(currentMatchState);
});


// 11. Chatbot powered by Gemini "SK Sherrani" expert cricket bot
app.post('/api/match/chat-sk', async (req, res) => {
  const { prompt, history } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required." });
  }

  const aiClient = getGeminiClient();

  // Create absolute context representing the living cricket pitch
  const liveMatchContext = `
Active Match Title: "${currentMatchState.matchTitle}"
Team A (Batting): "${currentMatchState.teamA?.name || 'Not Registered'}"
Team B (Bowling): "${currentMatchState.teamB?.name || 'Not Registered'}"
Runs: ${currentMatchState.runs}
Wickets: ${currentMatchState.wickets}
Overs played: ${currentMatchState.overs}.${currentMatchState.balls}
Target to win: ${currentMatchState.target || "N/A"}
Striker (On Strike): ${currentMatchState.strikerName || "No striker in strike selection"}
Non-striker: ${currentMatchState.nonStrikerName || "No non-striker in strike selection"}
Current Bowler: ${currentMatchState.currentBowlerName || "None"}
Past registered recordings available in app: ${currentMatchState.recordings.length} recorded frames.
Streaming status is: ${currentMatchState.isLive ? "ACTIVE LIVE STREAMING RIGHT NOW!" : "OFFLINE"}.
`;

  const systemPrompt = `You are SK, the iconic local cricket tournament organizer, match commentator, and friendly club president for the "SK SHERRANI Live Cricket" matches applet.
Your personality:
- Extremely warm, hospitable, and friendly. Speak like a true cricket lover from Quetta / regional Pakistan cricket leagues.
- Use regional cricket slang (like 'Jawaan', 'Lala', 'Chakka', 'Aala', 'Zabardast', 'Bouncer', 'Ghazi').
- Talk passionately about the local match organizer SK Sherrani and praise the players who are fighting hard on the field.
- Be super supportive, answering any questions about the live scores, general cricket queries, players, rules, or when the stream will go online.
- Keep the response friendly, quick, and conversational. Refer to current live score context to answer if the user asks "What is the score?", "Who is batting?", "How many runs?".

Here is the current live match score tracking context on our server:
${liveMatchContext}

Respond to the user with standard markdown. Do not include meta text. Keep under 3 short paragraphs. No robotic formatting.`;

  try {
    if (!aiClient) {
      // Mock descriptive fallback if no API key is set
      const scoreShort = `${currentMatchState.runs}/${currentMatchState.wickets} (Overs: ${currentMatchState.overs}.${currentMatchState.balls})`;
      const defaultText = `Assalamu Alaykum Jawaan! Lala, right now I am warming up, but let me tell you about today's matches. Today, we have registered matches under: ${currentMatchState.matchTitle}. Currently the scoreboard shows: ${scoreShort}. Striker: ${currentMatchState.strikerName || 'none'}, Bowler: ${currentMatchState.currentBowlerName || 'none'}. Connect your GEMINI API KEY to unlock full real-time commentary through my mind! Ask me anything, or enjoy the live camera stream compiled by webaid!`;
      return res.json({ reply: defaultText });
    }

    // Modern @google/genai SDK chat instance
    const chat = aiClient.chats.create({
      model: "gemini-3.5-flash",
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.9,
      }
    });

    const result = await chat.sendMessage({ message: prompt });
    const replyText = result.text || "Zabardast lala! Could not process that exact shot. Ask me again about the tournament!";
    res.json({ reply: replyText });

  } catch (err: any) {
    console.error("Gemini API Error details:", err);
    res.json({
      reply: `Lala, my thinking was caught on the boundary line! (API error: ${err.message || 'Verification Fail'}). But don't worry, currently the score is ${currentMatchState.runs}/${currentMatchState.wickets} in ${currentMatchState.overs}.${currentMatchState.balls} overs!`
    });
  }
});

/* --- Vite Middleware Setup --- */
async function bootServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`====================================================`);
    console.log(`🏏 SK SHERRANI Cricket Live running on port ${PORT}`);
    console.log(`====================================================`);
  });
}

bootServer();
