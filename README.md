# Stock Scraper Setup

1. Download Google Drive
2. set STOCK_SCRAPBOOK_LOCATION to Google Drive/stock-scrapbook directory
3. Clone repo
4. Run script: init
5. nvm alias default [version in .nvmrc]
6. npm i -g wait-on

Note: Make sure only one puppeteer instance is running at a time.

# To Run App

1. npm run launch
2. In a separate terminal run: npm run app
3. Type the name of the app you want to run. Simply use the name of the file (minus extension) from the src/apps directory.
   - For testing a single ticket, use the "start" app.
4. Some apps will require manually logging in to the user's brokerage accounts.
