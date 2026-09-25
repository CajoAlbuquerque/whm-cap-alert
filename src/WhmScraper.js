import { chromium } from 'playwright';

export class WhmScraper {
  constructor(url) {
    this.url = url;
  }

  async scrape() {
    console.log(`Launching browser to fetch Home Affairs status page...`);
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const currentStatuses = {};

    try {
      await page.goto(this.url, { waitUntil: 'domcontentloaded', timeout: 60000 });

      const statusText = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('tbody tr'));

        for (const row of rows) {
          const cells = row.querySelectorAll('td');
          if (cells.length < 2)
            continue;

          const country = cells[0].innerText.trim();
          const label = cells[1].querySelector('.label');
          let statusText = null;

          if (label) {
            statusText = label.innerText.trim().toUpperCase();
          } else if (cells[1].innerText.toLowerCase().includes('ballot')) {
            statusText = 'BALLOT';
          }

          currentStatuses[country] = statusText || 'unknown';
        }
      });


      return currentStatuses;
    } catch (error) {
      console.error('Error occurred while scraping Home Affairs page:', error);
      throw error;
    } finally {
      await browser.close();
    }
  }
}