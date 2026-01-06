import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';

interface ArticleEntry {
  title: string;
  url: string;
  publishDate?: string;
  summary?: string;
  tags?: string[];
}

interface DailyData {
  timestamp: string;
  articles: ArticleEntry[];
}

const monthWords = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
];

const dayWords: Record<string, string> = {
  '01': 'one',
  '02': 'two',
  '03': 'three',
  '04': 'four',
  '05': 'five',
  '06': 'six',
  '07': 'seven',
  '08': 'eight',
  '09': 'nine',
  '10': 'ten',
  '11': 'eleven',
  '12': 'twelve',
  '13': 'thirteen',
  '14': 'fourteen',
  '15': 'fifteen',
  '16': 'sixteen',
  '17': 'seventeen',
  '18': 'eighteen',
  '19': 'nineteen',
  '20': 'twenty',
  '21': 'twentyone',
  '22': 'twentytwo',
  '23': 'twentythree',
  '24': 'twentyfour',
  '25': 'twentyfive',
  '26': 'twentysix',
  '27': 'twentyseven',
  '28': 'twentyeight',
  '29': 'twentynine',
  '30': 'thirty',
  '31': 'thirtyone',
};

const slugOverrides: Record<string, Record<number, string>> = {
  '2026-01-02': {
    0: 'alpha-teen-mastermind-shock',
    1: 'salary-cap-130-rule-change',
    2: 'swiss-ski-fire-incident',
    3: 'hitachi-quality-leadership',
    4: 'us-urges-china-stop-taiwan-pressure',
    5: 'fifty-somethings-younger-boss',
    6: 'shogi-ghq-ai-legacy',
    7: 'byd-ev-leads-world',
    8: 'mazda-hiroshima-supply-chain',
    9: 'household-budget-inflation-2026',
    10: 'ten-billion-investor-profile',
    11: 'daiei-kinki-revival-strategy',
    12: 'hakone-ekiden-aogaku-threepeat',
    13: 'instant-bank-transfer-network',
    14: 'byd-china-competition-2025',
    15: 'toyota-2026-group-restructure',
    16: 'trial-go-retail-strategy',
  },
  '2026-01-03': {
    0: 'wealth-gap-top-earners',
    1: 'alpha-generation-origin',
    2: 'instant-crossborder-remit',
    3: 'disney-cost-gap-roblox',
    4: 'mitarai-career-chronicle',
    5: 'alpha-generation-us-divide',
    6: 'toyota-bz-four-x-lead',
    7: 'salary-cap-one-hundred-thirty',
    8: 'nikkei-outlook-growth-range',
    9: 'alpha-teen-terror-threat',
    10: 'delicate-middle-employees',
    11: 'hakone-ekiden-threepeat',
    12: 'caracas-blast-alert',
    13: 'korea-one-china-stance',
    14: 'time-rich-muda-party',
  },
};

function sanitizeDescription(text: string, limit = 120) {
  return text.replace(/\s+/g, ' ').trim().slice(0, limit);
}

function sanitizeTags(tags?: string[]) {
  if (!tags || tags.length === 0) {
    return ['ニュース分析'];
  }
  return tags.map((tag) => tag.replace(/^[#＃]/, '').replace(/[\\/]/g, '-'));
}

function escapeYaml(text: string) {
  return text.replace(/'/g, "''");
}

function baseSlug(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 30)
    .replace(/^-|-$/g, '');
}

function dateSuffix(dateKey: string) {
  const [, month, day] = dateKey.split('-');
  const monthWord = monthWords[Number(month) - 1] ?? 'month';
  const dayWord = dayWords[day] ?? 'day';
  return `${monthWord}-${dayWord}`;
}

function uniqueSlug(base: string, suffix: string, used: Set<string>) {
  const initial = base ? `${base}-${suffix}` : suffix;
  let candidate = initial || 'article';
  let code = 97;
  while (used.has(candidate)) {
    candidate = `${initial}-${String.fromCharCode(code)}`;
    code++;
    if (code > 122) {
      code = 97;
    }
  }
  used.add(candidate);
  return candidate;
}

function ensureDir(dir: string) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function buildArticleBody(article: ArticleEntry) {
  const summary = article.summary?.replace(/\s+/g, ' ').trim() ?? '最新の報道内容を踏まえて分析します。';
  const intro = `${article.title}に関する報道では、${summary}`;
  const background = `${article.title} は ${article.publishDate ?? '記載日時不明'} に伝えられ、政策・企業活動・国際関係に多角的な影響を及ぼす可能性があります。この記事では背景、実務への示唆、注意点を整理します。`;
  return [
    '## はじめに',
    intro,
    '',
    '## 背景と主要論点',
    background,
    '',
    '## 実務者向けチェックリスト',
    '1. 週次で公式発表や一次情報を確認し、前提となる数値やタイムラインを更新する。',
    '2. サプライチェーンや投資計画、リスク管理フレームワークに与える影響を洗い出し、代替策を準備する。',
    '3. 社内外ステークホルダーへの説明資料を整備し、議論の土台となる共通認識を醸成する。',
    '',
    '## 注意点・リスク',
    `- ${article.title} に関する情報は出所によってバイアスがかかる可能性があるため、複数ソースで検証する。`,
    '- 政策や国際情勢が急速に変化すると前提が崩れる恐れがあるため、シナリオプランニングを怠らない。',
    '',
    '## まとめ',
    `${article.title} は長期的なマクロ環境や企業戦略と密接に結び付いています。日々のアップデートを追いながら、再現性のある意思決定プロセスを構築しましょう。`,
  ].join('\n');
}

function main() {
  const dailyPath = process.argv[2];
  if (!dailyPath) {
    console.error('Usage: tsx scripts/batch-generate-from-daily.ts <path-to-daily-json>');
    process.exit(1);
  }

  const resolvedPath = path.resolve(dailyPath);
  const dailyData = JSON.parse(readFileSync(resolvedPath, 'utf-8')) as DailyData;
  const dateKey = path.basename(resolvedPath, path.extname(resolvedPath));
  ensureDir('articles');
  const articleDir = path.join('articles', dateKey);
  ensureDir(articleDir);

  const statusPath = path.join('data', 'article-status.json');
  const statusData = existsSync(statusPath) ? JSON.parse(readFileSync(statusPath, 'utf-8')) : {};
  if (!statusData[dateKey]) {
    statusData[dateKey] = [];
  }

  const draftedAt = new Date().toISOString();
  const usedSlugs = new Set<string>();
  Object.values(statusData).forEach((entries: any) => {
    entries.forEach((entry: any) => usedSlugs.add(entry.slug));
  });
  const suffix = dateSuffix(dateKey);

  dailyData.articles.forEach((article, index) => {
    const overrideSlug = slugOverrides[dateKey]?.[index];
    const slugBase = overrideSlug ?? baseSlug(article.title);
    const slug = uniqueSlug(slugBase, suffix, usedSlugs);
    const description = sanitizeDescription(article.summary ?? article.title);
    const tags = sanitizeTags(article.tags);

    const frontMatter = [
      '---',
      `title: '${escapeYaml(article.title)}'`,
      `description: '${escapeYaml(description)}'`,
      `pubDate: ${dailyData.timestamp.split('T')[0]}`,
      "author: 'Nikkei Scraper'",
      `tags: [${tags.map((t) => `'${escapeYaml(t)}'`).join(', ')}]`,
      '---',
      '',
    ].join('\n');

    const content = `${frontMatter}${buildArticleBody(article)}\n`;
    const outputPath = path.join(articleDir, `${slug}.md`);
    writeFileSync(outputPath, content);

    const existingIndex = statusData[dateKey].findIndex((entry: any) => entry.slug === slug);
    const existing = existingIndex >= 0 ? statusData[dateKey][existingIndex] : null;
    const record: any = existing ? { ...existing } : { slug, status: 'drafted' };
    record.sourceFile = dailyPath;
    record.articleIndex = index;
    record.contentPath = outputPath;
    if (!record.draftedAt) {
      record.draftedAt = draftedAt;
    }

    if (existingIndex >= 0) {
      statusData[dateKey][existingIndex] = record;
    } else {
      statusData[dateKey].push(record);
    }
  });

  writeFileSync(statusPath, JSON.stringify(statusData, null, 2));
  console.log(`Generated ${dailyData.articles.length} articles for ${dateKey}`);
}

main();
