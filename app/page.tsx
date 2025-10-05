"use client"

import { useState, useMemo } from "react"
import dynamic from "next/dynamic"
import { Search, X, MapPin, Layers } from "lucide-react"
import { FAMOUS_FEATURES } from "@/lib/famous-features"

const Globe3D = dynamic(() => import("@/components/globe-3d"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full" style={{ background: "#0a0a0a" }}>
      <div style={{ color: "var(--color-muted)" }}>Loading 3D globe...</div>
    </div>
  ),
})

interface FamousFeature {
  name: string
  type: string
  lat: number
  lon: number
  withinRegion?: string
  diameter?: number
  description?: string
}

export default function PlanetaryExplorer() {
  const [selectedPlanet, setSelectedPlanet] = useState<string>("")
  const [searchQuery, setSearchQuery] = useState("")
  const [showDetails, setShowDetails] = useState(false)
  const [selectedFeature, setSelectedFeature] = useState<FamousFeature | null>(null)
  const [isRotating, setIsRotating] = useState(false) // Track if planet is rotating to a feature

  const planetFeatures = useMemo(() => {
    if (!selectedPlanet) return []
    return FAMOUS_FEATURES[selectedPlanet] || []
  }, [selectedPlanet])

  const filteredFeatures = useMemo(() => {
    if (!searchQuery) return planetFeatures
    return planetFeatures.filter(
      (f) =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.type.toLowerCase().includes(searchQuery.toLowerCase()),
    )
  }, [planetFeatures, searchQuery])

  return (
    <div className="h-screen flex flex-col" style={{ background: "var(--color-background)" }}>
      {/* Header */}
      <header
        className="border-b backdrop-blur-sm"
        style={{
          borderColor: "var(--color-border)",
          background: "var(--color-surface)",
        }}
      >
        <div className="px-6 py-5">
          <div className="flex items-center justify-between mb-6">
            <h1 className="font-serif text-3xl tracking-tight" style={{ color: "var(--color-foreground)" }}>
              Planetary Explorer
            </h1>
            <div className="flex items-center gap-3 text-sm" style={{ color: "var(--color-muted)" }}>
              <Layers className="w-4 h-4" />
              <span>NASA/USGS Imagery</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <select
                value={selectedPlanet}
                onChange={(e) => setSelectedPlanet(e.target.value)}
                className="appearance-none border px-4 py-2.5 pr-10 rounded-lg transition-colors focus:outline-none focus:ring-2 min-w-[200px] cursor-pointer"
                style={{
                  background: "var(--color-surface-elevated)",
                  borderColor: "var(--color-border)",
                  color: "var(--color-foreground)",
                }}
              >
                <option value="">Select celestial body</option>
                <option value="Moon">Moon</option>
                <option value="Mars">Mars</option>
                <option value="Mercury">Mercury</option>
                <option value="Vesta">Vesta</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg
                  className="w-4 h-4"
                  style={{ color: "var(--color-muted)" }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            <div className="flex-1 relative max-w-md">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: "var(--color-muted)" }}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search features..."
                className="w-full border pl-10 pr-4 py-2.5 rounded-lg transition-colors focus:outline-none focus:ring-2"
                style={{
                  background: "var(--color-surface-elevated)",
                  borderColor: "var(--color-border)",
                  color: "var(--color-foreground)",
                }}
              />
            </div>

            {selectedPlanet && (
              <div
                className="text-sm flex items-center gap-2 px-4 py-2.5 rounded-lg border"
                style={{
                  color: "var(--color-primary)",
                  background: "rgba(212, 165, 116, 0.1)",
                  borderColor: "rgba(212, 165, 116, 0.2)",
                }}
              >
                <MapPin className="w-4 h-4" />
                <span>{planetFeatures.length} features available</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* 3D Globe */}
        <div className="flex-1 relative">
          {selectedPlanet ? (
            <Globe3D
              planet={selectedPlanet}
              features={planetFeatures}
              onFeatureClick={(feature) => {
                setSelectedFeature(feature)
                setIsRotating(true)
                setShowDetails(false) // Close details modal when clicking a new feature
              }}
              searchQuery={searchQuery}
              selectedFeature={selectedFeature}
              onRotationComplete={() => {
                if (isRotating) {
                  setShowDetails(true)
                  setIsRotating(false)
                }
              }}
              showDetailsModal={showDetails}
            />
          ) : (
            <div className="h-full flex items-center justify-center" style={{ background: "var(--color-surface)" }}>
              <div className="text-center max-w-md px-6">
                <h2 className="font-serif text-2xl mb-3" style={{ color: "var(--color-foreground)" }}>
                  Begin Your Exploration
                </h2>
                <p className="leading-relaxed" style={{ color: "var(--color-muted)" }}>
                  Select a celestial body from the dropdown above to start exploring planetary features in 3D.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside
          className="w-80 border-l overflow-y-auto"
          style={{
            background: "var(--color-surface)",
            borderColor: "var(--color-border)",
          }}
        >
          <div className="p-6">
            <h2 className="font-serif text-xl mb-4" style={{ color: "var(--color-foreground)" }}>
              Features
            </h2>

            {!selectedPlanet ? (
              <p className="text-sm leading-relaxed" style={{ color: "var(--color-muted)" }}>
                Select a celestial body to view its features and landmarks.
              </p>
            ) : (
              <div className="space-y-2">
                {filteredFeatures.length === 0 ? (
                  <p className="text-sm leading-relaxed" style={{ color: "var(--color-muted)" }}>
                    No features found matching your search.
                  </p>
                ) : (
                  filteredFeatures.map((feature, index) => (
                    <button
                      key={`${selectedPlanet}-${feature.name}-${index}`}
                      onClick={() => {
                        setSelectedFeature(feature)
                        setIsRotating(true)
                        setShowDetails(false)
                      }}
                      className="w-full text-left p-3 rounded-lg border transition-colors hover:border-[var(--color-primary)]"
                      style={{
                        background: "var(--color-surface-elevated)",
                        borderColor: "var(--color-border)",
                      }}
                    >
                      <div className="font-medium mb-1" style={{ color: "var(--color-foreground)" }}>
                        {feature.name}
                      </div>
                      <div className="text-xs" style={{ color: "var(--color-muted)" }}>
                        {feature.type}
                        {feature.withinRegion && ` • ${feature.withinRegion}`}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Feature Details Modal */}
      {showDetails && selectedFeature && (
        <div
          className="fixed inset-0 backdrop-blur-sm flex items-center justify-center p-6 z-[9999]"
          style={{ background: "rgba(0, 0, 0, 0.92)" }}
          onClick={() => setShowDetails(false)}
        >
          <div
            className="border rounded-2xl p-8 max-w-2xl w-full shadow-2xl"
            style={{
              background: "#1a1a1a",
              borderColor: "rgba(212, 165, 116, 0.3)",
              boxShadow: "0 0 0 1px rgba(212, 165, 116, 0.1), 0 20px 60px rgba(0, 0, 0, 0.8)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="font-serif text-2xl mb-2" style={{ color: "#ffffff" }}>
                  {selectedFeature.name}
                </h3>
                <p className="text-sm font-medium" style={{ color: "#D4A574" }}>
                  {selectedFeature.type}
                </p>
              </div>
              <button
                onClick={() => setShowDetails(false)}
                className="transition-colors p-2 -m-2 hover:bg-white/5 rounded-lg"
                style={{ color: "#888888" }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="mb-1 text-xs uppercase tracking-wider" style={{ color: "#666666" }}>
                    Coordinates
                  </p>
                  <p className="font-medium" style={{ color: "#e5e5e5" }}>
                    {selectedFeature.lat}°, {selectedFeature.lon}°
                  </p>
                </div>
                {selectedFeature.withinRegion && (
                  <div>
                    <p className="mb-1 text-xs uppercase tracking-wider" style={{ color: "#666666" }}>
                      Region
                    </p>
                    <p className="font-medium" style={{ color: "#e5e5e5" }}>
                      {selectedFeature.withinRegion}
                    </p>
                  </div>
                )}
              </div>

              {selectedFeature.description && (
                <div>
                  <p className="mb-2 text-xs uppercase tracking-wider" style={{ color: "#666666" }}>
                    Description
                  </p>
                  <p className="leading-relaxed" style={{ color: "#b5b5b5" }}>
                    {selectedFeature.description}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
