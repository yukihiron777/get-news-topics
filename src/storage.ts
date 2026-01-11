import fs from 'fs/promises';
import path from 'path';
import { Article } from './scraper';

export interface RankingSnapshot {
  timestamp: string;
  articles: Article[];
}

/**
 * JSTタイムスタンプを生成（ISO 8601形式）
 */
function getJSTTimestamp(): string {
  const now = new Date();
  // JSTはUTC+9時間
  const jstOffset = 9 * 60 * 60 * 1000;
  const jstDate = new Date(now.getTime() + jstOffset);

  // ISO 8601形式でタイムゾーン付き
  const year = jstDate.getUTCFullYear();
  const month = String(jstDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(jstDate.getUTCDate()).padStart(2, '0');
  const hours = String(jstDate.getUTCHours()).padStart(2, '0');
  const minutes = String(jstDate.getUTCMinutes()).padStart(2, '0');
  const seconds = String(jstDate.getUTCSeconds()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+09:00`;
}

/**
 * JST日付文字列を取得（YYYY-MM-DD形式）
 */
function getJSTDate(): string {
  const now = new Date();
  const jstOffset = 9 * 60 * 60 * 1000;
  const jstDate = new Date(now.getTime() + jstOffset);

  const year = jstDate.getUTCFullYear();
  const month = String(jstDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(jstDate.getUTCDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export async function saveRanking(articles: Article[], targetDate?: string): Promise<void> {
  const dataDir = path.join(process.cwd(), 'data');

  // データディレクトリを作成
  await fs.mkdir(dataDir, { recursive: true });

  // JSTタイムスタンプと日付を取得
  const timestamp = getJSTTimestamp();
  const date = targetDate || getJSTDate();
  const filename = `${date}.json`;
  const filepath = path.join(dataDir, filename);

  // 既存データを読み込む
  let existingArticles: Article[] = [];
  try {
    const existingData = await fs.readFile(filepath, 'utf-8');
    const existingSnapshot: RankingSnapshot = JSON.parse(existingData);
    existingArticles = existingSnapshot.articles;
  } catch {
    // ファイルが存在しない場合は新規作成
  }

  // URL重複チェック: 既存の記事URLのSetを作成
  const existingUrls = new Set(existingArticles.map(a => a.url));

  // 新しい記事のみを追加
  const newArticles = articles.filter(article => !existingUrls.has(article.url));

  // 既存記事と新規記事をマージ
  const mergedArticles = [...existingArticles, ...newArticles];

  const snapshot: RankingSnapshot = {
    timestamp,
    articles: mergedArticles
  };

  await fs.writeFile(filepath, JSON.stringify(snapshot, null, 2));
  console.log(`Saved ranking to ${filename} (${newArticles.length} new articles, ${existingArticles.length} existing)`);

  // latest.jsonを生成（常に最新データを指す）
  const latestPath = path.join(dataDir, 'latest.json');
  await fs.writeFile(latestPath, JSON.stringify(snapshot, null, 2));
  console.log('Updated latest.json');
}
