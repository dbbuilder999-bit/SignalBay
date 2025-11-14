import React, { useState, useEffect } from 'react'
import { polymarketService } from '../services/PolymarketService'

export default function EventsList() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0d14] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading events...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0d14] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">Error: {error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0d14] text-gray-100">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#0a0d14] border-b border-white/10 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-green-400">Polymarket Events</h1>
          <p className="text-sm text-gray-400 mt-1">
            Showing {events.length} active events
          </p>
        </div>
      </div>

      {/* Events List */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid gap-4">
          {events.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400">No events found</p>
            </div>
          ) : (
            events.map((event) => (
              <div
                key={event.id}
                className="bg-white/5 border border-white/10 rounded-lg p-6 hover:bg-white/10 transition cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-2">
                      {event.title || event.question || event.name || `Event ${event.id}`}
                    </h3>
                    {event.description && (
                      <p className="text-sm text-gray-400 mb-3 line-clamp-2">
                        {event.description}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                      {event.slug && (
                        <span className="bg-white/5 px-2 py-1 rounded">
                          {event.slug}
                        </span>
                      )}
                      {event.category && (
                        <span className="bg-white/5 px-2 py-1 rounded">
                          {event.category}
                        </span>
                      )}
                      {event.endDate && (
                        <span>
                          Ends: {new Date(event.endDate).toLocaleDateString()}
                        </span>
                      )}
                      {event.resolutionDate && (
                        <span>
                          Resolves: {new Date(event.resolutionDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  {event.imageUrl && (
                    <img
                      src={event.imageUrl}
                      alt={event.title}
                      className="w-24 h-24 object-cover rounded-lg ml-4"
                    />
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

