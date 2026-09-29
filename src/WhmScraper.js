import { chromium } from 'playwright-extra';
import stealthPlugin from 'puppeteer-extra-plugin-stealth';

chromium.use(stealthPlugin());
const UNKNOWN_STATE = 'UNKNOWN';

export class WhmScraper {
  constructor(url) {
    this.url = url;
  }

  async scrape() {
    console.log(`Launching browser to fetch Home Affairs status page...`);
    const browser = await chromium.launch({ headless: true });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      locale: 'en-US',
      timezoneId: 'Australia/Sydney',
    });

    const page = await context.newPage();

    try {
      const response = await page.goto(this.url, { waitUntil: 'domcontentloaded', timeout: 60000 });

      await this.checkForErrors(response, page);

      const currentStatuses = await page.evaluate(() => {
        const cleanString = (str) => str
          .replace(/[^\p{L}\s]/gu, '')
          .replace(/\s+/g, ' ')
          .trim();

        const statuses = {};
        const rows = Array.from(document.querySelectorAll('tbody tr'));

        for (const row of rows) {
          const cells = row.querySelectorAll('td');
          if (cells.length < 2) continue;

          const country = cleanString(cells[0].innerText);
          const statusTextRaw = cleanString(cells[1].innerText);
          const label = cells[1].querySelector('.label');
          let statusText = null;

          if (label) {
            statusText = cleanString(label.innerText).toUpperCase();
          } else if (statusTextRaw.toLowerCase().includes('ballot')) {
            statusText = 'BALLOT';
          } else {
            statusText = statusTextRaw.toUpperCase();
          }

          if (country) {
            statuses[country] = statusText || UNKNOWN_STATE;
          }
        }

        return statuses;
      });

      return currentStatuses;
    } catch (error) {
      console.error('Error occurred while scraping Home Affairs page:', error);
      throw error;
    } finally {
      await browser.close();
    }
  }

  async checkForErrors(response, page) {
    if (!response) {
      throw 'Network failure: No response received from target URL.';
    }

    const statusCode = response.status();
    console.log(`HTTP Response Status: ${statusCode} ${response.statusText()}`);

    if (statusCode >= 400) {
      throw `HTTP request failed with status code ${statusCode}.`;
    }

    const pageTitle = await page.title();
    const pageText = await page.evaluate(() => document.body?.innerText || '');

    const isAccessDeniedTitle = pageTitle.toLowerCase().includes('access denied');
    const isAccessDeniedBody = pageText.includes("You don't have permission to access") ||
      pageText.toLowerCase().includes('access denied');

    if (isAccessDeniedTitle || isAccessDeniedBody) {
      throw 'Soft-blocked by Akamai: Server returned HTTP 200 but content is "Access Denied".';
    }
  }
}