import React, { useState, useEffect, useRef } from 'react'
import { Search, Filter, List, Grid } from 'lucide-react'
import { polymarketService } from '../services/PolymarketService'

// Sports Grouped View Component
function SportsGroupedView({ marketsBySport, onSelectMarket, sortMarkets }) {
  // Define sport order: Football and Basketball first, then others
  const sportOrder = ['NFL', 'CFB', 'NBA', 'MLB', 'NHL', 'UFC', 'Soccer', 'Other']
  const mainSports = ['NFL', 'CFB', 'NBA'] // Main sports to feature
  
  // Get sorted sports list
  const sortedSports = Object.keys(marketsBySport).sort((a, b) => {
    const aIndex = sportOrder.indexOf(a) !== -1 ? sportOrder.indexOf(a) : 999
    const bIndex = sportOrder.indexOf(b) !== -1 ? sportOrder.indexOf(b) : 999
    return aIndex - bIndex
  })
  
  const formatPrice = (price) => {
    if (price >= 100) return '100.0¢'
    if (price <= 0) return '0.0¢'
    return `${price.toFixed(1)}¢`
  }
  
  const formatCurrency = (value) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`
    return `$${value.toLocaleString()}`
  }
  
  return (
    <div className="space-y-8">
      {/* Main Sports Section - Football and Basketball */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {sortedSports.filter(sport => mainSports.includes(sport)).map(sport => {
          const sportMarkets = sortMarkets(marketsBySport[sport])
          if (sportMarkets.length === 0) return null
          
          return (
            <div key={sport} className="bg-gray-900 border border-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <span className="text-3xl">
                    {sport === 'NFL' || sport === 'CFB' ? '🏈' : sport === 'NBA' ? '🏀' : '⚽'}
                  </span>
                  {sport}
                </h2>
                <span className="text-sm text-gray-400">{sportMarkets.length} markets</span>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {sportMarkets.slice(0, 5).map(market => (
                  <button
                    key={market.id}
                    onClick={() => onSelectMarket && onSelectMarket(market)}
                    className="w-full text-left p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800 border border-gray-700/50 hover:border-yellow-500/50 transition"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{market.title || market.question}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                          <span className="text-green-400">Yes {formatPrice(market.yesPrice || 0)}</span>
                          <span>•</span>
                          <span className="text-red-400">No {formatPrice(market.noPrice || 0)}</span>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-xs text-gray-500">Vol</p>
                        <p className="text-xs text-white font-medium">{formatCurrency(market.volume24h || market.volume || 0)}</p>
                      </div>
                    </div>
                  </button>
                ))}
                {sportMarkets.length > 5 && (
                  <p className="text-xs text-gray-500 text-center pt-2">
                    +{sportMarkets.length - 5} more markets
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
      
      {/* Other Sports Section */}
      {sortedSports.filter(sport => !mainSports.includes(sport)).length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-white mb-4">Other Sports</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedSports.filter(sport => !mainSports.includes(sport)).map(sport => {
              const sportMarkets = sortMarkets(marketsBySport[sport])
              if (sportMarkets.length === 0) return null
              
              const sportIcons = {
                'MLB': '⚾',
                'NHL': '🏒',
                'UFC': '🥊',
                'Soccer': '⚽',
                'Other': '🏆'
              }
              
              return (
                <div key={sport} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <span className="text-2xl">{sportIcons[sport] || '🏆'}</span>
                      {sport}
                    </h3>
                    <span className="text-xs text-gray-400">{sportMarkets.length}</span>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {sportMarkets.slice(0, 3).map(market => (
                      <button
                        key={market.id}
                        onClick={() => onSelectMarket && onSelectMarket(market)}
                        className="w-full text-left p-2 bg-gray-800/50 rounded hover:bg-gray-800 transition text-sm"
                      >
                        <p className="text-white truncate">{market.title || market.question}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs">
                          <span className="text-green-400">{formatPrice(market.yesPrice || 0)}</span>
                          <span className="text-gray-600">•</span>
                          <span className="text-red-400">{formatPrice(market.noPrice || 0)}</span>
                        </div>
                      </button>
                    ))}
                    {sportMarkets.length > 3 && (
                      <p className="text-xs text-gray-500 text-center pt-1">
                        +{sportMarkets.length - 3} more
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

const categories = ['Trending', 'New', 'Politics', 'Sports', 'Finance', 'Crypto', 'Tech', 'Pop Culture', 'Business', 'World', 'Science']

// Map UI category names to Polymarket API parameters
// Note: API uses tag_id (integer) for categories, not category (string)
// For sports, we can use sports_market_types parameter
const categoryApiMap = {
  'Trending': null, // Special: shows all markets
  'New': null, // Special: shows all markets
  'Politics': null, // Would need tag_id - using client-side filtering for now
  'Sports': { sports_market_types: [] }, // Can use sports_market_types for sports
  'Finance': null, // Would need tag_id - using client-side filtering for now
  'Crypto': null, // Would need tag_id - using client-side filtering for now
  'Tech': null, // Would need tag_id - using client-side filtering for now
  'Pop Culture': null, // Would need tag_id - using client-side filtering for now
  'Business': null, // Would need tag_id - using client-side filtering for now
  'World': null, // Would need tag_id - using client-side filtering for now
  'Science': null, // Would need tag_id - using client-side filtering for now
}

// Map UI category names to keywords for client-side filtering (fallback)
const categoryMap = {
  'Trending': null, // Special: shows all markets
  'New': null, // Special: shows all markets
  'Politics': ['politics', 'political', 'election', 'elections'],
  'Sports': ['sports', 'sport'],
  'Finance': ['finance', 'financial', 'economics', 'economic'],
  'Crypto': ['crypto', 'cryptocurrency', 'bitcoin', 'ethereum', 'blockchain'],
  'Tech': ['tech', 'technology', 'tech companies'],
  'Pop Culture': ['entertainment', 'pop culture', 'celebrity', 'movies', 'music'],
  'Business': ['business', 'companies', 'corporate'],
  'World': ['world', 'international', 'global'],
  'Science': ['science', 'scientific', 'research'],
}

// Component to handle market images with fallback to icon
function MarketImage({ market, alt, fallbackIcon, size = 'small' }) {
  const [imageError, setImageError] = useState(false)

  // Check multiple possible field names for image URL (similar to events)
  const imageUrl = market?.imageUrl || 
                  market?.image || 
                  market?.thumbnail || 
                  market?.image_url ||
                  market?.thumbnailUrl ||
                  market?.thumbnail_url ||
                  null
  
  // Only use if it's a valid URL string
  const hasValidImage = imageUrl && 
                       typeof imageUrl === 'string' && 
                       (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) &&
                       !imageError

  if (!hasValidImage && fallbackIcon) {
    const sizeClass = size === 'large' ? 'text-4xl' : 'text-xl'
    return <span className={`${sizeClass} flex-shrink-0`}>{fallbackIcon}</span>
  }

  if (!hasValidImage) {
    return null
  }

  const sizeClass = size === 'large' ? 'w-full h-32 rounded-lg mb-3' : 'w-10 h-10 rounded'
  return (
    <img 
      src={imageUrl} 
      alt={alt}
      className={`${sizeClass} object-cover flex-shrink-0`}
      onError={() => setImageError(true)}
    />
  )
}

export default function MarketsList({ onSelectMarket, eventFilter, onClearEventFilter }) {
  const [markets, setMarkets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isSearching, setIsSearching] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Trending')
  const [viewMode, setViewMode] = useState('list') // 'list' or 'tile'
  const [showFilterModal, setShowFilterModal] = useState(false)
  const [filters, setFilters] = useState({
    volume24h: null,
    totalVolume: null,
    liquidity: null,
    endDate: null,
  })
  const [selectedSport, setSelectedSport] = useState('NFL') // Selected sport when Sports category is active
  const [sportsMarketsBySport, setSportsMarketsBySport] = useState({}) // Markets grouped by sport
  const categoryCacheRef = useRef({}) // Cache markets by category using ref to avoid dependency issues
  const sportsTagIdsRef = useRef(null) // Cache sports tag IDs
  const tagsRef = useRef(null) // Cache tags data for category-to-tag_id mapping
  const sportsDataRef = useRef(null) // Cache sports metadata
  const [marketsBySport, setMarketsBySport] = useState({}) // Group markets by sport

  // Helper function to group markets by sport
  const groupMarketsBySport = React.useCallback((marketsList, sportsMetadata) => {
    const grouped = {}
    
    marketsList.forEach(market => {
      const title = (market.title || market.question || '').toLowerCase()
      const description = (market.description || '').toLowerCase()
      
      // Try to match market to a sport
      let matchedSport = null
      
      for (const sport of sportsMetadata) {
        const sportName = (sport.sport || sport.name || '').toLowerCase()
        const sportKeywords = [
          sportName,
          ...(sportName.includes('nfl') ? ['nfl', 'football', 'nfc', 'afc'] : []),
          ...(sportName.includes('nba') ? ['nba', 'basketball'] : []),
          ...(sportName.includes('cfb') || sportName.includes('college') ? ['cfb', 'college football', 'ncaa'] : []),
          ...(sportName.includes('mlb') ? ['mlb', 'baseball'] : []),
          ...(sportName.includes('nhl') ? ['nhl', 'hockey'] : []),
          ...(sportName.includes('ufc') ? ['ufc', 'mma'] : []),
          ...(sportName.includes('soccer') ? ['soccer', 'football'] : []),
        ]
        
        if (sportKeywords.some(keyword => title.includes(keyword) || description.includes(keyword))) {
          matchedSport = sport.sport || sport.name || 'Other'
          break
        }
      }
      
      // Fallback: try to detect sport from title
      if (!matchedSport) {
        if (title.includes('nfl') || title.includes('football') || title.includes('super bowl')) {
          matchedSport = 'NFL'
        } else if (title.includes('nba') || title.includes('basketball')) {
          matchedSport = 'NBA'
        } else if (title.includes('cfb') || title.includes('college football')) {
          matchedSport = 'CFB'
        } else if (title.includes('mlb') || title.includes('baseball')) {
          matchedSport = 'MLB'
        } else if (title.includes('nhl') || title.includes('hockey')) {
          matchedSport = 'NHL'
        } else if (title.includes('ufc') || title.includes('mma')) {
          matchedSport = 'UFC'
        } else {
          matchedSport = 'Other'
        }
      }
      
      if (!grouped[matchedSport]) {
        grouped[matchedSport] = []
      }
      grouped[matchedSport].push(market)
    })
    
    return grouped
  }, [])

  // Map UI category names to potential tag name matches
  const categoryToTagNameMap = {
    'Politics': ['politics', 'political', 'election', 'elections', 'government', 'governance'],
    'Finance': ['finance', 'financial', 'economics', 'economic', 'fiscal', 'monetary'],
    'Crypto': ['crypto', 'cryptocurrency', 'bitcoin', 'ethereum', 'blockchain', 'defi', 'web3'],
    'Tech': ['tech', 'technology', 'software', 'hardware', 'ai', 'artificial intelligence', 'machine learning'],
    'Pop Culture': ['entertainment', 'pop culture', 'celebrity', 'movies', 'music', 'tv', 'television', 'film'],
    'Business': ['business', 'companies', 'corporate', 'enterprise', 'startup', 'startups'],
    'World': ['world', 'international', 'global', 'geopolitics', 'foreign', 'diplomacy'],
    'Science': ['science', 'scientific', 'research', 'physics', 'chemistry', 'biology', 'medicine', 'medical'],
  }

  /**
   * Find tag IDs for a given category by matching category name to tag names
   * @param {string} categoryName - UI category name (e.g., "Politics", "Crypto")
   * @returns {Array<number>} Array of tag IDs for that category
   */
  const findTagIdsForCategory = (categoryName) => {
    if (!tagsRef.current || !Array.isArray(tagsRef.current)) {
      return []
    }

    const tagNameMatches = categoryToTagNameMap[categoryName] || []
    if (tagNameMatches.length === 0) {
      return []
    }

    const matchedTagIds = []
    tagsRef.current.forEach(tag => {
      const tagName = (tag.name || tag.tag || tag.title || '').toLowerCase()
      const tagId = tag.id || tag.tag_id

      if (tagId && tagNameMatches.some(match => tagName.includes(match.toLowerCase()))) {
        matchedTagIds.push(tagId)
      }
    })

    return matchedTagIds
  }

  // Fetch tags on component mount (for category-to-tag_id mapping)
  useEffect(() => {
    const fetchTags = async () => {
      if (tagsRef.current) {
        // Tags already cached
        return
      }

      try {
        const tags = await polymarketService.getTags()
        tagsRef.current = tags
      } catch (err) {
        tagsRef.current = [] // Set to empty array to prevent repeated failed attempts
      }
    }

    fetchTags()
  }, []) // Only run once on mount

  // Fetch markets based on selected category or event filter
  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        setLoading(true)
        setError(null)

        // If eventFilter is provided, fetch markets for that event
        if (eventFilter) {
          
          // First, check if event has markets directly
          if (eventFilter.markets && Array.isArray(eventFilter.markets) && eventFilter.markets.length > 0) {
            // Fetch full market data for each market to ensure prices are populated
            const fetchFullMarketData = async (market) => {
              try {
                // Ensure market has an ID
                const marketId = market.id || market.conditionId || market.slug
                if (marketId) {
                  // Try to fetch full market data if prices are missing
                  if (!market.yesPrice && !market.noPrice) {
                    const fullMarket = await polymarketService.getMarket(marketId)
                    if (fullMarket && (fullMarket.yesPrice !== undefined || fullMarket.noPrice !== undefined)) {
                      return fullMarket
                    }
                  }
                }
              } catch (error) {
                // If fetch fails, continue with original market data
              }
              
              // Parse outcomePrices if it's a string
              let yesPrice = market.yesPrice
              let noPrice = market.noPrice
              
              if (!yesPrice && !noPrice && market.outcomePrices) {
                try {
                  const prices = typeof market.outcomePrices === 'string' 
                    ? JSON.parse(market.outcomePrices) 
                    : market.outcomePrices
                  if (Array.isArray(prices) && prices.length >= 2) {
                    yesPrice = parseFloat(prices[0]) * 100 // Convert from decimal to cents
                    noPrice = parseFloat(prices[1]) * 100
                  }
                } catch (e) {
                  // If parsing fails, use defaults
                }
              }
              
              // Return market with defaults if no prices
              return {
                ...market,
                id: market.id || market.conditionId || market.slug || `event-market-${Date.now()}`,
                yesPrice: yesPrice || 50,
                noPrice: noPrice || 50
              }
            }
            
            const transformedMarkets = await Promise.all(
              eventFilter.markets.map(fetchFullMarketData)
            )
            setMarkets(transformedMarkets)
            setLoading(false)
            return
          }
          
          // Otherwise, search for markets using event title or slug
          const searchQuery = eventFilter.slug || eventFilter.title || eventFilter.question || eventFilter.name
          if (searchQuery) {
            const searchResults = await polymarketService.searchMarkets(searchQuery, {
              limit_per_type: 100,
              search_tags: true,
              sort: 'relevance',
            })
            
            // Filter results to match event more closely
            const eventMarkets = searchResults.filter(market => {
              const marketTitle = (market.title || market.question || '').toLowerCase()
              const marketDescription = (market.description || '').toLowerCase()
              const eventTitle = (eventFilter.title || eventFilter.question || eventFilter.name || '').toLowerCase()
              const eventSlug = (eventFilter.slug || '').toLowerCase()
              
              // Check if market title/description contains event title or slug
              return marketTitle.includes(eventTitle) || 
                     marketDescription.includes(eventTitle) ||
                     (eventSlug && (marketTitle.includes(eventSlug) || marketDescription.includes(eventSlug)))
            })
            
            setMarkets(eventMarkets)
            setLoading(false)
            return
          }
          
          // If no search query available, show empty
          setMarkets([])
          setLoading(false)
          return
        }

        // For "Trending" and "New", fetch all markets (client-side filtering)
        if (selectedCategory === 'Trending' || selectedCategory === 'New') {
          // Check cache first
          if (categoryCacheRef.current['Trending']) {
            setMarkets(categoryCacheRef.current['Trending'])
            setLoading(false)
            return
          }

          const marketsData = await polymarketService.getMarkets({
            limit: 1000, // Increased limit for better results after client-side filtering
            active: true,
            closed: false, // Only fetch open markets
            order: 'endDate', // Sort by endDate
            ascending: true, // Ascending order (earliest dates first)
          })
          
          setMarkets(marketsData)
          // Cache the results
          categoryCacheRef.current['Trending'] = marketsData
        } else {
          // For specific categories, fetch fresh data using API parameters
          // Check cache first
          if (categoryCacheRef.current[selectedCategory]) {
            setMarkets(categoryCacheRef.current[selectedCategory])
            setLoading(false)
            return
          }

          // Get Polymarket API parameters for this category
          const apiParams = categoryApiMap[selectedCategory]
          const categoryKeywords = categoryMap[selectedCategory] || []
          
          if (!apiParams && categoryKeywords.length === 0) {
            setMarkets([])
            setLoading(false)
            return
          }

          // Build API options
          const apiOptions = {
            limit: 1000,
            active: true,
            closed: false, // Only fetch open markets
            order: 'endDate', // Sort by endDate
            ascending: true, // Ascending order (earliest dates first)
            // Add category name for debugging/visibility
            _category: selectedCategory.toLowerCase(),
          }
          
          // For Sports category, try to use sports tag IDs if available
          if (selectedCategory === 'Sports') {
            try {
              // Get sports metadata (cache them)
              if (!sportsDataRef.current) {
                const sports = await polymarketService.getSports()
                sportsDataRef.current = sports
                // Get all unique tag IDs from all sports
                const allTagIds = new Set()
                sports.forEach(sport => {
                  if (sport.tags) {
                    const tagIds = typeof sport.tags === 'string' 
                      ? sport.tags.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))
                      : Array.isArray(sport.tags) 
                        ? sport.tags.map(id => parseInt(id)).filter(id => !isNaN(id))
                        : []
                    tagIds.forEach(id => allTagIds.add(id))
                  }
                })
                sportsTagIdsRef.current = Array.from(allTagIds)
              }
              
              if (sportsTagIdsRef.current.length > 0) {
                // Filter out invalid tag IDs
                const validTagIds = sportsTagIdsRef.current.filter(id => 
                  id != null && !isNaN(id) && typeof id === 'number' && id > 0
                )
                
                if (validTagIds.length > 0) {
                  // Use the first valid tag ID
                  const tagIdToUse = validTagIds[0]
                  apiOptions.tag_id = tagIdToUse
                  apiOptions.related_tags = true
                }
              }
            } catch (err) {
            }
          } else {
            // For non-sports categories, try to find tag IDs from tags API
            const categoryTagIds = findTagIdsForCategory(selectedCategory)
            if (categoryTagIds.length > 0) {
              // Use all matched tag IDs for server-side filtering
              apiOptions.tag_id = categoryTagIds
              apiOptions.related_tags = true // Include related tags
            } else {
            }
          }
          
          // Add other API-specific parameters if available
          if (apiParams) {
            if (apiParams.sports_market_types && Array.isArray(apiParams.sports_market_types) && apiParams.sports_market_types.length > 0) {
              apiOptions.sports_market_types = apiParams.sports_market_types
            }
            if (apiParams.tag_id) {
              apiOptions.tag_id = apiParams.tag_id
            }
          }

          // Fetch markets (with server-side filtering if tag_id is available)
          const marketsData = await polymarketService.getMarkets(apiOptions)
          
          // Client-side filtering by category keywords (as fallback or additional filter)
          const filtered = marketsData.filter(market => {
            if (categoryKeywords.length === 0) {
              return true
            }
            
            const marketCategory = market.category?.toLowerCase() || ''
            const marketTitle = market.title?.toLowerCase() || ''
            const marketDescription = market.description?.toLowerCase() || ''
            
            return categoryKeywords.some(keyword => 
              marketCategory.includes(keyword) ||
              marketTitle.includes(keyword) ||
              marketDescription.includes(keyword) ||
              marketCategory === keyword
            )
          })

          // For Sports category, group markets by sport (optional - can be enabled later)
          // if (selectedCategory === 'Sports' && sportsDataRef.current) {
          //   const grouped = groupMarketsBySport(filtered, sportsDataRef.current)
          //   setMarketsBySport(grouped)
          // }

          setMarkets(filtered)
          // Cache the filtered results for this category
          categoryCacheRef.current[selectedCategory] = filtered
        }
      } catch (err) {
        console.error('Error fetching markets:', err)
        setError(err.message || 'Failed to load markets')
      } finally {
        setLoading(false)
      }
    }

    fetchMarkets()
  }, [selectedCategory, eventFilter]) // Re-fetch when category or eventFilter changes

  // Handle search queries using public-search endpoint
  useEffect(() => {
    const performSearch = async () => {
      if (!searchQuery || searchQuery.trim().length === 0) {
        // If search is cleared, restore markets for current category
        if (categoryCacheRef.current[selectedCategory]) {
          setMarkets(categoryCacheRef.current[selectedCategory])
        }
        return
      }

      try {
        setIsSearching(true)
        setError(null)

        const searchResults = await polymarketService.searchMarkets(searchQuery, {
          limit_per_type: 50, // Limit results per type (markets, events, etc.)
          search_tags: true, // Search in tags
          search_profiles: false, // Don't search profiles for now
          sort: 'relevance', // Sort by relevance
        })

        setMarkets(searchResults)
      } catch (err) {
        console.error('Error searching markets:', err)
        setError(err.message || 'Search failed')
        setMarkets([])
      } finally {
        setIsSearching(false)
      }
    }

    // Debounce search to avoid too many API calls
    const timeoutId = setTimeout(() => {
      performSearch()
    }, 500) // Wait 500ms after user stops typing

    return () => clearTimeout(timeoutId)
  }, [searchQuery, selectedCategory]) // Re-search when query or category changes

  // Sport-specific tag IDs and keywords (defined here to avoid hook order issues)
  const SPORT_TAG_IDS = {
    NFL: 517,
    CFB: 518,
    NBA: 780
  }

  const SPORT_KEYWORDS = {
    NFL: ['nfl', 'national football league', 'super bowl', 'afc', 'nfc', 'nfl team', 'nfl player'],
    CFB: ['cfb', 'college football', 'ncaa football', 'ncaa', 'college', 'cfp', 'college football playoff'],
    NBA: ['nba', 'national basketball association', 'nba team', 'nba player', 'nba game', 'nba playoff']
  }

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

  // Fetch sports markets when Sports category is selected
  useEffect(() => {
    if (selectedCategory === 'Sports' && !eventFilter && !searchQuery) {
      const fetchSportsMarkets = async () => {
        try {
          const sportPromises = Object.entries(SPORT_TAG_IDS).map(async ([sport, tagId]) => {
            try {
              const sportMarkets = await polymarketService.getMarkets({
                tag_id: tagId,
                active: true,
                closed: false,
                limit: 200,
                related_tags: false
              })
              
              // Filter markets to ensure they're actually for this sport
              const keywords = SPORT_KEYWORDS[sport]
              const filtered = (sportMarkets || []).filter(market => {
                const title = (market.title || market.question || '').toLowerCase()
                const description = (market.description || '').toLowerCase()
                const searchText = `${title} ${description}`
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
          setSportsMarketsBySport(grouped)
          
          // Set markets to selected sport
          if (grouped[selectedSport]) {
            setMarkets(grouped[selectedSport])
          }
        } catch (err) {
          console.error('Error fetching sports markets:', err)
        }
      }

      fetchSportsMarkets()
    }
  }, [selectedCategory, eventFilter, searchQuery, selectedSport])

  // Update markets when sport selection changes
  useEffect(() => {
    if (selectedCategory === 'Sports' && sportsMarketsBySport[selectedSport]) {
      setMarkets(sportsMarketsBySport[selectedSport])
    }
  }, [selectedSport, sportsMarketsBySport, selectedCategory])

  const formatPrice = (price) => {
    if (price >= 100) return '100.0¢'
    if (price <= 0) return '0.0¢'
    return `${price.toFixed(1)}¢`
  }

  const formatCurrency = (value) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`
    return `$${value.toLocaleString()}`
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' })
  }

  const calculateSpread = (yesPrice, noPrice) => {
    return Math.abs(yesPrice - noPrice)
  }

  /**
   * Helper function to check if market is closed
   */
  const isMarketClosed = (market) => {
    return market.closed === true || market.closed === 'true' || 
           (market.polymarketData && market.polymarketData.closed === true)
  }

  /**
   * Sort markets: open markets first, then closed markets
   * Within each group, sort by volume (24hr volume first, then total volume) - most traded first
   */
  const sortMarkets = (marketsArray) => {
    if (!Array.isArray(marketsArray) || marketsArray.length === 0) {
      return marketsArray
    }

    // Separate open and closed markets
    const openMarkets = []
    const closedMarkets = []

    marketsArray.forEach(market => {
      if (isMarketClosed(market)) {
        closedMarkets.push(market)
      } else {
        openMarkets.push(market)
      }
    })

    // Sort function: by volume (24hr volume first, then total volume) - descending (most traded first)
    const sortByVolume = (a, b) => {
      // Prioritize 24hr volume, fallback to total volume
      const volumeA = a.volume24h || a.volume || 0
      const volumeB = b.volume24h || b.volume || 0
      
      // If volumes are equal, use total volume as tiebreaker
      if (volumeA === volumeB) {
        const totalVolumeA = a.volume || 0
        const totalVolumeB = b.volume || 0
        return totalVolumeB - totalVolumeA // Descending
      }
      
      return volumeB - volumeA // Descending (most traded first)
    }

    // Sort each group by volume
    openMarkets.sort(sortByVolume)
    closedMarkets.sort(sortByVolume)

    // Return open markets first, then closed markets
    return [...openMarkets, ...closedMarkets]
  }

  // Apply filters to markets
  const applyFilters = (marketsArray) => {
    return marketsArray.filter(market => {
      // 24hr Volume filter
      if (filters.volume24h) {
        const volume24h = market.volume24h || market.volume || 0
        const threshold = parseFloat(filters.volume24h.replace(/[^0-9.]/g, '')) * (filters.volume24h.includes('M') ? 1000000 : 1000)
        if (volume24h < threshold) return false
      }

      // Total Volume filter
      if (filters.totalVolume) {
        const totalVolume = market.volume || 0
        const threshold = parseFloat(filters.totalVolume.replace(/[^0-9.]/g, '')) * (filters.totalVolume.includes('M') ? 1000000 : 1000)
        if (totalVolume < threshold) return false
      }

      // Liquidity filter
      if (filters.liquidity) {
        const liquidity = market.liquidity || market.volume || 0
        const threshold = parseFloat(filters.liquidity.replace(/[^0-9.]/g, '')) * (filters.liquidity.includes('K') ? 1000 : 1)
        if (filters.liquidity.startsWith('<')) {
          if (liquidity >= threshold) return false
        } else {
          if (liquidity < threshold) return false
        }
      }

      // End Date filter
      if (filters.endDate && market.endDate) {
        const endDate = new Date(market.endDate)
        const now = new Date()
        const daysUntilEnd = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24))
        const maxDays = parseFloat(filters.endDate.replace(/[^0-9.]/g, ''))
        if (daysUntilEnd > maxDays) return false
      }

      return true
    })
  }

  // Filter and sort: open markets first, sorted by volume (most traded first)
  const filteredMarkets = sortMarkets(applyFilters(markets))

  // Count active filters
  const activeFilterCount = Object.values(filters).filter(f => f !== null).length

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading markets...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="text-6xl mb-6">📊</div>
          <h2 className="text-2xl font-bold text-white mb-3">No Markets Available</h2>
          <p className="text-gray-400 mb-6">
            We couldn't fetch markets from Polymarket at this time. This could be due to a temporary connection issue or API maintenance.
          </p>
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
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-black border-b border-gray-800 px-6 py-4">
        <div className="max-w-[1920px] mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              {eventFilter && (
                <button
                  onClick={() => onClearEventFilter && onClearEventFilter()}
                  className="text-gray-400 hover:text-white transition"
                  title="View all markets"
                >
                  ← Back
                </button>
              )}
              <h1 className="text-2xl font-bold text-white">
                {eventFilter 
                  ? `${eventFilter.title || eventFilter.question || eventFilter.name || 'Event'} Markets (${filteredMarkets.length})`
                  : searchQuery 
                    ? `Search: "${searchQuery}" (${filteredMarkets.length} results)`
                    : selectedCategory === 'Sports'
                      ? `${selectedSport} Markets (${filteredMarkets.length})`
                      : `${filteredMarkets.length} Markets`}
              </h1>
            </div>
            <div className="flex items-center gap-4">
              {/* View Toggle */}
              <div className="flex items-center gap-1 bg-gray-900 border border-gray-700 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded transition ${
                    viewMode === 'list'
                      ? 'bg-yellow-500 text-black'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                  title="List View"
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('tile')}
                  className={`p-2 rounded transition ${
                    viewMode === 'tile'
                      ? 'bg-yellow-500 text-black'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                  title="Tile View"
                >
                  <Grid className="h-4 w-4" />
                </button>
              </div>
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-gray-900 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500"
                />
                {isSearching && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-400"></div>
                  </div>
                )}
              </div>
              {/* Filter Button */}
              <button 
                onClick={() => setShowFilterModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg hover:bg-gray-800 transition relative"
              >
                <Filter className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-300">Filter</span>
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-yellow-500 text-black text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Category Filters or Sport Tabs */}
          <div className="mt-4">
            {selectedCategory === 'Sports' && !eventFilter && !searchQuery ? (
              // Sport tabs when Sports category is selected
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
                      ({sportsMarketsBySport[sport]?.length || 0})
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              // Category filters for other categories
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                      selectedCategory === category
                        ? 'bg-yellow-500 text-black border-2 border-yellow-500'
                        : 'bg-gray-900 text-gray-300 border border-gray-700 hover:bg-gray-800'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Markets Content */}
      <div className="max-w-[1920px] mx-auto px-6 py-6">
        {markets.length === 0 ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center max-w-md">
              <div className="text-6xl mb-6">🔍</div>
              <h2 className="text-2xl font-bold text-white mb-3">No Markets Found</h2>
              <p className="text-gray-400 mb-2">
                There are currently no active markets available from Polymarket.
              </p>
              <p className="text-gray-500 text-sm">
                Check back later for new prediction markets.
              </p>
            </div>
          </div>
        ) : filteredMarkets.length === 0 ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center max-w-md">
              <div className="text-6xl mb-6">🔎</div>
              <h2 className="text-2xl font-bold text-white mb-3">No Markets Match Your Filters</h2>
              <p className="text-gray-400 mb-4">
                Try adjusting your search or category filters to see more markets.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('')
                  setSelectedCategory('Trending')
                }}
                className="px-6 py-2 bg-yellow-500 text-black rounded-lg hover:bg-yellow-600 transition font-semibold text-sm"
              >
                Clear Filters
              </button>
            </div>
          </div>
        ) : viewMode === 'list' ? (
          /* List View */
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Title</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Prices</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400">Spread</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400">24h Vol</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400">Volume</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400">Liquidity</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Start</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">End</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-400">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredMarkets.map((market) => {
                  const spread = calculateSpread(market.yesPrice || 0, market.noPrice || 0)
                  const volume24h = market.volume24h || market.volume || 0
                  const totalVolume = market.volume || 0
                  const liquidity = market.liquidity || market.volume || 0

                  return (
                    <tr
                      key={market.id}
                      onClick={() => onSelectMarket && onSelectMarket(market)}
                      className="border-b border-gray-900 hover:bg-gray-900/50 transition cursor-pointer"
                    >
                      {/* Title */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <MarketImage 
                            market={market}
                            alt={market.title || 'Market'}
                            fallbackIcon={market.icon}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-medium text-white truncate">
                                {market.title || market.question || `Market ${market.id}`}
                              </p>
                              {isMarketClosed(market) && (() => {
                                const yesPrice = market.yesPrice || 0
                                const noPrice = market.noPrice || 0
                                let resolution = null
                                
                                if (yesPrice >= 99) {
                                  resolution = { outcome: 'Yes', color: 'green' }
                                } else if (noPrice >= 99) {
                                  resolution = { outcome: 'No', color: 'red' }
                                } else if (yesPrice > 45 && yesPrice < 55 && noPrice > 45 && noPrice < 55) {
                                  resolution = { outcome: 'Unresolved', color: 'gray' }
                                }
                                
                                if (resolution) {
                                  return (
                                    <span className={`px-2 py-0.5 text-xs font-semibold rounded ${
                                      resolution.color === 'green' 
                                        ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                                        : resolution.color === 'red'
                                        ? 'bg-red-500/20 text-red-400 border border-red-500/50'
                                        : 'bg-gray-500/20 text-gray-400 border border-gray-500/50'
                                    }`}>
                                      {resolution.outcome === 'Yes' ? '✅ Yes' : 
                                       resolution.outcome === 'No' ? '❌ No' : 
                                       '⏸️ Unresolved'}
                                    </span>
                                  )
                                }
                                return null
                              })()}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Prices */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-green-400 font-medium">
                            Yes {formatPrice(market.yesPrice || 0)}
                          </span>
                          <span className="text-gray-600">•</span>
                          <span className="text-red-400 font-medium">
                            No {formatPrice(market.noPrice || 0)}
                          </span>
                        </div>
                      </td>

                      {/* Spread */}
                      <td className="py-4 px-4 text-right text-sm text-gray-300">
                        {formatPrice(spread)}
                      </td>

                      {/* 24h Vol */}
                      <td className="py-4 px-4 text-right text-sm text-gray-300">
                        {formatCurrency(volume24h)}
                      </td>

                      {/* Volume */}
                      <td className="py-4 px-4 text-right text-sm text-gray-300">
                        {formatCurrency(totalVolume)}
                      </td>

                      {/* Liquidity */}
                      <td className="py-4 px-4 text-right text-sm text-gray-300">
                        {formatCurrency(liquidity)}
                      </td>

                      {/* Start */}
                      <td className="py-4 px-4 text-sm text-gray-400">
                        {formatDate(market.startDate || market.createdDate)}
                      </td>

                      {/* End */}
                      <td className="py-4 px-4 text-sm text-gray-400">
                        {formatDate(market.endDate || market.resolutionDate)}
                      </td>

                      {/* Action */}
                      <td className="py-4 px-4 text-center">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation() // Prevent row click
                            onSelectMarket && onSelectMarket(market)
                          }}
                          className="px-4 py-2 bg-yellow-500 text-black rounded-lg hover:bg-yellow-600 transition font-semibold text-sm"
                        >
                          Trade
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* Tile View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredMarkets.map((market) => {
              const spread = calculateSpread(market.yesPrice || 0, market.noPrice || 0)
              const volume24h = market.volume24h || market.volume || 0
              const totalVolume = market.volume || 0

              return (
                <div
                  key={market.id}
                  onClick={() => onSelectMarket && onSelectMarket(market)}
                  className="bg-gray-900 border border-gray-800 rounded-lg p-4 hover:border-yellow-500/50 hover:bg-gray-800/50 transition cursor-pointer flex flex-col h-full"
                >
                  {/* Image/Icon */}
                  <div className="mb-3 flex justify-center">
                    <MarketImage 
                      market={market}
                      alt={market.title || 'Market'}
                      fallbackIcon={market.icon}
                      size="large"
                    />
                  </div>

                  {/* Title */}
                  <h3 className="text-sm font-semibold text-white mb-2 line-clamp-2">
                    {market.title || market.question || `Market ${market.id}`}
                  </h3>

                  {/* Closed Market Resolution Badge */}
                  {isMarketClosed(market) && (() => {
                    const yesPrice = market.yesPrice || 0
                    const noPrice = market.noPrice || 0
                    let resolution = null
                    
                    if (yesPrice >= 99) {
                      resolution = { outcome: 'Yes', color: 'green' }
                    } else if (noPrice >= 99) {
                      resolution = { outcome: 'No', color: 'red' }
                    } else if (yesPrice > 45 && yesPrice < 55 && noPrice > 45 && noPrice < 55) {
                      resolution = { outcome: 'Unresolved', color: 'gray' }
                    }
                    
                    if (resolution) {
                      return (
                        <div className="mb-2">
                          <span className={`inline-block px-2 py-1 text-xs font-semibold rounded ${
                            resolution.color === 'green' 
                              ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                              : resolution.color === 'red'
                              ? 'bg-red-500/20 text-red-400 border border-red-500/50'
                              : 'bg-gray-500/20 text-gray-400 border border-gray-500/50'
                          }`}>
                            {resolution.outcome === 'Yes' ? '✅ Yes Won' : 
                             resolution.outcome === 'No' ? '❌ No Won' : 
                             '⏸️ Unresolved'}
                          </span>
                        </div>
                      )
                    }
                    return null
                  })()}

                  {/* Prices */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-green-400 font-medium">
                        Yes {formatPrice(market.yesPrice || 0)}
                      </span>
                      <span className="text-gray-600">•</span>
                      <span className="text-xs text-red-400 font-medium">
                        No {formatPrice(market.noPrice || 0)}
                      </span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
                    <div>
                      <span className="text-gray-500">24h Vol</span>
                      <p className="text-white font-medium">{formatCurrency(volume24h)}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-gray-500">Spread</span>
                      <p className="text-white font-medium">{formatPrice(spread)}</p>
                    </div>
                  </div>

                  {/* Action Button - Pushed to bottom with mt-auto */}
                  <button 
                    onClick={(e) => {
                      e.stopPropagation()
                      onSelectMarket && onSelectMarket(market)
                    }}
                    className="w-full px-4 py-2 bg-yellow-500 text-black rounded-lg hover:bg-yellow-600 transition font-semibold text-sm mt-auto"
                  >
                    Trade
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Filter Modal */}
      {showFilterModal && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowFilterModal(false)}
        >
          <div 
            className="bg-[#0a0d14] border border-white/20 rounded-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h2 className="text-xl font-bold text-white">Filter Markets</h2>
              <button
                onClick={() => {
                  setFilters({ volume24h: null, totalVolume: null, liquidity: null, endDate: null })
                }}
                className="text-sm text-gray-400 hover:text-white transition"
              >
                Clear All
              </button>
            </div>

            {/* Filter Options */}
            <div className="p-6 space-y-6">
              {/* 24hr Volume */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-3">24hr Volume</label>
                <div className="flex flex-wrap gap-2">
                  {['>10K', '>25K', '>50K', '>100K', '>500K', '>1M'].map((option) => (
                    <button
                      key={option}
                      onClick={() => setFilters(prev => ({
                        ...prev,
                        volume24h: prev.volume24h === option ? null : option
                      }))}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                        filters.volume24h === option
                          ? 'bg-yellow-500 text-black'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              {/* Total Volume */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-3">Total Volume</label>
                <div className="flex flex-wrap gap-2">
                  {['>50K', '>100K', '>250K', '>500K', '>1M', '>5M', '>10M'].map((option) => (
                    <button
                      key={option}
                      onClick={() => setFilters(prev => ({
                        ...prev,
                        totalVolume: prev.totalVolume === option ? null : option
                      }))}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                        filters.totalVolume === option
                          ? 'bg-yellow-500 text-black'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              {/* Liquidity */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-3">Liquidity</label>
                <div className="flex flex-wrap gap-2">
                  {['<100', '<1K', '>1K', '>5K', '>10K', '>50K', '>100K', '>250K'].map((option) => (
                    <button
                      key={option}
                      onClick={() => setFilters(prev => ({
                        ...prev,
                        liquidity: prev.liquidity === option ? null : option
                      }))}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                        filters.liquidity === option
                          ? 'bg-yellow-500 text-black'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              {/* End Date */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-3">End Date</label>
                <div className="flex flex-wrap gap-2">
                  {['<1 day', '<3 days', '<5 days', '<7 days', '<14 days'].map((option) => (
                    <button
                      key={option}
                      onClick={() => setFilters(prev => ({
                        ...prev,
                        endDate: prev.endDate === option ? null : option
                      }))}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                        filters.endDate === option
                          ? 'bg-yellow-500 text-black'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end p-6 border-t border-white/10">
              <button
                onClick={() => setShowFilterModal(false)}
                className="px-6 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

