/**
 * Market Data Service
 * This service handles fetching live market data from APIs
 * Currently using mock data, but can be easily swapped with real API calls
 */

class MarketDataService {
  constructor(config = {}) {
    // Use config values or default values
    // Environment variables can be passed via config if needed
    this.apiUrl = config.apiUrl || 'https://api.signalbay.com'
    this.wsUrl = config.wsUrl || 'wss://api.signalbay.com/ws'
    this.ws = null
    this.subscriptions = new Map()
  }

  /**
   * Fetch all available markets
   * @returns {Promise<Array>} Array of market objects
   */
  async getMarkets() {
    try {
      // TODO: Replace with real API call
      // const response = await fetch(`${this.apiUrl}/markets`)
      // return await response.json()
      
      // Mock data for now
      return [
        {
          id: 'bulls-pistons',
          icon: '🏀',
          title: 'Bulls vs. Pistons',
          description: 'Spread: Pistons (-2.5)',
          yesPrice: 0.1,
          noPrice: 100.0,
          volume: 53300,
          category: 'sports',
          endDate: new Date('2025-11-12').toISOString(),
        },
        {
          id: 'bulls-pistons-ou',
          icon: '🏀',
          title: 'Bulls vs. Pistons: O/U 233.5',
          description: 'Over/Under',
          yesPrice: 100.0,
          noPrice: 0.0,
          volume: 4800,
          category: 'sports',
          endDate: new Date('2025-11-12').toISOString(),
        },
        {
          id: 'election-2024',
          icon: '🗳️',
          title: '2024 Election Outcome',
          description: 'Presidential Election',
          yesPrice: 45.2,
          noPrice: 54.8,
          volume: 1250000,
          category: 'politics',
          endDate: new Date('2024-11-05').toISOString(),
        },
        {
          id: 'bitcoin-50k',
          icon: '₿',
          title: 'Bitcoin hits $50K by Dec 2024',
          description: 'Price Prediction',
          yesPrice: 32.5,
          noPrice: 67.5,
          volume: 890000,
          category: 'crypto',
          endDate: new Date('2024-12-31').toISOString(),
        }
      ]
    } catch (error) {
      console.error('Error fetching markets:', error)
      throw error
    }
  }

  /**
   * Fetch market details by ID
   * @param {string} marketId - Market identifier
   * @returns {Promise<Object>} Market object
   */
  async getMarket(marketId) {
    try {
      // TODO: Replace with real API call
      // const response = await fetch(`${this.apiUrl}/markets/${marketId}`)
      // return await response.json()
      
      const markets = await this.getMarkets()
      return markets.find(m => m.id === marketId) || null
    } catch (error) {
      console.error('Error fetching market:', error)
      throw error
    }
  }

  /**
   * Fetch price history for a market
   * @param {string} marketId - Market identifier
   * @param {string} timeframe - Timeframe (1H, 4H, 1D, 1W, 1M, All)
   * @returns {Promise<Array>} Array of price points
   */
  async getPriceHistory(marketId, timeframe = '1D') {
    try {
      // TODO: Replace with real API call
      // const response = await fetch(`${this.apiUrl}/markets/${marketId}/history?timeframe=${timeframe}`)
      // return await response.json()
      
      // Mock data - generate price history
      const market = await this.getMarket(marketId)
      if (!market) return []
      
      const data = []
      const now = Math.floor(Date.now() / 1000)
      const hoursBack = this.getHoursForTimeframe(timeframe)
      let currentPrice = market.yesPrice
      
      for (let i = hoursBack; i >= 0; i--) {
        const time = now - (i * 3600)
        const variation = (Math.random() - 0.5) * 5
        currentPrice = Math.max(0, Math.min(100, currentPrice + variation))
        
        data.push({
          time: time,
          value: currentPrice,
        })
      }
      
      return data
    } catch (error) {
      console.error('Error fetching price history:', error)
      throw error
    }
  }

  /**
   * Get hours for timeframe
   * @param {string} timeframe - Timeframe string
   * @returns {number} Number of hours
   */
  getHoursForTimeframe(timeframe) {
    const timeframeMap = {
      '1H': 1,
      '4H': 4,
      '1D': 24,
      '1W': 168,
      '1M': 720,
      'All': 8760, // 1 year
    }
    return timeframeMap[timeframe] || 24
  }

  /**
   * Subscribe to real-time price updates for a market
   * @param {string} marketId - Market identifier
   * @param {Function} callback - Callback function to receive updates
   */
  subscribeToPriceUpdates(marketId, callback) {
    try {
      // TODO: Replace with real WebSocket connection
      // if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      //   this.connectWebSocket()
      // }
      // 
      // this.ws.send(JSON.stringify({
      //   type: 'subscribe',
      //   market: marketId
      // }))
      // 
      // this.subscriptions.set(marketId, callback)
      
      // Mock real-time updates
      const interval = setInterval(() => {
        const variation = (Math.random() - 0.5) * 2
        callback({
          marketId,
          yesPrice: Math.max(0, Math.min(100, (Math.random() * 100))),
          noPrice: Math.max(0, Math.min(100, (Math.random() * 100))),
          timestamp: Date.now(),
        })
      }, 3000) // Update every 3 seconds
      
      // Store interval for cleanup
      this.subscriptions.set(marketId, { callback, interval })
    } catch (error) {
      console.error('Error subscribing to price updates:', error)
      throw error
    }
  }

  /**
   * Unsubscribe from price updates
   * @param {string} marketId - Market identifier
   */
  unsubscribeFromPriceUpdates(marketId) {
    const subscription = this.subscriptions.get(marketId)
    if (subscription && subscription.interval) {
      clearInterval(subscription.interval)
      this.subscriptions.delete(marketId)
    }
  }

  /**
   * Connect to WebSocket for real-time updates
   */
  connectWebSocket() {
    // TODO: Implement WebSocket connection
    // this.ws = new WebSocket(this.wsUrl)
    // 
    // this.ws.onopen = () => {
    //   console.log('WebSocket connected')
    // }
    // 
    // this.ws.onmessage = (event) => {
    //   const data = JSON.parse(event.data)
    //   const subscription = this.subscriptions.get(data.marketId)
    //   if (subscription) {
    //     subscription.callback(data)
    //   }
    // }
    // 
    // this.ws.onerror = (error) => {
    //   console.error('WebSocket error:', error)
    // }
    // 
    // this.ws.onclose = () => {
    //   console.log('WebSocket disconnected')
    //   // Reconnect after 5 seconds
    //   setTimeout(() => this.connectWebSocket(), 5000)
    // }
  }

  /**
   * Get order book for a market
   * @param {string} marketId - Market identifier
   * @returns {Promise<Object>} Order book with bids and asks
   */
  async getOrderBook(marketId) {
    try {
      // TODO: Replace with real API call
      // const response = await fetch(`${this.apiUrl}/markets/${marketId}/orderbook`)
      // return await response.json()
      
      // Mock order book data
      const market = await this.getMarket(marketId)
      if (!market) return { bids: [], asks: [] }
      
      const generateOrders = (side, basePrice, count = 15) => {
        const orders = []
        for (let i = 0; i < count; i++) {
          const offset = side === 'bid' 
            ? (count - i) * 0.1
            : (i + 1) * 0.1
          const orderPrice = side === 'bid' 
            ? Math.max(0, basePrice - offset)
            : Math.min(100, basePrice + offset)
          orders.push({
            price: orderPrice,
            amount: Math.random() * 10 + 0.1,
            total: 0
          })
        }
        // Calculate cumulative totals
        let runningTotal = 0
        orders.forEach(order => {
          runningTotal += order.amount
          order.total = runningTotal
        })
        return orders
      }
      
      return {
        bids: generateOrders('bid', market.yesPrice, 15),
        asks: generateOrders('ask', market.yesPrice, 15),
      }
    } catch (error) {
      console.error('Error fetching order book:', error)
      throw error
    }
  }

  /**
   * Get recent trades for a market
   * @param {string} marketId - Market identifier
   * @returns {Promise<Array>} Array of recent trades
   */
  async getRecentTrades(marketId) {
    try {
      // TODO: Replace with real API call
      // const response = await fetch(`${this.apiUrl}/markets/${marketId}/trades`)
      // return await response.json()
      
      // Mock trade data
      const market = await this.getMarket(marketId)
      if (!market) return []
      
      const trades = []
      for (let i = 0; i < 20; i++) {
        trades.push({
          price: market.yesPrice + (Math.random() - 0.5) * 10,
          amount: Math.random() * 5,
          time: new Date(Date.now() - i * 60000).toISOString(),
          side: Math.random() > 0.5 ? 'buy' : 'sell'
        })
      }
      return trades
    } catch (error) {
      console.error('Error fetching recent trades:', error)
      throw error
    }
  }
}

// Export singleton instance
export const marketDataService = new MarketDataService()

export default MarketDataService

