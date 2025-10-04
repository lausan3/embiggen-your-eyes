// Planetary configuration with WMTS tile services
const PLANETARY_CONFIG = {
    Moon: {
        name: "Moon",
        wmts_url: "https://trek.nasa.gov/tiles/Moon/EQ/LRO_WAC_Mosaic_Global_303ppd/1.0.0//default/default028mm/{z}/{y}/{x}.jpg",
        projection: "EPSG:4326",
        center: [0, 0],
        minZoom: 0,
        maxZoom: 8,
        usgs_name: "Moon"
    },
    Mars: {
        name: "Mars",
        wmts_url: "https://trek.nasa.gov/tiles/Mars/EQ/Mars_Viking_MDIM21_ClrMosaic_global_232m/1.0.0//default/default028mm/{z}/{y}/{x}.jpg",
        projection: "EPSG:4326",
        center: [0, 0],
        minZoom: 0,
        maxZoom: 7,
        usgs_name: "Mars"
    },
    Mercury: {
        name: "Mercury",
        wmts_url: "https://trek.nasa.gov/tiles/Mercury/EQ/Mercury_MESSENGER_MDIS_Basemap_EnhancedColor_Equirectangular_928m/1.0.0//default/default028mm/{z}/{y}/{x}.jpg",
        projection: "EPSG:4326",
        center: [0, 0],
        minZoom: 0,
        maxZoom: 6,
        usgs_name: "Mercury"
    },
    Vesta: {
        name: "Vesta",
        wmts_url: "https://trek.nasa.gov/tiles/Vesta/EQ/Vesta_Dawn_FC_Mosaic_Global_74ppd/1.0.0//default/default028mm/{z}/{y}/{x}.jpg",
        projection: "EPSG:4326",
        center: [0, 0],
        minZoom: 0,
        maxZoom: 5,
        usgs_name: "Vesta"
    }
};

// Feature types for filtering
const FEATURE_TYPES = [
    'Crater', 'Mons', 'Vallis', 'Planitia', 'Mare', 'Terra',
    'Patera', 'Tholus', 'Rupes', 'Fossa', 'Dorsum'
];
