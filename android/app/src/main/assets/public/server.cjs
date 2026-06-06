var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var dotenv = __toESM(require("dotenv"), 1);
dotenv.config();
var app = (0, import_express.default)();
var PORT = 3e3;
app.use(import_express.default.json({ limit: "100mb" }));
app.use(import_express.default.urlencoded({ limit: "100mb", extended: true }));
var currentMatchState = {
  teamA: { name: "Sherrani Royals", squad: [], totalSquadSize: 0, isRegistered: false },
  teamB: { name: "Quetta Gladiators Local", squad: [], totalSquadSize: 0, isRegistered: false },
  battingTeamIndex: 0,
  bowlingTeamIndex: 1,
  runs: 0,
  wickets: 0,
  overs: 0,
  balls: 0,
  strikerName: void 0,
  nonStrikerName: void 0,
  currentBowlerName: void 0,
  matchActive: false,
  isLive: false,
  currentFrame: void 0,
  comments: [
    {
      id: "comment-1",
      user: "SK Sherrani",
      text: "As-salamu alaykum! Welcome to the official matches application. Today we will have some amazing local matches. Register the teams to get started!",
      timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    }
  ],
  recordings: [],
  recentBalls: [],
  matchId: "match-sk-default",
  matchTitle: "Sardar Sherrani Premier League"
};
var stateUndoStack = [];
function pushToUndoStack() {
  stateUndoStack.push(JSON.stringify({
    ...currentMatchState,
    comments: void 0
    // Do not undo user comments
  }));
  if (stateUndoStack.length > 10) {
    stateUndoStack.shift();
  }
}
var getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("Warning: GEMINI_API_KEY environment variable is not configured. SK Chatbot will run in mock descriptive mode.");
    return null;
  }
  return new import_genai.GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build"
      }
    }
  });
};
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: (/* @__PURE__ */ new Date()).toISOString() });
});
app.get("/api/match/state", (req, res) => {
  res.json(currentMatchState);
});
app.post("/api/match/comment", (req, res) => {
  const { user, text } = req.body;
  if (!text) {
    return res.status(400).json({ error: "Comment text is required." });
  }
  const newComment = {
    id: `comment-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    user: user || "Cricket Fan",
    text: text.trim().slice(0, 200),
    timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  };
  currentMatchState.comments.unshift(newComment);
  if (currentMatchState.comments.length > 100) {
    currentMatchState.comments.pop();
  }
  res.json({ success: true, comments: currentMatchState.comments });
});
app.post("/api/admin/match/init", (req, res) => {
  const { teamAName, teamBName, teamASquad, teamBSquad, matchTitle } = req.body;
  if (!teamAName || !teamBName) {
    return res.status(400).json({ error: "Both team names are required." });
  }
  pushToUndoStack();
  const mapSquad = (names) => {
    return (names || []).filter((name) => name.trim() !== "").map((name) => ({
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
      status: "bench"
    }));
  };
  const squadA = mapSquad(teamASquad);
  const squadB = mapSquad(teamBSquad);
  if (squadA.length > 0) {
    squadA[0].status = "batting";
    squadA[0].isCurrentlyBatting = true;
    if (squadA.length > 1) {
      squadA[1].status = "batting";
    }
  }
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
    battingTeamIndex: 0,
    bowlingTeamIndex: 1,
    runs: 0,
    wickets: 0,
    overs: 0,
    balls: 0,
    strikerName: squadA[0]?.name || void 0,
    nonStrikerName: squadA[1]?.name || void 0,
    currentBowlerName: squadB[0]?.name || void 0,
    matchActive: true,
    recentBalls: [],
    matchTitle: (matchTitle || "Local League Match").trim(),
    matchId: `match-${Date.now()}`
  };
  if (squadB.length > 0) {
    squadB[0].status = "bench";
  }
  currentMatchState.comments.unshift({
    id: `event-${Date.now()}`,
    user: "System",
    text: `\u{1F3CF} Match Initialized! ${currentMatchState.teamA.name} is batting and ${currentMatchState.teamB.name} is fielding. Match title: ${currentMatchState.matchTitle}.`,
    timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  });
  res.json(currentMatchState);
});
app.post("/api/admin/match/update-score", (req, res) => {
  const { action, value, detail } = req.body;
  if (!currentMatchState.matchActive) {
    return res.status(400).json({ error: "No active match initialized. Setup the match first." });
  }
  pushToUndoStack();
  const battingTeam = currentMatchState.battingTeamIndex === 0 ? currentMatchState.teamA : currentMatchState.teamB;
  const bowlingTeam = currentMatchState.bowlingTeamIndex === 0 ? currentMatchState.teamA : currentMatchState.teamB;
  const striker = battingTeam.squad.find((p) => p.name === currentMatchState.strikerName);
  const bowler = bowlingTeam.squad.find((p) => p.name === currentMatchState.currentBowlerName);
  if (action === "run") {
    const scoreVal = parseInt(value, 10) || 0;
    currentMatchState.runs += scoreVal;
    currentMatchState.balls += 1;
    currentMatchState.recentBalls.push(scoreVal.toString());
    if (striker) {
      striker.runsScored += scoreVal;
      striker.ballsFaced += 1;
      if (scoreVal === 4) striker.boundaries4 += 1;
      if (scoreVal === 6) striker.boundaries6 += 1;
    }
    if (bowler) {
      bowler.runsConceded += scoreVal;
      bowler.ballsBowledInOver += 1;
    }
    if (scoreVal % 2 === 1) {
      const temp = currentMatchState.strikerName;
      currentMatchState.strikerName = currentMatchState.nonStrikerName;
      currentMatchState.nonStrikerName = temp;
    }
  } else if (action === "extra") {
    const extraType = value;
    const penaltyRuns = parseInt(detail, 10) || 1;
    if (extraType === "wide") {
      currentMatchState.runs += penaltyRuns;
      currentMatchState.recentBalls.push("Wd");
      if (bowler) {
        bowler.runsConceded += penaltyRuns;
      }
    } else if (extraType === "noball") {
      currentMatchState.runs += penaltyRuns;
      currentMatchState.recentBalls.push("Nb");
      if (striker) {
        striker.ballsFaced += 1;
      }
      if (bowler) {
        bowler.runsConceded += penaltyRuns;
      }
    } else if (extraType === "bye" || extraType === "legbye") {
      currentMatchState.runs += penaltyRuns;
      currentMatchState.balls += 1;
      currentMatchState.recentBalls.push(`${penaltyRuns}B`);
      if (striker) {
        striker.ballsFaced += 1;
      }
      if (bowler) {
        bowler.ballsBowledInOver += 1;
      }
      if (penaltyRuns % 2 === 1) {
        const temp = currentMatchState.strikerName;
        currentMatchState.strikerName = currentMatchState.nonStrikerName;
        currentMatchState.nonStrikerName = temp;
      }
    }
  } else if (action === "wicket") {
    currentMatchState.wickets += 1;
    currentMatchState.balls += 1;
    currentMatchState.recentBalls.push("W");
    if (striker) {
      striker.ballsFaced += 1;
      striker.isOut = true;
      striker.status = "out";
      striker.isCurrentlyBatting = false;
      striker.outHow = detail || "Caught";
    }
    if (bowler) {
      bowler.wicketsTaken += 1;
      bowler.ballsBowledInOver += 1;
    }
    currentMatchState.strikerName = void 0;
  } else if (action === "switch-strike") {
    const temp = currentMatchState.strikerName;
    currentMatchState.strikerName = currentMatchState.nonStrikerName;
    currentMatchState.nonStrikerName = temp;
    currentMatchState.comments.unshift({
      id: `strike-${Date.now()}`,
      user: "System",
      text: "\u{1F504} Mutual strike change between batsmen.",
      timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    });
  } else if (action === "set-bowler") {
    currentMatchState.currentBowlerName = value;
  } else if (action === "set-batsman") {
    const { position, name } = req.body.data;
    const playerRef = battingTeam.squad.find((p) => p.name === name);
    if (playerRef) {
      playerRef.status = "batting";
      if (position === "striker") {
        currentMatchState.strikerName = name;
        playerRef.isCurrentlyBatting = true;
      } else {
        currentMatchState.nonStrikerName = name;
      }
    }
  } else if (action === "declare-over") {
    if (bowler) {
      bowler.oversBowled += 1;
      bowler.ballsBowledInOver = 0;
    }
    currentMatchState.overs += 1;
    currentMatchState.balls = 0;
    currentMatchState.recentBalls = [];
    currentMatchState.currentBowlerName = void 0;
    const temp = currentMatchState.strikerName;
    currentMatchState.strikerName = currentMatchState.nonStrikerName;
    currentMatchState.nonStrikerName = temp;
    currentMatchState.comments.unshift({
      id: `over-${Date.now()}`,
      user: "System",
      text: `\u{1F51A} Over completed! Score: ${currentMatchState.runs}/${currentMatchState.wickets} after ${currentMatchState.overs} overs. Choose the next bowler.`,
      timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    });
  }
  if (currentMatchState.balls >= 6) {
    if (bowler) {
      bowler.oversBowled += 1;
      bowler.ballsBowledInOver = 0;
    }
    currentMatchState.overs += 1;
    currentMatchState.balls = 0;
    currentMatchState.recentBalls = [];
    currentMatchState.currentBowlerName = void 0;
    const temp = currentMatchState.strikerName;
    currentMatchState.strikerName = currentMatchState.nonStrikerName;
    currentMatchState.nonStrikerName = temp;
    currentMatchState.comments.unshift({
      id: `over-auto-${Date.now()}`,
      user: "System",
      text: `\u{1F51A} Over ended automatically! Score: ${currentMatchState.runs}/${currentMatchState.wickets} in ${currentMatchState.overs} overs.`,
      timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    });
  }
  res.json(currentMatchState);
});
app.post("/api/admin/match/undo", (req, res) => {
  if (stateUndoStack.length === 0) {
    return res.status(400).json({ error: "No undo history available." });
  }
  const previousStateStr = stateUndoStack.pop();
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
    text: "\u26A0\uFE0F Late scoring mistake undone by the administrator.",
    timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  });
  res.json(currentMatchState);
});
app.post("/api/admin/match/switch-innings", (req, res) => {
  pushToUndoStack();
  const currentBatting = currentMatchState.battingTeamIndex;
  const targetScore = currentMatchState.runs + 1;
  const oldBattingTeam = currentBatting === 0 ? currentMatchState.teamA : currentMatchState.teamB;
  oldBattingTeam.squad.forEach((p) => {
    p.isCurrentlyBatting = false;
    if (p.status === "batting") p.status = "bench";
  });
  currentMatchState.battingTeamIndex = currentBatting === 0 ? 1 : 0;
  currentMatchState.bowlingTeamIndex = currentBatting === 0 ? 0 : 1;
  const newBattingTeam = currentMatchState.battingTeamIndex === 0 ? currentMatchState.teamA : currentMatchState.teamB;
  if (newBattingTeam.squad.length > 0) {
    newBattingTeam.squad[0].status = "batting";
    newBattingTeam.squad[0].isCurrentlyBatting = true;
    currentMatchState.strikerName = newBattingTeam.squad[0].name;
    if (newBattingTeam.squad.length > 1) {
      newBattingTeam.squad[1].status = "batting";
      currentMatchState.nonStrikerName = newBattingTeam.squad[1].name;
    } else {
      currentMatchState.nonStrikerName = void 0;
    }
  }
  const newBowlingTeam = currentMatchState.bowlingTeamIndex === 0 ? currentMatchState.teamA : currentMatchState.teamB;
  if (newBowlingTeam.squad.length > 0) {
    currentMatchState.currentBowlerName = newBowlingTeam.squad[0].name;
  } else {
    currentMatchState.currentBowlerName = void 0;
  }
  currentMatchState.runs = 0;
  currentMatchState.wickets = 0;
  currentMatchState.overs = 0;
  currentMatchState.balls = 0;
  currentMatchState.recentBalls = [];
  currentMatchState.target = targetScore;
  currentMatchState.comments.unshift({
    id: `innings-${Date.now()}`,
    user: "System",
    text: `\u{1F3CF} Innings break! ${newBattingTeam.name} starts batting. Target to win: ${targetScore} runs in ${newBattingTeam.totalSquadSize} wickets.`,
    timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  });
  res.json(currentMatchState);
});
app.post("/api/admin/match/add-player", (req, res) => {
  const { teamIndex, name } = req.body;
  const team = teamIndex === 0 ? currentMatchState.teamA : currentMatchState.teamB;
  if (!team) return res.status(400).json({ error: "Team not found" });
  if (!name || !name.trim()) return res.status(400).json({ error: "Player name is required" });
  pushToUndoStack();
  const newPlayer = {
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
    status: "bench"
  };
  team.squad.push(newPlayer);
  team.totalSquadSize = team.squad.length;
  currentMatchState.comments.unshift({
    id: `add-p-${Date.now()}`,
    user: "System",
    text: `\u{1F464} Admin Naveed added player "${newPlayer.name}" to the team squad: ${team.name}.`,
    timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  });
  res.json(currentMatchState);
});
app.post("/api/admin/match/edit-player", (req, res) => {
  const { teamIndex, oldName, newName } = req.body;
  const team = teamIndex === 0 ? currentMatchState.teamA : currentMatchState.teamB;
  if (!team) return res.status(400).json({ error: "Team not found" });
  if (!oldName || !newName || !newName.trim()) return res.status(400).json({ error: "Valid names required" });
  pushToUndoStack();
  const player = team.squad.find((p) => p.name === oldName);
  if (!player) return res.status(404).json({ error: "Player not found" });
  player.name = newName.trim();
  if (currentMatchState.strikerName === oldName) currentMatchState.strikerName = player.name;
  if (currentMatchState.nonStrikerName === oldName) currentMatchState.nonStrikerName = player.name;
  if (currentMatchState.currentBowlerName === oldName) currentMatchState.currentBowlerName = player.name;
  currentMatchState.comments.unshift({
    id: `edit-p-${Date.now()}`,
    user: "System",
    text: `\u{1F464} Admin Naveed renamed player "${oldName}" to "${player.name}" in squad: ${team.name}.`,
    timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  });
  res.json(currentMatchState);
});
app.post("/api/admin/match/delete-player", (req, res) => {
  const { teamIndex, name } = req.body;
  const team = teamIndex === 0 ? currentMatchState.teamA : currentMatchState.teamB;
  if (!team) return res.status(400).json({ error: "Team not found" });
  pushToUndoStack();
  team.squad = team.squad.filter((p) => p.name !== name);
  team.totalSquadSize = team.squad.length;
  if (currentMatchState.strikerName === name) currentMatchState.strikerName = void 0;
  if (currentMatchState.nonStrikerName === name) currentMatchState.nonStrikerName = void 0;
  if (currentMatchState.currentBowlerName === name) currentMatchState.currentBowlerName = void 0;
  currentMatchState.comments.unshift({
    id: `del-p-${Date.now()}`,
    user: "System",
    text: `\u{1F5D1}\uFE0F Admin Naveed removed player "${name}" from team squad: ${team.name}.`,
    timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  });
  res.json(currentMatchState);
});
app.post("/api/admin/match/set-squad-size", (req, res) => {
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
    text: `\u2699\uFE0F State Updated: Admin Naveed set total team squad limit for ${team.name} to ${numericSize}.`,
    timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  });
  res.json(currentMatchState);
});
app.post("/api/admin/match/stream-frame", (req, res) => {
  const { frame } = req.body;
  if (frame) {
    currentMatchState.currentFrame = frame;
    currentMatchState.isLive = true;
  }
  res.json({ success: true });
});
app.post("/api/admin/match/stream-toggle", (req, res) => {
  const { live } = req.body;
  currentMatchState.isLive = !!live;
  if (!live) {
    currentMatchState.currentFrame = void 0;
  }
  res.json({ success: true, isLive: currentMatchState.isLive });
});
app.post("/api/admin/match/save-recording", (req, res) => {
  const { title, duration, videoUrl } = req.body;
  if (!videoUrl) {
    return res.status(400).json({ error: "Recording video data is required." });
  }
  const newRec = {
    id: `record-${Date.now()}`,
    title: title || `SK Sherrani League Match - Rec ${currentMatchState.recordings.length + 1}`,
    duration: duration || "00:30",
    videoUrl,
    date: (/* @__PURE__ */ new Date()).toLocaleDateString(void 0, { year: "numeric", month: "short", day: "numeric" })
  };
  currentMatchState.recordings.unshift(newRec);
  currentMatchState.comments.unshift({
    id: `rec-added-${Date.now()}`,
    user: "SK Sherrani",
    text: `\u{1F4F9} New recorded match playback saved in application: "${newRec.title}". Check past matches to view!`,
    timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  });
  res.json({ success: true, recordings: currentMatchState.recordings });
});
app.post("/api/match/chat-sk", async (req, res) => {
  const { prompt, history } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required." });
  }
  const aiClient = getGeminiClient();
  const liveMatchContext = `
Active Match Title: "${currentMatchState.matchTitle}"
Team A (Batting): "${currentMatchState.teamA?.name || "Not Registered"}"
Team B (Bowling): "${currentMatchState.teamB?.name || "Not Registered"}"
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
      const scoreShort = `${currentMatchState.runs}/${currentMatchState.wickets} (Overs: ${currentMatchState.overs}.${currentMatchState.balls})`;
      const defaultText = `Assalamu Alaykum Jawaan! Lala, right now I am warming up, but let me tell you about today's matches. Today, we have registered matches under: ${currentMatchState.matchTitle}. Currently the scoreboard shows: ${scoreShort}. Striker: ${currentMatchState.strikerName || "none"}, Bowler: ${currentMatchState.currentBowlerName || "none"}. Connect your GEMINI API KEY to unlock full real-time commentary through my mind! Ask me anything, or enjoy the live camera stream compiled by webaid!`;
      return res.json({ reply: defaultText });
    }
    const chat = aiClient.chats.create({
      model: "gemini-3.5-flash",
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.9
      }
    });
    const result = await chat.sendMessage({ message: prompt });
    const replyText = result.text || "Zabardast lala! Could not process that exact shot. Ask me again about the tournament!";
    res.json({ reply: replyText });
  } catch (err) {
    console.error("Gemini API Error details:", err);
    res.json({
      reply: `Lala, my thinking was caught on the boundary line! (API error: ${err.message || "Verification Fail"}). But don't worry, currently the score is ${currentMatchState.runs}/${currentMatchState.wickets} in ${currentMatchState.overs}.${currentMatchState.balls} overs!`
    });
  }
});
async function bootServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`====================================================`);
    console.log(`\u{1F3CF} SK SHERRANI Cricket Live running on port ${PORT}`);
    console.log(`====================================================`);
  });
}
bootServer();
//# sourceMappingURL=server.cjs.map
