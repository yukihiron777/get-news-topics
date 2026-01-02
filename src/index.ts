import { fetchNikkeiTopNews, fetchArticleDetail } from './scraper';
import { saveRanking } from './storage';

// レート制限のための遅延関数
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  try {
    console.log('Fetching Nikkei top 10 news...');
    const articles = await fetchNikkeiTopNews();

    console.log(`Found ${articles.length} articles`);

    // 各記事の詳細を取得
    console.log('\nFetching article details...');
    for (let i = 0; i < articles.length; i++) {
      const article = articles[i];
      console.log(`[${i + 1}/${articles.length}] ${article.title}`);

      const details = await fetchArticleDetail(article.url);

      // 詳細情報をマージ
      articles[i] = {
        ...article,
        ...details
      };

      // レート制限: 次のリクエストまで1.5秒待機
      if (i < articles.length - 1) {
        await sleep(1500);
      }
    }

    console.log('\nSaving ranking data...');
    await saveRanking(articles);
    console.log('Successfully saved ranking data');
  } catch (error) {
    console.error('Failed to fetch or save news:', error);
    process.exit(1);
  }
}

main();
