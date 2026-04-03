import axios from 'axios';
import * as cheerio from 'cheerio';
import { Article } from '../../types';
import { sleep } from '../../utils';
import { getSource } from '../../sources-registry';

const config = getSource('kabutan');

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
    const time = $('time').first();
    if (time.length) {
      details.publishDate = time.attr('datetime') || time.text().trim();
    }

    // リード文（metaタグ）
    const metaDescription = $('meta[name="description"]').attr('content');
    if (metaDescription) {
      details.summary = metaDescription.trim();
    }

    return details;
  } catch (error) {
    console.error(`Error fetching detail from ${url}:`, error);
    return {};
  }
}

/**
 * 株探のアクセスランキングページから記事を取得
 * URL: https://kabutan.jp/info/accessranking/2_1
 */
export async function fetchArticles(): Promise<Article[]> {
  try {
    console.log(`Fetching ${config.label} ranking...`);
    const response = await axios.get(config.url, { headers: HEADERS });
    const $ = cheerio.load(response.data);
    const seenUrls = new Set<string>();
    const articles: Article[] = [];

    let duplicateCount = 0;

    // アクセスランキングの記事一覧を取得
    $('div.acrank table.s_news_list tr').each((_, element) => {
      const $el = $(element);

      const titleLink = $el.find('td.acrank_title a');
      const title = titleLink.text().trim();
      const relativeUrl = titleLink.attr('href');

      if (!title || !relativeUrl) return;

      const fullUrl = relativeUrl.startsWith('http')
        ? relativeUrl
        : `${config.baseUrl}${relativeUrl}`;

      // URL正規化して重複チェック（クエリパラメータが記事IDのため保持）
      const normalizedUrl = fullUrl.replace(/\/+$/, '');
      if (seenUrls.has(normalizedUrl)) {
        duplicateCount++;
        return;
      }
      seenUrls.add(normalizedUrl);

      const article: Article = { title, url: fullUrl };

      // カテゴリ（市況・材料・決算・注目など）
      const category = $el.find('td.acrank_bgp div.newslist_ctg').text().trim();
      if (category) article.category = category;

      articles.push(article);
    });

    console.log(`Found ${articles.length} articles from ranking (skipped ${duplicateCount} duplicates)`);

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
