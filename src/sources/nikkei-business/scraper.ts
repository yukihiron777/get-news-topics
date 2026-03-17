import axios from 'axios';
import * as cheerio from 'cheerio';
import { Article } from '../../types';
import { sleep } from '../../utils';
import { getSource } from '../../sources-registry';

const config = getSource('nikkei-business');

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

    // カテゴリ（シリーズ名）
    const parentTitle = $('.p-article_header_parentTitle').text().trim();
    if (parentTitle) {
      details.category = parentTitle;
    }

    // リード文（metaタグ）
    const metaDescription = $('meta[name="description"]').attr('content');
    if (metaDescription) {
      details.summary = metaDescription.trim();
    }

    // タグ
    const tags: string[] = [];
    $('.p-article_footer_tags_item a').each((_, el) => {
      const tag = $(el).text().trim();
      if (tag && !tags.includes(tag)) {
        tags.push(tag);
      }
    });
    if (tags.length > 0) {
      details.tags = tags.slice(0, 5);
    }

    // 著者名
    const editor = $('.p-article_header_meta_item.-editor').text().trim();
    if (editor) {
      // "By 森永輔 日経ビジネス シニアエディター" → 名前部分を抽出
      const authorMatch = editor.replace(/^By\s+/i, '').trim();
      if (authorMatch) {
        details.author = authorMatch;
      }
    }

    return details;
  } catch (error) {
    console.error(`Error fetching detail from ${url}:`, error);
    return {};
  }
}

/**
 * 日経ビジネスのランキングページから有料記事を全セクション取得
 * セクション: 有料会員 / 人気記事 / ブックマーク数 / 経営層が読んだ
 */
export async function fetchArticles(): Promise<Article[]> {
  try {
    console.log(`Fetching ${config.label} ranking...`);
    const response = await axios.get(config.url, { headers: HEADERS });
    const $ = cheerio.load(response.data);
    const seenUrls = new Set<string>();
    const articles: Article[] = [];

    // 全セクションの記事を取得（有料記事のみ）
    $('.p-articleList.-ranking .p-articleList_item').each((_, element) => {
      const $el = $(element);

      // 有料記事のみ（-titleLockクラスで判定）
      const dateEl = $el.find('.p-articleList_item_date');
      if (!dateEl.hasClass('-titleLock')) return;

      const relativeUrl = $el.find('.p-articleList_item_link').attr('href');
      const title = $el.find('.p-articleList_item_title').text().trim();

      if (!title || !relativeUrl) return;

      const fullUrl = relativeUrl.startsWith('http')
        ? relativeUrl
        : `${config.baseUrl}${relativeUrl}`;

      // URL重複除去
      if (seenUrls.has(fullUrl)) return;
      seenUrls.add(fullUrl);

      const article: Article = { title, url: fullUrl };

      const subTitle = $el.find('.p-articleList_item_subTitle').text().trim();
      if (subTitle) article.category = subTitle;

      const description = $el.find('.p-articleList_item_description').text().trim();
      if (description) article.summary = description;

      const date = dateEl.text().trim();
      if (date) article.publishDate = date;

      articles.push(article);
    });

    console.log(`Found ${articles.length} paid articles from ranking (deduplicated)`);

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
