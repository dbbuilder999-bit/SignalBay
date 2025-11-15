import React, { useState, useEffect } from 'react'
import { TrendingUp, Calendar, DollarSign, ArrowRight, ArrowLeft, Grid } from 'lucide-react'
import { polymarketService } from '../services/PolymarketService'

// Sport-specific tag IDs
const SPORT_TAG_IDS = {
  NFL: 517,
  CFB: 518,
  NBA: 780
}

// Sport keywords for filtering
const SPORT_KEYWORDS = {
  NFL: ['nfl', 'national football league', 'super bowl', 'afc', 'nfc', 'nfl team', 'nfl player'],
  CFB: ['cfb', 'college football', 'ncaa football', 'ncaa', 'college', 'cfp', 'college football playoff'],
  NBA: ['nba', 'national basketball association', 'nba team', 'nba player', 'nba game', 'nba playoff']
}

export default function SportsMarketsView({ onSelectMarket, onViewAllMarkets }) {
  const [markets, setMarkets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedSport, setSelectedSport] = useState('NFL') // Default to NFL
  const [marketsBySport, setMarketsBySport] = useState({})

  useEffect(() => {
    const fetchSportsMarkets = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch markets for all three main sports
        const sportPromises = Object.entries(SPORT_TAG_IDS).map(async ([sport, tagId]) => {
          try {
            const sportMarkets = await polymarketService.getMarkets({
              tag_id: tagId,
              active: true,
              closed: false,
              limit: 200, // Get more to filter properly
              related_tags: false // Don't include related tags to get more specific results
            })
            
            // Filter markets to ensure they're actually for this sport
            const keywords = SPORT_KEYWORDS[sport]
            const filtered = (sportMarkets || []).filter(market => {
              const title = (market.title || market.question || '').toLowerCase()
              const description = (market.description || '').toLowerCase()
              const searchText = `${title} ${description}`
              
              // Check if market title/question contains sport keywords
              return keywords.some(keyword => searchText.includes(keyword))
            })
            
            return { sport, markets: filtered }
          } catch (err) {
            console.error(`Error fetching ${sport} markets:`, err)
            return { sport, markets: [] }
          }
        })

        const results = await Promise.all(sportPromises)
        const grouped = {}
        results.forEach(({ sport, markets }) => {
          grouped[sport] = markets
        })

        setMarketsBySport(grouped)
        
        // Set initial markets to selected sport
        setMarkets(grouped[selectedSport] || [])
      } catch (err) {
        console.error('Error fetching sports markets:', err)
        setError(err.message || 'Failed to load sports markets')
      } finally {
        setLoading(false)
      }
    }

    fetchSportsMarkets()
  }, [])

  // Update markets when sport selection changes
  useEffect(() => {
    if (marketsBySport[selectedSport]) {
      setMarkets(marketsBySport[selectedSport])
    }
  }, [selectedSport, marketsBySport])

  const formatPrice = (price) => {
    if (!price && price !== 0) return 'N/A'
    if (price >= 100) return '100¢'
    if (price <= 0) return '0¢'
    return `${price.toFixed(1)}¢`
  }

  const formatCurrency = (value) => {
    if (!value) return '$0'
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`
    return `$${value.toLocaleString()}`
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'TBD'
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = date - now
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) return 'Past'
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Tomorrow'
    if (diffDays <= 7) return `${diffDays} days`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  // Group markets by game/matchup
  const groupMarketsByGame = (marketsList) => {
    const games = {}
    
    marketsList.forEach(market => {
      const title = market.title || market.question || ''
      
      // Try to extract team names or game identifier
      // Look for patterns like "Team A vs Team B" or "Team A @ Team B"
      let gameKey = title
      
      // Try to find common patterns
      const vsMatch = title.match(/(.+?)\s+(?:vs|@|v\.|versus)\s+(.+?)(?:\s|$)/i)
      if (vsMatch) {
        gameKey = `${vsMatch[1].trim()} vs ${vsMatch[2].trim()}`
      } else {
        // Use first 50 chars as key
        gameKey = title.substring(0, 50)
      }
      
      if (!games[gameKey]) {
        games[gameKey] = []
      }
      games[gameKey].push(market)
    })
    
    return games
  }

  // Sort markets by volume
  const sortMarkets = (marketsArray) => {
    return [...marketsArray].sort((a, b) => {
      const volA = a.volume24h || a.volume || 0
      const volB = b.volume24h || b.volume || 0
      return volB - volA
    })
  }

  const groupedGames = groupMarketsByGame(markets)
  const sortedGames = Object.keys(groupedGames).sort((a, b) => {
    // Sort by total volume of markets in the game
    const volA = groupedGames[a].reduce((sum, m) => sum + (m.volume24h || m.volume || 0), 0)
    const volB = groupedGames[b].reduce((sum, m) => sum + (m.volume24h || m.volume || 0), 0)
    return volB - volA
  })

  const sportIcons = {
    NFL: '🏈',
    CFB: '🏈',
    NBA: '🏀'
  }

  const sportColors = {
    NFL: 'bg-blue-500/20 border-blue-500/50 text-blue-400',
    CFB: 'bg-orange-500/20 border-orange-500/50 text-orange-400',
    NBA: 'bg-purple-500/20 border-purple-500/50 text-purple-400'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0d14] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading sports markets...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0d14] flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="text-6xl mb-6">⚠️</div>
          <h2 className="text-2xl font-bold text-white mb-3">Error Loading Sports Markets</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-yellow-500 text-black rounded-lg hover:bg-yellow-600 transition font-semibold"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0d14] text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#0a0d14] border-b border-white/10 px-6 py-6">
        <div className="max-w-[1920px] mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/20 rounded-lg">
                <span className="text-3xl">{sportIcons[selectedSport] || '🏆'}</span>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Sports Markets</h1>
                <p className="text-gray-400 text-sm mt-1">
                  Spreads, futures, and game markets for {selectedSport}
                </p>
              </div>
            </div>
            {onViewAllMarkets && (
              <button
                onClick={onViewAllMarkets}
                className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg transition text-sm"
              >
                <Grid className="h-4 w-4" />
                <span>View All Markets</span>
              </button>
            )}
          </div>

          {/* Sport Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {Object.keys(SPORT_TAG_IDS).map(sport => (
              <button
                key={sport}
                onClick={() => setSelectedSport(sport)}
                className={`px-6 py-3 rounded-lg text-sm font-semibold whitespace-nowrap transition ${
                  selectedSport === sport
                    ? `${sportColors[sport]} border-2`
                    : 'bg-gray-900 text-gray-300 border border-gray-700 hover:bg-gray-800'
                }`}
              >
                <span className="text-xl mr-2">{sportIcons[sport]}</span>
                {sport}
                <span className="ml-2 text-xs opacity-75">
                  ({marketsBySport[sport]?.length || 0})
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1920px] mx-auto px-6 py-8">
        {markets.length === 0 ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center max-w-md">
              <div className="text-6xl mb-6">🏈</div>
              <h2 className="text-2xl font-bold text-white mb-3">No {selectedSport} Markets Found</h2>
              <p className="text-gray-400 mb-2">
                There are currently no active {selectedSport} markets available.
              </p>
              <p className="text-gray-500 text-sm">
                Check back later for new games and spreads.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Games/Matchups */}
            {sortedGames.map((gameKey, gameIndex) => {
              const gameMarkets = sortMarkets(groupedGames[gameKey])
              const totalVolume = gameMarkets.reduce((sum, m) => sum + (m.volume24h || m.volume || 0), 0)
              
              return (
                <div
                  key={gameIndex}
                  className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 hover:border-yellow-500/50 transition"
                >
                  {/* Game Header */}
                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-800">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-2">{gameKey}</h3>
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {gameMarkets[0]?.endDate ? formatDate(gameMarkets[0].endDate) : 'TBD'}
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          {formatCurrency(totalVolume)} volume
                        </span>
                        <span className="flex items-center gap-1">
                          <TrendingUp className="h-4 w-4" />
                          {gameMarkets.length} market{gameMarkets.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Markets for this game */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {gameMarkets.map((market) => {
                      const isSpread = market.title?.toLowerCase().includes('spread') || 
                                      market.question?.toLowerCase().includes('spread')
                      const isTotal = market.title?.toLowerCase().includes('total') || 
                                     market.title?.toLowerCase().includes('over') ||
                                     market.title?.toLowerCase().includes('under')
                      const isFutures = market.title?.toLowerCase().includes('championship') ||
                                       market.title?.toLowerCase().includes('super bowl') ||
                                       market.title?.toLowerCase().includes('playoffs') ||
                                       market.title?.toLowerCase().includes('win') ||
                                       market.title?.toLowerCase().includes('champion')

                      return (
                        <button
                          key={market.id}
                          onClick={() => onSelectMarket && onSelectMarket(market)}
                          className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 hover:border-yellow-500/50 hover:bg-gray-800 transition text-left group"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-white line-clamp-2 group-hover:text-yellow-400 transition">
                                {market.title || market.question}
                              </p>
                              {(isSpread || isTotal || isFutures) && (
                                <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-semibold rounded ${
                                  isSpread ? 'bg-blue-500/20 text-blue-400' :
                                  isTotal ? 'bg-green-500/20 text-green-400' :
                                  'bg-purple-500/20 text-purple-400'
                                }`}>
                                  {isSpread ? 'Spread' : isTotal ? 'Total' : 'Futures'}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-700">
                            <div className="flex items-center gap-3">
                              <div className="text-center">
                                <p className="text-xs text-gray-400 mb-1">Yes</p>
                                <p className="text-sm font-bold text-green-400">
                                  {formatPrice(market.yesPrice)}
                                </p>
                              </div>
                              <div className="w-px h-8 bg-gray-700"></div>
                              <div className="text-center">
                                <p className="text-xs text-gray-400 mb-1">No</p>
                                <p className="text-sm font-bold text-red-400">
                                  {formatPrice(market.noPrice)}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-gray-400 mb-1">24h Vol</p>
                              <p className="text-xs font-medium text-white">
                                {formatCurrency(market.volume24h || market.volume || 0)}
                              </p>
                            </div>
                          </div>

                          <div className="mt-3 flex items-center justify-end">
                            <span className="text-xs text-yellow-400 flex items-center gap-1 group-hover:gap-2 transition-all">
                              Trade <ArrowRight className="h-3 w-3" />
                            </span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

