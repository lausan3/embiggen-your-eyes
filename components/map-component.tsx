"use client"

import { useEffect, useRef, useState } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { GEOGRAPHIC_FEATURES, type GeographicFeature } from "@/lib/geographic-features"

interface MapComponentProps {
  planet: string
  searchQuery: string
  onFeatureSelect: (feature: GeographicFeature | null) => void
  onShowDetails: () => void
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

export default function MapComponent({ planet, searchQuery, onFeatureSelect, onShowDetails }: MapComponentProps) {
  const mapRef = useRef<L.Map | null>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const markersRef = useRef<L.Marker[]>([])
  const [isLoading, setIsLoading] = useState(true)

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
    const planetFeatures = GEOGRAPHIC_FEATURES.filter((f) => f.planet === planet)

    // Filter by search query if provided
    const filteredFeatures = searchQuery
      ? planetFeatures.filter(
          (f) =>
            f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            f.type.toLowerCase().includes(searchQuery.toLowerCase()),
        )
      : planetFeatures

    // Create custom icon
    const customIcon = L.divIcon({
      className: "custom-marker",
      html: `<div style="
        width: 12px;
        height: 12px;
        background: #D4A574;
        border: 2px solid #fff;
        border-radius: 50%;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      "></div>`,
      iconSize: [12, 12],
      iconAnchor: [6, 6],
    })

    // Add markers for filtered features
    filteredFeatures.forEach((feature) => {
      const marker = L.marker([feature.lat, feature.lon], { icon: customIcon })
        .addTo(mapRef.current!)
        .bindTooltip(feature.name, {
          permanent: false,
          direction: "top",
          offset: [0, -6],
        })
        .on("click", () => {
          onFeatureSelect(feature)
          onShowDetails()
        })

      markersRef.current.push(marker)
    })

    // If there's a search query and results, zoom to first result
    if (searchQuery && filteredFeatures.length > 0) {
      const firstFeature = filteredFeatures[0]
      mapRef.current.setView([firstFeature.lat, firstFeature.lon], 4)
    }
  }, [planet, searchQuery, onFeatureSelect, onShowDetails])

  return <div ref={mapContainerRef} className="w-full h-full" style={{ background: "var(--color-surface)" }} />
}
