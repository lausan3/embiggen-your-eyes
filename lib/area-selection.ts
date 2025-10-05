// Area selection utilities for 3D planets
// Allows users to select rectangular areas on spherical surfaces

import * as THREE from 'three'

export interface BoundingBox {
  north: number
  south: number
  east: number
  west: number
}

export interface AreaSelection {
  bounds: BoundingBox
  features: any[]
  visible: boolean
}

// Convert spherical coordinates to 3D position on unit sphere
export function sphericalToCartesian(lat: number, lon: number, radius: number = 1): THREE.Vector3 {
  const phi = THREE.MathUtils.degToRad(90 - lat)
  // Fix theta calculation to match the corrected coordinate system
  const theta = THREE.MathUtils.degToRad(-lon)
  
  return new THREE.Vector3(
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  )
}

// Convert 3D position back to spherical coordinates
export function cartesianToSpherical(position: THREE.Vector3): { lat: number, lon: number } {
  const r = position.length()
  const lat = 90 - THREE.MathUtils.radToDeg(Math.acos(position.y / r))
  // Fix longitude calculation - flip to match planet orientation
  const lon = -THREE.MathUtils.radToDeg(Math.atan2(position.z, position.x))
  
  return { lat, lon }
}

// Create a selection box geometry on sphere surface
export function createSelectionBox(bounds: BoundingBox, radius: number = 2.05): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry()
  const vertices: number[] = []
  const indices: number[] = []
  
  // Create grid of vertices across the bounding box
  const latSteps = 20
  const lonSteps = 20
  
  for (let i = 0; i <= latSteps; i++) {
    for (let j = 0; j <= lonSteps; j++) {
      const lat = bounds.south + (bounds.north - bounds.south) * (i / latSteps)
      let lon = bounds.west + (bounds.east - bounds.west) * (j / lonSteps)
      
      // Handle longitude wrapping
      if (bounds.west > bounds.east) {
        // Crossing 180/-180 meridian
        if (j / lonSteps <= 0.5) {
          lon = bounds.west + (360 - bounds.west + bounds.east) * (j / lonSteps)
        } else {
          lon = bounds.west + (360 - bounds.west + bounds.east) * (j / lonSteps) - 360
        }
      }
      
      const pos = sphericalToCartesian(lat, lon, radius)
      vertices.push(pos.x, pos.y, pos.z)
    }
  }
  
  // Create indices for wireframe lines
  for (let i = 0; i < latSteps; i++) {
    for (let j = 0; j < lonSteps; j++) {
      const idx = i * (lonSteps + 1) + j
      
      // Horizontal lines
      if (j < lonSteps) {
        indices.push(idx, idx + 1)
      }
      
      // Vertical lines
      if (i < latSteps) {
        indices.push(idx, idx + lonSteps + 1)
      }
    }
  }
  
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geometry.setIndex(indices)
  
  return geometry
}

// Check if coordinates are within bounding box (handling longitude wrapping)
export function isPointInBounds(lat: number, lon: number, bounds: BoundingBox): boolean {
  // Check latitude (straightforward)
  const latMatch = lat >= bounds.south && lat <= bounds.north
  
  // Check longitude (handle wrapping around 180/-180)
  let lonMatch: boolean
  if (bounds.west <= bounds.east) {
    // Normal case: west to east doesn't cross antimeridian
    lonMatch = lon >= bounds.west && lon <= bounds.east
  } else {
    // Crosses antimeridian: west is > 0, east is < 0
    // Feature is in range if: lon >= west OR lon <= east
    lonMatch = lon >= bounds.west || lon <= bounds.east
  }
  
  return latMatch && lonMatch
}

// Filter features by area bounds
export function filterFeaturesByBounds(features: any[], bounds: BoundingBox): any[] {
  return features.filter(feature => {
    // Handle both KMZFeature format (geometry.coordinates) and FamousFeature format (lat/lon)
    let lat: number, lon: number
    
    if (feature.geometry && feature.geometry.coordinates) {
      // KMZFeature format: [lon, lat]
      [lon, lat] = feature.geometry.coordinates
    } else if (feature.lat !== undefined && feature.lon !== undefined) {
      // FamousFeature format: {lat, lon}
      lat = feature.lat
      lon = feature.lon
    } else {
      return false
    }
    
    return isPointInBounds(lat, lon, bounds)
  })
}

// Calculate default area around a point
export function getDefaultAreaBounds(centerLat: number, centerLon: number, sizeDegrees: number = 20): BoundingBox {
  return {
    north: Math.min(centerLat + sizeDegrees / 2, 90),
    south: Math.max(centerLat - sizeDegrees / 2, -90),
    east: centerLon + sizeDegrees / 2,
    west: centerLon - sizeDegrees / 2
  }
}

// Normalize longitude to -180 to 180 range
export function normalizeLongitude(lon: number): number {
  while (lon > 180) lon -= 360
  while (lon < -180) lon += 360
  return lon
}

// Check if two bounding boxes intersect
export function boundsIntersect(bounds1: BoundingBox, bounds2: BoundingBox): boolean {
  return !(bounds1.east < bounds2.west ||
           bounds1.west > bounds2.east ||
           bounds1.north < bounds2.south ||
           bounds1.south > bounds2.north)
}