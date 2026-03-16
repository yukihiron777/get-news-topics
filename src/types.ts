export interface Article {
  title: string;
  url: string;
  publishDate?: string;
  category?: string;
  summary?: string;
  tags?: string[];
  author?: string;
}

export interface RankingSnapshot {
  source?: string;
  timestamp: string;
  articles: Article[];
}
