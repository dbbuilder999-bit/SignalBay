import React, { useState, useEffect } from 'react'
import { Star } from 'lucide-react'
import { polymarketService } from '../services/PolymarketService'

const eventTabs = ['All', 'Most Traded', 'Watchlist']

export default function EventsList({ onSelectEvent }) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('All')
  const [eventWatchlist, setEventWatchlist] = useState(() => {
    // Load event watchlist from localStorage on mount
    try {
      const saved = localStorage.getItem('signalbay-event-watchlist')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true)
        setError(null)
        const eventsData = await polymarketService.getEvents({
          order: 'id',
          ascending: false,
          closed: false,
          limit: 100
        })
        setEvents(eventsData)
      } catch (err) {
        console.error('Error fetching events:', err)
        setError(err.message || 'Failed to load events')
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
  }, [])

  // Save event watchlist to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('signalbay-event-watchlist', JSON.stringify(eventWatchlist))
    } catch (error) {
      console.error('Error saving event watchlist to localStorage:', error)
    }
  }, [eventWatchlist])

  // Toggle event in watchlist
  const toggleEventWatchlist = (eventId, e) => {
    e.stopPropagation() // Prevent event card click
    setEventWatchlist(prev => {
      if (prev.includes(eventId)) {
        return prev.filter(id => id !== eventId)
      } else {
        return [...prev, eventId]
      }
    })
  }

  // Check if event is in watchlist
  const isInWatchlist = (eventId) => {
    return eventWatchlist.includes(eventId)
  }

  // Filter and sort events based on active tab
  const getFilteredEvents = () => {
    let filtered = [...events]

    if (activeTab === 'Watchlist') {
      filtered = filtered.filter(event => isInWatchlist(event.id))
    } else if (activeTab === 'Most Traded') {
      // Sort by volume (24hr volume first, then total volume) - most traded first
      filtered.sort((a, b) => {
        // Prioritize 24hr volume, fallback to total volume, then number of markets
        const volumeA = a.volume24h || a.volume || a.totalVolume || (a.markets?.length || 0) * 1000
        const volumeB = b.volume24h || b.volume || b.totalVolume || (b.markets?.length || 0) * 1000
        return volumeB - volumeA // Descending order (most traded first)
      })
    } else {
      // For "All" tab, also sort by volume (most traded first)
      filtered.sort((a, b) => {
        const volumeA = a.volume24h || a.volume || a.totalVolume || (a.markets?.length || 0) * 1000
        const volumeB = b.volume24h || b.volume || b.totalVolume || (b.markets?.length || 0) * 1000
        return volumeB - volumeA // Descending order (most traded first)
      })
    }

    return filtered
  }

  const filteredEvents = getFilteredEvents()

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading events...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="text-6xl mb-6">⚠️</div>
          <h2 className="text-2xl font-bold text-white mb-3">Error Loading Events</h2>
          <p className="text-gray-400 mb-6">
            {error}
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
          <h1 className="text-2xl font-bold text-white">Events</h1>
          <p className="text-sm text-gray-400 mt-1">
            {activeTab === 'Watchlist' 
              ? `Showing ${filteredEvents.length} watched event${filteredEvents.length !== 1 ? 's' : ''}`
              : `Showing ${filteredEvents.length} active event${filteredEvents.length !== 1 ? 's' : ''}`} • Click an event to view its markets
          </p>
          
          {/* Tabs */}
          <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-2">
            {eventTabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                  activeTab === tab
                    ? 'bg-yellow-500 text-black border-2 border-yellow-500'
                    : 'bg-gray-900 text-gray-300 border border-gray-700 hover:bg-gray-800'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Events List */}
      <div className="max-w-[1920px] mx-auto px-6 py-6">
        {events.length === 0 ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center max-w-md">
              <div className="text-6xl mb-6">📅</div>
              <h2 className="text-2xl font-bold text-white mb-3">No Events Found</h2>
              <p className="text-gray-400 mb-2">
                There are currently no active events available from Polymarket.
              </p>
              <p className="text-gray-500 text-sm">
                Check back later for new events.
              </p>
            </div>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center max-w-md">
              <div className="text-6xl mb-6">
                {activeTab === 'Watchlist' ? '⭐' : '📊'}
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">
                {activeTab === 'Watchlist' 
                  ? 'No Watched Events' 
                  : 'No Events Found'}
              </h2>
              <p className="text-gray-400 mb-2">
                {activeTab === 'Watchlist'
                  ? 'Add events to your watchlist by clicking the star icon on any event card.'
                  : 'There are currently no events matching your selection.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredEvents.map((event) => {
              // Check multiple possible field names for image URL (similar to markets)
              const imageUrl = event.imageUrl || 
                              event.image || 
                              event.thumbnail || 
                              event.image_url ||
                              event.thumbnailUrl ||
                              event.thumbnail_url ||
                              null
              
              // Only render image if it's a valid URL string (not just text)
              const hasValidImage = imageUrl && 
                                   typeof imageUrl === 'string' && 
                                   (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'))
              
              return (
              <div
                key={event.id}
                onClick={() => onSelectEvent && onSelectEvent(event)}
                className="bg-gray-900 border border-gray-800 rounded-lg p-6 hover:border-yellow-500/50 hover:bg-gray-800/50 transition cursor-pointer relative"
              >
                {/* Watchlist Button */}
                <button
                  onClick={(e) => toggleEventWatchlist(event.id, e)}
                  className={`absolute top-4 right-4 p-2 rounded-lg transition z-10 ${
                    isInWatchlist(event.id)
                      ? 'bg-yellow-500/20 hover:bg-yellow-500/30'
                      : 'bg-gray-800/50 hover:bg-gray-700/50'
                  }`}
                  title={isInWatchlist(event.id) ? 'Remove from watchlist' : 'Add to watchlist'}
                >
                  <Star 
                    className={`h-5 w-5 transition ${
                      isInWatchlist(event.id)
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-gray-400'
                    }`} 
                  />
                </button>
                {hasValidImage && (
                  <img
                    src={imageUrl}
                    alt={event.title || event.question || event.name || 'Event'}
                    className="w-full h-32 object-cover rounded-lg mb-4"
                    onError={(e) => {
                      e.target.style.display = 'none'
                    }}
                  />
                )}
                <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2">
                  {event.title || event.question || event.name || `Event ${event.id}`}
                </h3>
                {event.description && (
                  <p className="text-sm text-gray-400 mb-4 line-clamp-3">
                    {event.description}
                  </p>
                )}
                <div className="flex flex-wrap gap-2 text-xs">
                  {event.category && (
                    <span className="bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded">
                      {event.category}
                    </span>
                  )}
                  {event.endDate && (
                    <span className="text-gray-500">
                      Ends: {new Date(event.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </div>
                <div className="mt-3 pt-3 border-t border-gray-800 space-y-1">
                  {event.markets && Array.isArray(event.markets) && event.markets.length > 0 && (
                    <p className="text-xs text-gray-500">
                      {event.markets.length} market{event.markets.length !== 1 ? 's' : ''} available
                    </p>
                  )}
                  {(() => {
                    const volume = event.volume || event.totalVolume || 0
                    if (volume > 0) {
                      const formatVolume = (vol) => {
                        if (vol >= 1000000) return `$${(vol / 1000000).toFixed(1)}M`
                        if (vol >= 1000) return `$${(vol / 1000).toFixed(1)}K`
                        return `$${vol.toLocaleString()}`
                      }
                      return (
                        <p className="text-xs text-yellow-400 font-medium">
                          Vol: {formatVolume(volume)}
                        </p>
                      )
                    }
                    return null
                  })()}
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

