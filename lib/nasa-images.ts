// NASA Images API integration
// Fetches real images from NASA's public image database

export interface NASAImage {
  title: string
  description: string
  imageUrl: string
  nasaId: string
  dateCreated: string
  relevanceScore: number
}

// Fetch NASA images for a specific feature
export async function fetchNASAImages(featureName: string, planetName: string): Promise<NASAImage[]> {
  console.log(`Searching for images of: ${featureName} on ${planetName}`)
  
  try {
    // Create multiple search strategies for better coverage
    const searchTerms = [
      `${featureName} crater`,  // Generic crater search
      `${featureName} ${planetName}`,  // Feature with planet
      `${featureName}`,  // Just the feature name
      `lunar crater ${featureName}`,  // Lunar specific if it's Moon
      `${featureName} moon`,  // Alternative moon reference
    ]

    let allImages: NASAImage[] = []
    
    for (let i = 0; i < searchTerms.length && allImages.length < 5; i++) {
      const searchTerm = searchTerms[i]
      console.log(`Trying search term: "${searchTerm}"`)
      
      try {
        const response = await fetch(
          `https://images-api.nasa.gov/search?q=${encodeURIComponent(searchTerm)}&media_type=image&page_size=30`,
          { 
            mode: 'cors',
            headers: {
              'Accept': 'application/json'
            }
          }
        )
        
        if (response.ok) {
          const data = await response.json()
          const items = data.collection?.items || []
          console.log(`Found ${items.length} results for "${searchTerm}"`)
          
          // More flexible filtering - check if feature name appears anywhere
          const relevantImages = items
            .filter((item: any) => {
              if (!item.data || !item.data[0] || !item.links || !item.links[0]) return false
              
              const title = (item.data[0].title || '').toLowerCase()
              const description = (item.data[0].description || '').toLowerCase()
              const keywords = (item.data[0].keywords || []).join(' ').toLowerCase()
              const featureNameLower = featureName.toLowerCase()
              
              // Check title, description, and keywords
              const foundInTitle = title.includes(featureNameLower)
              const foundInDescription = description.includes(featureNameLower)
              const foundInKeywords = keywords.includes(featureNameLower)
              
              if (foundInTitle || foundInDescription || foundInKeywords) {
                console.log(`Match found: ${title}`)
                return true
              }
              return false
            })
            .map((item: any) => ({
              title: item.data[0].title,
              description: item.data[0].description || '',
              imageUrl: item.links[0].href,
              nasaId: item.data[0].nasa_id,
              dateCreated: item.data[0].date_created,
              relevanceScore: calculateRelevanceScore(item.data[0], featureName)
            }))
            .sort((a: NASAImage, b: NASAImage) => b.relevanceScore - a.relevanceScore)
          
          console.log(`Filtered to ${relevantImages.length} relevant images`)
          
          // Add unique images (avoid duplicates)
          relevantImages.forEach((img: NASAImage) => {
            if (!allImages.find(existing => existing.nasaId === img.nasaId) && allImages.length < 5) {
              allImages.push(img)
            }
          })
        } else {
          console.error(`API request failed for "${searchTerm}":`, response.status, response.statusText)
        }
      } catch (termError) {
        console.error(`Error searching for "${searchTerm}":`, termError)
      }
    }
    
    console.log(`Final result: ${allImages.length} images found for ${featureName}`)
    return allImages
    
  } catch (error) {
    console.error('Error fetching NASA images:', error)
    return []
  }
}

// Calculate relevance score for image matching
function calculateRelevanceScore(imageData: any, featureName: string): number {
  const title = (imageData.title || '').toLowerCase()
  const description = (imageData.description || '').toLowerCase()
  const keywords = (imageData.keywords || []).join(' ').toLowerCase()
  const featureNameLower = featureName.toLowerCase()
  
  let score = 0
  
  // Higher score if feature name is in title
  if (title.includes(featureNameLower)) score += 20
  
  // Bonus if it's an exact match or starts with feature name
  if (title.startsWith(featureNameLower)) score += 30
  if (title === featureNameLower) score += 50
  
  // Score for description mentions
  if (description.includes(featureNameLower)) score += 10
  
  // Score for keyword mentions
  if (keywords.includes(featureNameLower)) score += 15
  
  // Bonus for high-resolution or closeup images
  if (title.includes('high resolution') || title.includes('closeup') || title.includes('detail') || title.includes('close-up')) score += 25
  
  // Bonus for mission-specific images (Apollo, LRO, etc.)
  if (title.includes('apollo') || title.includes('lro') || title.includes('lunar reconnaissance')) score += 20
  
  // Less harsh penalty for generic terms
  if (title.includes('overview') || title.includes('global')) score -= 5
  
  return score
}