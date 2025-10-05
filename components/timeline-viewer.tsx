"use client"

import React from "react"
import { formatYears } from "@/lib/timeline-utils"
import type { TimelineEvent } from "@/lib/timeline-data"

interface TimelineViewerProps {
  events: TimelineEvent[]
  featureName: string
  featureType: string
}

export default function TimelineViewer({ events, featureName, featureType }: TimelineViewerProps) {
  // Sort events by years (oldest first)
  const sortedEvents = [...events].sort((a, b) => b.years - a.years)

  return (
    <div className="space-y-4">
      <div className="border-b pb-2" style={{ borderColor: "#3a4f6f" }}>
        <h3 className="font-serif text-lg" style={{ color: "#ffffff" }}>
          Timeline: {featureName}
        </h3>
        <p className="text-sm" style={{ color: "#D4A574" }}>
          {featureType}
        </p>
      </div>

      <div className="space-y-3">
        {sortedEvents.map((event, index) => (
          <div
            key={index}
            className="p-3 rounded-lg border-l-4"
            style={{
              background: "#1a1a2e",
              borderLeftColor: "#D4A574",
              border: "1px solid #3a4f6f"
            }}
          >
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-medium" style={{ color: "#ffffff" }}>
                {event.phase}
              </h4>
              <span
                className="text-xs px-2 py-1 rounded"
                style={{
                  background: "#2a3f5f",
                  color: "#D4A574",
                }}
              >
                {formatYears(event.years)}
              </span>
            </div>
            
            <p className="text-sm mb-2" style={{ color: "#cccccc" }}>
              {event.description}
            </p>
            
            <div className="flex items-center justify-between text-xs">
              <span style={{ color: "#888888" }}>
                Source: {event.source}
              </span>
              {event.url && (
                <a
                  href={event.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                  style={{ color: "#D4A574" }}
                >
                  Read more →
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}