// Smart feature visibility management
// Only show features that are visible from current camera angle

import * as THREE from 'three'

export interface VisibleFeature {
  name: string
  type: string
  lat: number
  lon: number
  diameter?: number
  withinRegion?: string
  description?: string
  distance?: number
}

// Calculate which features are visible from current camera position
export function getVisibleFeatures(
  allFeatures: any[],
  camera: THREE.Camera,
  maxFeatures: number = 200
): VisibleFeature[] {
  // Get camera direction (where it's looking)
  const cameraDirection = new THREE.Vector3()
  camera.getWorldDirection(cameraDirection)
  
  // Score features by how close they are to camera view center
  const scoredFeatures = allFeatures.map(feature => {
    // Convert feature lat/lon to 3D position
    const lat = feature.lat
    const lon = feature.lon
    
    const phi = THREE.MathUtils.degToRad(90 - lat)
    const theta = THREE.MathUtils.degToRad(lon)
    
    const featurePosition = new THREE.Vector3(
      Math.sin(phi) * Math.cos(theta),
      Math.cos(phi),
      Math.sin(phi) * Math.sin(theta)
    )
    
    // Calculate dot product (how aligned feature is with camera direction)
    const alignment = featurePosition.dot(cameraDirection)
    
    // Prioritize larger features and those more aligned with camera
    const importanceScore = (feature.diameter || 1) * 0.1
    const visibilityScore = Math.max(0, alignment) // Only front-facing features
    const totalScore = visibilityScore + importanceScore
    
    return {
      ...feature,
      distance: 1 - alignment, // For sorting (closer = lower distance)
      score: totalScore
    }
  })
  
  // Filter to only front-facing features and sort by score
  return scoredFeatures
    .filter(f => f.score > 0.1) // Only show features reasonably visible
    .sort((a, b) => b.score - a.score)
    .slice(0, maxFeatures) // Limit total features shown
}

// Check if a feature is on the visible hemisphere
export function isFeatureVisible(
  lat: number,
  lon: number,
  camera: THREE.Camera
): boolean {
  const cameraDirection = new THREE.Vector3()
  camera.getWorldDirection(cameraDirection)
  
  const phi = THREE.MathUtils.degToRad(90 - lat)
  const theta = THREE.MathUtils.degToRad(lon)
  
  const featurePosition = new THREE.Vector3(
    Math.sin(phi) * Math.cos(theta),
    Math.cos(phi),
    Math.sin(phi) * Math.sin(theta)
  )
  
  return featurePosition.dot(cameraDirection) > 0.1
}

// Get features within a zoom level
export function getFeaturesByZoom(
  allFeatures: any[],
  zoomLevel: number,
  maxFeatures: number = 500
): any[] {
  // At far zoom, show only major features
  if (zoomLevel < 4) {
    return allFeatures
      .filter(f => (f.diameter || 0) > 50) // Only large features
      .slice(0, 50)
  }
  
  // At medium zoom, show more features
  if (zoomLevel < 6) {
    return allFeatures
      .filter(f => (f.diameter || 0) > 10) // Medium+ features
      .slice(0, 200)
  }
  
  // At close zoom, show many features
  return allFeatures.slice(0, maxFeatures)
}