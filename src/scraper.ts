import axios from 'axios';
import * as cheerio from 'cheerio';

export interface Article {
  title: string;
  url: string;
  publishDate?: string;
  category?: string;
  summary?: string;
  tags?: string[];
  author?: string;
}

export async function fetchArticleDetail(url: string): Promise<Partial<Article>> {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const details: Partial<Article> = {};

    // 公開日時を取得
    const publishDateElement = $('time').first();
    if (publishDateElement.length) {
      details.publishDate = publishDateElement.text().trim();
    }

    // カテゴリ/シリーズ名を取得
    const categoryElement = $('.theme-title').first();
    if (categoryElement.length) {
      details.category = categoryElement.text().trim();
    }

    // リード文を取得（メタタグまたはプレビューテキスト）
    const metaDescription = $('meta[name="description"]').attr('content');
    if (metaDescription) {
      details.summary = metaDescription.trim();
    } else {
      // メタタグがない場合、記事本文の最初のテキストを取得
      const articleText = $('.cmn-article_text').first().text().trim();
      if (articleText && articleText.length > 20) {
        // 残り文字数の表記を削除
        const summary = articleText.replace(/残り\d+文字.*$/, '').trim();
        details.summary = summary.substring(0, 200); // 最大200文字
      }
    }

    // タグを取得（#で始まるハッシュタグのみ、最大5個）
    const tags: string[] = [];
    $('a[href*="/theme/"]').each((_, element) => {
      const tag = $(element).text().trim();
      if (tag.startsWith('#') && !tags.includes(tag)) {
        tags.push(tag);
      }
    });
    if (tags.length > 0) {
      details.tags = tags.slice(0, 5); // 最大5個に制限
    }

    // 著者名を取得
    const authorElement = $('.cmnc-byline');
    if (authorElement.length) {
      details.author = authorElement.text().trim();
    }

    return details;
  } catch (error) {
    console.error(`Error fetching article detail from ${url}:`, error);
    return {};
  }
}

export async function fetchNikkeiTopNews(date?: string): Promise<Article[]> {
  try {
    // dateが指定されている場合はYYYYMMDD形式に変換
    let url = 'https://www.nikkei.com/access/index/?bd=hKijiSougou';
    if (date) {
      const dateStr = date.replace(/-/g, '');
      url = `https://www.nikkei.com/access/index/?bc=${dateStr}&bd=hKijiSougou`;
    }

    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const articles: Article[] = [];

    // 1-30位の記事を取得
    $('.m-miM32_item').each((index, element) => {
      if (index >= 30) return false; // 30件まで

      const $element = $(element);
      const $link = $element.find('.m-miM32_itemTitleText a');

      // タイトルテキストを取得
      const titleText = $link.text().trim();
      const relativeUrl = $link.attr('href');

      if (titleText && relativeUrl) {
        const fullUrl = relativeUrl.startsWith('http')
          ? relativeUrl
          : `https://www.nikkei.com${relativeUrl}`;

        articles.push({
          title: titleText,
          url: fullUrl
        });
      }
    });

    return articles;
  } catch (error) {
    console.error('Error fetching Nikkei news:', error);
    throw error;
  }
}
