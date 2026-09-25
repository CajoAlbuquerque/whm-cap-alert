import { WhmScraper } from './src/WhmScraper.js';
import { CapStateEngine } from './src/CapStateEngine.js';
import { StateStore } from './src/StateStore.js';
import { EmailNotifier } from './src/EmailNotifier.js';

const TARGET_COUNTRIES = ['Spain', 'Brazil'];
const STATUS_PAGE_URL = 'https://immi.homeaffairs.gov.au/what-we-do/whm-program/status-of-country-caps';

async function main() {
  console.log('--- Starting WHM Country Cap Check ---');

  const scraper = new WhmScraper(STATUS_PAGE_URL);
  const stateEngine = new CapStateEngine();
  const stateStore = new StateStore('./status.json');
  const notifier = new EmailNotifier(process.env.RESEND_API_KEY, process.env.NOTIFY_EMAIL);

  try {
    // 1. Fetch current status from page
    const currentStatuses = await scraper.scrape(TARGET_COUNTRIES);

    // 2. Read previous status from storage
    const previousState = stateStore.load();

    // 3. Evaluate state changes
    const changes = stateEngine.evaluate(previousState, currentStatuses);

    // 4. Notify if meaningful state transitions occurred
    if (changes.length > 0) {
      console.log(`Detected ${changes.length} change(s). Sending notifications...`);
      await notifier.notify(changes, STATUS_PAGE_URL);
    } else {
      console.log('No actionable status changes detected.');
    }

    // 5. Always persist latest fetched state
    stateStore.save({ ...previousState, ...currentStatuses });

    console.log('--- WHM Check Complete ---');
  } catch (error) {
    console.error('Fatal error during execution:', error);
    process.exit(1);
  }
}

main();