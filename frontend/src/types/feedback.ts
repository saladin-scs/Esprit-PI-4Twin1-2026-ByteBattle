export interface FeedbackPoint {
  title: string;
  description: string;
  category: string; // 'strength' | 'improvement' | 'hint'
  severity: string; // 'info' | 'low' | 'medium' | 'high'
}

export interface FeedbackResponse {
  overall_score: number;
  summary: string;
  points: FeedbackPoint[];
  extra?: Record<string, any>;
}

