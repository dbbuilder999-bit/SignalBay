# Data Integration Guide

## Current Status: Mock Data

**SignalBay currently uses simulated/mock data** for demonstration purposes. All market data, price updates, and order book information is generated locally.

## Architecture

The app uses a **service layer pattern** (`MarketDataService`) that makes it easy to swap mock data with real API calls. All data fetching is centralized in `src/services/MarketDataService.js`.

## How to Connect Real Data

### 1. Update API Configuration

Set your API endpoints in `MarketDataService.js`:

```javascript
constructor(config = {}) {
  this.apiUrl = config.apiUrl || process.env.REACT_APP_API_URL || 'https://api.your-platform.com'
  this.wsUrl = config.wsUrl || process.env.REACT_APP_WS_URL || 'wss://api.your-platform.com/ws'
}
```

Or set environment variables:

```bash
REACT_APP_API_URL=https://api.your-platform.com
REACT_APP_WS_URL=wss://api.your-platform.com/ws
```

### 2. Replace Mock Data with API Calls

#### Markets List

Update `getMarkets()` method:

```javascript
async getMarkets() {
  const response = await fetch(`${this.apiUrl}/markets`)
  if (!response.ok) throw new Error('Failed to fetch markets')
  return await response.json()
}
```

#### Price History

Update `getPriceHistory()` method:

```javascript
async getPriceHistory(marketId, timeframe = '1D') {
  const response = await fetch(
    `${this.apiUrl}/markets/${marketId}/history?timeframe=${timeframe}`
  )
  if (!response.ok) throw new Error('Failed to fetch price history')
  return await response.json()
}
```

#### Real-time Price Updates

Update `subscribeToPriceUpdates()` method:

```javascript
subscribeToPriceUpdates(marketId, callback) {
  if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
    this.connectWebSocket()
  }
  
  this.ws.send(JSON.stringify({
    type: 'subscribe',
    market: marketId
  }))
  
  this.subscriptions.set(marketId, callback)
}

connectWebSocket() {
  this.ws = new WebSocket(this.wsUrl)
  
  this.ws.onopen = () => {
    console.log('WebSocket connected')
    // Resubscribe to all active subscriptions
    this.subscriptions.forEach((_, marketId) => {
      this.ws.send(JSON.stringify({
        type: 'subscribe',
        market: marketId
      }))
    })
  }
  
  this.ws.onmessage = (event) => {
    const data = JSON.parse(event.data)
    const subscription = this.subscriptions.get(data.marketId)
    if (subscription) {
      subscription.callback(data)
    }
  }
  
  this.ws.onerror = (error) => {
    console.error('WebSocket error:', error)
  }
  
  this.ws.onclose = () => {
    console.log('WebSocket disconnected')
    // Reconnect after 5 seconds
    setTimeout(() => this.connectWebSocket(), 5000)
  }
}
```

#### Order Book

Update `getOrderBook()` method:

```javascript
async getOrderBook(marketId) {
  const response = await fetch(`${this.apiUrl}/markets/${marketId}/orderbook`)
  if (!response.ok) throw new Error('Failed to fetch order book')
  return await response.json()
}
```

### 3. Expected Data Formats

#### Market Object

```typescript
{
  id: string
  icon: string
  title: string
  description: string
  yesPrice: number  // 0-100 (cents)
  noPrice: number   // 0-100 (cents)
  volume: number
  category: string
  endDate: string   // ISO date string
}
```

#### Price History Point

```typescript
{
  time: number      // Unix timestamp (seconds)
  value: number     // Price in cents (0-100)
}
```

#### Price Update

```typescript
{
  marketId: string
  yesPrice: number
  noPrice: number
  timestamp: number // Unix timestamp (milliseconds)
}
```

#### Order Book

```typescript
{
  bids: Array<{
    price: number
    amount: number
    total: number
  }>
  asks: Array<{
    price: number
    amount: number
    total: number
  }>
}
```

## Testing with Mock Data

The service will continue to use mock data until you uncomment the real API calls. This allows you to:

1. Test the UI without a backend
2. Develop features independently
3. Gradually migrate to real data

## Example Integration

Here's a complete example for a prediction market API:

```javascript
// src/services/MarketDataService.js

async getMarkets() {
  try {
    const response = await fetch(`${this.apiUrl}/markets`, {
      headers: {
        'Authorization': `Bearer ${this.getAuthToken()}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    
    // Transform API response to app format
    return data.map(market => ({
      id: market.id,
      icon: market.icon || '📊',
      title: market.title,
      description: market.description,
      yesPrice: market.yesPrice * 100, // Convert to cents
      noPrice: market.noPrice * 100,
      volume: market.volume24h,
      category: market.category,
      endDate: market.endDate
    }))
  } catch (error) {
    console.error('Error fetching markets:', error)
    // Fallback to mock data on error
    return this.getMockMarkets()
  }
}
```

## Next Steps

1. **Set up your API endpoints** - Update the `apiUrl` and `wsUrl` in `MarketDataService.js`
2. **Implement API calls** - Replace mock data functions with real API calls
3. **Handle authentication** - Add auth tokens if your API requires it
4. **Test real-time updates** - Set up WebSocket connection for live price updates
5. **Error handling** - Add proper error handling and fallbacks
6. **Loading states** - The UI already has loading states, ensure they work with real API calls

## Notes

- All price values should be in **cents (0-100)** for prediction markets
- WebSocket subscriptions should be cleaned up when components unmount
- The service handles subscription management automatically
- Error handling should gracefully fall back to cached data when possible

