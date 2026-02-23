export type LeaderboardEntry = {
  id: string;
  usernameDisplay: string;
  usernameKey: string;
  lots: number;
  avgPrice: number;
  totalNominal: number;
  createdAt: string;
  updatedAt: string;
};

export type RankedLeaderboardEntry = LeaderboardEntry & {
  rank: number;
};

export type LeaderboardStats = {
  holdersCount: number;
  totalLots: number;
  meanAvgPrice: number;
  totalNominal: number;
};

export type MyRankResult = {
  rank: number;
  entry: LeaderboardEntry;
};

export type LeaderboardResponse = {
  stats: LeaderboardStats;
  top10: RankedLeaderboardEntry[];
  hiddenCount: number;
  myRank?: MyRankResult;
};

export type PostEntryResponse = {
  entry: LeaderboardEntry;
  rank: number;
};

export type ApiErrorResponse = {
  error: string;
  fieldErrors?: Record<string, string[] | undefined>;
};
