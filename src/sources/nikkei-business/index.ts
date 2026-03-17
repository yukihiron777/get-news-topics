import { fetchArticles } from './scraper';
import { saveRanking } from '../../source-storage';
import { getSource } from '../../sources-registry';

const config = getSource('nikkei-business');

async function main() {
  try {
    console.log(`Starting ${config.label} fetch...`);
    const articles = await fetchArticles();

    console.log('\nSaving ranking data...');
    await saveRanking(config.id, articles);
    console.log('Done');
  } catch (error) {
    console.error('Failed to fetch or save:', error);
    process.exit(1);
  }
}

main();
