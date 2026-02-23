export type LeaderboardEntry = {
  id: string;
  usernameDisplay: string;
  usernameKey: string;
  isBlurred: boolean;
  isMasked: boolean;
  lots: number;
  avgPrice: number;
  totalNominal: number;
  createdAt: string;
  updatedAt: string;
};

export type RankedLeaderboardEntry = LeaderboardEntry & {
  rank: number;
};

export type TopLoserEntry = LeaderboardEntry & {
  lossRank: number;
  overallRank: number;
  marketPrice: number;
  pnlPercent: number;
  pnlNominal: number;
};

export type LeaderboardStats = {
  holdersCount: number;
  totalLots: number;
  meanAvgPrice: number;
  totalNominal: number;
};

export type MarketPriceSnapshot = {
  emiten: string;
  exchange: string;
  price: number | null;
  currency: string;
  asOf: string | null;
  source: "google-finance" | "unavailable";
  quoteUrl: string;
};

export type MyRankResult = {
  rank: number;
  entry: LeaderboardEntry;
};

export type LeaderboardResponse = {
  stats: LeaderboardStats;
  top10: RankedLeaderboardEntry[];
  top10Losers: TopLoserEntry[];
  hiddenCount: number;
  market: MarketPriceSnapshot;
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
