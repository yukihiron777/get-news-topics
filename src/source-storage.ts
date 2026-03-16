import fs from 'fs/promises';
import path from 'path';
import { Article, RankingSnapshot } from './types';
import { getJSTTimestamp, getJSTDate } from './utils';

/**
 * 汎用ストレージ: ソース別にデータを保存
 * 保存先: data/<sourceName>/YYYY-MM-DD.json
 */
export async function saveRanking(sourceName: string, articles: Article[]): Promise<void> {
  const dataDir = path.join(process.cwd(), 'data', sourceName);

  await fs.mkdir(dataDir, { recursive: true });

  const timestamp = getJSTTimestamp();
  const date = getJSTDate();
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

  // URL重複チェック
  const existingUrls = new Set(existingArticles.map(a => a.url));
  const newArticles = articles.filter(article => !existingUrls.has(article.url));
  const mergedArticles = [...existingArticles, ...newArticles];

  const snapshot: RankingSnapshot = {
    source: sourceName,
    timestamp,
    articles: mergedArticles
  };

  await fs.writeFile(filepath, JSON.stringify(snapshot, null, 2));
  console.log(`[${sourceName}] Saved to ${filename} (${newArticles.length} new, ${existingArticles.length} existing)`);

  // latest.jsonを更新
  const latestPath = path.join(dataDir, 'latest.json');
  await fs.writeFile(latestPath, JSON.stringify(snapshot, null, 2));
  console.log(`[${sourceName}] Updated latest.json`);
}
