"use client"

import React, { useMemo } from "react"
import { X } from "lucide-react"
import { formatYears } from "@/lib/timeline-utils"
import type { TimelineEvent } from "@/lib/timeline-data"

interface FamousFeature {
  name: string
  type: string
  lat: number
  lon: number
  diameter?: number
  description?: string
  withinRegion?: string
}

interface ComparisonFeature {
  feature: FamousFeature
  timeline: TimelineEvent[]
}

interface FeatureComparisonProps {
  features: ComparisonFeature[]
  onClose: () => void
  onRemoveFeature: (index: number) => void
}

export default function FeatureComparison({ features, onClose, onRemoveFeature }: FeatureComparisonProps) {
  // Get all events for timeline visualization
  const allEvents = useMemo(() => {
    const events: Array<{ event: TimelineEvent; featureIndex: number; featureName: string }> = []
    
    features.forEach((featureData, featureIndex) => {
      featureData.timeline.forEach(event => {
        events.push({
          event,
          featureIndex,
          featureName: featureData.feature.name
        })
      })
    })
    
    return events.filter(e => e.event.years !== null && e.event.years !== undefined)
      .sort((a, b) => b.event.years - a.event.years)
  }, [features])

  // Calculate timeline scale with improved logarithmic approach
  const timelineScale = useMemo(() => {
    const ages = allEvents.map(e => e.event.years).filter(y => y > 0)
    
    if (ages.length === 0) {
      return {
        maxAge: 4.5e9,
        minAge: 1e6,
        majorTicks: [4e9, 3e9, 2e9, 1e9, 500e6, 100e6, 10e6, 1e6, 0]
      }
    }
    
    const maxAge = Math.max(...ages, 4.5e9) // Ensure we show full geological time
    const minAge = Math.min(...ages, 1e6)   // Minimum 1 million years for log scale
    
    // Generate meaningful time markers based on geological periods
    const majorTicks = [
      4.5e9,  // Formation of Earth
      4e9,    // Late Heavy Bombardment
      3.8e9,  // First life
      3e9,    // Archean
      2.5e9,  // Great Oxidation
      2e9,    // Proterozoic
      1e9,    // Multicellular life
      541e6,  // Cambrian explosion
      252e6,  // Permian extinction
      66e6,   // K-Pg extinction (dinosaurs)
      2.6e6,  // Quaternary period
      0       // Present
    ].filter(age => age <= maxAge && age >= minAge / 10)
    
    return { maxAge, minAge, majorTicks }
  }, [allEvents])

  // Completely rewritten logarithmic position calculation
  const getLogPosition = (years: number): number => {
    if (years <= 0) return 95 // Present day at far right
    
    const { maxAge, minAge } = timelineScale
    
    // Enhanced logarithmic scale with geological time awareness
    const logMax = Math.log10(maxAge)
    const logMin = Math.log10(Math.max(minAge, 1e6))
    const logYears = Math.log10(Math.max(years, 1e6))
    
    // Normalize to 0-1 range
    let normalized = (logMax - logYears) / (logMax - logMin)
    
    // Apply geological time weighting for better distribution
    // Recent events (< 100Ma) get more space on the right
    if (years < 100e6) {
      const recentWeight = 1 - (years / 100e6)
      normalized = normalized * 0.7 + recentWeight * 0.3
    }
    
    // Clamp and apply to timeline width (5% to 90% of container)
    normalized = Math.max(0, Math.min(1, normalized))
    return 5 + normalized * 85
  }

  const colors = ["#4a9eff", "#ff9d4a", "#9d4edd", "#00ff88"]

  return (
    <div
      className="fixed inset-0 backdrop-blur-sm flex items-center justify-center p-6 z-[9999]"
      style={{ background: "rgba(0, 0, 0, 0.92)" }}
      onClick={onClose}
    >
      <div
        className="border rounded-2xl p-8 max-w-6xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        style={{
          background: "#1a1a1a",
          borderColor: "rgba(212, 165, 116, 0.3)",
          boxShadow: "0 0 0 1px rgba(212, 165, 116, 0.1), 0 20px 60px rgba(0, 0, 0, 0.8)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="font-serif text-2xl mb-2" style={{ color: "#ffffff" }}>
              Feature Comparison
            </h3>
            <p className="text-sm" style={{ color: "#D4A574" }}>
              Comparing {features.length} features across geological time
            </p>
          </div>
          <button
            onClick={onClose}
            className="transition-colors p-2 -m-2 hover:bg-white/5 rounded-lg"
            style={{ color: "#888888" }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feature Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {features.map((featureData, index) => (
            <div
              key={index}
              className="p-4 rounded-lg border relative"
              style={{
                background: "#0a0e27",
                borderColor: colors[index],
                borderWidth: 2,
              }}
            >
              <button
                onClick={() => onRemoveFeature(index)}
                className="absolute top-2 right-2 text-xs hover:text-red-400 transition-colors"
                style={{ color: "#888888" }}
              >
                <X className="w-4 h-4" />
              </button>
              
              <h4 className="font-medium mb-2" style={{ color: colors[index] }}>
                {featureData.feature.name}
              </h4>
              
              <div className="space-y-1 text-sm">
                <p style={{ color: "#e5e5e5" }}>
                  <strong>Type:</strong> {featureData.feature.type}
                </p>
                <p style={{ color: "#e5e5e5" }}>
                  <strong>Location:</strong> {featureData.feature.lat.toFixed(1)}°, {featureData.feature.lon.toFixed(1)}°
                </p>
                {featureData.feature.diameter && (
                  <p style={{ color: "#e5e5e5" }}>
                    <strong>Diameter:</strong> {featureData.feature.diameter} km
                  </p>
                )}
                {featureData.feature.withinRegion && (
                  <p style={{ color: "#e5e5e5" }}>
                    <strong>Region:</strong> {featureData.feature.withinRegion}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Timeline Visualization */}
        <div className="mb-8">
          <h4 className="font-medium text-lg mb-4" style={{ color: "#ffffff" }}>
            Timeline Comparison (Logarithmic Scale)
          </h4>
          
          <div
            className="relative h-96 rounded-lg p-6 overflow-x-auto overflow-y-visible"
            style={{ background: "#1a1a2e" }}
          >
            {/* Time axis labels with dynamic geological markers */}
            {timelineScale.majorTicks.map((years, axisIndex) => {
              const position = getLogPosition(years)
              return (
                <React.Fragment key={years}>
                  <div
                    className="absolute text-xs"
                    style={{
                      left: `${position}%`,
                      bottom: "15px",
                      color: years === 0 ? "#D4A574" : "var(--color-muted-foreground)",
                      transform: "translateX(-50%)",
                      fontSize: '9px',
                      whiteSpace: 'nowrap',
                      zIndex: 1,
                      fontWeight: years === 0 ? 'bold' : 'normal'
                    }}
                  >
                    {formatYears(years)}
                  </div>
                  <div
                    className="absolute w-px"
                    style={{
                      left: `${position}%`,
                      top: "40px",
                      bottom: "50px",
                      background: years === 0 ? "#D4A574" : "#3a4f6f",
                      zIndex: 0,
                      opacity: years === 0 ? 0.8 : 0.4
                    }}
                  />
                </React.Fragment>
              )
            })}

            {/* Center line */}
            <div
              className="absolute left-0 right-0 h-0.5"
              style={{
                top: "50%",
                background: "#2a3f5f",
                transform: "translateY(-50%)",
              }}
            />

            {/* Plot events with advanced collision avoidance */}
            {(() => {
              // Enhanced positioning system with horizontal displacement
              const eventPositions: Array<{
                event: any
                featureIndex: number
                featureName: string
                x: number
                y: number
                isTop: boolean
              }> = []

              const CARD_WIDTH = 85
              const CARD_HEIGHT = 45
              const MIN_H_SEPARATION = 20  // Increased horizontal separation
              const MIN_V_SEPARATION = 15  // Increased vertical separation
              const LANE_HEIGHT = 65       // Increased lane spacing
              const MAX_LANES = 4          // More lanes available
              const MAX_H_OFFSET = 15      // Maximum horizontal displacement

              // Sort events by time (oldest first) for logical positioning
              const sortedEvents = [...allEvents].sort((a, b) => b.event.years - a.event.years)

              sortedEvents.forEach((eventData, index) => {
                const baseX = getLogPosition(eventData.event.years)
                const clampedBaseX = Math.max(8, Math.min(88, baseX))

                let bestPosition = { x: clampedBaseX, y: 0, isTop: true }
                let foundPerfectSpot = false

                // Test different horizontal offsets first
                for (let hOffset of [0, -MAX_H_OFFSET, MAX_H_OFFSET, -MAX_H_OFFSET*2, MAX_H_OFFSET*2]) {
                  if (foundPerfectSpot) break

                  const testX = Math.max(8, Math.min(88, clampedBaseX + hOffset))

                  // Test positions above and below center line
                  for (let isTop of [true, false]) {
                    if (foundPerfectSpot) break

                    for (let lane = 0; lane < MAX_LANES; lane++) {
                      const testY = isTop ? lane * LANE_HEIGHT + 50 : lane * LANE_HEIGHT + 80
                      
                      // Check for any overlap with existing events
                      let hasOverlap = false

                      for (const existing of eventPositions) {
                        const dx = Math.abs(testX - existing.x)
                        const dy = Math.abs(testY - existing.y)
                        
                        // More stringent overlap detection
                        if (dx < CARD_WIDTH/2 + MIN_H_SEPARATION && dy < CARD_HEIGHT + MIN_V_SEPARATION) {
                          hasOverlap = true
                          break
                        }
                      }

                      if (!hasOverlap) {
                        bestPosition = { x: testX, y: testY, isTop }
                        foundPerfectSpot = true
                        break
                      }
                    }
                  }
                }

                // If no perfect spot found, use a force-based displacement
                if (!foundPerfectSpot) {
                  // Find the least crowded lane
                  const laneCounts = { top: [0, 0, 0, 0], bottom: [0, 0, 0, 0] }
                  
                  eventPositions.forEach(pos => {
                    const laneIndex = Math.floor((pos.y - (pos.isTop ? 50 : 80)) / LANE_HEIGHT)
                    if (pos.isTop && laneIndex >= 0 && laneIndex < 4) {
                      laneCounts.top[laneIndex]++
                    } else if (!pos.isTop && laneIndex >= 0 && laneIndex < 4) {
                      laneCounts.bottom[laneIndex]++
                    }
                  })

                  // Choose least crowded lane
                  let bestLane = 0
                  let bestIsTop = true
                  let minCount = Math.min(...laneCounts.top)

                  if (Math.min(...laneCounts.bottom) < minCount) {
                    minCount = Math.min(...laneCounts.bottom)
                    bestIsTop = false
                    bestLane = laneCounts.bottom.indexOf(minCount)
                  } else {
                    bestLane = laneCounts.top.indexOf(minCount)
                  }

                  bestPosition = {
                    x: clampedBaseX,
                    y: bestIsTop ? bestLane * LANE_HEIGHT + 50 : bestLane * LANE_HEIGHT + 80,
                    isTop: bestIsTop
                  }
                }

                eventPositions.push({
                  event: eventData.event,
                  featureIndex: eventData.featureIndex,
                  featureName: eventData.featureName,
                  x: bestPosition.x,
                  y: bestPosition.y,
                  isTop: bestPosition.isTop
                })
              })

              return eventPositions.map((pos, index) => {
                const color = colors[pos.featureIndex]
                
                return (
                  <div
                    key={index}
                    className="absolute z-10"
                    style={{
                      left: `${pos.x}%`,
                      [pos.isTop ? 'top' : 'bottom']: `${pos.y}px`,
                      transform: 'translateX(-50%)',
                      width: `${CARD_WIDTH}px`,
                    }}
                  >
                    <div className="flex flex-col items-center gap-1">
                      {!pos.isTop && (
                        <>
                          <div
                            className="w-2 h-2 border border-white rounded-full"
                            style={{ background: color }}
                          />
                          <div className="w-0.5 h-4" style={{ background: color }} />
                        </>
                      )}
                      
                      <div
                        className="p-1.5 rounded text-center leading-tight shadow-lg"
                        style={{
                          background: "#0a0e27",
                          border: `1px solid ${color}`,
                          color: "#fff",
                          width: '80px',
                          fontSize: '8px',
                          minHeight: '40px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          boxShadow: `0 2px 8px rgba(0,0,0,0.3), 0 0 0 1px ${color}20`
                        }}
                      >
                        <div className="font-medium mb-1" style={{ color, fontSize: '8px' }}>
                          {pos.event.phase.length > 9 ? 
                            pos.event.phase.substring(0, 9) + '...' : 
                            pos.event.phase}
                        </div>
                        <div className="text-[7px]" style={{ color: "#aaa" }}>
                          {formatYears(pos.event.years)}
                        </div>
                        <div className="text-[6px] mt-0.5" style={{ color: "#888" }}>
                          {pos.featureName.length > 7 ? 
                            pos.featureName.substring(0, 7) + '...' : 
                            pos.featureName}
                        </div>
                      </div>
                      
                      {pos.isTop && (
                        <>
                          <div className="w-0.5 h-4" style={{ background: color }} />
                          <div
                            className="w-2 h-2 border border-white rounded-full"
                            style={{ background: color }}
                          />
                        </>
                      )}
                    </div>
                  </div>
                )
              })
            })()}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 justify-center">
          {features.map((featureData, index) => (
            <div key={index} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ background: colors[index] }}
              />
              <span className="text-sm" style={{ color: "#e5e5e5" }}>
                {featureData.feature.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}