# Polymarket Integration Guide

SignalBay now supports **real Polymarket prediction markets**! Get live data from one of the world's largest prediction markets.

## 🎉 Polymarket Integration

### Features

- ✅ **Real Markets** - Fetch actual prediction markets from Polymarket
- ✅ **Live Prices** - Real-time Yes/No prices in cents (0-100¢)
- ✅ **Market Data** - Volume, end dates, categories, and more
- ✅ **No Authentication Required** - Read market data is public
- ✅ **Trading Ready** - Ready for order placement (requires wallet/API keys)

## 🚀 Quick Start

### Enable Polymarket

1. Open `src/config/dataConfig.js`
2. Set `DATA_SOURCE = 'polymarket'`:

```javascript
export const DATA_SOURCE = 'polymarket' // 'polymarket' | 'mock'
```

3. That's it! The app will now fetch real markets from Polymarket.

### Data Sources

- **`'polymarket'`** - Real Polymarket prediction markets (SOURCE OF TRUTH)
- **`'mock'`** - Mock/simulated data (fallback only)

## 📊 Polymarket API

### Endpoints Used

1. **Gamma Markets API** - Fetch markets
   - Endpoint: `https://gamma-api.polymarket.com/markets`
   - No authentication required
   - Returns: Market list with prices, volume, end dates

2. **CLOB API** - Order book (if available)
   - Endpoint: `https://clob.polymarket.com/book`
   - May have CORS restrictions in browser
   - Returns: Order book with bids and asks

### API Documentation

- **Gamma Markets API**: https://docs.polymarket.com/developers/gamma-markets-api/get-markets
- **CLOB API**: https://docs.polymarket.com/developers/clob-client
- **Market Data Guide**: https://docs.polymarket.com/developers/gamma-markets-api/fetch-markets-guide

## 🔧 How It Works

### Market Data Flow

1. **Fetch Markets** - Calls Polymarket Gamma API
2. **Transform Data** - Converts Polymarket format to SignalBay format
3. **Display Markets** - Shows real markets in the UI
4. **Update Prices** - Polls API every 30 seconds for price updates

### Price Format

- **Polymarket**: Prices are 0-1 (decimal)
- **SignalBay**: Prices are 0-100¢ (cents)
- **Conversion**: `priceCents = priceDecimal * 100`

### Market Structure

```javascript
{
  id: 'condition-id',
  icon: '📊',
  title: 'Market Question',
  description: 'Market description',
  yesPrice: 45.2, // 0-100¢
  noPrice: 54.8,  // 0-100¢
  volume: 1250000,
  category: 'politics',
  endDate: '2024-11-05T00:00:00Z',
  polymarketData: {
    conditionId: '...',
    yesTokenId: '...',
    noTokenId: '...',
    tickSize: '0.001',
    negRisk: false,
  }
}
```

## 🛠️ Trading (Advanced)

### Placing Orders

To place orders on Polymarket, you'll need:

1. **Wallet** - MetaMask, Coinbase Wallet, or Email login
2. **API Keys** - Generated from Polymarket
3. **CLOB Client** - `@polymarket/clob-client` package

### Installation

```bash
npm install @polymarket/clob-client
npm install ethers
```

### Example Trade

See the Polymarket documentation for examples:
- **TypeScript**: https://docs.polymarket.com/developers/clob-client/typescript-first-trade
- **Python**: https://docs.polymarket.com/developers/clob-client/python-first-trade

### Trading Setup

1. **Get Your Funder Address** - Address shown in your Polymarket profile
2. **Export Private Key** - From Magic Link or Web3 wallet
3. **Create API Key** - Use `createOrDeriveApiKey()`
4. **Set Signature Type**:
   - `1` - Magic/Email Login
   - `2` - Browser Wallet (MetaMask, Coinbase Wallet)
   - `0` - EOA (External Owned Account)

### Order Placement

```javascript
import { ClobClient, OrderType, Side } from "@polymarket/clob-client";
import { Wallet } from "@ethersproject/wallet";

const host = 'https://clob.polymarket.com';
const signer = new Wallet("YOUR_PRIVATE_KEY");
const funder = "YOUR_FUNDER_ADDRESS";

const creds = new ClobClient(host, 137, signer).createOrDeriveApiKey();
const clobClient = new ClobClient(host, 137, signer, await creds, 1, funder);

const order = await clobClient.createAndPostOrder(
  {
    tokenID: "TOKEN_ID", // From market data
    price: 0.01,
    side: Side.BUY,
    size: 5,
    feeRateBps: 0,
  },
  { 
    tickSize: "0.001", // From market data
    negRisk: false     // From market data
  },
  OrderType.GTC
);
```

## 🐛 Troubleshooting

### API Errors

If you see API errors:

1. **Check CORS** - Polymarket API may have CORS restrictions
   - **Solution**: Use a backend proxy or CORS browser extension (dev only)

2. **Check API Endpoint** - Verify the endpoint is correct
   - **Gamma API**: `https://gamma-api.polymarket.com/markets`
   - **CLOB API**: `https://clob.polymarket.com/book`

3. **Check Network** - Verify your internet connection

4. **Fallback** - App automatically falls back to mock data on errors

### CORS Issues

If you see CORS errors in the browser:

1. **Use Backend Proxy** (recommended for production):
   ```javascript
   // Backend proxy endpoint
   const response = await fetch('/api/polymarket/markets')
   ```

2. **Use CORS Proxy** (development only):
   ```javascript
   const proxyUrl = 'https://cors-anywhere.herokuapp.com/'
   const response = await fetch(proxyUrl + apiUrl)
   ```

3. **Browser Extension** - Install a CORS browser extension (dev only)

### Rate Limits

Polymarket API rate limits:

- **Gamma API**: ~100 requests/minute (estimated)
- **CLOB API**: Varies by endpoint
- **Cache**: 1 minute cache reduces API calls
- **Update Interval**: 30 seconds (respects rate limits)

### Empty Markets

If markets are empty:

1. **Check API Response** - Verify the API is returning data
2. **Check Data Transformation** - Verify the transform function
3. **Check Filters** - Verify market filters aren't too restrictive
4. **Fallback** - App shows fallback message if no markets

## 📚 Resources

### Documentation

- **Polymarket Docs**: https://docs.polymarket.com/
- **Gamma Markets API**: https://docs.polymarket.com/developers/gamma-markets-api
- **CLOB Client**: https://docs.polymarket.com/developers/clob-client
- **Market Data Guide**: https://docs.polymarket.com/developers/gamma-markets-api/fetch-markets-guide

### Examples

- **TypeScript Examples**: https://docs.polymarket.com/developers/clob-client/typescript-first-trade
- **Python Examples**: https://docs.polymarket.com/developers/clob-client/python-first-trade

### Community

- **Polymarket Discord**: Join for support and updates
- **GitHub**: Check for API updates and examples

## 🎯 Next Steps

1. **Test Markets** - Verify markets are loading correctly
2. **Add Trading** - Integrate CLOB client for order placement
3. **Add Filters** - Filter markets by category, date, volume
4. **Add Search** - Search markets by question or description
5. **Add Favorites** - Save favorite markets
6. **Add Alerts** - Set price alerts for markets

## 💡 Tips

- **Cache Aggressively** - Reduce API calls with caching
- **Handle Errors** - Always fall back to mock data on errors
- **Respect Rate Limits** - Don't abuse the API
- **Monitor Usage** - Keep track of API calls
- **Use Backend Proxy** - Avoid CORS issues in production

## 🔐 Security

- **No Authentication Required** - Reading market data is public
- **Trading Requires Auth** - Placing orders requires wallet/API keys
- **Private Keys** - Never expose private keys in client code
- **API Keys** - Store API keys securely (use environment variables)
- **HTTPS Only** - Always use HTTPS in production

## 📝 Notes

- **Polymarket API is public** - No authentication needed for reading
- **Trading requires setup** - Wallet and API keys needed for orders
- **CORS may be an issue** - Use backend proxy for production
- **Rate limits apply** - Respect API rate limits
- **Data format may vary** - Handle different response formats

## 🚀 Production Considerations

For production use:

1. **Use Backend Proxy** - Avoid CORS issues
2. **Add Authentication** - If adding trading features
3. **Implement Caching** - Reduce API calls
4. **Add Error Handling** - Handle all edge cases
5. **Monitor Usage** - Track API usage and errors
6. **Add Rate Limiting** - Protect your backend
7. **Use WebSockets** - For real-time updates (when available)

Happy trading! 🎉

