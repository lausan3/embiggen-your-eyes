// Planetary configuration with WMTS tile services and enhanced features
// Converted from config.js to TypeScript

export interface PlanetaryConfigItem {
  name: string
  wmts_url?: string
  projection: string
  center: [number, number]
  minZoom: number
  maxZoom: number
  usgs_name: string
  kmz_url?: string
  textureUrl?: string
  fallbackColor?: string
}

export const PLANETARY_CONFIG: Record<string, PlanetaryConfigItem> = {
  Moon: {
    name: "Moon",
    wmts_url: "https://trek.nasa.gov/tiles/Moon/EQ/LRO_WAC_Mosaic_Global_303ppd/1.0.0//default/default028mm/{z}/{y}/{x}.jpg",
    projection: "EPSG:4326",
    center: [0, 0],
    minZoom: 0,
    maxZoom: 8,
    usgs_name: "MOON",
    kmz_url: "data/MOON_nomenclature_center_pts.kmz",
    textureUrl: "/textures/moon-texture-4k.jpg",
    fallbackColor: "#cccccc"
  },
  Mars: {
    name: "Mars",
    wmts_url: "https://trek.nasa.gov/tiles/Mars/EQ/Mars_Viking_MDIM21_ClrMosaic_global_232m/1.0.0//default/default028mm/{z}/{y}/{x}.jpg",
    projection: "EPSG:4326",
    center: [0, 0],
    minZoom: 0,
    maxZoom: 7,
    usgs_name: "MARS",
    kmz_url: "data/MARS_nomenclature_center_pts.kmz",
    textureUrl: "/textures/mars-texture-4k.jpg",
    fallbackColor: "#cd853f"
  },
  Mercury: {
    name: "Mercury",
    wmts_url: "https://trek.nasa.gov/tiles/Mercury/EQ/Mercury_MESSENGER_MDIS_Basemap_EnhancedColor_Equirectangular_928m/1.0.0//default/default028mm/{z}/{y}/{x}.jpg",
    projection: "EPSG:4326",
    center: [0, 0],
    minZoom: 0,
    maxZoom: 6,
    usgs_name: "Mercury",
    kmz_url: "data/MERCURY_nomenclature_center_pts.kmz",
    textureUrl: "/textures/mercury-texture-4k.jpg",
    fallbackColor: "#8c7853"
  },
  Vesta: {
    name: "Vesta",
    wmts_url: "https://trek.nasa.gov/tiles/Vesta/EQ/Vesta_Dawn_FC_Mosaic_Global_74ppd/1.0.0//default/default028mm/{z}/{y}/{x}.jpg",
    projection: "EPSG:4326",
    center: [0, 0],
    minZoom: 0,
    maxZoom: 5,
    usgs_name: "Vesta",
    kmz_url: "data/VESTA_nomenclature_center_pts.kmz",
    textureUrl: "/textures/vesta-texture-2k.jpg",
    fallbackColor: "#a0a0a0"
  },
  Europa: {
    name: "Europa",
    wmts_url: "https://trek.nasa.gov/tiles/Europa/EQ/20150218_europa_global_map_20000x10000/1.0.0/default/default028mm/{z}/{y}/{x}.png",
    projection: "EPSG:4326",
    center: [0, 0],
    minZoom: 0,
    maxZoom: 5,
    usgs_name: "Europa",
    kmz_url: "data/EUROPA_nomenclature_center_pts.kmz",
    textureUrl: "/textures/europa-texture-2k.jpg",
    fallbackColor: "#f5f5dc"
  },
  Io: {
    name: "Io",
    wmts_url: "https://trek.nasa.gov/tiles/Io/EQ/Io_GalileoSSI_Voyager_Global_Mosaic_ClrMerge_1km/1.0.0/default/default028mm/{z}/{y}/{x}.png",
    projection: "EPSG:4326",
    center: [0, 0],
    minZoom: 0,
    maxZoom: 5,
    usgs_name: "Io",
    kmz_url: "data/IO_nomenclature_center_pts.kmz",
    textureUrl: "/textures/io-texture-2k.jpg",
    fallbackColor: "#ffff80"
  }
}

// Feature types for filtering
export const FEATURE_TYPES = [
  'Crater', 'Mons', 'Vallis', 'Planitia', 'Mare', 'Terra',
  'Patera', 'Tholus', 'Rupes', 'Fossa', 'Dorsum', 'Chasma',
  'Oceanus', 'Sinus', 'Lacus', 'Palus', 'Labyrinthus', 'Fossae'
]