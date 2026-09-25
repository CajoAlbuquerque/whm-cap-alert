import { chromium } from 'playwright';
import { Resend } from 'resend';
import fs from 'fs';

// Configuration
const STATUS_PAGE_URL = 'https://immi.homeaffairs.gov.au/what-we-do/whm-program/status-of-country-caps';
const TARGET_COUNTRIES = ['Spain', 'Brazil']; // Add your target countries here
const STATUS_FILE = './status.json';

const resend = new Resend(process.env.RESEND_API_KEY);
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL;

async function runScraper() {
  console.log('Starting Home Affairs WHM status check...');
  
  // 1. Read existing local state
  let previousState = {};
  if (fs.existsSync(STATUS_FILE)) {
    previousState = JSON.parse(fs.readFileSync(STATUS_FILE, 'utf8'));
  }

  // 2. Launch headless browser
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    await page.goto(STATUS_PAGE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    // Scrape table content directly
    const currentStatuses = {};
    
    for (const country of TARGET_COUNTRIES) {
      // Locate the table row containing the country name and extract the status column text
      const statusText = await page.evaluate((countryName) => {
        const rows = Array.from(document.querySelectorAll('table tr'));
        for (const row of rows) {
          if (row.innerText.includes(countryName)) {
            const cells = row.querySelectorAll('td');
            // Assuming status is in the last or second-to-last cell of the row
            return cells.length > 0 ? cells[cells.length - 1].innerText.trim() : null;
          }
        }
        return null;
      }, country);

      if (statusText) {
        currentStatuses[country] = statusText;
      } else {
        console.warn(`Could not find status row for: ${country}`);
        currentStatuses[country] = previousState[country] || 'unknown';
      }
    }

    await browser.close();

    // 3. Compare states and send notifications
    let stateHasChanged = false;
    const newState = { ...previousState };

    for (const country of TARGET_COUNTRIES) {
      const oldStatus = (previousState[country] || 'unknown').toLowerCase();
      const newStatus = (currentStatuses[country] || 'unknown').toLowerCase();

      console.log(`[${country}] Previous: "${oldStatus}" | Current: "${newStatus}"`);

      if (oldStatus !== newStatus && oldStatus !== 'unknown') {
        stateHasChanged = true;
        newState[country] = currentStatuses[country];

        // Trigger on OPEN
        if (newStatus.includes('open')) {
          console.log(`Alerting! ${country} is now OPEN!`);
          await sendEmail(
            `🚀 WHM Visa Cap OPEN: ${country}!`,
            `<h2>Good news!</h2><p>The Australian Work and Holiday Visa cap for <strong>${country}</strong> is now status: <strong>${currentStatuses[country]}</strong>.</p><p><a href="${STATUS_PAGE_URL}">Click here to apply on the official site</a></p>`
          );
        } 
        // Trigger on CLOSED
        else if (newStatus.includes('closed') || newStatus.includes('paused')) {
          console.log(`Notice: ${country} is now ${currentStatuses[country]}`);
          await sendEmail(
            `ℹ️ WHM Visa Cap Update: ${country} is now ${currentStatuses[country]}`,
            `<p>The cap status for <strong>${country}</strong> has changed to: <strong>${currentStatuses[country]}</strong>.</p>`
          );
        }
      } else {
        newState[country] = currentStatuses[country];
      }
    }

    // 4. Update status.json if state changed
    if (stateHasChanged || JSON.stringify(previousState) !== JSON.stringify(newState)) {
      console.log('Updating status.json with new state...');
      fs.writeFileSync(STATUS_FILE, JSON.stringify(newState, null, 2));
    } else {
      console.log('No state changes detected.');
    }

  } catch (error) {
    console.error('Error during scraping execution:', error);
    await browser.close();
    process.exit(1);
  }
}

async function sendEmail(subject, htmlBody) {
  try {
    const data = await resend.emails.send({
      from: 'WHM Alert <onboarding@resend.dev>',
      to: [NOTIFY_EMAIL],
      subject: subject,
      html: htmlBody,
    });
    console.log('Email sent successfully:', data);
  } catch (error) {
    console.error('Failed to send email via Resend:', error);
  }
}

runScraper();