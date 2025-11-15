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
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  // Fetch popular markets (sorted by volume) with progressive loading
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
        
        // Calculate volume statistics for relative comparison
        const volumes = sortedMarkets.map(m => (m.volume24h || 0) + (m.volume || 0)).filter(v => v > 0)
        const avgVolume = volumes.length > 0 ? volumes.reduce((a, b) => a + b, 0) / volumes.length : 0
        const maxVolume = volumes.length > 0 ? Math.max(...volumes) : 0
        
        // Progressive loading: analyze first 3 markets immediately, then continue with rest
        const context = { avgVolume, maxVolume }
        
        // Analyze first 3 markets
        const firstBatch = sortedMarkets.slice(0, 3)
        const firstAnalyzed = await Promise.all(
          firstBatch.map(market => analyzeMarket(market, context))
        )
        setAnalyzedMarkets(firstAnalyzed)
        setLoading(false) // Show first batch immediately
        
        // Continue analyzing the rest
        const remainingMarkets = sortedMarkets.slice(3)
        if (remainingMarkets.length > 0) {
          setIsLoadingMore(true)
          for (const market of remainingMarkets) {
            const analysis = await analyzeMarket(market, context)
            setAnalyzedMarkets(prev => [...prev, analysis])
          }
          setIsLoadingMore(false)
        }
      } catch (error) {
        console.error('Error fetching markets:', error)
        setLoading(false)
      }
    }

    fetchPopularMarkets()
  }, [])

  // Analyze a single market to predict outcome
  const analyzeMarket = async (market, context = {}) => {
    const analysis = {
      market,
      prediction: null,
      confidence: 0,
      sources: []
    }

    try {
      // Source 1: Price Trend Analysis (more nuanced)
      const priceTrend = analyzePriceTrend(market)
      if (priceTrend) {
        analysis.sources.push({
          name: 'Price Trend',
          icon: priceTrend.direction === 'up' ? TrendingUp : priceTrend.direction === 'down' ? TrendingDown : BarChart3,
          weight: 0.3,
          signal: priceTrend.signal,
          details: priceTrend.details,
          score: priceTrend.score || 0
        })
      }

      // Source 2: Volume Analysis (relative to other markets)
      const volumeAnalysis = analyzeVolume(market, context)
      if (volumeAnalysis) {
        analysis.sources.push({
          name: 'Volume Activity',
          icon: Activity,
          weight: 0.25,
          signal: volumeAnalysis.signal,
          details: volumeAnalysis.details,
          score: volumeAnalysis.score || 0
        })
      }

      // Source 3: Price Momentum (more granular)
      const momentum = analyzeMomentum(market)
      if (momentum) {
        analysis.sources.push({
          name: 'Momentum',
          icon: BarChart3,
          weight: 0.25,
          signal: momentum.signal,
          details: momentum.details,
          score: momentum.score || 0
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
          details: depthAnalysis.details,
          score: depthAnalysis.score || 0
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

  // Analyze price trend (more nuanced with scoring)
  const analyzePriceTrend = (market) => {
    const yesPrice = market.yesPrice || 50
    const noPrice = market.noPrice || 50
    const priceDiff = yesPrice - noPrice
    const priceSpread = Math.abs(priceDiff)
    
    // Calculate score: positive for Yes, negative for No
    let score = priceDiff
    
    // Very strong signals (80+)
    if (yesPrice >= 80) {
      return {
        direction: 'up',
        signal: 'Very Strong Yes',
        details: `Yes price at ${yesPrice.toFixed(1)}¢ (${priceSpread.toFixed(1)}¢ lead) shows very strong confidence`,
        score: 0.9
      }
    }
    if (noPrice >= 80) {
      return {
        direction: 'down',
        signal: 'Very Strong No',
        details: `No price at ${noPrice.toFixed(1)}¢ (${priceSpread.toFixed(1)}¢ lead) shows very strong confidence`,
        score: -0.9
      }
    }
    
    // Strong signals (65-80)
    if (yesPrice >= 65) {
      return {
        direction: 'up',
        signal: 'Strong Yes',
        details: `Yes price at ${yesPrice.toFixed(1)}¢ (${priceSpread.toFixed(1)}¢ lead) indicates strong market confidence`,
        score: 0.7
      }
    }
    if (noPrice >= 65) {
      return {
        direction: 'down',
        signal: 'Strong No',
        details: `No price at ${noPrice.toFixed(1)}¢ (${priceSpread.toFixed(1)}¢ lead) indicates strong market confidence`,
        score: -0.7
      }
    }
    
    // Moderate signals (55-65)
    if (yesPrice >= 55) {
      return {
        direction: 'up',
        signal: 'Moderate Yes',
        details: `Yes price at ${yesPrice.toFixed(1)}¢ (${priceSpread.toFixed(1)}¢ lead) shows moderate confidence`,
        score: 0.4
      }
    }
    if (noPrice >= 55) {
      return {
        direction: 'down',
        signal: 'Moderate No',
        details: `No price at ${noPrice.toFixed(1)}¢ (${priceSpread.toFixed(1)}¢ lead) shows moderate confidence`,
        score: -0.4
      }
    }

    // Neutral (45-55)
    return {
      direction: 'neutral',
      signal: 'Neutral',
      details: `Prices balanced at Yes: ${yesPrice.toFixed(1)}¢, No: ${noPrice.toFixed(1)}¢ (${priceSpread.toFixed(1)}¢ spread)`,
      score: 0
    }
  }

  // Analyze volume (relative to other markets)
  const analyzeVolume = (market, context = {}) => {
    const volume24h = market.volume24h || 0
    const totalVolume = market.volume || 0
    const combinedVolume = volume24h + totalVolume
    const { avgVolume = 0, maxVolume = 1 } = context
    
    // Calculate relative volume (0-1 scale)
    const relativeVolume = maxVolume > 0 ? combinedVolume / maxVolume : 0
    const relativeToAvg = avgVolume > 0 ? combinedVolume / avgVolume : 0
    
    // Format volume for display
    const formatVol = (vol) => {
      if (vol >= 1000000) return `$${(vol / 1000000).toFixed(2)}M`
      if (vol >= 1000) return `$${(vol / 1000).toFixed(1)}K`
      return `$${vol.toFixed(0)}`
    }
    
    // Very high activity (top 20%)
    if (relativeVolume >= 0.8 || combinedVolume > 500000) {
      return {
        signal: 'Very High Activity',
        details: `Very high trading volume (24h: ${formatVol(volume24h)}, total: ${formatVol(totalVolume)}) - ${(relativeToAvg * 100).toFixed(0)}% above average`,
        score: 0.8
      }
    }
    
    // High activity (top 40%)
    if (relativeVolume >= 0.5 || combinedVolume > 100000 || relativeToAvg > 1.5) {
      return {
        signal: 'High Activity',
        details: `High trading volume (24h: ${formatVol(volume24h)}, total: ${formatVol(totalVolume)}) - ${(relativeToAvg * 100).toFixed(0)}% above average`,
        score: 0.6
      }
    }
    
    // Moderate activity
    if (relativeVolume >= 0.2 || combinedVolume > 10000 || relativeToAvg > 0.8) {
      return {
        signal: 'Moderate Activity',
        details: `Moderate trading volume (24h: ${formatVol(volume24h)}, total: ${formatVol(totalVolume)}) - ${(relativeToAvg * 100).toFixed(0)}% of average`,
        score: 0.3
      }
    }
    
    // Low activity
    return {
      signal: 'Low Activity',
      details: `Lower trading volume (24h: ${formatVol(volume24h)}, total: ${formatVol(totalVolume)}) - ${(relativeToAvg * 100).toFixed(0)}% of average`,
      score: 0.1
    }
  }

  // Analyze momentum (more granular price spread analysis)
  const analyzeMomentum = (market) => {
    const yesPrice = market.yesPrice || 50
    const noPrice = market.noPrice || 50
    const momentum = yesPrice - noPrice
    const momentumPercent = Math.abs(momentum) / 50 // Normalize to 0-1 scale
    
    // Very strong momentum (30+ cent spread)
    if (momentum > 30) {
      return {
        signal: 'Very Strong Yes Momentum',
        details: `Yes leading by ${momentum.toFixed(1)}¢ (${(momentumPercent * 100).toFixed(0)}% spread) - very strong upward momentum`,
        score: 0.9
      }
    }
    if (momentum < -30) {
      return {
        signal: 'Very Strong No Momentum',
        details: `No leading by ${Math.abs(momentum).toFixed(1)}¢ (${(momentumPercent * 100).toFixed(0)}% spread) - very strong downward momentum`,
        score: -0.9
      }
    }
    
    // Strong momentum (15-30 cent spread)
    if (momentum > 15) {
      return {
        signal: 'Strong Yes Momentum',
        details: `Yes leading by ${momentum.toFixed(1)}¢ (${(momentumPercent * 100).toFixed(0)}% spread) - strong upward momentum`,
        score: 0.7
      }
    }
    if (momentum < -15) {
      return {
        signal: 'Strong No Momentum',
        details: `No leading by ${Math.abs(momentum).toFixed(1)}¢ (${(momentumPercent * 100).toFixed(0)}% spread) - strong downward momentum`,
        score: -0.7
      }
    }
    
    // Moderate momentum (5-15 cent spread)
    if (momentum > 5) {
      return {
        signal: 'Moderate Yes Momentum',
        details: `Yes leading by ${momentum.toFixed(1)}¢ (${(momentumPercent * 100).toFixed(0)}% spread) - moderate upward momentum`,
        score: 0.4
      }
    }
    if (momentum < -5) {
      return {
        signal: 'Moderate No Momentum',
        details: `No leading by ${Math.abs(momentum).toFixed(1)}¢ (${(momentumPercent * 100).toFixed(0)}% spread) - moderate downward momentum`,
        score: -0.4
      }
    }
    
    // Balanced (0-5 cent spread)
    return {
      signal: 'Balanced',
      details: `Prices are relatively balanced (${Math.abs(momentum).toFixed(1)}¢ spread) - no clear momentum`,
      score: 0
    }
  }

  // Analyze market depth (order book analysis)
  const analyzeMarketDepth = async (market) => {
    try {
      const orderBook = await dataService.getOrderBook(market.id)
      if (!orderBook || !orderBook.bids || !orderBook.asks) {
        return null
      }

      const totalBids = orderBook.bids.reduce((sum, bid) => sum + (bid.size || bid.amount || 0), 0)
      const totalAsks = orderBook.asks.reduce((sum, ask) => sum + (ask.size || ask.amount || 0), 0)
      const totalDepth = totalBids + totalAsks
      
      if (totalDepth === 0) {
        return null
      }
      
      const bidRatio = totalBids / totalDepth
      const askRatio = totalAsks / totalDepth
      const imbalance = Math.abs(bidRatio - askRatio)
      
      // Very strong imbalance (70%+ on one side)
      if (bidRatio >= 0.7) {
        return {
          signal: 'Very Strong Buy Pressure',
          details: `Very strong buy-side depth (${(bidRatio * 100).toFixed(0)}% bids, ${totalBids.toFixed(0)} vs ${totalAsks.toFixed(0)}) - strong Yes support`,
          score: 0.8
        }
      }
      if (askRatio >= 0.7) {
        return {
          signal: 'Very Strong Sell Pressure',
          details: `Very strong sell-side depth (${(askRatio * 100).toFixed(0)}% asks, ${totalAsks.toFixed(0)} vs ${totalBids.toFixed(0)}) - strong No support`,
          score: -0.8
        }
      }
      
      // Strong imbalance (60-70%)
      if (bidRatio >= 0.6) {
        return {
          signal: 'Strong Buy Pressure',
          details: `Strong buy-side depth (${(bidRatio * 100).toFixed(0)}% bids, ${totalBids.toFixed(0)} vs ${totalAsks.toFixed(0)}) - Yes support`,
          score: 0.6
        }
      }
      if (askRatio >= 0.6) {
        return {
          signal: 'Strong Sell Pressure',
          details: `Strong sell-side depth (${(askRatio * 100).toFixed(0)}% asks, ${totalAsks.toFixed(0)} vs ${totalBids.toFixed(0)}) - No support`,
          score: -0.6
        }
      }
      
      // Moderate imbalance (55-60%)
      if (bidRatio >= 0.55) {
        return {
          signal: 'Moderate Buy Pressure',
          details: `Moderate buy-side depth (${(bidRatio * 100).toFixed(0)}% bids, ${totalBids.toFixed(0)} vs ${totalAsks.toFixed(0)}) - slight Yes bias`,
          score: 0.3
        }
      }
      if (askRatio >= 0.55) {
        return {
          signal: 'Moderate Sell Pressure',
          details: `Moderate sell-side depth (${(askRatio * 100).toFixed(0)}% asks, ${totalAsks.toFixed(0)} vs ${totalBids.toFixed(0)}) - slight No bias`,
          score: -0.3
        }
      }
      
      // Balanced (45-55%)
      return {
        signal: 'Balanced Depth',
        details: `Order book shows balanced liquidity (${(bidRatio * 100).toFixed(0)}% bids, ${totalBids.toFixed(0)} vs ${totalAsks.toFixed(0)})`,
        score: 0
      }
    } catch (error) {
      return null
    }
  }

  // Aggregate predictions from all sources using scores
  const aggregatePredictions = (sources) => {
    let weightedScore = 0
    let totalWeight = 0
    let maxPossibleScore = 0

    sources.forEach(source => {
      const weight = source.weight || 0.25
      const score = source.score || 0
      
      totalWeight += weight
      weightedScore += (score * weight)
      maxPossibleScore += (Math.abs(score) * weight)
    })

    // Normalize to -1 to 1 scale
    const normalizedScore = maxPossibleScore > 0 ? weightedScore / maxPossibleScore : 0
    
    // Calculate confidence based on agreement between sources
    const confidence = Math.min(Math.abs(normalizedScore) * 100, 95)
    
    // Determine prediction
    let prediction = 'Neutral'
    if (normalizedScore > 0.15) {
      prediction = 'Yes'
    } else if (normalizedScore < -0.15) {
      prediction = 'No'
    }

    return { prediction, confidence: Math.max(confidence, 10) } // Minimum 10% confidence
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
          {/* Skeleton loaders for remaining markets */}
          {isLoadingMore && markets.length > analyzedMarkets.length && (
            Array.from({ length: Math.min(3, markets.length - analyzedMarkets.length) }).map((_, idx) => (
              <div
                key={`skeleton-${idx}`}
                className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 animate-pulse"
              >
                {/* Market Header Skeleton */}
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-lg bg-gray-800 flex-shrink-0"></div>
                  <div className="flex-1">
                    <div className="h-5 bg-gray-800 rounded mb-2"></div>
                    <div className="h-4 bg-gray-800 rounded w-2/3"></div>
                  </div>
                </div>

                {/* Prediction Badge Skeleton */}
                <div className="mb-4">
                  <div className="h-8 bg-gray-800 rounded-lg w-32"></div>
                </div>

                {/* Sources Skeleton */}
                <div className="space-y-3 mb-4">
                  <div className="h-3 bg-gray-800 rounded w-24"></div>
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-gray-800/50 rounded-lg">
                      <div className="w-4 h-4 bg-gray-700 rounded flex-shrink-0"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-700 rounded mb-2 w-24"></div>
                        <div className="h-3 bg-gray-700 rounded w-full mb-2"></div>
                        <div className="h-5 bg-gray-700 rounded w-20"></div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Prices Skeleton */}
                <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg mb-4">
                  <div className="flex-1">
                    <div className="h-3 bg-gray-700 rounded w-8 mb-1"></div>
                    <div className="h-5 bg-gray-700 rounded w-16"></div>
                  </div>
                  <div className="w-px h-8 bg-gray-700"></div>
                  <div className="flex-1">
                    <div className="h-3 bg-gray-700 rounded w-8 mb-1"></div>
                    <div className="h-5 bg-gray-700 rounded w-16"></div>
                  </div>
                </div>

                {/* Button Skeleton */}
                <div className="h-10 bg-gray-800 rounded-lg"></div>
              </div>
            ))
          )}

          {/* Actual market cards */}
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

