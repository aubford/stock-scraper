# Notes for Cursor Agents

## Test a change against the real browser

```
npm run quick -- AAPL MSFT
```

One command does the whole dance: it reuses the Chrome debug target on port 9222 (or launches
one detached and waits for it), rewrites `ws.json`, opens Fidelity and Merrill login tabs and
waits for Enter (so the human can sign in; skipped when both are already logged in), runs the `start` app for the given tickers, prints
a summary per ticker (field count, any `error_*` / `warnError_*` source fields, and the
abbreviated record), and exits `0` only if every ticker scraped. One or two tickers is usually
enough to see whether a change worked.

- Full records land in `stockDataStaging.json` under `<TICKER>` (minified; `npm run prettyStocks`
  formats it).
- A ticker-level `❌` means `scrapeDataForTicker` threw; a `✅` with `source errors` means one
  source failed but the rest were written. Both are printed in the summary.
- Every browser app (`npm run app`, `npm run all`, `debug/*.debug.js`) reuses or launches the
 debug Chrome itself and only prompts for the brokerage logins it needs. `npm run browser` just
 starts it.

## Never delete anything in the Google Sheet without explicit permission

Do not delete or overwrite anything in the Google Sheet (rows, columns, cells, formulas, tabs)
unless the user specifically says to. Add alongside what's there instead of replacing it.

## Environment facts

- Runs only on the user's Mac: it needs Google Chrome, `STOCK_SCRAPBOOK_LOCATION` pointing at the
  Google Drive `stock-scrapbook` folder, and the user's brokerage sessions. It cannot run in a
  cloud VM or CI.
- The Fidelity- and Merrill-backed sources (`fidelityAnalysts`, `argusAnalyst`, `boa`, and the
  `cfra`/`morningstar` links that come from `boa`) require the human to be logged in inside the
  debug Chrome (profile `~/chrome-debug-profile`). If those fields come back as `error_*`, ask the
  user to log in in that Chrome window, then re-run; do not try to log in yourself.
- Leave the debug Chrome running between runs; it is reused. `npm run launch` is the hard reset
  and kills every Chrome window, so only use it when the debug target is wedged.
- Only one puppeteer process may be connected at a time: do not run `npm run quick` while
  `npm run app` / `npm run all` is mid-scrape.
- `npm run test-historical-prices` is the Yahoo price pre-flight check that `npm run app` runs
  before starting; `npm run quick` skips it for speed.
