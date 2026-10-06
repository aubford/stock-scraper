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

1. Run: npm run app
2. Type the name of the app you want to run. Simply use the name of the file (minus extension) from the src/apps directory.
   - For testing a single ticket, use the "start" app.
3. Apps that need the browser reuse the debug Chrome on port 9222, or launch one in the
   background if none is running. `npm run launch` is the hard reset (kills all Chrome windows).
4. Apps that scrape through Fidelity or Merrill open only those login tabs and wait for Enter
   only if you are logged out.
