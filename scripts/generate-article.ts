import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import path from 'path';

interface ArticleEntry {
  title: string;
  url: string;
  publishDate?: string;
  summary?: string;
  tags?: string[];
  category?: string;
  author?: string;
}

interface DailyData {
  timestamp: string;
  articles: ArticleEntry[];
}

function loadJson<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, 'utf-8')) as T;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

function buildFrontMatter(title: string, description: string, tags: string[], date: string, author: string) {
  const safeTags = tags.map((tag) => tag.replace(/[\\/]/g, '-'));
  return `---\ntitle: '${title}'\ndescription: '${description}'\npubDate: ${date}\nauthor: '${author}'\ntags: [${safeTags.map((t) => `'${t}'`).join(', ')}]\n---`;
}

function main() {
  const dailyFile = process.argv[2];
  const articleIndex = Number(process.argv[3] ?? '0');

  if (!dailyFile) {
    console.error('Usage: ts-node scripts/generate-article.ts <daily-json-path> [article-index]');
    process.exit(1);
  }

  const dataPath = path.resolve(dailyFile);
  const dailyData = loadJson<DailyData>(dataPath);
  const target = dailyData.articles[articleIndex];

  if (!target) {
    console.error(`Article at index ${articleIndex} not found in ${dailyFile}`);
    process.exit(1);
  }

  const articleTitle = target.title;
  const description = target.summary?.slice(0, 110) ?? '日経ニュースのトピックを解説します。';
  const slug = slugify(articleTitle).slice(0, 30);
  const pubDate = dailyData.timestamp.split('T')[0];
  const author = target.author ?? 'Nikkei Scraper';
  const tags = target.tags ?? [];

  const lines = [];
  lines.push(buildFrontMatter(articleTitle, description, tags, pubDate, author));
  lines.push('');
  lines.push('## はじめに');
  lines.push(`${target.summary ?? 'この記事では日経新聞の記事を取り上げます。'}`);
  lines.push('');
  lines.push('## 主なポイント');
  lines.push(`- オリジナルURL: ${target.url}`);
  lines.push(`- 公開日: ${target.publishDate ?? '記載なし'}`);
  lines.push('');
  lines.push('## 詳細解説');
  lines.push('記事内容に基づいた解説をここに記載します。');
  lines.push('');
  lines.push('## まとめ');
  lines.push('主要なポイントをまとめて記載します。');

  if (!existsSync('articles')) {
    mkdirSync('articles');
  }

  const outputPath = path.join('articles', `${slug || 'article'}-${Date.now()}.md`);
  writeFileSync(outputPath, lines.join('\n'));
  console.log(`Article generated: ${outputPath}`);
}

main();
