// Enhanced KMZ loader for USGS planetary nomenclature data
// Loads thousands of features from KMZ files with full metadata

import JSZip from 'jszip'

export interface KMZFeature {
  properties: {
    name: string
    featureType: string
    diameter?: number
    origin?: string
    approval_date?: string
    withinRegion?: string
    source: 'kmz' | 'famous'
  }
  geometry: {
    coordinates: [number, number] // [lon, lat]
  }
}

export interface LoadFeaturesResult {
  features: KMZFeature[]
  kmzCount: number
  famousCount: number
  total: number
}

// Parse KML content and extract features
function parseKML(kmlText: string): KMZFeature[] {
  const parser = new DOMParser()
  const kmlDoc = parser.parseFromString(kmlText, 'text/xml')

  // Check for parsing errors
  const parserError = kmlDoc.getElementsByTagName('parsererror')
  if (parserError.length > 0) {
    console.error('KML parsing error:', parserError[0].textContent)
    return []
  }

  const placemarks = kmlDoc.getElementsByTagName('Placemark')
  console.log(`Found ${placemarks.length} Placemarks in KML`)

  const parsedFeatures: KMZFeature[] = []
  let skippedCount = 0

  for (let placemark of placemarks) {
    const nameEl = placemark.getElementsByTagName('name')[0]
    const coordsEl = placemark.getElementsByTagName('coordinates')[0]

    if (!nameEl || !coordsEl) {
      skippedCount++
      continue
    }

    const name = nameEl.textContent?.trim() || ''
    const coordsText = coordsEl.textContent?.trim() || ''
    const coords = coordsText.split(/[\s,]+/).filter(c => c.length > 0)

    if (coords.length < 2) {
      console.warn(`Invalid coordinates for ${name}:`, coordsText)
      skippedCount++
      continue
    }

    const lon = parseFloat(coords[0])
    const lat = parseFloat(coords[1])

    if (isNaN(lon) || isNaN(lat)) {
      console.warn(`NaN coordinates for ${name}: lon=${coords[0]}, lat=${coords[1]}`)
      skippedCount++
      continue
    }

    // Extract extended data
    const extendedData = placemark.getElementsByTagName('ExtendedData')[0]
    let featureType = 'Unknown'
    let diameter: number | undefined
    let origin: string | undefined
    let approvalDate: string | undefined

    if (extendedData) {
      const simpleData = extendedData.getElementsByTagName('SimpleData')
      for (let data of simpleData) {
        const name = data.getAttribute('name')
        const value = data.textContent?.trim()

        if (name === 'feature_type' && value) {
          featureType = value
        } else if (name === 'diameter' && value) {
          const diameterValue = parseFloat(value)
          if (!isNaN(diameterValue)) {
            diameter = diameterValue
          }
        } else if (name === 'origin' && value) {
          origin = value
        } else if (name === 'approval_date' && value) {
          approvalDate = value
        }
      }
    }

    // Create feature object
    parsedFeatures.push({
      properties: {
        name,
        featureType,
        diameter,
        origin,
        approval_date: approvalDate,
        source: 'kmz'
      },
      geometry: {
        coordinates: [lon, lat]
      }
    })
  }

  if (skippedCount > 0) {
    console.log(`Skipped ${skippedCount} invalid placemarks`)
  }

  return parsedFeatures
}

// Convert famous features to KMZ format
function convertFamousFeatures(famousFeatures: any[]): KMZFeature[] {
  return famousFeatures.map(f => ({
    properties: {
      name: f.name,
      featureType: f.type,
      diameter: f.diameter,
      withinRegion: f.withinRegion || undefined,
      source: 'famous' as const
    },
    geometry: { 
      coordinates: [f.lon, f.lat] as [number, number] 
    }
  }))
}

// Load features from KMZ file with fallback to famous features
export async function loadPlanetFeatures(
  planetConfig: any,
  famousFeatures: any[],
  onProgress?: (message: string) => void
): Promise<LoadFeaturesResult> {
  
  // Convert famous features to standard format
  const convertedFamous = convertFamousFeatures(famousFeatures)

  // Check if KMZ URL is available
  const kmzUrl = planetConfig?.kmz_url
  if (!kmzUrl) {
    console.warn('No KMZ URL configured for this planet, using famous features')
    onProgress?.('Loaded famous features only')
    return {
      features: convertedFamous,
      kmzCount: 0,
      famousCount: convertedFamous.length,
      total: convertedFamous.length
    }
  }

  try {
    console.log(`Fetching KMZ from: ${kmzUrl}`)
    onProgress?.('Downloading nomenclature data...')

    const response = await fetch(kmzUrl, {
      mode: 'cors',
      credentials: 'omit'
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const blob = await response.blob()
    console.log(`Downloaded ${(blob.size / 1024 / 1024).toFixed(2)} MB`)

    onProgress?.('Extracting and parsing data...')

    // Unzip KMZ using JSZip
    const zip = await JSZip.loadAsync(blob)

    // Find the KML file (usually doc.kml)
    let kmlFile = null
    for (let filename in zip.files) {
      if (filename.endsWith('.kml')) {
        kmlFile = zip.files[filename]
        break
      }
    }

    if (!kmlFile) {
      throw new Error('No KML file found in KMZ')
    }

    const kmlText = await kmlFile.async('text')
    console.log('Parsing KML...')

    const kmzFeatures = parseKML(kmlText)
    console.log(`Parsed ${kmzFeatures.length} features from KMZ`)

    // Log sample features to verify coordinates
    if (kmzFeatures.length > 0) {
      console.log('Sample features:', kmzFeatures.slice(0, 3).map(f => ({
        name: f.properties.name,
        type: f.properties.featureType,
        lon: f.geometry.coordinates[0],
        lat: f.geometry.coordinates[1]
      })))
    }

    // Combine KMZ features with famous features (prioritize KMZ, add unique famous)
    const kmzNames = new Set(kmzFeatures.map(f => f.properties.name))
    const uniqueFamous = convertedFamous.filter(f =>
      !kmzNames.has(f.properties.name)
    )

    const allFeatures = [...kmzFeatures, ...uniqueFamous]

    console.log(`Total features: ${allFeatures.length} (${kmzFeatures.length} from KMZ + ${uniqueFamous.length} famous)`)

    // Sort by name
    allFeatures.sort((a, b) => {
      const nameA = a.properties?.name || ''
      const nameB = b.properties?.name || ''
      return nameA.localeCompare(nameB)
    })

    onProgress?.(`Loaded ${allFeatures.length} features`)

    return {
      features: allFeatures,
      kmzCount: kmzFeatures.length,
      famousCount: uniqueFamous.length,
      total: allFeatures.length
    }

  } catch (error) {
    console.error('Failed to load KMZ, using famous features:', error)
    onProgress?.('Failed to load KMZ, using famous features')
    
    return {
      features: convertedFamous,
      kmzCount: 0,
      famousCount: convertedFamous.length,
      total: convertedFamous.length
    }
  }
}

// Get region assignment (you can enhance this with the geographic-features.js data)
export function assignRegionsToFeatures(features: KMZFeature[], planetKey: string): void {
  // For now, we'll keep the existing region assignments
  // You could enhance this by loading the geographic-features.js data
  // and checking if features fall within defined geographic boundaries
  console.log(`Region assignment for ${planetKey} not yet implemented`)
}