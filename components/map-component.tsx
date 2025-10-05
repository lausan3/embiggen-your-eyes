"use client"

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { GEOGRAPHIC_FEATURES, type GeographicFeature } from "@/lib/geographic-features"
import { type BoundingBox } from "@/lib/area-selection"

interface MapComponentProps {
  planet: string
  searchQuery?: string
  areaSelectionMode?: boolean
  onFeatureSelect?: (feature: any) => void
  onShowDetails?: (feature: any) => void
  onAreaSelect?: (bounds: BoundingBox) => void
  areaSelection?: { bounds: BoundingBox; visible: boolean } | null
  allFeatures?: any[] // Add KMZ features from main app
  onKMZFeatureClick?: (feature: any) => void // Add handler for KMZ feature clicks
  onMapClick?: () => void // Add handler for clicking on empty map areas
}

export interface MapComponentRef {
  panToLocation: (lat: number, lon: number, zoom?: number) => Promise<void>
}

const PLANETARY_CONFIG: Record<string, any> = {
  Moon: {
    name: "Moon",
    wmts_url:
      "https://trek.nasa.gov/tiles/Moon/EQ/LRO_WAC_Mosaic_Global_303ppd/1.0.0//default/default028mm/{z}/{y}/{x}.jpg",
    center: [0, 0],
    minZoom: 0,
    maxZoom: 8,
  },
  Mars: {
    name: "Mars",
    wmts_url:
      "https://trek.nasa.gov/tiles/Mars/EQ/Mars_Viking_MDIM21_ClrMosaic_global_232m/1.0.0//default/default028mm/{z}/{y}/{x}.jpg",
    center: [0, 0],
    minZoom: 0,
    maxZoom: 7,
  },
  Mercury: {
    name: "Mercury",
    wmts_url:
      "https://trek.nasa.gov/tiles/Mercury/EQ/Mercury_MESSENGER_MDIS_Basemap_EnhancedColor_Equirectangular_928m/1.0.0//default/default028mm/{z}/{y}/{x}.jpg",
    center: [0, 0],
    minZoom: 0,
    maxZoom: 6,
  },
  Vesta: {
    name: "Vesta",
    wmts_url:
      "https://trek.nasa.gov/tiles/Vesta/EQ/Vesta_Dawn_FC_Mosaic_Global_74ppd/1.0.0//default/default028mm/{z}/{y}/{x}.jpg",
    center: [0, 0],
    minZoom: 0,
    maxZoom: 5,
  },
}

const MapComponent = forwardRef<MapComponentRef, MapComponentProps>(({ 
  planet, 
  searchQuery, 
  onFeatureSelect, 
  onShowDetails, 
  areaSelectionMode = false,
  onAreaSelect,
  areaSelection,
  allFeatures = [],
  onKMZFeatureClick,
  onMapClick
}, ref) => {
  const mapRef = useRef<L.Map | null>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const markersRef = useRef<L.Marker[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const selectionRectangleRef = useRef<L.Rectangle | null>(null)
  const persistentSelectionRef = useRef<L.Rectangle | null>(null)
  const [isSelecting, setIsSelecting] = useState(false)

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    panToLocation: (lat: number, lon: number, zoom: number = 5): Promise<void> => {
      return new Promise((resolve) => {
        if (mapRef.current) {
          // Listen for the moveend event to know when animation completes
          const onMoveEnd = () => {
            mapRef.current!.off('moveend', onMoveEnd)
            resolve()
          }
          
          mapRef.current.on('moveend', onMoveEnd)
          mapRef.current.setView([lat, lon], zoom, {
            animate: true,
            duration: 1.0
          })
        } else {
          resolve()
        }
      })
    }
  }), [])

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    // Initialize map
    const map = L.map(mapContainerRef.current, {
      crs: L.CRS.EPSG4326,
      center: [0, 0],
      zoom: 2,
      minZoom: 1,
      maxZoom: 8,
      attributionControl: false,
    })

    mapRef.current = map

    // Add attribution
    L.control.attribution({ position: "bottomright", prefix: false }).addAttribution("NASA/USGS").addTo(map)

    setIsLoading(false)

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  // Map click handler for unselecting features
  useEffect(() => {
    if (!mapRef.current || !onMapClick) return

    const map = mapRef.current

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      // Only trigger if not in area selection mode and not clicking on a marker
      if (!areaSelectionMode) {
        onMapClick()
      }
    }

    map.on('click', handleMapClick)

    return () => {
      map.off('click', handleMapClick)
    }
  }, [onMapClick, areaSelectionMode])

  // Separate effect for area selection event handlers
  useEffect(() => {
    if (!mapRef.current) return

    const map = mapRef.current
    let startPoint: L.LatLng | null = null
    
    const handleMouseDown = (e: L.LeafletMouseEvent) => {
      if (!areaSelectionMode || !onAreaSelect) return
      
      setIsSelecting(true)
      startPoint = e.latlng
      
      // Clear existing selection rectangle
      if (selectionRectangleRef.current) {
        map.removeLayer(selectionRectangleRef.current)
        selectionRectangleRef.current = null
      }
      
      // Disable map dragging during selection
      map.dragging.disable()
    }
    
    const handleMouseMove = (e: L.LeafletMouseEvent) => {
      if (!areaSelectionMode || !isSelecting || !startPoint || !onAreaSelect) return
      
      const currentPoint = e.latlng
      const bounds = L.latLngBounds(startPoint, currentPoint)
      
      // Remove previous preview rectangle
      if (selectionRectangleRef.current) {
        map.removeLayer(selectionRectangleRef.current)
      }
      
      // Add new preview rectangle
      selectionRectangleRef.current = L.rectangle(bounds, {
        color: '#4a9eff',
        weight: 2,
        fillOpacity: 0.1,
        fillColor: '#4a9eff'
      }).addTo(map)
    }
    
    const handleMouseUp = (e: L.LeafletMouseEvent) => {
      if (!areaSelectionMode || !isSelecting || !startPoint || !onAreaSelect) return
      
      setIsSelecting(false)
      const endPoint = e.latlng
      
      // Create bounding box
      const north = Math.max(startPoint.lat, endPoint.lat)
      const south = Math.min(startPoint.lat, endPoint.lat)
      const east = Math.max(startPoint.lng, endPoint.lng)
      const west = Math.min(startPoint.lng, endPoint.lng)
      
      // Only create selection if it's big enough
      if (Math.abs(north - south) > 1 || Math.abs(east - west) > 1) {
        // Remove temporary selection rectangle
        if (selectionRectangleRef.current) {
          map.removeLayer(selectionRectangleRef.current)
          selectionRectangleRef.current = null
        }
        
        // Create persistent selection rectangle
        if (persistentSelectionRef.current) {
          map.removeLayer(persistentSelectionRef.current)
        }
        
        const bounds = L.latLngBounds([south, west], [north, east])
        persistentSelectionRef.current = L.rectangle(bounds, {
          color: '#4a9eff',
          weight: 2,
          fillOpacity: 0.2,
          fillColor: '#4a9eff'
        }).addTo(map)
        
        onAreaSelect({ north, south, east, west })
      }
      
      // Re-enable map dragging
      map.dragging.enable()
      startPoint = null
    }

    // Add event listeners
    map.on('mousedown', handleMouseDown)
    map.on('mousemove', handleMouseMove) 
    map.on('mouseup', handleMouseUp)

    // Cleanup event listeners
    return () => {
      map.off('mousedown', handleMouseDown)
      map.off('mousemove', handleMouseMove)
      map.off('mouseup', handleMouseUp)
      
      // Clear selection rectangle when component unmounts or mode changes
      if (selectionRectangleRef.current) {
        map.removeLayer(selectionRectangleRef.current)
        selectionRectangleRef.current = null
      }
    }
  }, [areaSelectionMode, onAreaSelect, isSelecting])

  // Effect to show/hide persistent area selection
  useEffect(() => {
    if (!mapRef.current) return

    const map = mapRef.current

    // Clear existing persistent selection
    if (persistentSelectionRef.current) {
      map.removeLayer(persistentSelectionRef.current)
      persistentSelectionRef.current = null
    }

    // Show area selection if it exists and is visible
    if (areaSelection && areaSelection.visible) {
      const { bounds } = areaSelection
      const leafletBounds = L.latLngBounds([bounds.south, bounds.west], [bounds.north, bounds.east])
      
      persistentSelectionRef.current = L.rectangle(leafletBounds, {
        color: '#4a9eff',
        weight: 2,
        fillOpacity: 0.2,
        fillColor: '#4a9eff'
      }).addTo(map)
    }
  }, [areaSelection])

  useEffect(() => {
    if (!mapRef.current || !planet) return

    const config = PLANETARY_CONFIG[planet]
    if (!config) return

    // Clear existing layers
    mapRef.current.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        mapRef.current?.removeLayer(layer)
      }
    })

    // Add new tile layer
    L.tileLayer(config.wmts_url, {
      minZoom: config.minZoom,
      maxZoom: config.maxZoom,
      tms: false,
    }).addTo(mapRef.current)

    // Reset view
    mapRef.current.setView(config.center, 2)
  }, [planet])

  useEffect(() => {
    if (!mapRef.current || !planet) return

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove())
    markersRef.current = []

    // Filter features for current planet
    let planetFeatures = GEOGRAPHIC_FEATURES[planet] || []

    // Apply area selection filter if active
    if (areaSelection && areaSelection.visible) {
      const { bounds } = areaSelection
      console.log('Area selection bounds:', bounds)
      
      planetFeatures = planetFeatures.filter((feature) => {
        const featureLat = (feature.bounds.north + feature.bounds.south) / 2
        const featureLon = (feature.bounds.east + feature.bounds.west) / 2
        
        console.log(`Feature ${feature.name}: lat=${featureLat}, lon=${featureLon}`)
        
        const isInBounds = (
          featureLat >= bounds.south &&
          featureLat <= bounds.north &&
          featureLon >= bounds.west &&
          featureLon <= bounds.east
        )
        
        console.log(`Feature ${feature.name} in bounds:`, isInBounds)
        return isInBounds
      })
      
      console.log('Filtered features count:', planetFeatures.length)
    }

    // Filter by search query if provided
    const filteredFeatures = searchQuery
      ? planetFeatures.filter(
          (f) =>
            f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            f.type.toLowerCase().includes(searchQuery.toLowerCase()),
        )
      : planetFeatures

    // Create custom icon using built-in Leaflet marker
    const customIcon = L.divIcon({
      className: "custom-marker",
      html: `<div style="
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      "><div style="
        width: 12px;
        height: 12px;
        background: #D4A574;
        border: 2px solid #fff;
        border-radius: 50%;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      "></div></div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    })

    // Create smaller icon for KMZ features
    const kmzIcon = L.divIcon({
      className: "kmz-marker",
      html: `<div style="
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      "><div style="
        width: 8px;
        height: 8px;
        background: #FFFF00;
        border: 1px solid #fff;
        border-radius: 50%;
        box-shadow: 0 1px 2px rgba(0,0,0,0.3);
      "></div></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    })

    console.log('About to create markers for', filteredFeatures.length, 'geographic features')

    // Add markers for geographic features
    filteredFeatures.forEach((feature: GeographicFeature, index) => {
      // Calculate center point from bounds
      const lat = (feature.bounds.north + feature.bounds.south) / 2
      const lon = (feature.bounds.east + feature.bounds.west) / 2
      
      const marker = L.marker([lat, lon], { icon: customIcon })
        .addTo(mapRef.current!)
        .bindTooltip(feature.name, {
          permanent: false,
          direction: "top",
          offset: [0, -10],
        })
        .on("click", () => {
          onFeatureSelect?.(feature)
        })

      markersRef.current.push(marker)
    })

    // Add KMZ features if we have them and area selection is active
    if (areaSelection && areaSelection.visible && allFeatures.length > 0) {
      const { bounds } = areaSelection
      console.log('Adding KMZ features within area selection')
      
      // Filter KMZ features within the selected area
      const kmzFeaturesInArea = allFeatures.filter((feature) => {
        const lat = feature.geometry.coordinates[1]
        const lon = feature.geometry.coordinates[0]
        
        return (
          lat >= bounds.south &&
          lat <= bounds.north &&
          lon >= bounds.west &&
          lon <= bounds.east
        )
      })
      
      console.log(`Found ${kmzFeaturesInArea.length} KMZ features in selected area`)
      
      // Add markers for KMZ features
      kmzFeaturesInArea.forEach((feature, index) => {
        const lat = feature.geometry.coordinates[1]
        const lon = feature.geometry.coordinates[0]
        const name = feature.properties.name
        
        const marker = L.marker([lat, lon], { icon: kmzIcon })
          .addTo(mapRef.current!)
          .bindTooltip(name, {
            permanent: false,
            direction: "top",
            offset: [0, -8],
          })
          .on("click", () => {
            console.log(`Clicked KMZ feature: ${name}`)
            if (onKMZFeatureClick) {
              // Convert KMZ feature to FamousFeature format for compatibility
              const convertedFeature = {
                name: feature.properties.name,
                type: feature.properties.featureType || 'Feature',
                lat: feature.geometry.coordinates[1],
                lon: feature.geometry.coordinates[0],
                diameter: feature.properties.diameter,
                description: feature.properties.origin || feature.properties.name
              }
              onKMZFeatureClick(convertedFeature)
            }
          })

        markersRef.current.push(marker)
      })
    }

    // If there's a search query and results, zoom to first result
    if (searchQuery && filteredFeatures.length > 0) {
      const firstFeature = filteredFeatures[0]
      const lat = (firstFeature.bounds.north + firstFeature.bounds.south) / 2
      const lon = (firstFeature.bounds.east + firstFeature.bounds.west) / 2
      mapRef.current.setView([lat, lon], 4)
    }
  }, [planet, searchQuery, areaSelection, onFeatureSelect, onShowDetails, allFeatures, onKMZFeatureClick, onMapClick])

  return (
    <div className="relative w-full h-full">
      <div 
        ref={mapContainerRef} 
        className="w-full h-full" 
        style={{ 
          background: "var(--color-surface)",
          cursor: areaSelectionMode ? 'crosshair' : 'grab'
        }} 
      />
      
      {/* Area selection mode indicator */}
      {areaSelectionMode && (
        <div 
          className="absolute top-4 right-4 px-3 py-2 rounded-lg border backdrop-blur-sm pointer-events-none"
          style={{
            background: "rgba(59, 130, 246, 0.9)",
            borderColor: "rgba(59, 130, 246, 0.8)",
            color: "#ffffff",
            fontSize: "12px",
            fontWeight: "500"
          }}
        >
          Click and drag to select area
        </div>
      )}
    </div>
  )
})

MapComponent.displayName = 'MapComponent'

export default MapComponent
