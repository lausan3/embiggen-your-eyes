"use client"

import React, { useMemo } from "react"
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

  // Calculate logarithmic timeline scale
  const timelineScale = useMemo(() => {
    const ages = sortedEvents.map(e => e.years).filter(y => y > 0)
    
    if (ages.length === 0) {
      return {
        maxAge: 4.5e9,
        minAge: 1e6,
        majorTicks: [4e9, 3e9, 2e9, 1e9, 500e6, 100e6, 10e6, 1e6, 0]
      }
    }
    
    const maxAge = Math.max(...ages, 4.5e9)
    const minAge = Math.min(...ages, 1e6)
    
    // Generate geological time markers
    const majorTicks = [
      4.5e9, 4e9, 3.8e9, 3e9, 2.5e9, 2e9, 1e9, 541e6, 252e6, 66e6, 2.6e6, 0
    ].filter(age => age <= maxAge && age >= minAge / 10)
    
    return { maxAge, minAge, majorTicks }
  }, [sortedEvents])

  // Logarithmic position calculation
  const getLogPosition = (years: number): number => {
    if (years <= 0) return 95
    
    const { maxAge, minAge } = timelineScale
    const logMax = Math.log10(maxAge)
    const logMin = Math.log10(Math.max(minAge, 1e6))
    const logYears = Math.log10(Math.max(years, 1e6))
    
    let normalized = (logMax - logYears) / (logMax - logMin)
    
    // Give recent events more space
    if (years < 100e6) {
      const recentWeight = 1 - (years / 100e6)
      normalized = normalized * 0.7 + recentWeight * 0.3
    }
    
    normalized = Math.max(0, Math.min(1, normalized))
    return 5 + normalized * 85
  }

  return (
    <div className="space-y-6">
      <div className="border-b pb-2" style={{ borderColor: "#3a4f6f" }}>
        <h3 className="font-serif text-lg" style={{ color: "#ffffff" }}>
          Timeline: {featureName}
        </h3>
        <p className="text-sm" style={{ color: "#D4A574" }}>
          {featureType}
        </p>
      </div>

      {/* Logarithmic Timeline Visualization */}
      <div className="relative">
        <h4 className="font-medium text-sm mb-4" style={{ color: "#ffffff" }}>
          Geological Timeline (Logarithmic Scale)
        </h4>
        
        <div
          className="relative h-80 rounded-lg p-4 overflow-hidden"
          style={{ background: "#1a1a2e" }}
        >
          {/* Time axis labels */}
          {timelineScale.majorTicks.map((years) => {
            const position = getLogPosition(years)
            return (
              <React.Fragment key={years}>
                <div
                  className="absolute text-xs"
                  style={{
                    left: `${position}%`,
                    bottom: "10px",
                    color: years === 0 ? "#D4A574" : "#888888",
                    transform: "translateX(-50%)",
                    fontSize: '9px',
                    whiteSpace: 'nowrap',
                    fontWeight: years === 0 ? 'bold' : 'normal'
                  }}
                >
                  {formatYears(years)}
                </div>
                <div
                  className="absolute w-px"
                  style={{
                    left: `${position}%`,
                    top: "30px",
                    bottom: "35px",
                    background: years === 0 ? "#D4A574" : "#3a4f6f",
                    opacity: years === 0 ? 0.8 : 0.4
                  }}
                />
              </React.Fragment>
            )
          })}

          {/* Center timeline */}
          <div
            className="absolute left-0 right-0 h-0.5"
            style={{
              top: "50%",
              background: "#2a3f5f",
              transform: "translateY(-50%)",
            }}
          />

          {/* Plot events */}
          {sortedEvents.map((event, index) => {
            const position = getLogPosition(event.years)
            const isTop = index % 2 === 0
            const yOffset = Math.floor(index / 2) * 70 + 40
            
            return (
              <div
                key={index}
                className="absolute z-10"
                style={{
                  left: `${position}%`,
                  [isTop ? 'top' : 'bottom']: `${yOffset}px`,
                  transform: 'translateX(-50%)',
                  width: '120px',
                }}
              >
                <div className="flex flex-col items-center gap-1">
                  {!isTop && (
                    <>
                      <div
                        className="w-2 h-2 border border-white rounded-full"
                        style={{ background: "#D4A574" }}
                      />
                      <div className="w-0.5 h-6" style={{ background: "#D4A574" }} />
                    </>
                  )}
                  
                  <div
                    className="p-2 rounded text-center leading-tight shadow-lg"
                    style={{
                      background: "#0a0e27",
                      border: "1px solid #D4A574",
                      color: "#fff",
                      width: '110px',
                      fontSize: '8px',
                      minHeight: '50px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      boxShadow: "0 2px 8px rgba(0,0,0,0.3), 0 0 0 1px rgba(212,165,116,0.2)"
                    }}
                  >
                    <div className="font-medium mb-1" style={{ color: "#D4A574", fontSize: '9px' }}>
                      {event.phase.length > 12 ? 
                        event.phase.substring(0, 12) + '...' : 
                        event.phase}
                    </div>
                    <div className="text-[7px] mb-1" style={{ color: "#aaa" }}>
                      {formatYears(event.years)}
                    </div>
                    <div className="text-[6px]" style={{ color: "#ccc" }}>
                      {event.description.length > 35 ? 
                        event.description.substring(0, 35) + '...' : 
                        event.description}
                    </div>
                  </div>
                  
                  {isTop && (
                    <>
                      <div className="w-0.5 h-6" style={{ background: "#D4A574" }} />
                      <div
                        className="w-2 h-2 border border-white rounded-full"
                        style={{ background: "#D4A574" }}
                      />
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Detailed Event List */}
      <div className="space-y-3">
        <h4 className="font-medium text-sm" style={{ color: "#ffffff" }}>
          Detailed Timeline Events
        </h4>
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