import React, { useState, useEffect } from 'react'
import { TrendingUp, Calendar, DollarSign, ArrowRight, Grid, ExternalLink } from 'lucide-react'
import { polymarketService } from '../services/PolymarketService'

export default function SportsMarketsView({ onSelectMarket, onViewAllMarkets }) {
  const [sports, setSports] = useState([])
  const [events, setEvents] = useState([])
  const [eventsBySport, setEventsBySport] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedSport, setSelectedSport] = useState(null)

  useEffect(() => {
    const fetchSportsAndEvents = async () => {
      try {
        setLoading(true)
        setError(null)

        // Step 1: Fetch sports from /sports endpoint
        const sportsData = await polymarketService.getSports()
        setSports(sportsData)

        // Step 2: Extract all unique tag IDs from all sports
        const allTagIds = new Set()
        sportsData.forEach(sport => {
          if (sport.tags) {
            const tagIds = typeof sport.tags === 'string' 
              ? sport.tags.split(',').map(id => id.trim()).filter(id => id.length > 0)
              : Array.isArray(sport.tags) 
                ? sport.tags.map(id => String(id))
                : []
            tagIds.forEach(id => allTagIds.add(id))
          }
        })

        const uniqueTagIds = Array.from(allTagIds)
        console.log(`Found ${uniqueTagIds.length} unique tag IDs from ${sportsData.length} sports`)

        // Step 3: Fetch events for each tag ID individually
        const eventPromises = uniqueTagIds.map(async (tagId) => {
          try {
            const eventsForTag = await polymarketService.getEvents({
              tag_id: tagId,
              limit: 100,
              closed: false
            })
            return { tagId, events: eventsForTag || [] }
          } catch (err) {
            console.error(`Error fetching events for tag_id ${tagId}:`, err)
            return { tagId, events: [] }
          }
        })

        const eventResults = await Promise.all(eventPromises)
        
        // Step 4: Group events by sport
        const groupedBySport = {}
        const allEvents = []

        sportsData.forEach(sport => {
          const sportTagIds = typeof sport.tags === 'string' 
            ? sport.tags.split(',').map(id => id.trim()).filter(id => id.length > 0)
            : Array.isArray(sport.tags) 
              ? sport.tags.map(id => String(id))
              : []

          const sportEvents = []
          eventResults.forEach(({ tagId, events: tagEvents }) => {
            if (sportTagIds.includes(String(tagId))) {
              tagEvents.forEach(event => {
                // Avoid duplicates
                if (!sportEvents.find(e => e.id === event.id || e.slug === event.slug)) {
                  sportEvents.push(event)
                }
              })
            }
          })

          // Also add to all events
          sportEvents.forEach(event => {
            if (!allEvents.find(e => e.id === event.id || e.slug === event.slug)) {
              allEvents.push(event)
            }
          })

          if (sportEvents.length > 0) {
            groupedBySport[sport.sport || sport.id] = sportEvents
          }
        })

        setEventsBySport(groupedBySport)
        setEvents(allEvents)

        // Set default selected sport (first sport with events)
        const firstSportWithEvents = Object.keys(groupedBySport)[0]
        if (firstSportWithEvents) {
          setSelectedSport(firstSportWithEvents)
        }
      } catch (err) {
        console.error('Error fetching sports and events:', err)
        setError(err.message || 'Failed to load sports events')
      } finally {
        setLoading(false)
      }
    }

    fetchSportsAndEvents()
  }, [])

  // Update events when sport selection changes
  useEffect(() => {
    if (selectedSport && eventsBySport[selectedSport]) {
      setEvents(eventsBySport[selectedSport])
    } else {
      setEvents([])
    }
  }, [selectedSport, eventsBySport])

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

  const formatCurrency = (value) => {
    if (!value) return '$0'
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`
    return `$${value.toLocaleString()}`
  }

  // Get sport icon (using sport code or name)
  const getSportIcon = (sportCode) => {
    const iconMap = {
      nfl: '🏈',
      cfb: '🏈',
      nba: '🏀',
      ncaab: '🏀',
      cbb: '🏀',
      epl: '⚽',
      lal: '⚽',
      mlb: '⚾',
      nhl: '🏒',
      wnba: '🏀',
      cwbb: '🏀',
      mma: '🥊',
      atp: '🎾',
      wta: '🎾',
      ipl: '🏏',
      dota2: '🎮',
      lol: '🎮',
      valorant: '🎮',
      cs2: '🎮',
    }
    return iconMap[sportCode?.toLowerCase()] || '🏆'
  }

  // Sort events by date or volume
  const sortEvents = (eventsArray) => {
    return [...eventsArray].sort((a, b) => {
      // Try to sort by volume first if available
      const volA = a.volume || a.volume24h || 0
      const volB = b.volume || b.volume24h || 0
      if (volB !== volA) {
        return volB - volA
      }
      // Then by date
      const dateA = a.endDate || a.end_date || a.endDateIso || ''
      const dateB = b.endDate || b.end_date || b.endDateIso || ''
      if (dateA && dateB) {
        return new Date(dateA) - new Date(dateB)
      }
      return 0
    })
  }

  const sortedEvents = sortEvents(events)

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0d14] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading sports events...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0d14] flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="text-6xl mb-6">⚠️</div>
          <h2 className="text-2xl font-bold text-white mb-3">Error Loading Sports Events</h2>
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
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-black border-b border-gray-800 px-6 py-4">
        <div className="max-w-[1920px] mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/20 rounded-lg">
                <span className="text-3xl">🏆</span>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Sports Events</h1>
                <p className="text-gray-400 text-sm mt-1">
                  {selectedSport ? `Events for ${selectedSport.toUpperCase()}` : 'All sports events'}
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
            <button
              onClick={() => setSelectedSport(null)}
              className={`px-6 py-3 rounded-lg text-sm font-semibold whitespace-nowrap transition ${
                selectedSport === null
                  ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400 border-2'
                  : 'bg-gray-900 text-gray-300 border border-gray-700 hover:bg-gray-800'
              }`}
            >
              All Sports
              <span className="ml-2 text-xs opacity-75">
                ({Object.values(eventsBySport).flat().length})
              </span>
            </button>
            {Object.keys(eventsBySport).map(sport => (
              <button
                key={sport}
                onClick={() => setSelectedSport(sport)}
                className={`px-6 py-3 rounded-lg text-sm font-semibold whitespace-nowrap transition ${
                  selectedSport === sport
                    ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400 border-2'
                    : 'bg-gray-900 text-gray-300 border border-gray-700 hover:bg-gray-800'
                }`}
              >
                <span className="text-xl mr-2">{getSportIcon(sport)}</span>
                {sport.toUpperCase()}
                <span className="ml-2 text-xs opacity-75">
                  ({eventsBySport[sport]?.length || 0})
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1920px] mx-auto px-6 py-8">
        {sortedEvents.length === 0 ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center max-w-md">
              <div className="text-6xl mb-6">🏆</div>
              <h2 className="text-2xl font-bold text-white mb-3">No Events Found</h2>
              <p className="text-gray-400 mb-2">
                {selectedSport 
                  ? `There are currently no active events for ${selectedSport.toUpperCase()}.`
                  : 'There are currently no active sports events available.'}
              </p>
              <p className="text-gray-500 text-sm">
                Check back later for new events.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedEvents.map((event) => {
              const eventTitle = event.title || event.question || event.name || event.slug || 'Untitled Event'
              const eventDescription = event.description || ''
              const eventImage = event.image || event.imageUrl || event.thumbnail
              const eventVolume = event.volume || event.volume24h || 0
              const eventMarkets = event.markets || []
              const eventSlug = event.slug || event.id
              const resolutionUrl = event.resolution || ''

              return (
                <div
                  key={event.id || event.slug || eventTitle}
                  className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 hover:border-yellow-500/50 transition group"
                >
                  {/* Event Image */}
                  {eventImage && (
                    <div className="mb-4 -mx-6 -mt-6">
                      <img
                        src={eventImage}
                        alt={eventTitle}
                        className="w-full h-48 object-cover rounded-t-xl"
                        onError={(e) => {
                          e.target.style.display = 'none'
                        }}
                      />
                    </div>
                  )}

                  {/* Event Header */}
                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-white mb-2 line-clamp-2 group-hover:text-yellow-400 transition">
                      {eventTitle}
                    </h3>
                    {eventDescription && (
                      <p className="text-sm text-gray-400 line-clamp-2 mb-3">
                        {eventDescription}
                      </p>
                    )}
                  </div>

                  {/* Event Stats */}
                  <div className="flex items-center gap-4 text-sm text-gray-400 mb-4 pb-4 border-b border-gray-800">
                    {event.endDate || event.end_date || event.endDateIso ? (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {formatDate(event.endDate || event.end_date || event.endDateIso)}
                      </span>
                    ) : null}
                    {eventVolume > 0 && (
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        {formatCurrency(eventVolume)}
                      </span>
                    )}
                    {eventMarkets.length > 0 && (
                      <span className="flex items-center gap-1">
                        <TrendingUp className="h-4 w-4" />
                        {eventMarkets.length} market{eventMarkets.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {eventMarkets.length > 0 && onSelectMarket ? (
                      <button
                        onClick={() => {
                          // If event has markets, select the first one or show markets list
                          if (eventMarkets.length === 1) {
                            onSelectMarket(eventMarkets[0])
                          } else {
                            // Multiple markets - could show a modal or navigate
                            // For now, select the first market
                            onSelectMarket(eventMarkets[0])
                          }
                        }}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-yellow-500 text-black rounded-lg hover:bg-yellow-600 transition font-semibold text-sm"
                      >
                        View Markets
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    ) : null}
                    {resolutionUrl && (
                      <a
                        href={resolutionUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg transition text-sm flex items-center gap-2"
                      >
                        Resolution
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
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
