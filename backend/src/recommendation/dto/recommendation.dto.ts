/* eslint-disable prettier/prettier */
export type RecommendationItem = {
  itemId: string;
  score: number;
  title?: string;
  difficulty?: string;
  tags?: string[];
  xpReward?: number;
  languages?: string[];
};

export type RecommendationResponse = {
  challenges: RecommendationItem[];
};
