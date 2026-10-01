# WHM Cap Alert

A simple automated script that watches the official Australian **Work and Holiday Visa (WHM) [Status of country caps](https://immi.homeaffairs.gov.au/what-we-do/whm-program/status-of-country-caps)** page and emails you when a country's cap status changes.

I built this mostly for me and a friend so we wouldn't have to keep refreshing the Home Affairs site — but it's easy to fork/clone and run for yourself.

## What it does

- **Scrapes** the official Home Affairs `status-of-country-caps` page periodically.
- **Compares** the freshly scraped statuses against the last known state stored in [`status.json`](./status.json).
- **Alerts** subscribed emails **only when a country you care about changes** (e.g. `PAUSED` → `OPEN`).
- **Persists** the new state back to `status.json` so the next run only alerts on *new* changes.

It runs automatically via GitHub Actions:

```text
.github/workflows/ -> Monitor WHM Visa Country Caps
schedule: 23 */3 * * *  # every 3 hours at minute 23
+ manual trigger via "Run workflow" (workflow_dispatch)
```

On each run it also commits the updated `status.json` back to the repo, so you get a full history of cap changes.

### How it works under the hood

1. `src/WhmScraper.js` — launches headless Chromium (Playwright + stealth plugin, to handle Akamai protection) and parses the `tbody tr` country/status table into e.g.:
   ```json
   { "Brazil": "PAUSED", "Portugal": "OPEN", "India": "BALLOT" }
   ```
2. `src/StateStore.js` — loads/saves the previous state from `./status.json`.
3. `src/CapStateEngine.js` — diffs old vs. new **only for countries listed in `SUBSCRIPTIONS`**. Skips unchanged or `UNKNOWN` states.
4. `src/EmailNotifier.js` — sends batched emails via [Resend](https://resend.com/) with a different subject/body per change type.
5. `scraper.js` — orchestrates the above.

### What emails you'll get

| Change type | When | Subject example |
|---|---|---|
| `OPEN` | Cap changed to `OPEN` — time to apply! | `🚀 WHM Visa Cap OPEN: Portugal!` |
| `PAUSED` / `BALLOT` | Cap changed but not open/closed (informational) | `ℹ️ WHM Visa Cap Update: Portugal is now PAUSED` |
| `CLOSED` | Cap closed for the application year | `❌ WHM Visa Cap for Portugal is CLOSED` |
| `NEW` | You just subscribed to a country (first seen state, non-`OPEN`) | `✅ You are now subscribed to WHM Visa Cap updates for: Portugal!` |

Each email links back to the official status page and to this repo. No change for your subscribed countries = no email.

## Configure it for yourself

Everything is configured through **GitHub Secrets** (so you never commit emails/API keys). The full list with examples lives in [`.env.example`](./.env.example):

```bash
RESEND_API_KEY=your_api_key_here
SENDER_EMAIL=noreply@yourdomain.com
SUBSCRIPTIONS={"Country1":["email1@example.com", "email2@example.com"], "Country2":["email1@example.com"]}
```

### 1. Fork / clone the repo

```bash
git clone https://github.com/CajoAlbuquerque/whm-cap-alert.git
cd whm-cap-alert
npm install
```

> Keep the included `Monitor WHM Visa Country Caps` workflow enabled — that's what runs the check every 3 hours.

### 2. Set up Resend for sending emails

1. Create a free account at [resend.com](https://resend.com/).
2. Verify a sending domain (or single email for testing) under **Domains / Emails**.
3. Create an API key under **API Keys** → copy it — that's your `RESEND_API_KEY`.
4. Decide your sender address, e.g. `noreply@yourdomain.com` — that's your `SENDER_EMAIL`. It must be verified in Resend. The script sends as `WHM Cap Alert <your SENDER_EMAIL>`.

### 3. Add the 3 GitHub Secrets

Go to your fork on GitHub → **Settings → Secrets and variables → Actions → New repository secret**, and create:

| Secret name | Value | Where to get it |
|---|---|---|
| `RESEND_API_KEY` | `re_xxxxxxxx...` | Resend dashboard → API Keys |
| `SENDER_EMAIL` | `noreply@yourdomain.com` | An address/domain you verified in Resend |
| `SUBSCRIPTIONS` | JSON string (see below) | You write this yourself |

The workflow injects them as env vars on every run:

```yaml
env:
  RESEND_API_KEY: ${{ secrets.RESEND_API_KEY }}
  SUBSCRIPTIONS: ${{ secrets.SUBSCRIPTIONS }}
  SENDER_EMAIL: ${{ secrets.SENDER_EMAIL }}
```

### 4. The interesting one: `SUBSCRIPTIONS`

This is where you tell the script **which emails should be notified about changes in which country**.

Format: a **single-line JSON object** mapping **exact country name → array of emails**:

```json
{"Brazil":["you@example.com", "friend@example.com"], "Portugal":["you@example.com"], "India":["friend@example.com"]}
```

Rules / tips:

- Country names **must match exactly** the names on the Home Affairs page / in `status.json` (e.g. `Brazil`, `Czechia`, `Papua New Guinea`, `Slovak Republic`, `Türkiye`). Case-sensitive.
- You can subscribe multiple emails to one country, and one email to multiple countries.
- A country **not** listed here is still scraped and stored in `status.json`, but **never triggers an email**.
- It must be **valid JSON** on one line when pasted into GitHub Secrets — double quotes, commas, no trailing comma. Validate with `JSON.parse()` or [jsonlint.com](https://jsonlint.com/) if unsure.
- To add/remove someone later, just update the `SUBSCRIPTIONS` secret — no code change needed. Newly added countries send a `NEW` confirmation email with their current status on the next run.

Local testing uses the same values via a `.env` file (which is git-ignored — never commit it):

```bash
cp .env.example .env
# edit .env with your real values
npm start
# or: node scraper.js
```

### 5. Enable and test the schedule

- The workflow is already scheduled for `23 */3 * * *` (every 3 hours). Adjust the cron in `.github/workflows/*.yml` if you want it more/less often.
- To test immediately: **Actions → Monitor WHM Visa Country Caps → Run workflow → Run workflow**.
- Check the Actions logs for `Detected X change(s)` / `No actionable status changes detected`, and check your inbox (and spam).
- `status.json` will be auto-committed after each run when it changes.

Prerequisites for local runs: Node.js 26+ (see workflow), `npm ci`, and `npx playwright install --with-deps chromium`.

## Project structure

```text
scraper.js              # entrypoint / orchestration
src/WhmScraper.js       # Playwright scraping of Home Affairs page
src/CapStateEngine.js   # diff old vs new, filter by SUBSCRIPTIONS
src/StateStore.js       # load/save status.json
src/EmailNotifier.js    # Resend batched email sending
status.json             # last known country -> status map (auto-updated)
.env.example            # documented list of required env vars / secrets
.github/workflows/      # scheduled check + auto-commit of status.json
```

## Want to be notified without running this yourself?

Don't want to fork, set up Resend, and manage secrets? No problem — **reach out to me and I can add you to my instance's notifications**.

Please **contact me privately** via GitHub at [@CajoAlbuquerque](https://github.com/CajoAlbuquerque) (please do not post your email publicly in an Issue) with:

1. The **country/countries** you want to watch (exact names as shown on the official page), and
2. The **email address** to notify.

I'll add you to my `SUBSCRIPTIONS` secret and you'll get the same `OPEN` / `PAUSED` / `CLOSED` alerts on the next change — no setup needed on your side. I will reply to confirm before subscribing you.

#### Privacy notice for direct subscriptions

*   **Controller:** Carlos Albuquerque (@CajoAlbuquerque), owner of this repository.
*   **What I collect:** Your email address and your country/countries of interest.
*   **Why and lawful basis:** To send you automated WHM cap change emails — based on your **consent**.
*   **Where it's stored/processed:** In this repository's GitHub Actions Secrets and processed by [Resend](https://resend.com) to deliver emails. No other sharing or selling.
*   **Retention:** Until you unsubscribe, or until this repository is archived/deleted — whichever comes first.
*   **Your rights:** You can request access, correction, or deletion of your data, and you can withdraw consent at any time (withdrawing does not affect emails already sent).
*   **How to unsubscribe:** Contact me privately via GitHub at [@CajoAlbuquerque](https://github.com/CajoAlbuquerque) and I will remove you promptly and confirm removal.

By contacting me with your email and country preference and confirming my reply, you agree to the above.

## Disclaimer

This is an unofficial community tool. Statuses can change at any time and scraping can be delayed or blocked. **Always confirm on the [official Home Affairs status page](https://immi.homeaffairs.gov.au/what-we-do/whm-program/status-of-country-caps) before acting/applying.**

MIT Licensed — see [LICENSE](./LICENSE).

