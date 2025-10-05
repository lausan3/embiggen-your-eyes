// Planetary configuration with WMTS tile services
// Moon and Mars have working Trek imagery; Europa and Io have nomenclature data only
const PLANETARY_CONFIG = {
    Moon: {
        name: "Moon",
        wmts_url: "https://trek.nasa.gov/tiles/Moon/EQ/LRO_WAC_Mosaic_Global_303ppd/1.0.0//default/default028mm/{z}/{y}/{x}.jpg",
        projection: "EPSG:4326",
        center: [0, 0],
        minZoom: 0,
        maxZoom: 8,
        usgs_name: "MOON",
        kmz_url: "data/MOON_nomenclature_center_pts.kmz"
    },
    Mars: {
        name: "Mars",
        wmts_url: "https://trek.nasa.gov/tiles/Mars/EQ/Mars_Viking_MDIM21_ClrMosaic_global_232m/1.0.0//default/default028mm/{z}/{y}/{x}.jpg",
        projection: "EPSG:4326",
        center: [0, 0],
        minZoom: 0,
        maxZoom: 7,
        usgs_name: "MARS",
        kmz_url: "data/MARS_nomenclature_center_pts.kmz"
    },
    Europa: {
        name: "Europa",
        wmts_url: "https://trek.nasa.gov/tiles/Europa/EQ/20150218_europa_global_map_20000x10000/1.0.0/default/default028mm/{z}/{y}/{x}.png",
        projection: "EPSG:4326",
        center: [0, 0],
        minZoom: 0,
        maxZoom: 5,
        usgs_name: "Europa",
        kmz_url: "data/EUROPA_nomenclature_center_pts.kmz"
    },
    Io: {
        name: "Io",
        wmts_url: "https://trek.nasa.gov/tiles/Io/EQ/Io_GalileoSSI_Voyager_Global_Mosaic_ClrMerge_1km/1.0.0/default/default028mm/{z}/{y}/{x}.png",
        projection: "EPSG:4326",
        center: [0, 0],
        minZoom: 0,
        maxZoom: 5,
        usgs_name: "Io",
        kmz_url: "data/IO_nomenclature_center_pts.kmz"
    }
};

// Feature types for filtering
const FEATURE_TYPES = [
    'Crater', 'Mons', 'Vallis', 'Planitia', 'Mare', 'Terra',
    'Patera', 'Tholus', 'Rupes', 'Fossa', 'Dorsum'
];
