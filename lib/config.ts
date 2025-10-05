export interface PlanetaryConfig {
  name: string
  wmts_url: string
  projection: string
  center: [number, number]
  minZoom: number
  maxZoom: number
  usgs_name: string
  kmz_url: string
  textureUrl?: string
  fallbackColor?: string
}

export const PLANETARY_CONFIG: Record<string, PlanetaryConfig> = {
  Moon: {
    name: "Moon",
    wmts_url:
      "https://trek.nasa.gov/tiles/Moon/EQ/LRO_WAC_Mosaic_Global_303ppd/1.0.0//default/default028mm/{z}/{y}/{x}.jpg",
    projection: "EPSG:4326",
    center: [0, 0],
    minZoom: 0,
    maxZoom: 8,
    usgs_name: "Moon",
    kmz_url: "data/MOON_nomenclature_center_pts.kmz",
    textureUrl: "/moon-surface-texture-realistic-gray-craters.jpg",
    fallbackColor: "#8a8a8a",
  },
  Mars: {
    name: "Mars",
    wmts_url:
      "https://trek.nasa.gov/tiles/Mars/EQ/Mars_Viking_MDIM21_ClrMosaic_global_232m/1.0.0//default/default028mm/{z}/{y}/{x}.jpg",
    projection: "EPSG:4326",
    center: [0, 0],
    minZoom: 0,
    maxZoom: 7,
    usgs_name: "Mars",
    kmz_url: "data/MARS_nomenclature_center_pts.kmz",
    textureUrl: "/mars-surface-texture-realistic-red-orange-terrain.jpg",
    fallbackColor: "#cd5c5c",
  },
  Europa: {
    name: "Europa",
    wmts_url:
      "https://trek.nasa.gov/tiles/Europa/EQ/20150218_europa_global_map_20000x10000/1.0.0/default/default028mm/{z}/{y}/{x}.png",
    projection: "EPSG:4326",
    center: [0, 0],
    minZoom: 0,
    maxZoom: 5,
    usgs_name: "Europa",
    kmz_url: "data/EUROPA_nomenclature_center_pts.kmz",
  },
  Io: {
    name: "Io",
    wmts_url:
      "https://trek.nasa.gov/tiles/Io/EQ/Io_GalileoSSI_Voyager_Global_Mosaic_ClrMerge_1km/1.0.0/default/default028mm/{z}/{y}/{x}.png",
    projection: "EPSG:4326",
    center: [0, 0],
    minZoom: 0,
    maxZoom: 5,
    usgs_name: "Io",
    kmz_url: "data/IO_nomenclature_center_pts.kmz",
  },
  Mercury: {
    name: "Mercury",
    wmts_url:
      "https://trek.nasa.gov/tiles/Mercury/EQ/Mercury_MESSENGER_MDIS_Basemap_LOI_Mosaic_Global_166m/1.0.0/default/default028mm/{z}/{y}/{x}.jpg",
    projection: "EPSG:4326",
    center: [0, 0],
    minZoom: 0,
    maxZoom: 6,
    usgs_name: "Mercury",
    kmz_url: "data/MERCURY_nomenclature_center_pts.kmz",
    textureUrl: "/mercury-surface-texture-realistic-gray-brown-crate.jpg",
    fallbackColor: "#a0826d",
  },
  Vesta: {
    name: "Vesta",
    wmts_url:
      "https://trek.nasa.gov/tiles/Vesta/EQ/Vesta_Dawn_FC_HAMO_Mosaic_Global_74ppd/1.0.0/default/default028mm/{z}/{y}/{x}.jpg",
    projection: "EPSG:4326",
    center: [0, 0],
    minZoom: 0,
    maxZoom: 5,
    usgs_name: "Vesta",
    kmz_url: "data/VESTA_nomenclature_center_pts.kmz",
    textureUrl: "/vesta-asteroid-surface-texture-realistic-gray-rock.jpg",
    fallbackColor: "#7a7a7a",
  },
}

export const FEATURE_TYPES = [
  "Crater",
  "Mons",
  "Vallis",
  "Planitia",
  "Mare",
  "Terra",
  "Patera",
  "Tholus",
  "Rupes",
  "Fossa",
  "Dorsum",
  "Oceanus",
  "Sinus",
  "Lacus",
  "Palus",
  "Chasma",
  "Fossae",
  "Labyrinthus",
  "Planum",
  "Region",
]
