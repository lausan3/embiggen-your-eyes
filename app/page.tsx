"use client"

import { useState, useMemo, useCallback, useEffect, useRef } from "react"
import dynamic from "next/dynamic"
import { Search, X, MapPin, Layers, Target, GitCompare, Clock, Zap, Globe, Map } from "lucide-react"
import { FAMOUS_FEATURES } from "@/lib/famous-features"
import { TIMELINE_DATA } from "@/lib/timeline-data"
import { FeatureAnalyzer } from "@/lib/feature-analyzer"
import { filterFeaturesByBounds, getDefaultAreaBounds, type BoundingBox } from "@/lib/area-selection"
import { isNotableFeature } from "@/lib/timeline-utils"
import { fetchNASAImages, type NASAImage } from "@/lib/nasa-images"
import { loadPlanetFeatures, type KMZFeature } from "@/lib/kmz-loader"
import { PLANETARY_CONFIG } from "@/lib/config"
import TimelineViewer from "@/components/timeline-viewer"
import FeatureComparison from "@/components/feature-comparison"

const Globe3D = dynamic(() => import("@/components/globe-3d"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full" style={{ background: "#0a0a0a" }}>
      <div style={{ color: "var(--color-muted)" }}>Loading 3D globe...</div>
    </div>
  ),
})

const MapComponent = dynamic(() => import("@/components/map-component"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full" style={{ background: "#0a0a0a" }}>
      <div style={{ color: "var(--color-muted)" }}>Loading 2D map...</div>
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

interface AreaSelection {
  bounds: BoundingBox
  visible: boolean
  features: FamousFeature[]
}

interface ComparisonFeature {
  feature: FamousFeature
  timeline: any[]
}

export default function PlanetaryExplorer() {
  const [selectedPlanet, setSelectedPlanet] = useState<string>("")
  const [searchQuery, setSearchQuery] = useState("")
  const [showDetails, setShowDetails] = useState(false)
  const [selectedFeature, setSelectedFeature] = useState<FamousFeature | null>(null)
  const [isRotating, setIsRotating] = useState(false)
  const [viewMode, setViewMode] = useState<"2d" | "3d">("3d") // New state for view toggle
  
  // New state for enhanced features
  const [areaSelection, setAreaSelection] = useState<AreaSelection | null>(null)
  const [showTimeline, setShowTimeline] = useState(false)
  const [comparisonMode, setComparisonMode] = useState(false)
  const [comparisonFeatures, setComparisonFeatures] = useState<ComparisonFeature[]>([])
  const [showComparison, setShowComparison] = useState(false)
  const [areaSelectionMode, setAreaSelectionMode] = useState(false)
  const [featureAnalyzer] = useState(() => new FeatureAnalyzer())
  const [nasaImages, setNasaImages] = useState<NASAImage[]>([])
  const [loadingImages, setLoadingImages] = useState(false)
  
  // KMZ feature loading state
  const [allFeatures, setAllFeatures] = useState<KMZFeature[]>([])
  const [loadingFeatures, setLoadingFeatures] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState("")
  const [featureStats, setFeatureStats] = useState<{kmz: number, famous: number, total: number} | null>(null)

  // Map ref for controlling 2D map
  const mapRef = useRef<any>(null)

  // Load features when planet changes
  useEffect(() => {
    if (!selectedPlanet) {
      setAllFeatures([])
      setFeatureStats(null)
      return
    }

    const loadFeatures = async () => {
      setLoadingFeatures(true)
      setLoadingMessage('Loading features...')
      
      try {
        const planetConfig = PLANETARY_CONFIG[selectedPlanet]
        const famousFeatures = FAMOUS_FEATURES[selectedPlanet] || []
        
        const result = await loadPlanetFeatures(
          planetConfig,
          famousFeatures,
          (message) => setLoadingMessage(message)
        )
        
        setAllFeatures(result.features)
        setFeatureStats({
          kmz: result.kmzCount,
          famous: result.famousCount,
          total: result.total
        })
        
        console.log(`Loaded ${result.total} features for ${selectedPlanet}`)
      } catch (error) {
        console.error('Failed to load features:', error)
        setLoadingMessage('Failed to load features')
      } finally {
        setLoadingFeatures(false)
      }
    }

    loadFeatures()
  }, [selectedPlanet])

  const planetFeatures = useMemo(() => {
    if (!selectedPlanet || allFeatures.length === 0) return []
    
    // Convert KMZ features to FamousFeature format for compatibility
    const convertedFeatures = allFeatures.map(f => ({
      name: f.properties.name,
      type: f.properties.featureType,
      lat: f.geometry.coordinates[1],
      lon: f.geometry.coordinates[0],
      diameter: f.properties.diameter,
      withinRegion: f.properties.withinRegion,
      description: f.properties.origin
    }))
    
    // If area selection is active, filter features
    if (areaSelection && areaSelection.visible) {
      return filterFeaturesByBounds(convertedFeatures, areaSelection.bounds)
    }
    
    return convertedFeatures
  }, [selectedPlanet, allFeatures, areaSelection])

  const filteredFeatures = useMemo(() => {
    if (!searchQuery) return planetFeatures
    return planetFeatures.filter(
      (f) =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.type.toLowerCase().includes(searchQuery.toLowerCase()),
    )
  }, [planetFeatures, searchQuery])

  // Generate timeline for a feature
  const generateTimeline = useCallback(async (feature: FamousFeature) => {
    const planetKey = selectedPlanet.toUpperCase()
    
    // Check structured timeline data first
    if (TIMELINE_DATA[planetKey] && TIMELINE_DATA[planetKey][feature.name]) {
      return TIMELINE_DATA[planetKey][feature.name]
    }
    
    // Use AI analyzer as fallback
    if (isNotableFeature({ properties: feature })) {
      const featureObj = {
        properties: {
          name: feature.name,
          featureType: feature.type,
          diameter: feature.diameter,
          withinRegion: feature.withinRegion
        },
        geometry: {
          coordinates: [feature.lon, feature.lat]
        }
      }
      
      return featureAnalyzer.analyzeFeature(featureObj, planetKey)
    }
    
    return []
  }, [selectedPlanet, featureAnalyzer])

  // Handle area selection
  const handleAreaSelect = useCallback((bounds: BoundingBox) => {
    const features = filterFeaturesByBounds(planetFeatures, bounds)
    setAreaSelection({
      bounds,
      visible: true,
      features
    })
    // Automatically exit area selection mode to re-enable rotation
    setAreaSelectionMode(false)
    console.log('Area selected:', bounds, 'Features found:', features.length)
  }, [planetFeatures])

  // Handle comparison mode
  const handleComparisonAdd = useCallback(async (feature: FamousFeature) => {
    if (comparisonFeatures.length >= 4) {
      alert('Maximum 4 features can be compared at once')
      return
    }
    
    if (comparisonFeatures.some(cf => cf.feature.name === feature.name)) {
      alert('This feature is already selected for comparison')
      return
    }
    
    // More permissive check - allow any feature with a name and type
    if (!feature.name || !feature.type) {
      alert('Invalid feature selected for comparison')
      return
    }
    
    const timeline = await generateTimeline(feature)
    const newComparison: ComparisonFeature = { feature, timeline }
    
    setComparisonFeatures(prev => [...prev, newComparison])
    
    if (comparisonFeatures.length + 1 >= 2) {
      setShowComparison(true)
      setComparisonMode(false)
    }
  }, [comparisonFeatures, generateTimeline])

  // Clear area selection
  const clearAreaSelection = useCallback(() => {
    setAreaSelection(null)
  }, [])

  // Toggle comparison mode
  const toggleComparisonMode = useCallback(() => {
    if (comparisonMode) {
      setComparisonMode(false)
    } else {
      setComparisonFeatures([])
      setComparisonMode(true)
      setShowComparison(false)
    }
  }, [comparisonMode])

  // Handle feature click for timeline
  const handleFeatureClick = useCallback(async (feature: FamousFeature) => {
    setSelectedFeature(feature)
    setIsRotating(true)
    setShowDetails(false)
    setShowTimeline(false)
    setNasaImages([])
    
    // Start loading NASA images immediately
    setLoadingImages(true)
    try {
      const images = await fetchNASAImages(feature.name, selectedPlanet)
      setNasaImages(images)
    } catch (error) {
      console.error('Failed to load NASA images:', error)
    } finally {
      setLoadingImages(false)
    }
    
    if (isNotableFeature({ properties: feature })) {
      const timeline = await generateTimeline(feature)
      if (timeline.length > 0) {
        // Timeline will be shown after rotation completes
      }
    }
  }, [generateTimeline, selectedPlanet])

  // Handle rotation complete
  const handleRotationComplete = useCallback(async () => {
    if (isRotating && selectedFeature) {
      setShowDetails(true)
      setIsRotating(false)
      
      if (isNotableFeature({ properties: selectedFeature })) {
        setShowTimeline(true)
      }
    }
  }, [isRotating, selectedFeature])

  // Handle clicking outside features to unselect
  const handleMapClick = useCallback(() => {
    if (selectedFeature) {
      setSelectedFeature(null)
      setShowDetails(false)
      setShowTimeline(false)
      setNasaImages([])
    }
  }, [selectedFeature])

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
              NASALink
            </h1>
            <div className="flex items-center gap-4">
              {/* 2D/3D Toggle */}
              <div className="flex items-center rounded-lg overflow-hidden" style={{
                background: "var(--color-surface-elevated)",
                border: "1px solid var(--color-border)"
              }}>
                <button
                  onClick={() => setViewMode("3d")}
                  className={`px-4 py-2 text-sm font-medium transition-all duration-200 flex items-center gap-2 relative`}
                  style={{
                    background: viewMode === "3d" ? "var(--color-primary)" : "transparent",
                    color: viewMode === "3d" ? "#ffffff" : "var(--color-foreground)",
                    borderRight: "1px solid var(--color-border)"
                  }}
                >
                  <Globe className="w-4 h-4" />
                  3D
                </button>
                <button
                  onClick={() => setViewMode("2d")}
                  className={`px-4 py-2 text-sm font-medium transition-all duration-200 flex items-center gap-2 relative`}
                  style={{
                    background: viewMode === "2d" ? "var(--color-primary)" : "transparent",
                    color: viewMode === "2d" ? "#ffffff" : "var(--color-foreground)"
                  }}
                >
                  <Map className="w-4 h-4" />
                  2D
                </button>
              </div>
              <div className="flex items-center gap-3 text-sm" style={{ color: "var(--color-muted)" }}>
                <Layers className="w-4 h-4" />
                <span>NASA/USGS Imagery</span>
              </div>
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
              <>
                <div
                  className="text-sm flex items-center gap-2 px-4 py-2.5 rounded-lg border"
                  style={{
                    color: "var(--color-primary)",
                    background: "rgba(212, 165, 116, 0.1)",
                    borderColor: "rgba(212, 165, 116, 0.2)",
                  }}
                >
                  <MapPin className="w-4 h-4" />
                  {loadingFeatures ? (
                    <span>{loadingMessage}</span>
                  ) : featureStats ? (
                    <span>
                      {filteredFeatures.length} features {areaSelection ? 'in selection' : 'available'}
                      {featureStats.kmz > 0 && (
                        <span className="text-xs ml-2" style={{ color: "#9ca3af" }}>
                          ({featureStats.kmz} KMZ + {featureStats.famous} curated)
                        </span>
                      )}
                    </span>
                  ) : (
                    <span>No features loaded</span>
                  )}
                </div>
                

                
                {/* New Action Buttons */}
                {/* Area Selection - available in both 2D and 3D modes */}
                <button
                  onClick={() => setAreaSelectionMode(!areaSelectionMode)}
                  className={`px-4 py-2.5 rounded-lg border transition-colors text-sm ${
                    areaSelectionMode ? 'bg-blue-600 text-white border-blue-600' : 'hover:border-blue-400'
                  }`}
                  style={{
                    borderColor: areaSelectionMode ? '#2563eb' : 'var(--color-border)',
                    color: areaSelectionMode ? '#ffffff' : 'var(--color-foreground)',
                    background: areaSelectionMode ? '#2563eb' : 'var(--color-surface-elevated)',
                  }}
                >
                  <Target className="w-4 h-4 inline mr-2" />
                  {areaSelectionMode ? 'Cancel Selection' : 'Select Area'}
                </button>
                
                <button
                  onClick={toggleComparisonMode}
                  className={`px-4 py-2.5 rounded-lg border transition-colors text-sm ${
                    comparisonMode ? 'bg-purple-600 text-white border-purple-600' : 'hover:border-purple-400'
                  }`}
                  style={{
                    borderColor: comparisonMode ? '#9333ea' : 'var(--color-border)',
                    color: comparisonMode ? '#ffffff' : 'var(--color-foreground)',
                    background: comparisonMode ? '#9333ea' : 'var(--color-surface-elevated)',
                  }}
                >
                  <GitCompare className="w-4 h-4 inline mr-2" />
                  {comparisonMode ? `Cancel (${comparisonFeatures.length})` : 'Compare Features'}
                </button>
                
                {comparisonFeatures.length >= 2 && (
                  <button
                    onClick={() => setShowComparison(true)}
                    className="px-4 py-2.5 rounded-lg border transition-colors text-sm bg-green-600 text-white border-green-600 hover:bg-green-700"
                  >
                    <Zap className="w-4 h-4 inline mr-2" />
                    Show Comparison ({comparisonFeatures.length})
                  </button>
                )}
                
                {areaSelection && (
                  <button
                    onClick={clearAreaSelection}
                    className="px-4 py-2.5 rounded-lg border transition-colors text-sm bg-red-600 text-white border-red-600 hover:bg-red-700"
                  >
                    <X className="w-4 h-4 inline mr-2" />
                    Clear Area
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* 3D Globe or 2D Map */}
        <div className="flex-1 relative">
          {selectedPlanet ? (
            <>
              {viewMode === "3d" ? (
                <Globe3D
                  planet={selectedPlanet}
                  features={planetFeatures}
                  onFeatureClick={comparisonMode ? handleComparisonAdd : handleFeatureClick}
                  searchQuery={searchQuery}
                  selectedFeature={selectedFeature}
                  onRotationComplete={handleRotationComplete}
                  showDetailsModal={showDetails}
                  onAreaSelect={areaSelectionMode ? handleAreaSelect : undefined}
                  areaSelection={areaSelection}
                  comparisonMode={comparisonMode}
                  onComparisonAdd={handleComparisonAdd}
                  comparisonFeatures={comparisonFeatures.map(cf => cf.feature)}
                  areaSelectionMode={areaSelectionMode}
                  onMapClick={handleMapClick}
                />
              ) : (
                <MapComponent
                  ref={mapRef}
                  planet={selectedPlanet}
                  searchQuery={searchQuery}
                  areaSelectionMode={areaSelectionMode}
                  onAreaSelect={handleAreaSelect}
                  areaSelection={areaSelection}
                  allFeatures={allFeatures}
                  onMapClick={handleMapClick}
                  onKMZFeatureClick={(feature) => {
                    if (comparisonMode) {
                      handleComparisonAdd(feature)
                    } else {
                      handleFeatureClick(feature)
                    }
                  }}
                  onFeatureSelect={(feature) => {
                    if (feature) {
                      const convertedFeature: FamousFeature = {
                        name: feature.name,
                        type: feature.type,
                        lat: (feature.bounds.north + feature.bounds.south) / 2,
                        lon: (feature.bounds.east + feature.bounds.west) / 2,
                        description: feature.description
                      }
                      if (comparisonMode) {
                        handleComparisonAdd(convertedFeature)
                      } else {
                        // For 2D mode, show details immediately since there's no rotation
                        setSelectedFeature(convertedFeature)
                        setShowDetails(true)
                        setShowTimeline(false)
                        setNasaImages([])
                        
                        // Load NASA images
                        setLoadingImages(true)
                        fetchNASAImages(convertedFeature.name, selectedPlanet)
                          .then(images => setNasaImages(images))
                          .catch(error => console.error('Failed to load NASA images:', error))
                          .finally(() => setLoadingImages(false))
                      }
                    } else {
                      setSelectedFeature(null)
                    }
                  }}
                  onShowDetails={() => setShowDetails(true)}
                />
              )}
              {/* Area Selection Overlay - available in both modes */}
              {areaSelection && (
                <div 
                  className="absolute bottom-4 left-4 p-3 rounded-lg border backdrop-blur-sm" 
                  style={{ 
                    background: "rgba(26, 26, 46, 0.9)", 
                    borderColor: "rgba(58, 79, 111, 0.8)",
                    color: "#ffffff",
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
                    maxWidth: "200px"
                  }}
                >
                  <div className="font-medium mb-2 text-sm" style={{ color: "#D4A574" }}>Selection Area</div>
                  <div className="text-xs space-y-1">
                    <div>N: {areaSelection.bounds.north.toFixed(2)}°, S: {areaSelection.bounds.south.toFixed(2)}°</div>
                    <div>E: {areaSelection.bounds.east.toFixed(2)}°, W: {areaSelection.bounds.west.toFixed(2)}°</div>
                    <div className="text-center">
                      <button
                        onClick={clearAreaSelection}
                        className="mt-2 text-xs px-2 py-1 rounded border transition-colors hover:bg-white/10"
                        style={{
                          background: "transparent",
                          borderColor: "rgba(58, 79, 111, 0.8)",
                          color: "#D4A574"
                        }}
                      >
                        Clear Selection
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
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
            ) : loadingFeatures ? (
              <div className="text-center py-8">
                <div className="text-sm mb-2" style={{ color: "var(--color-foreground)" }}>
                  {loadingMessage}
                </div>
                <div className="text-xs" style={{ color: "var(--color-muted)" }}>
                  Loading thousands of features from USGS data...
                </div>
              </div>
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
                      onClick={async () => {
                        if (comparisonMode) {
                          handleComparisonAdd(feature)
                        } else {
                          setSelectedFeature(feature)
                          
                          if (viewMode === "2d") {
                            // For 2D mode: pan to feature first, then show details after animation
                            if (mapRef.current?.panToLocation) {
                              await mapRef.current.panToLocation(feature.lat, feature.lon, 6)
                            }
                            
                            // Show details after the pan animation completes
                            setShowDetails(true)
                            setShowTimeline(false)
                            setNasaImages([])
                            
                            // Load NASA images
                            setLoadingImages(true)
                            fetchNASAImages(feature.name, selectedPlanet)
                              .then(images => setNasaImages(images))
                              .catch(error => console.error('Failed to load NASA images:', error))
                              .finally(() => setLoadingImages(false))
                          } else {
                            // For 3D mode: use rotation animation
                            setIsRotating(true)
                            setShowDetails(false)
                          }
                        }
                      }}
                      className="w-full text-left p-3 rounded-lg border transition-colors hover:border-[var(--color-primary)]"
                      style={{
                        background: selectedFeature?.name === feature.name 
                          ? "var(--color-sidebar-accent)" 
                          : "var(--color-card)",
                        borderColor: selectedFeature?.name === feature.name 
                          ? "var(--color-primary)" 
                          : "var(--color-border)",
                      }}
                    >
                      <div className="font-medium mb-1" style={{ color: "var(--color-foreground)" }}>
                        {feature.name}
                      </div>
                      <div className="text-xs" style={{ color: "var(--color-muted)" }}>
                        {feature.type}
                        {feature.withinRegion && ` • ${feature.withinRegion}`}
                        {feature.diameter && ` • ${feature.diameter}km`}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Enhanced Feature Details Modal */}
      {showDetails && selectedFeature && (
        <div
          className="fixed inset-0 backdrop-blur-sm flex items-center justify-center p-6 z-[9999]"
          style={{ background: "rgba(0, 0, 0, 0.92)" }}
          onClick={() => setShowDetails(false)}
        >
          <div
            className="border rounded-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            style={{
              background: "#1a1a1a",
              borderColor: "rgba(212, 165, 116, 0.3)",
              boxShadow: "0 0 0 1px rgba(212, 165, 116, 0.1), 0 20px 60px rgba(0, 0, 0, 0.8)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <h3 className="font-serif text-2xl mb-2" style={{ color: "#ffffff" }}>
                  {selectedFeature.name}
                </h3>
                <p className="text-sm font-medium" style={{ color: "#D4A574" }}>
                  {selectedFeature.type}
                </p>
                {selectedFeature.diameter && (
                  <p className="text-sm mt-1" style={{ color: "#b5b5b5" }}>
                    Diameter: {selectedFeature.diameter} km
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                {isNotableFeature({ properties: selectedFeature }) && (
                  <button
                    onClick={() => setShowTimeline(!showTimeline)}
                    className="px-3 py-1.5 rounded-lg border transition-colors text-sm"
                    style={{
                      background: showTimeline ? "#D4A574" : "#1a1a2e",
                      borderColor: showTimeline ? "#D4A574" : "#3a4f6f",
                      color: showTimeline ? "#000000" : "#ffffff",
                    }}
                  >
                    <Clock className="w-4 h-4 inline mr-1" />
                    Timeline
                  </button>
                )}
                <button
                  onClick={() => setShowDetails(false)}
                  className="transition-colors p-2 -m-2 hover:bg-white/5 rounded-lg"
                  style={{ color: "#888888" }}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="mb-1 text-xs uppercase tracking-wider" style={{ color: "#666666" }}>
                      Coordinates
                    </p>
                    <p className="font-medium" style={{ color: "#e5e5e5" }}>
                      {selectedFeature.lat.toFixed(2)}°, {selectedFeature.lon.toFixed(2)}°
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
                    <p className="leading-relaxed text-sm" style={{ color: "#b5b5b5" }}>
                      {selectedFeature.description}
                    </p>
                  </div>
                )}

                {/* NASA Images */}
                <div>
                  <p className="mb-3 text-xs uppercase tracking-wider" style={{ color: "#666666" }}>
                    NASA Images
                  </p>
                  {loadingImages ? (
                    <div className="text-sm" style={{ color: "#888888" }}>
                      Loading images...
                    </div>
                  ) : nasaImages.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {nasaImages.slice(0, 4).map((image, index) => (
                        <div
                          key={index}
                          className="cursor-pointer rounded-lg overflow-hidden border transition-transform hover:scale-105"
                          style={{ 
                            borderColor: "#3a4f6f",
                            background: "#1a1a2e"
                          }}
                          onClick={() => window.open(image.imageUrl, '_blank')}
                        >
                          <img
                            src={image.imageUrl}
                            alt={image.title}
                            className="w-full h-20 object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLElement
                              target.parentElement!.style.display = 'none'
                            }}
                          />
                          <div className="p-2">
                            <div className="text-xs font-medium truncate" style={{ color: "#ffffff" }}>
                              {image.title.substring(0, 40)}{image.title.length > 40 ? '...' : ''}
                            </div>
                            <div className="text-xs" style={{ color: "#D4A574" }}>
                              NASA ID: {image.nasaId}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm" style={{ color: "#888888" }}>
                      No specific images found for "{selectedFeature.name}"
                    </div>
                  )}
                </div>
              </div>

              {/* Timeline */}
              {showTimeline && isNotableFeature({ properties: selectedFeature }) && (
                <div className="lg:col-span-1">
                  <div className="max-h-96 overflow-y-auto">
                    <TimelineViewer
                      events={TIMELINE_DATA[selectedPlanet.toUpperCase()]?.[selectedFeature.name] || []}
                      featureName={selectedFeature.name}
                      featureType={selectedFeature.type}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Feature Comparison Modal */}
      {showComparison && comparisonFeatures.length >= 2 && (
        <FeatureComparison
          features={comparisonFeatures}
          onClose={() => setShowComparison(false)}
          onRemoveFeature={(index) => {
            setComparisonFeatures(prev => prev.filter((_, i) => i !== index))
            if (comparisonFeatures.length <= 2) {
              setShowComparison(false)
            }
          }}
        />
      )}
    </div>
  )
}
