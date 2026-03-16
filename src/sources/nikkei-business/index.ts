import { fetchArticles } from './scraper';
import { saveRanking } from '../../source-storage';
import { SOURCE_CONFIG } from './config';

async function main() {
  try {
    console.log(`Starting ${SOURCE_CONFIG.displayName} fetch...`);
    const articles = await fetchArticles();

    console.log('\nSaving ranking data...');
    await saveRanking(SOURCE_CONFIG.name, articles);
    console.log('Done');
  } catch (error) {
    console.error('Failed to fetch or save:', error);
    process.exit(1);
  }
}

main();
