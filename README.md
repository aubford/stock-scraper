# Stock Scraper Setup

1. Download Google Drive
2. set STOCK_SCRAPBOOK_LOCATION to Google Drive/stock-scrapbook directory
3. Clone repo
4. Run script: init
5. nvm alias default [version in .nvmrc]

Note: Make sure only one puppeteer instance is running at a time.

# Quick Test (one command)

```
npm run quick -- AAPL MSFT
```

Reuses the Chrome debug target on port 9222 if one is running (otherwise launches one in the
background and waits for it), refreshes `ws.json`, opens Fidelity and Merrill login tabs and
waits for Enter, runs the `start` app for the given tickers, prints a per-ticker summary of the
scraped record, and exits non-zero if a ticker fails. Results are written to
`stockDataStaging.json`. This is the recommended way for Cursor Agents to check a change (see
`AGENTS.md`).

# To Run App

1. Make sure the debug browser is up: `npm run browser` (reuse or launch, refreshes `ws.json`)
   or `npm run launch` (kills all Chrome windows and starts a fresh one; keep that terminal open).
2. Run: npm run app
3. Type the name of the app you want to run. Simply use the name of the file (minus extension) from the src/apps directory.
   - For testing a single ticket, use the "start" app.
4. Some apps will require manually logging in to the user's brokerage accounts.
