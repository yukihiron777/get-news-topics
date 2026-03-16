import fs from 'fs/promises';
import path from 'path';
import { Article, RankingSnapshot } from './types';
import { getJSTTimestamp, getJSTDate } from './utils';

export type { RankingSnapshot };

export async function saveRanking(articles: Article[], targetDate?: string): Promise<void> {
  const dataDir = path.join(process.cwd(), 'data', 'nikkei');

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
