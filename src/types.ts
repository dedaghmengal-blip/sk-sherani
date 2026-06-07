export interface Player {
  name: string;
  runsScored: number;
  ballsFaced: number;
  boundaries4: number;
  boundaries6: number;
  isOut: boolean;
  outHow?: string;
  oversBowled: number;
  runsConceded: number;
  wicketsTaken: number;
  ballsBowledInOver: number; // to track bowler balls
  isCurrentlyBatting: boolean;
  status: 'squad' | 'batting' | 'out' | 'bench';
}

export interface Team {
  name: string;
  squad: Player[];
  totalSquadSize: number;
  isRegistered: boolean;
}

export interface MatchComment {
  id: string;
  user: string;
  text: string;
  timestamp: string;
}

export interface MatchRecording {
  id: string;
  title: string;
  videoUrl: string; // Base64 chunk-stored inline video / temporary file URL
  duration: string;
  date: string;
}

export interface OverRecord {
  over: number;
  runs: number;
  wickets: number;
  runRate: number;
}

export interface MatchHighlight {
  id: string;
  over: number;
  balls: number;
  runs: number;
  wickets: number;
  text: string;
  timestamp: string;
  type: 'six' | 'four' | 'wicket' | 'innings_break' | 'custom' | 'init';
}

export interface MatchState {
  teamA: Team;
  teamB: Team;
  battingTeamIndex: 0 | 1;
  bowlingTeamIndex: 0 | 1;
  runs: number;
  wickets: number;
  overs: number; // overs completed
  balls: number; // balls in current over (0 to 5)
  target?: number;
  strikerName?: string;
  nonStrikerName?: string;
  currentBowlerName?: string;
  matchActive: boolean;
  isLive: boolean;
  currentFrame?: string; // base64 string
  comments: MatchComment[];
  recordings: MatchRecording[];
  recentBalls: string[]; // E.g., ["1", "4", "Wd", "W", "6", "0"] for the current over
  matchId: string;
  matchTitle: string;
  groundName?: string;
  streamType?: 'camera' | 'fb_stream';
  fbStreamUrl?: string;
  maxOvers?: number;
  inningsCount?: number;
  teamAOversHistory?: OverRecord[];
  teamBOversHistory?: OverRecord[];
  highlights?: MatchHighlight[];
  tossWinner?: string;
  tossDecision?: string;
  tossText?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

export interface UpcomingMatch {
  id: string;
  teamA: string;
  teamB: string;
  date: string;
  time: string;
  venue: string;
  matchType: string;
  notes?: string;
}

