/**
 * Polymarket Service
 * Fetches real prediction market data from Polymarket API
 * 
 * Polymarket Gamma API Documentation:
 * - Markets API: https://docs.polymarket.com/developers/gamma-markets-api/get-markets
 * - Events API: /events (currently implemented)
 * - Sports API: /sports (not yet implemented)
 * - Tags API: /tags (not yet implemented)
 * - Health API: /health (not yet implemented)
 * 
 * Currently using:
 * - /markets endpoint for fetching markets
 * - /events endpoint for fetching events
 * 
 * TODO: Consider implementing /sports, /tags, and /health endpoints for richer data
 * 
 * - No authentication required for reading market data (public API)
 * - Authentication only needed for trading (placing orders)
 * 
 * To add API keys for trading:
 * 1. Set VITE_POLYMARKET_API_KEY in your .env file
 * 2. Set VITE_POLYMARKET_FUNDER_ADDRESS in your .env file
 * 3. See POLYMARKET_SETUP.md for detailed trading setup
 */

import { POLYMARKET_CONFIG } from '../config/dataConfig'

class PolymarketService {
  constructor() {
    // Polymarket API endpoints (from config)
    // Use proxy in development to avoid CORS issues
    const isDev = import.meta.env.DEV
    this.apiUrl = isDev 
      ? '/api/polymarket'  // Use Vite proxy in development
      : POLYMARKET_CONFIG.gammaApiUrl  // Direct API in production
    this.clobUrl = POLYMARKET_CONFIG.clobApiUrl
    // API key (optional - only for trading)
    this.apiKey = POLYMARKET_CONFIG.apiKey
    this.funderAddress = POLYMARKET_CONFIG.funderAddress
    // Cache for market data
    this.cache = new Map()
    this.cacheTimeout = 60000 // 1 minute cache
    this.subscriptions = new Map()
  }

  /**
   * Fetch markets from Polymarket
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of market objects
   */
  async getMarkets(options = {}) {
    try {
      debugger // Moved to top so it's always hit when getMarkets is called
      
      // CACHE DISABLED - Always fetch fresh data
      // Check cache - if we have a cached result with same or larger limit, use it
      // const requestedLimit = options.limit || 20
      // let cached = null
      // let cacheKey = null
      
      // Try to find a cached result that satisfies our request
      // Look for any cache entry with same active/closed settings and sufficient limit
      // const activeFilter = options.active !== false
      // const closedFilter = options.closed !== undefined ? options.closed : false
      
      // for (const [key, value] of this.cache.entries()) {
      //   if (key.startsWith('markets-')) {
      //     try {
      //       const cachedOptions = JSON.parse(key.replace('markets-', ''))
      //       const cachedLimit = cachedOptions.limit || 20
      //       const cachedActive = cachedOptions.active !== false
      //       const cachedClosed = cachedOptions.closed !== undefined ? cachedOptions.closed : false
      //       
      //       // If cached limit is >= requested limit and other options match, use it
      //       if (cachedLimit >= requestedLimit && 
      //           cachedActive === activeFilter &&
      //           cachedClosed === closedFilter &&
      //           Date.now() - value.timestamp < this.cacheTimeout) {
      //         console.log(`[Cache HIT] Using cached data: ${key} (requested limit: ${requestedLimit})`)
      //         // Return a slice if we need fewer items
      //         if (cachedLimit > requestedLimit) {
      //           return value.data.slice(0, requestedLimit)
      //         }
      //         return value.data
      //       }
      //     } catch (e) {
      //       // Skip invalid cache keys
      //       continue
      //     }
      //   }
      // }
      
      console.log(`[Cache DISABLED] Fetching fresh data for limit: ${options.limit || 20}, active: ${options.active !== false}, closed: ${options.closed || false}`)
      
      // If no suitable cache found, create new cache key
      const cacheKey = `markets-${JSON.stringify(options)}`

      // Polymarket Gamma Markets API endpoint
      // Documentation: https://docs.polymarket.com/developers/gamma-markets-api/get-markets
      const params = new URLSearchParams({
        limit: String(options.limit || 20),
        offset: String(options.offset || 0),
        active: options.active !== false ? 'true' : 'false',
        closed: options.closed !== undefined ? String(options.closed) : 'false', // Exclude closed markets by default
        ...(options.category && { category: options.category }),
        ...(options.tokens && { tokens: options.tokens }),
      })
      // Try the Gamma Markets API endpoint (uses proxy in dev, direct in prod)
      debugger
      const response = await fetch(
        `${this.apiUrl}/markets?${params.toString()}`,
        {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`Polymarket API error: ${response.status}`, errorText)
        // Throw error instead of returning fallback - we want REAL data only
        throw new Error(`Polymarket API error: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      console.log('Polymarket API response:', data)
      
      // Handle different response formats
      const marketsData = Array.isArray(data) ? data : (data.data || data.markets || [])
      console.log('Markets data extracted:', marketsData.length, 'items')
      
      if (!marketsData || marketsData.length === 0) {
        console.warn('No markets data found in response')
        // Return empty array instead of fallback - we want REAL data only
        return []
      }
      
      const markets = this.transformMarkets(marketsData)
      console.log('Transformed markets:', markets.length, 'items')

      // CACHE DISABLED - Don't cache results
      // Cache the result
      // this.cache.set(cacheKey, {
      //   data: markets,
      //   timestamp: Date.now(),
      // })

      return markets.length > 0 ? markets : []
    } catch (error) {
      console.error('Error fetching Polymarket markets:', error)
      // Throw error instead of returning fallback - we want REAL data only
      throw error
    }
  }

  /**
   * Transform Polymarket market data to SignalBay format
   */
  transformMarkets(polymarketData) {
    if (!Array.isArray(polymarketData)) {
      console.warn('transformMarkets: data is not an array', polymarketData)
      return []
    }

    console.log('transformMarkets: processing', polymarketData.length, 'markets')
    
    return polymarketData
      .filter(market => {
        // More lenient filter - accept any market with an id or question/title
        const isValid = market && (market.id || market.question || market.title || market.slug)
        if (!isValid) {
          console.warn('Filtered out invalid market:', market)
          return false
        }
        // Filter out closed markets unless they have valid prices
        if (market.closed === true) {
          // Check if market has any meaningful price data
          const hasPrices = market.outcomePrices && 
            (typeof market.outcomePrices === 'string' ? 
              JSON.parse(market.outcomePrices).some(p => parseFloat(p) > 0) :
              market.outcomePrices.some(p => parseFloat(p) > 0))
          if (!hasPrices) {
            console.log('Filtered out closed market with no prices:', market.id)
            return false
          }
        }
        return true
      })
      .map((market) => {
        console.log('Transforming market:', market.id || market.slug || 'unknown')
        
        // Parse outcomes and prices - they come as JSON strings
        let outcomes = []
        let outcomePrices = []
        
        try {
          if (typeof market.outcomes === 'string') {
            outcomes = JSON.parse(market.outcomes)
          } else if (Array.isArray(market.outcomes)) {
            outcomes = market.outcomes
          } else if (market.tokens) {
            outcomes = Array.isArray(market.tokens) ? market.tokens : []
          }
          
          if (typeof market.outcomePrices === 'string') {
            outcomePrices = JSON.parse(market.outcomePrices)
          } else if (Array.isArray(market.outcomePrices)) {
            outcomePrices = market.outcomePrices
          }
        } catch (e) {
          console.warn('Error parsing outcomes/prices:', e)
        }
        
        // Find Yes/No indices
        const yesIndex = outcomes.findIndex(o => 
          (typeof o === 'string' && (o === 'Yes' || o === 'YES' || o.toLowerCase().includes('yes'))) ||
          (o && (o.outcome === 'Yes' || o.outcome === 'YES' || o.side === 'YES'))
        )
        const noIndex = outcomes.findIndex(o => 
          (typeof o === 'string' && (o === 'No' || o === 'NO' || o.toLowerCase().includes('no'))) ||
          (o && (o.outcome === 'No' || o.outcome === 'NO' || o.side === 'NO'))
        )
        
        // Get prices from outcomePrices array or from token objects
        let yesPrice = 50
        let noPrice = 50
        
        if (outcomePrices.length > 0 && yesIndex >= 0 && noIndex >= 0) {
          // Prices from outcomePrices array
          yesPrice = parseFloat(outcomePrices[yesIndex] || 0) * 100
          noPrice = parseFloat(outcomePrices[noIndex] || 0) * 100
        } else if (market.bestAsk !== undefined && market.bestBid !== undefined) {
          // Use bestAsk/bestBid if available
          yesPrice = parseFloat(market.bestAsk || 0) * 100
          noPrice = parseFloat(market.bestBid || 0) * 100
        } else {
          // Try direct price fields
          const directYesPrice = market.yesPrice || market.priceYes || market.price_yes
          const directNoPrice = market.noPrice || market.priceNo || market.price_no
          
          if (directYesPrice !== undefined || directNoPrice !== undefined) {
            yesPrice = parseFloat(directYesPrice || (1 - (directNoPrice || 0.5))) * 100
            noPrice = parseFloat(directNoPrice || (1 - (directYesPrice || 0.5))) * 100
          }
        }
        
        // Ensure prices are valid
        if (yesPrice <= 0 && noPrice > 0) yesPrice = 100 - noPrice
        if (noPrice <= 0 && yesPrice > 0) noPrice = 100 - yesPrice
        if (yesPrice <= 0 && noPrice <= 0) {
          yesPrice = 50
          noPrice = 50
        }

        // Calculate volume (handle different formats)
        const volume = market.volumeNum || 
          (market.volume ? (typeof market.volume === 'string' ? parseFloat(market.volume) : market.volume) : 0) ||
          (market.volume24hr || market.volume24h || market.volume_24h || market.tradingVolume || 0)
        
        const volume24h = market.volume24hr || market.volume24h || market.volume_24h || 0
        const liquidity = market.liquidityNum || 
          (market.liquidity ? (typeof market.liquidity === 'string' ? parseFloat(market.liquidity) : market.liquidity) : 0)

        // Get dates
        const endDate = market.endDateIso || 
                       market.endDate_iso || 
                       market.endDate || 
                       market.end_date ||
                       market.resolutionDate ||
                       market.resolution_date ||
                       (market.events && market.events[0]?.endDate) ||
                       new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        
        const startDate = market.startDate ||
                         market.creationDate ||
                         (market.events && market.events[0]?.startDate) ||
                         (market.events && market.events[0]?.creationDate) ||
                         market.createdAt

        // Get category/icon
        const category = market.category || 
                        market.tags?.[0] || 
                        market.groupItemTitle ||
                        'general'
        const icon = this.getIconForCategory(category)
        
        // Get image URL (Polymarket may provide imageUrl, image, thumbnail, etc.)
        const imageUrl = market.imageUrl || 
                        market.image || 
                        market.thumbnail || 
                        market.image_url ||
                        market.thumbnailUrl ||
                        market.thumbnail_url ||
                        (market.events && market.events[0]?.imageUrl) ||
                        null

        // Get title
        const title = market.question || 
                     market.title || 
                     market.marketMaker ||
                     'Market'

        // Get description
        const description = market.description || 
                           market.details ||
                           market.category ||
                           ''

        // Get condition ID or market ID
        const conditionId = market.conditionId || 
                           market.condition_id ||
                           market.id ||
                           market.slug ||
                           `polymarket-${Date.now()}-${Math.random()}`
        
        // Parse token IDs from clobTokenIds if available
        let yesTokenId = null
        let noTokenId = null
        try {
          if (market.clobTokenIds) {
            const tokenIds = typeof market.clobTokenIds === 'string' 
              ? JSON.parse(market.clobTokenIds) 
              : market.clobTokenIds
            if (Array.isArray(tokenIds) && tokenIds.length >= 2) {
              // First token is typically Yes, second is No (but may vary)
              yesTokenId = tokenIds[0]
              noTokenId = tokenIds[1]
            }
          }
        } catch (e) {
          console.warn('Error parsing token IDs:', e)
        }

        return {
          id: conditionId,
          icon: icon,
          imageUrl: imageUrl,
          title: title,
          description: description,
          yesPrice: Math.max(0.1, Math.min(99.9, yesPrice)),
          noPrice: Math.max(0.1, Math.min(99.9, noPrice)),
          volume: volume,
          volume24h: volume24h,
          liquidity: liquidity,
          category: category,
          startDate: startDate,
          endDate: endDate,
          // Polymarket-specific data
          polymarketData: {
            conditionId: conditionId,
            slug: market.slug || market.id,
            resolutionSource: market.resolutionSource || market.resolution_source,
            marketMakerAddress: market.marketMakerAddress || market.market_maker_address,
            yesTokenId: yesTokenId,
            noTokenId: noTokenId,
            tickSize: market.tickSize || market.tick_size || '0.001',
            negRisk: market.negRisk || market.neg_risk || market.enableNegRisk || false,
          },
        }
      })
      .filter(market => market.id && market.title) // Filter out invalid transformations
  }

  /**
   * Get icon for category
   */
  getIconForCategory(category) {
    const categoryIcons = {
      politics: '🗳️',
      sports: '🏀',
      crypto: '₿',
      stocks: '📈',
      entertainment: '🎬',
      technology: '💻',
      economics: '💵',
      weather: '🌤️',
      general: '📊',
    }
    return categoryIcons[category?.toLowerCase()] || '📊'
  }

  /**
   * Get market by ID
   */
  async getMarket(marketId) {
    try {
      // Try to get from cache first
      const markets = await this.getMarkets({ limit: 100 })
      let market = markets.find(m => 
        m.id === marketId || 
        m.polymarketData?.conditionId === marketId ||
        m.polymarketData?.slug === marketId
      )

      if (!market) {
        // Try fetching specific market by condition ID or tokens
        try {
          const response = await fetch(
            `https://gamma-api.polymarket.com/markets?tokens=${marketId}&limit=1`,
            {
              headers: {
                'Accept': 'application/json',
              },
            }
          )
          if (response.ok) {
            const data = await response.json()
            const marketsData = Array.isArray(data) ? data : (data.data || data.markets || [])
            const transformed = this.transformMarkets(marketsData)
            market = transformed[0]
          }
        } catch (error) {
          console.warn('Could not fetch specific market:', error.message)
        }
      }

      return market || null
    } catch (error) {
      console.error('Error fetching market:', error)
      return null
    }
  }

  /**
   * Get price history for a market
   */
  async getPriceHistory(marketId, timeframe = '1D') {
    try {
      const market = await this.getMarket(marketId)
      if (!market || !market.polymarketData?.yesTokenId) {
        return this.generateMockHistory(market?.yesPrice || 50, timeframe)
      }

      // Polymarket doesn't have a direct price history endpoint
      // We'll generate mock history based on current price
      // In a real implementation, you'd use WebSocket or polling
      return this.generateMockHistory(market.yesPrice, timeframe)
    } catch (error) {
      console.error('Error fetching price history:', error)
      return this.generateMockHistory(50, timeframe)
    }
  }

  /**
   * Generate mock history (Polymarket doesn't provide public price history API)
   */
  generateMockHistory(basePrice, timeframe) {
    const data = []
    const now = Math.floor(Date.now() / 1000)
    const hoursBack = this.getHoursForTimeframe(timeframe)
    let currentPrice = basePrice

    for (let i = hoursBack; i >= 0; i--) {
      const time = now - (i * 3600)
      const variation = (Math.random() - 0.5) * 3
      currentPrice = Math.max(0, Math.min(100, currentPrice + variation))

      data.push({
        time: time,
        value: currentPrice,
      })
    }

    return data
  }

  /**
   * Get hours for timeframe
   */
  getHoursForTimeframe(timeframe) {
    const timeframeMap = {
      '1H': 1,
      '4H': 4,
      '1D': 24,
      '1W': 168,
      '1M': 720,
      'All': 8760,
    }
    return timeframeMap[timeframe] || 24
  }

  /**
   * Subscribe to real-time price updates
   * Note: Polymarket doesn't have public WebSocket, so we poll the API
   */
  subscribeToPriceUpdates(marketId, callback) {
    if (!this.subscriptions) {
      this.subscriptions = new Map()
    }

    const updatePrice = async () => {
      try {
        const market = await this.getMarket(marketId)
        if (market) {
          callback({
            marketId,
            yesPrice: market.yesPrice,
            noPrice: market.noPrice,
            timestamp: Date.now(),
          })
        }
      } catch (error) {
        console.error('Error updating price:', error)
      }
    }

    // Update immediately
    updatePrice()

    // Then update every 30 seconds (respects API rate limits)
    const interval = setInterval(updatePrice, 30000)

    this.subscriptions.set(marketId, { callback, interval })
  }

  /**
   * Unsubscribe from price updates
   */
  unsubscribeFromPriceUpdates(marketId) {
    if (this.subscriptions) {
      const subscription = this.subscriptions.get(marketId)
      if (subscription && subscription.interval) {
        clearInterval(subscription.interval)
        this.subscriptions.delete(marketId)
      }
    }
  }

  /**
   * Get order book for a market
   */
  async getOrderBook(marketId) {
    try {
      const market = await this.getMarket(marketId)
      if (!market) {
        return this.generateMockOrderBook(marketId)
      }

      // Try to get real order book from Polymarket CLOB API
      // Note: This may have CORS restrictions in browser
      if (market.polymarketData?.yesTokenId) {
        try {
          const tokenId = market.polymarketData.yesTokenId
          const response = await fetch(
            `https://clob.polymarket.com/book?token_id=${tokenId}`,
            {
              headers: {
                'Accept': 'application/json',
              },
            }
          )

          if (response.ok) {
            const data = await response.json()
            
            // Transform order book data
            const bids = (data.bids || []).map(order => ({
              price: parseFloat(order.price || order[0] || 0) * 100, // Convert to cents
              amount: parseFloat(order.size || order[1] || 0),
              total: 0, // Will be calculated
            }))
            
            const asks = (data.asks || []).map(order => ({
              price: parseFloat(order.price || order[0] || 0) * 100,
              amount: parseFloat(order.size || order[1] || 0),
              total: 0,
            }))
            
            // Calculate cumulative totals
            let runningTotal = 0
            bids.forEach(order => {
              runningTotal += order.amount
              order.total = runningTotal
            })
            
            runningTotal = 0
            asks.forEach(order => {
              runningTotal += order.amount
              order.total = runningTotal
            })
            
            return { bids, asks }
          }
        } catch (error) {
          console.warn('Could not fetch real order book, using mock:', error.message)
        }
      }
      
      // Fallback to mock order book
      return this.generateMockOrderBook(marketId)
    } catch (error) {
      console.error('Error fetching order book:', error)
      return this.generateMockOrderBook(marketId)
    }
  }

  /**
   * Generate mock order book if API fails
   */
  async generateMockOrderBook(marketId) {
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
  }

  /**
   * Get popular/trending markets
   */
  async getTrendingMarkets() {
    return this.getMarkets({
      limit: 20,
      active: true,
    })
  }

  /**
   * Search markets
   */
  async searchMarkets(query) {
    try {
      const response = await fetch(
        `${this.apiUrl}/markets?limit=50&active=true`
      )

      if (!response.ok) {
        throw new Error(`Search API error: ${response.status}`)
      }

      const data = await response.json()
      const markets = this.transformMarkets(data)

      // Filter by query
      const queryLower = query.toLowerCase()
      return markets.filter(market =>
        market.title.toLowerCase().includes(queryLower) ||
        market.description.toLowerCase().includes(queryLower)
      )
    } catch (error) {
      console.error('Error searching markets:', error)
      return []
    }
  }

  /**
   * Fetch events from Polymarket
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of event objects
   */
  async getEvents(options = {}) {
    try {
      // CACHE DISABLED - Always fetch fresh data
      // const cacheKey = `events-${JSON.stringify(options)}`
      // const cached = this.cache.get(cacheKey)
      // 
      // if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      //   return cached.data
      // }

      // Polymarket Events API endpoint
      const params = new URLSearchParams({
        order: options.order || 'id',
        ascending: String(options.ascending !== undefined ? options.ascending : false),
        closed: String(options.closed !== undefined ? options.closed : false),
        limit: String(options.limit || 100),
        ...(options.offset && { offset: String(options.offset) }),
      })

      const response = await fetch(
        `${this.apiUrl}/events?${params.toString()}`,
        {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.ok) {
        throw new Error(`Polymarket API error: ${response.status}`)
      }

      const data = await response.json()
      
      // Handle different response formats
      const eventsData = Array.isArray(data) ? data : (data.data || data.events || [])

      // CACHE DISABLED - Don't cache results
      // Cache the result
      // this.cache.set(cacheKey, {
      //   data: eventsData,
      //   timestamp: Date.now(),
      // })

      return eventsData
    } catch (error) {
      console.error('Error fetching Polymarket events:', error)
      throw error
    }
  }

  /**
   * Fallback markets if API fails
   */
  getFallbackMarkets() {
    return [
      {
        id: 'fallback-polymarket',
        icon: '📊',
        title: 'Polymarket API Unavailable',
        description: 'Unable to fetch real markets. Check your connection or try again later.',
        yesPrice: 50,
        noPrice: 50,
        volume: 0,
        category: 'general',
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        polymarketData: {
          conditionId: 'fallback',
          slug: 'fallback',
          tickSize: '0.001',
          negRisk: false,
        },
      },
    ]
  }
}

// Export singleton instance
export const polymarketService = new PolymarketService()

export default PolymarketService

