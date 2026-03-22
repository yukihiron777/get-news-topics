import axios from 'axios';
import * as cheerio from 'cheerio';
import { Article } from '../../types';
import { sleep } from '../../utils';
import { getSource } from '../../sources-registry';

const config = getSource('nytimes');

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
};

const FEED_URLS = [
  config.url, // HomePage.xml
  'https://rss.nytimes.com/services/xml/rss/nyt/MostViewed.xml',
];

/**
 * RSS XML をパースして Article[] を返す
 */
function parseRssFeed(xml: string): Article[] {
  const $ = cheerio.load(xml, { xmlMode: true });
  const articles: Article[] = [];

  $('item').each((_, element) => {
    const $item = $(element);

    const title = $item.find('title').text().trim();
    const url = $item.find('link').text().trim();

    if (!title || !url) return;

    const article: Article = { title, url };

    // 要約（HTML タグ除去）
    const description = $item.find('description').text().trim();
    if (description) {
      article.summary = description.replace(/<[^>]*>/g, '').trim();
    }

    // 著者
    const creator = $item.find('dc\\:creator').text().trim();
    if (creator) {
      article.author = creator;
    }

    // 公開日時（RFC 2822 → ISO 8601）
    const pubDate = $item.find('pubDate').text().trim();
    if (pubDate) {
      try {
        article.publishDate = new Date(pubDate).toISOString();
      } catch {
        // パース失敗時はスキップ
      }
    }

    // カテゴリ → tags + category
    const categories: string[] = [];
    let primaryCategory: string | undefined;

    $item.find('category').each((__, catEl) => {
      const text = $(catEl).text().trim();
      const domain = $(catEl).attr('domain') || '';
      if (text) {
        categories.push(text);
        if (!primaryCategory && domain.includes('/des')) {
          primaryCategory = text;
        }
      }
    });

    if (primaryCategory) {
      article.category = primaryCategory;
    }
    if (categories.length > 0) {
      article.tags = categories.slice(0, 10);
    }

    articles.push(article);
  });

  return articles;
}

/**
 * NYTimes の RSS フィードから記事一覧を取得
 */
export async function fetchArticles(): Promise<Article[]> {
  try {
    console.log(`Fetching ${config.label} RSS feeds...`);
    const seenUrls = new Set<string>();
    const allArticles: Article[] = [];

    for (let i = 0; i < FEED_URLS.length; i++) {
      const feedUrl = FEED_URLS[i];
      console.log(`Fetching feed: ${feedUrl}`);

      const response = await axios.get(feedUrl, { headers: HEADERS });
      const articles = parseRssFeed(response.data);

      let duplicateCount = 0;
      for (const article of articles) {
        const normalizedUrl = article.url.split('?')[0].replace(/\/+$/, '');
        if (seenUrls.has(normalizedUrl)) {
          duplicateCount++;
          continue;
        }
        seenUrls.add(normalizedUrl);
        allArticles.push(article);
      }

      console.log(`  Found ${articles.length} articles (skipped ${duplicateCount} duplicates)`);

      // フィード間のレート制限
      if (i < FEED_URLS.length - 1) {
        await sleep(1000);
      }
    }

    console.log(`Total: ${allArticles.length} unique articles`);
    return allArticles;
  } catch (error) {
    console.error(`Error fetching ${config.label}:`, error);
    throw error;
  }
}
