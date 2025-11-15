import React, { useState } from 'react'

export default function TruncatedText({ text, maxLength = 150, className = '' }) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (!text) return null

  const shouldTruncate = text.length > maxLength
  const displayText = isExpanded || !shouldTruncate ? text : `${text.slice(0, maxLength)}...`

  return (
    <div className={className}>
      <p className="text-sm text-gray-400 whitespace-pre-wrap">
        {displayText}
      </p>
      {shouldTruncate && (
        <span
          onClick={(e) => {
            e.stopPropagation() // Prevent event bubbling when used inside another button
            setIsExpanded(!isExpanded)
          }}
          className="mt-1 text-xs text-yellow-400 hover:text-yellow-300 transition font-medium cursor-pointer inline-block"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              e.stopPropagation()
              setIsExpanded(!isExpanded)
            }
          }}
        >
          {isExpanded ? 'Show less' : 'Read more'}
        </span>
      )}
    </div>
  )
}

