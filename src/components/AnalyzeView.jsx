import React, { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, BarChart3, Activity, ArrowRight, Sparkles } from 'lucide-react'
import { polymarketService } from '../services/PolymarketService'

const dataService = polymarketService

// Component to handle market images with fallback to icon
function MarketImage({ market, alt, fallbackIcon }) {
  const [imageError, setImageError] = useState(false)
  
  // Check multiple possible field names for image URL
  const imageUrl = market?.imageUrl || 
                   market?.image || 
                   market?.thumbnail || 
                   market?.image_url ||
                   market?.thumbnailUrl ||
                   market?.thumbnail_url ||
                   null
  
  // Only use if it's a valid URL
  const hasValidImage = imageUrl && 
                       typeof imageUrl === 'string' && 
                       (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'))
  
  if (hasValidImage && !imageError) {
    return (
      <img
        src={imageUrl}
        alt={alt || 'Market'}
        className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
        onError={() => setImageError(true)}
      />
    )
  }
  
  return <span className="text-2xl flex-shrink-0">{fallbackIcon || market?.icon || '📊'}</span>
}

export default function AnalyzeView({ onSelectMarket }) {
  const [markets, setMarkets] = useState([])
  const [loading, setLoading] = useState(true)
  const [analyzedMarkets, setAnalyzedMarkets] = useState([])

  // Fetch popular markets (sorted by volume)
  useEffect(() => {
    const fetchPopularMarkets = async () => {
      try {
        setLoading(true)
        const marketData = await dataService.getMarkets({ 
          limit: 50, 
          active: true, 
          closed: false 
        })
        
        // Sort by 24hr volume, then total volume
        const sortedMarkets = marketData.sort((a, b) => {
          const volA = (a.volume24h || 0) + (a.volume || 0)
          const volB = (b.volume24h || 0) + (b.volume || 0)
          return volB - volA
        }).slice(0, 20) // Top 20 most popular
        
        setMarkets(sortedMarkets)
        
        // Analyze each market
        const analyzed = await Promise.all(
          sortedMarkets.map(market => analyzeMarket(market))
        )
        setAnalyzedMarkets(analyzed)
      } catch (error) {
        console.error('Error fetching markets:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPopularMarkets()
  }, [])

  // Analyze a single market to predict outcome
  const analyzeMarket = async (market) => {
    const analysis = {
      market,
      prediction: null,
      confidence: 0,
      sources: []
    }

    try {
      // Source 1: Price Trend Analysis
      const priceTrend = analyzePriceTrend(market)
      if (priceTrend) {
        analysis.sources.push({
          name: 'Price Trend',
          icon: priceTrend.direction === 'up' ? TrendingUp : TrendingDown,
          weight: 0.3,
          signal: priceTrend.signal,
          details: priceTrend.details
        })
      }

      // Source 2: Volume Analysis
      const volumeAnalysis = analyzeVolume(market)
      if (volumeAnalysis) {
        analysis.sources.push({
          name: 'Volume Activity',
          icon: Activity,
          weight: 0.25,
          signal: volumeAnalysis.signal,
          details: volumeAnalysis.details
        })
      }

      // Source 3: Price Momentum
      const momentum = analyzeMomentum(market)
      if (momentum) {
        analysis.sources.push({
          name: 'Momentum',
          icon: BarChart3,
          weight: 0.25,
          signal: momentum.signal,
          details: momentum.details
        })
      }

      // Source 4: Market Depth (if available)
      const depthAnalysis = await analyzeMarketDepth(market)
      if (depthAnalysis) {
        analysis.sources.push({
          name: 'Market Depth',
          icon: Sparkles,
          weight: 0.2,
          signal: depthAnalysis.signal,
          details: depthAnalysis.details
        })
      }

      // Aggregate predictions
      const aggregated = aggregatePredictions(analysis.sources)
      analysis.prediction = aggregated.prediction
      analysis.confidence = aggregated.confidence

    } catch (error) {
      console.error('Error analyzing market:', error)
    }

    return analysis
  }

  // Analyze price trend
  const analyzePriceTrend = (market) => {
    const yesPrice = market.yesPrice || 50
    const noPrice = market.noPrice || 50
    
    // Strong signals
    if (yesPrice >= 70) {
      return {
        direction: 'up',
        signal: 'Strong Yes',
        details: `Yes price at ${yesPrice.toFixed(1)}¢ indicates strong market confidence`
      }
    }
    if (noPrice >= 70) {
      return {
        direction: 'down',
        signal: 'Strong No',
        details: `No price at ${noPrice.toFixed(1)}¢ indicates strong market confidence`
      }
    }
    
    // Moderate signals
    if (yesPrice >= 60) {
      return {
        direction: 'up',
        signal: 'Moderate Yes',
        details: `Yes price at ${yesPrice.toFixed(1)}¢ shows moderate confidence`
      }
    }
    if (noPrice >= 60) {
      return {
        direction: 'down',
        signal: 'Moderate No',
        details: `No price at ${noPrice.toFixed(1)}¢ shows moderate confidence`
      }
    }

    // Neutral
    return {
      direction: 'neutral',
      signal: 'Neutral',
      details: `Prices balanced at Yes: ${yesPrice.toFixed(1)}¢, No: ${noPrice.toFixed(1)}¢`
    }
  }

  // Analyze volume
  const analyzeVolume = (market) => {
    const volume24h = market.volume24h || 0
    const totalVolume = market.volume || 0
    
    if (volume24h > 100000 || totalVolume > 1000000) {
      return {
        signal: 'High Activity',
        details: `High trading volume (24h: $${(volume24h / 1000).toFixed(1)}K) indicates strong interest`
      }
    }
    if (volume24h > 10000 || totalVolume > 100000) {
      return {
        signal: 'Moderate Activity',
        details: `Moderate trading volume (24h: $${(volume24h / 1000).toFixed(1)}K)`
      }
    }
    
    return {
      signal: 'Low Activity',
      details: `Lower trading volume suggests less market consensus`
    }
  }

  // Analyze momentum (price movement direction)
  const analyzeMomentum = (market) => {
    const yesPrice = market.yesPrice || 50
    const noPrice = market.noPrice || 50
    
    // Calculate momentum based on price position
    const momentum = yesPrice - noPrice
    
    if (momentum > 20) {
      return {
        signal: 'Strong Yes Momentum',
        details: `Yes leading by ${momentum.toFixed(1)}¢ suggests upward trend`
      }
    }
    if (momentum < -20) {
      return {
        signal: 'Strong No Momentum',
        details: `No leading by ${Math.abs(momentum).toFixed(1)}¢ suggests downward trend`
      }
    }
    
    return {
      signal: 'Balanced',
      details: `Prices are relatively balanced, no clear momentum`
    }
  }

  // Analyze market depth (order book analysis)
  const analyzeMarketDepth = async (market) => {
    try {
      const orderBook = await dataService.getOrderBook(market.id)
      if (!orderBook || !orderBook.bids || !orderBook.asks) {
        return null
      }

      const totalBids = orderBook.bids.reduce((sum, bid) => sum + (bid.size || 0), 0)
      const totalAsks = orderBook.asks.reduce((sum, ask) => sum + (ask.size || 0), 0)
      
      if (totalBids > totalAsks * 1.5) {
        return {
          signal: 'Buy Pressure',
          details: `Strong buy-side depth (${totalBids.toFixed(0)} vs ${totalAsks.toFixed(0)}) indicates Yes support`
        }
      }
      if (totalAsks > totalBids * 1.5) {
        return {
          signal: 'Sell Pressure',
          details: `Strong sell-side depth (${totalAsks.toFixed(0)} vs ${totalBids.toFixed(0)}) indicates No support`
        }
      }
      
      return {
        signal: 'Balanced Depth',
        details: `Order book shows balanced liquidity on both sides`
      }
    } catch (error) {
      return null
    }
  }

  // Aggregate predictions from all sources
  const aggregatePredictions = (sources) => {
    let yesScore = 0
    let noScore = 0
    let totalWeight = 0

    sources.forEach(source => {
      const weight = source.weight || 0.25
      totalWeight += weight

      if (source.signal.includes('Yes') || source.signal === 'Buy Pressure') {
        yesScore += weight
      } else if (source.signal.includes('No') || source.signal === 'Sell Pressure') {
        noScore += weight
      }
    })

    // Normalize scores
    if (totalWeight > 0) {
      yesScore = yesScore / totalWeight
      noScore = noScore / totalWeight
    }

    let prediction = 'Neutral'
    let confidence = Math.abs(yesScore - noScore) * 100

    if (yesScore > noScore + 0.1) {
      prediction = 'Yes'
    } else if (noScore > yesScore + 0.1) {
      prediction = 'No'
    }

    return { prediction, confidence: Math.min(confidence, 95) }
  }

  // Get confidence color
  const getConfidenceColor = (confidence) => {
    if (confidence >= 70) return 'text-green-400'
    if (confidence >= 50) return 'text-yellow-400'
    if (confidence >= 30) return 'text-orange-400'
    return 'text-gray-400'
  }

  // Get prediction color
  const getPredictionColor = (prediction) => {
    if (prediction === 'Yes') return 'bg-green-500/20 border-green-500/50 text-green-400'
    if (prediction === 'No') return 'bg-red-500/20 border-red-500/50 text-red-400'
    return 'bg-gray-500/20 border-gray-500/50 text-gray-400'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0d14] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <p className="text-gray-400">Analyzing markets...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0d14] text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#0a0d14] border-b border-white/10 px-6 py-6">
        <div className="max-w-[1920px] mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <Sparkles className="h-6 w-6 text-yellow-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Market Analysis</h1>
              <p className="text-gray-400 text-sm mt-1">
                AI-powered predictions based on aggregated market data
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1920px] mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {analyzedMarkets.map((analysis, index) => {
            const market = analysis.market
            const prediction = analysis.prediction || 'Neutral'
            const confidence = analysis.confidence || 0

            return (
              <div
                key={market.id || index}
                className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 hover:border-yellow-500/50 transition-all cursor-pointer group flex flex-col h-full"
                onClick={() => onSelectMarket && onSelectMarket(market)}
              >
                {/* Market Header */}
                <div className="flex items-start gap-4 mb-4">
                  <MarketImage 
                    market={market}
                    alt={market.title || 'Market'}
                    fallbackIcon={market.icon}
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-white mb-1 line-clamp-2 group-hover:text-yellow-400 transition">
                      {market.title || market.question || `Market ${market.id}`}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <span>24h Vol: ${((market.volume24h || 0) / 1000).toFixed(1)}K</span>
                    </div>
                  </div>
                </div>

                {/* Prediction Badge */}
                <div className="mb-4">
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border ${getPredictionColor(prediction)}`}>
                    <span className="font-bold text-sm">
                      {prediction === 'Yes' ? '✅' : prediction === 'No' ? '❌' : '⚖️'} {prediction}
                    </span>
                    <span className={`text-xs font-semibold ${getConfidenceColor(confidence)}`}>
                      {confidence.toFixed(0)}% confidence
                    </span>
                  </div>
                </div>

                {/* Sources */}
                <div className="space-y-3 mb-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Analysis Sources</p>
                  {analysis.sources.map((source, idx) => {
                    const Icon = source.icon || BarChart3
                    return (
                      <div key={idx} className="flex items-start gap-3 p-3 bg-gray-800/50 rounded-lg">
                        <div className="flex-shrink-0 mt-0.5">
                          <Icon className="h-4 w-4 text-yellow-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-white">{source.name}</span>
                            <span className="text-xs text-gray-500">{(source.weight * 100).toFixed(0)}%</span>
                          </div>
                          <p className="text-xs text-gray-400">{source.details}</p>
                          <div className="mt-2">
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              source.signal.includes('Yes') || source.signal === 'Buy Pressure'
                                ? 'bg-green-500/20 text-green-400'
                                : source.signal.includes('No') || source.signal === 'Sell Pressure'
                                ? 'bg-red-500/20 text-red-400'
                                : 'bg-gray-500/20 text-gray-400'
                            }`}>
                              {source.signal}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Current Prices */}
                <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg mb-4">
                  <div className="text-center flex-1">
                    <p className="text-xs text-gray-400 mb-1">Yes</p>
                    <p className="text-lg font-bold text-green-400">
                      {(market.yesPrice || 50).toFixed(1)}¢
                    </p>
                  </div>
                  <div className="text-center flex-1 border-x border-gray-700">
                    <p className="text-xs text-gray-400 mb-1">No</p>
                    <p className="text-lg font-bold text-red-400">
                      {(market.noPrice || 50).toFixed(1)}¢
                    </p>
                  </div>
                </div>

                {/* View Details Button - Pushed to bottom with mt-auto */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onSelectMarket && onSelectMarket(market)
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/50 rounded-lg text-yellow-400 transition group-hover:border-yellow-500 mt-auto"
                >
                  <span className="text-sm font-semibold">View Details</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )
          })}
        </div>

        {analyzedMarkets.length === 0 && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📊</div>
            <h2 className="text-2xl font-bold text-white mb-2">No Markets to Analyze</h2>
            <p className="text-gray-400">Markets will appear here once data is available</p>
          </div>
        )}
      </div>
    </div>
  )
}

