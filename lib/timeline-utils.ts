// Timeline utility functions
// Converted from app.js functions

export function parseTimeframeToYears(timeframe: string): number | null {
  if (!timeframe || timeframe === 'Present day') return 0

  // Match patterns like "3.5 billion years ago", "~2 million years ago", "0.1-4 billion years ago"
  const billionMatch = timeframe.match(/([\d.]+)(?:-[\d.]+)?\s*billion/i)
  if (billionMatch) {
    return parseFloat(billionMatch[1]) * 1e9
  }

  const millionMatch = timeframe.match(/([\d.]+)(?:-[\d.]+)?\s*million/i)
  if (millionMatch) {
    return parseFloat(millionMatch[1]) * 1e6
  }

  const thousandMatch = timeframe.match(/([\d.]+)(?:-[\d.]+)?\s*thousand/i)
  if (thousandMatch) {
    return parseFloat(thousandMatch[1]) * 1e3
  }

  // Match "Ancient (billions of years ago)" - default to 4 billion
  if (timeframe.toLowerCase().includes('ancient') || timeframe.toLowerCase().includes('billions of years ago')) {
    return 4e9
  }

  // Default to null for truly unparseable timeframes
  return null
}

// Format years for display
export function formatYears(years: number): string {
  if (years === 0) return 'Present'
  if (years >= 1e9) return `${(years / 1e9).toFixed(2)} Bya`
  if (years >= 1e6) return `${(years / 1e6).toFixed(1)} Mya`
  if (years >= 1e3) return `${(years / 1e3).toFixed(0)} Kya`
  return `${years} years ago`
}

// Format years to timeframe string (for structured data)
export function formatYearsToTimeframe(years: number): string {
  if (years === 0) return 'Present day'
  if (years >= 1e9) {
    const bya = (years / 1e9).toFixed(1)
    return `${bya} billion years ago`
  }
  if (years >= 1e6) {
    const mya = (years / 1e6).toFixed(0)
    return `${mya} million years ago`
  }
  if (years >= 1e3) {
    const kya = (years / 1e3).toFixed(0)
    return `${kya} thousand years ago`
  }
  return `${years} years ago`
}

// Estimate formation time based on feature type and planet
export function getEstimatedFormationTime(featureType: string, planetName: string): string {
  const type = featureType.toLowerCase()

  if (planetName === 'MOON') {
    if (type.includes('mare')) return '~3.0-3.8 billion years ago'
    if (type.includes('crater')) return '~0.1-4 billion years ago'
    return '~3-4 billion years ago'
  } else if (planetName === 'MARS') {
    if (type.includes('mons') || type.includes('volcan')) return '~3.5 billion years ago'
    if (type.includes('vallis') || type.includes('channel')) return '~3.5 billion years ago'
    if (type.includes('crater')) return '~0.1-4 billion years ago'
    return '~3-4 billion years ago'
  }

  return 'Ancient (billions of years ago)'
}

// Get formation process description
export function getFormationProcess(featureType: string): string {
  const type = featureType.toLowerCase()

  if (type.includes('crater')) return 'meteorite impact'
  if (type.includes('mons') || type.includes('tholus')) return 'volcanic activity'
  if (type.includes('mare')) return 'ancient lava flows'
  if (type.includes('vallis')) return 'water or lava erosion'
  if (type.includes('chasma')) return 'tectonic activity'

  return 'geological processes'
}

// Determine if a feature is notable enough to fetch timeline
export function isNotableFeature(feature: { properties: any }): boolean {
  const props = feature.properties

  // Check if in famous features
  if (props.source === 'famous') return true

  // Large features (>50km diameter)
  if (props.diameter && props.diameter > 50) return true

  // Important feature types
  const notableTypes = ['Mons', 'Tholus', 'Patera', 'Planum', 'Mare', 'Vallis', 'Chasma']
  if (notableTypes.some(type => props.featureType?.includes(type))) return true

  return false
}