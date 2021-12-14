mv "$STOCK_SCRAPBOOK_LOCATION/stockData.json" "$STOCK_SCRAPBOOK_LOCATION/stockDataBackup_$(date '+%Y-%m-%d').json" &&
echo {} > "$STOCK_SCRAPBOOK_LOCATION/stockData.json"