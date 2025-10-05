import JSZip from "jszip"

export interface KMZFeature {
  name: string
  lat: number
  lon: number
  description?: string
}

export interface KMZData {
  features: KMZFeature[]
  textures: { name: string; data: Blob }[]
}

export async function parseKMZ(url: string): Promise<KMZData> {
  try {
    // Fetch the KMZ file
    const response = await fetch(url)
    const arrayBuffer = await response.arrayBuffer()

    // Unzip the KMZ file
    const zip = await JSZip.loadAsync(arrayBuffer)

    const features: KMZFeature[] = []
    const textures: { name: string; data: Blob }[] = []

    // Find and parse the KML file
    const kmlFile = Object.keys(zip.files).find((name) => name.endsWith(".kml"))

    if (kmlFile) {
      const kmlContent = await zip.files[kmlFile].async("string")

      // Parse KML XML
      const parser = new DOMParser()
      const xmlDoc = parser.parseFromString(kmlContent, "text/xml")

      // Extract placemarks (features)
      const placemarks = xmlDoc.getElementsByTagName("Placemark")

      for (let i = 0; i < placemarks.length; i++) {
        const placemark = placemarks[i]
        const name = placemark.getElementsByTagName("name")[0]?.textContent || ""
        const description = placemark.getElementsByTagName("description")[0]?.textContent
        const coordinates = placemark.getElementsByTagName("coordinates")[0]?.textContent

        if (coordinates) {
          // KML coordinates are in format: lon,lat,altitude
          const [lon, lat] = coordinates.trim().split(",").map(Number)

          if (!isNaN(lat) && !isNaN(lon)) {
            features.push({
              name,
              lat,
              lon,
              description,
            })
          }
        }
      }
    }

    // Extract any image files (textures)
    for (const [filename, file] of Object.entries(zip.files)) {
      if (filename.match(/\.(jpg|jpeg|png|gif)$/i) && !file.dir) {
        const blob = await file.async("blob")
        textures.push({ name: filename, data: blob })
      }
    }

    return { features, textures }
  } catch (error) {
    console.error("[v0] Error parsing KMZ:", error)
    return { features: [], textures: [] }
  }
}

export function createTextureFromBlob(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
