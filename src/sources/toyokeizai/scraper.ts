import axios from 'axios';
import * as cheerio from 'cheerio';
import { Article } from '../../types';
import { sleep } from '../../utils';
import { getSource } from '../../sources-registry';

const config = getSource('toyokeizai');

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
};

/**
 * 記事詳細ページからメタ情報を取得
 */
async function fetchArticleDetail(url: string): Promise<Partial<Article>> {
  try {
    const response = await axios.get(url, { headers: HEADERS });
    const $ = cheerio.load(response.data);
    const details: Partial<Article> = {};

    // 公開日時
    const publishedTime = $('meta[property="article:published_time"]').attr('content');
    if (publishedTime) {
      details.publishDate = publishedTime;
    }

    // カテゴリ
    const category = $('meta[name="cXenseParse:toy-category"]').attr('content');
    if (category) {
      details.category = category;
    }

    // 著者
    const author = $('meta[name="cXenseParse:author"]').attr('content');
    if (author) {
      details.author = author;
    }

    // 要約
    const description = $('meta[name="description"]').attr('content');
    if (description) {
      details.summary = description.trim();
    }

    return details;
  } catch (error) {
    console.error(`Error fetching detail from ${url}:`, error);
    return {};
  }
}

/**
 * 東洋経済オンラインのランキングページから記事一覧を取得
 */
export async function fetchArticles(): Promise<Article[]> {
  try {
    console.log(`Fetching ${config.label} ranking...`);
    const response = await axios.get(config.url, { headers: HEADERS });
    const $ = cheerio.load(response.data);
    const articles: Article[] = [];

    // ランキングリストの記事を取得
    const rankingList = $('ul[class^="ranking-"]').first();
    const items = rankingList.find('li[id^="rank"]').filter((_, el) => {
      // サイドバーの rank1b 等を除外（数字のみのIDを対象）
      const id = $(el).attr('id') || '';
      return /^rank\d+$/.test(id);
    });

    items.each((index, element) => {
      if (index >= 10) return false; // 10件まで

      const $el = $(element);
      const linkEl = $el.find('a.link-box');
      const relativeUrl = linkEl.attr('href');
      const title = $el.find('span.column-main-ttl').text().trim();

      if (title && relativeUrl) {
        const fullUrl = relativeUrl.startsWith('http')
          ? relativeUrl
          : `${config.baseUrl}${relativeUrl}`;

        const article: Article = { title, url: fullUrl };

        // ランキングページから取得できるメタデータ
        const author = $el.find('div.meta > span.author').text().trim();
        if (author) {
          article.author = author;
        }

        const date = $el.find('div.meta > span.date').text().trim();
        if (date) {
          article.publishDate = date;
        }

        const summary = $el.find('span.summary').text().trim();
        if (summary) {
          article.summary = summary;
        }

        articles.push(article);
      }
    });

    console.log(`Found ${articles.length} articles from ranking`);

    // 各記事の詳細を取得
    console.log('\nFetching article details...');
    for (let i = 0; i < articles.length; i++) {
      const article = articles[i];
      console.log(`[${i + 1}/${articles.length}] ${article.title}`);

      const details = await fetchArticleDetail(article.url);
      articles[i] = { ...article, ...details };

      // レート制限: 1.5秒待機
      if (i < articles.length - 1) {
        await sleep(1500);
      }
    }

    return articles;
  } catch (error) {
    console.error(`Error fetching ${config.label}:`, error);
    throw error;
  }
}
