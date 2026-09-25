import { chromium } from 'playwright';

export class WhmScraper {
  constructor(url) {
    this.url = url;
  }

  async scrape(targetCountries) {
    console.log(`Launching browser to fetch ${this.url}...`);
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const currentStatuses = {};

    try {
      await page.goto(this.url, { waitUntil: 'domcontentloaded', timeout: 60000 });

      for (const country of targetCountries) {
        const statusText = await page.evaluate((countryName) => {
          const rows = Array.from(document.querySelectorAll('table tr'));
          for (const row of rows) {
            if (row.innerText.includes(countryName)) {
              const cells = row.querySelectorAll('td');
              return cells.length > 0 ? cells[cells.length - 1].innerText.trim() : null;
            }
          }
          return null;
        }, country);

        currentStatuses[country] = statusText || 'unknown';
      }

      return currentStatuses;
    } catch (error) {
      console.error('Error occurred while scraping Home Affairs page:', error);
      throw error;
    } finally {
      await browser.close();
    }
  }
}