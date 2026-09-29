import { chromium } from 'playwright';

export class WhmScraper {
  constructor(url) {
    this.url = url;
  }

  async scrape() {
    console.log(`Launching browser to fetch Home Affairs status page...`);
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    try {
      const response = await page.goto(this.url, { waitUntil: 'domcontentloaded', timeout: 60000 });

      await this.checkForErrors(response, page);

      const currentStatuses = await page.evaluate(() => {
        const statuses = {};
        const rows = Array.from(document.querySelectorAll('tbody tr'));

        for (const row of rows) {
          const cells = row.querySelectorAll('td');
          if (cells.length < 2) continue;

          const country = cells[0].innerText.trim();
          const label = cells[1].querySelector('.label');
          let statusText = null;

          if (label) {
            statusText = label.innerText.trim().toUpperCase();
          } else if (cells[1].innerText.toLowerCase().includes('ballot')) {
            statusText = 'BALLOT';
          } else {
            statusText = cells[1].innerText.trim().toUpperCase();
          }

          if (country) {
            statuses[country] = statusText || 'UNKNOWN';
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