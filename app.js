// Main application state
let map = null;
let currentPlanet = null;
let features = [];
let featureMarkers = [];
let currentHighlight = null;
let selectedTileBounds = null;
let tileBoundsLayer = null;
let regionLayers = [];  // Store region boundary rectangles

// Initialize the application
function init() {
    setupPlanetSelector();
    initMap();
    setupEventListeners();
}

// Set up planet selector dropdown
function setupPlanetSelector() {
    const select = document.getElementById('planetSelect');
    Object.keys(PLANETARY_CONFIG).forEach(planet => {
        const option = document.createElement('option');
        option.value = planet;
        option.textContent = PLANETARY_CONFIG[planet].name;
        select.appendChild(option);
    });
}

// Initialize Leaflet map
function initMap() {
    map = L.map('map', {
        crs: L.CRS.EPSG4326,
        center: [0, 0],
        zoom: 2,
        minZoom: 1,
        maxZoom: 8,
        attributionControl: true,
        maxBounds: [[-90, -180], [90, 180]],
        maxBoundsViscosity: 1.0
    });

    map.attributionControl.addAttribution('Tiles: NASA/USGS');

    // Enable tile selection by default
    map.on('click', handleTileSelection);
}

// Load a specific planet
async function loadPlanet(planetKey) {
    if (!planetKey) return;

    const config = PLANETARY_CONFIG[planetKey];
    currentPlanet = config;

    // Clear existing layers and markers
    map.eachLayer(layer => {
        if (layer instanceof L.TileLayer) {
            map.removeLayer(layer);
        }
    });
    clearMarkers();

    // Add new tile layer if available
    if (config.wmts_url) {
        L.tileLayer(config.wmts_url, {
            minZoom: config.minZoom,
            maxZoom: config.maxZoom,
            tms: false,
            attribution: `${config.name} - NASA/USGS`
        }).addTo(map);
    } else {
        // Show message that tiles are unavailable
        console.warn(`Tile imagery unavailable for ${config.name}, but features will still load`);
    }

    // Reset view
    map.setView(config.center, 2);

    // Clear tile selection and reset UI
    clearTileSelection();

    // Load all features for this planet (stored in memory, not displayed)
    await loadFeatures(config.usgs_name);
}

// Parse KML to extract features
function parseKML(kmlText) {
    const parser = new DOMParser();
    const kmlDoc = parser.parseFromString(kmlText, 'text/xml');

    // Check for parsing errors
    const parserError = kmlDoc.getElementsByTagName('parsererror');
    if (parserError.length > 0) {
        console.error('KML parsing error:', parserError[0].textContent);
        return [];
    }

    const placemarks = kmlDoc.getElementsByTagName('Placemark');
    console.log(`Found ${placemarks.length} Placemarks in KML`);

    const parsedFeatures = [];
    let skippedCount = 0;

    for (let placemark of placemarks) {
        const nameEl = placemark.getElementsByTagName('name')[0];
        const coordsEl = placemark.getElementsByTagName('coordinates')[0];

        if (!nameEl || !coordsEl) {
            skippedCount++;
            continue;
        }

        const name = nameEl.textContent.trim();
        const coordsText = coordsEl.textContent.trim();
        const coords = coordsText.split(/[\s,]+/).filter(c => c.length > 0);

        if (coords.length < 2) {
            console.warn(`Invalid coordinates for ${name}:`, coordsText);
            skippedCount++;
            continue;
        }

        const lon = parseFloat(coords[0]);
        const lat = parseFloat(coords[1]);

        if (isNaN(lon) || isNaN(lat)) {
            console.warn(`NaN coordinates for ${name}: lon=${coords[0]}, lat=${coords[1]}`);
            skippedCount++;
            continue;
        }

        // Extract extended data
        const extendedData = placemark.getElementsByTagName('ExtendedData')[0];
        let featureType = 'Unknown';
        let diameter = null;
        let origin = null;
        let approvalDate = null;
        let ethnicity = null;
        let code = null;

        if (extendedData) {
            const simpleData = extendedData.getElementsByTagName('SimpleData');
            for (let data of simpleData) {
                const attrName = data.getAttribute('name');
                const value = data.textContent.trim();

                if (attrName === 'type') {
                    featureType = value;
                } else if (attrName === 'diameter') {
                    diameter = parseFloat(value);
                } else if (attrName === 'origin') {
                    origin = value;
                } else if (attrName === 'approvaldt') {
                    approvalDate = value;
                } else if (attrName === 'ethnicity') {
                    ethnicity = value;
                } else if (attrName === 'code') {
                    code = value;
                }
            }
        }

        parsedFeatures.push({
            properties: {
                name: name,
                featureType: featureType,
                diameter: diameter,
                origin: origin,
                approval_date: approvalDate,
                ethnicity: ethnicity,
                code: code,
                source: 'kmz'
            },
            geometry: {
                coordinates: [lon, lat]
            }
        });
    }

    console.log(`Successfully parsed ${parsedFeatures.length} features, skipped ${skippedCount}`);
    return parsedFeatures;
}

// Load features from USGS KMZ file
async function loadFeatures(planetName) {
    const sidebar = document.getElementById('featureList');
    sidebar.innerHTML = '<div class="loading">Loading features from USGS...</div>';

    console.log(`Loading features for ${planetName}`);

    // Get famous features as fallback
    let famousFeatures = [];
    if (FAMOUS_FEATURES && FAMOUS_FEATURES[planetName]) {
        famousFeatures = FAMOUS_FEATURES[planetName].map(f => ({
            properties: {
                name: f.name,
                featureType: f.type,
                withinRegion: f.withinRegion || null,
                source: 'famous'
            },
            geometry: { coordinates: [f.lon, f.lat] }
        }));
    }

    // Try to fetch KMZ from USGS
    const kmzUrl = currentPlanet?.kmz_url;

    if (!kmzUrl) {
        console.warn('No KMZ URL configured for this planet, using famous features');
        features = famousFeatures;
        sidebar.innerHTML = `<div class="loading">Loaded ${features.length} features. Click a tile to view features in that area, or search above.</div>`;
        return;
    }

    try {
        console.log(`Fetching KMZ from: ${kmzUrl}`);
        sidebar.innerHTML = '<div class="loading">Downloading nomenclature data...</div>';

        const response = await fetch(kmzUrl, {
            mode: 'cors',
            credentials: 'omit'
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const blob = await response.blob();
        console.log(`Downloaded ${(blob.size / 1024 / 1024).toFixed(2)} MB`);

        sidebar.innerHTML = '<div class="loading">Extracting and parsing data...</div>';

        // Unzip KMZ using JSZip
        const zip = await JSZip.loadAsync(blob);

        // Find the KML file (usually doc.kml)
        let kmlFile = null;
        for (let filename in zip.files) {
            if (filename.endsWith('.kml')) {
                kmlFile = zip.files[filename];
                break;
            }
        }

        if (!kmlFile) throw new Error('No KML file found in KMZ');

        const kmlText = await kmlFile.async('text');
        console.log('Parsing KML...');

        const kmzFeatures = parseKML(kmlText);
        console.log(`Parsed ${kmzFeatures.length} features from KMZ`);

        // Log sample features to verify coordinates
        if (kmzFeatures.length > 0) {
            console.log('Sample features:', kmzFeatures.slice(0, 3).map(f => ({
                name: f.properties.name,
                type: f.properties.featureType,
                lon: f.geometry.coordinates[0],
                lat: f.geometry.coordinates[1]
            })));
        }

        // Combine KMZ features with famous features (prioritize KMZ, add unique famous)
        const kmzNames = new Set(kmzFeatures.map(f => f.properties.name));
        const uniqueFamous = famousFeatures.filter(f =>
            !kmzNames.has(f.properties.name)
        );

        features = [...kmzFeatures, ...uniqueFamous];

        console.log(`Total features: ${features.length} (${kmzFeatures.length} from KMZ + ${uniqueFamous.length} famous)`);

    } catch (error) {
        console.error('Failed to load KMZ, using famous features:', error);
        features = famousFeatures;
        console.log(`Using ${features.length} famous features as fallback`);
    }

    // Sort by name
    features.sort((a, b) => {
        const nameA = a.properties?.name || '';
        const nameB = b.properties?.name || '';
        return nameA.localeCompare(nameB);
    });

    // Show message
    sidebar.innerHTML = `<div class="loading">Loaded ${features.length} features. Click a tile to view features in that area, or search above.</div>`;
}

// Get region boundary for a feature that is inside a larger region
function getRegionBoundary(regionName) {
    if (!currentPlanet || !GEOGRAPHIC_FEATURES) return null;

    const planetFeatures = GEOGRAPHIC_FEATURES[currentPlanet.usgs_name] || [];
    const region = planetFeatures.find(f => f.name === regionName);

    return region ? region.bounds : null;
}

// Display features in sidebar
function displayFeatures(featureList) {
    const sidebar = document.getElementById('featureList');
    sidebar.innerHTML = '';

    if (featureList.length === 0) {
        sidebar.innerHTML = '<div class="loading">No features found</div>';
        return;
    }

    displayList = featureList;

    featureList.forEach(feature => {
        const item = document.createElement('div');
        item.className = 'feature-item';

        const name = feature.properties.name || 'Unnamed';
        const type = feature.properties.featureType || 'Unknown';
        const withinRegion = feature.properties.withinRegion;

        let html = `<h4>${name}</h4><p>${type}`;

        if (withinRegion) {
            html += ` <span style="color: #4a9eff;">in ${withinRegion}</span>`;
        }

        html += `</p>`;
        item.innerHTML = html;

        item.addEventListener('click', () => highlightFeature(feature));
        sidebar.appendChild(item);
    });

    // Add markers for all features
    addFeatureMarkers(featureList);
}

// Add markers for features
function addFeatureMarkers(featureList) {
    clearMarkers();

    featureList.forEach(feature => {
        if (!feature.geometry || !feature.geometry.coordinates) return;

        const [lon, lat] = feature.geometry.coordinates;

        const marker = L.circleMarker([lat, lon], {
            radius: 4,
            fillColor: '#4a9eff',
            color: '#fff',
            weight: 1,
            opacity: 1,
            fillOpacity: 0.8
        }).addTo(map);

        marker.bindTooltip(feature.properties.name || 'Unnamed', {
            permanent: false,
            direction: 'top'
        });

        marker.on('click', () => highlightFeature(feature));

        featureMarkers.push(marker);
    });
}

// Clear all markers
function clearMarkers() {
    featureMarkers.forEach(marker => map.removeLayer(marker));
    featureMarkers = [];

    if (currentHighlight) {
        map.removeLayer(currentHighlight);
        currentHighlight = null;
    }

    // Clear region boundaries
    regionLayers.forEach(layer => map.removeLayer(layer));
    regionLayers = [];
}

// Highlight a specific feature
function highlightFeature(feature) {
    if (!feature.geometry || !feature.geometry.coordinates) return;

    const [lon, lat] = feature.geometry.coordinates;
    const withinRegion = feature.properties.withinRegion;

    // Remove previous highlight
    if (currentHighlight) {
        map.removeLayer(currentHighlight);
    }

    // Clear previous region boundaries
    regionLayers.forEach(layer => map.removeLayer(layer));
    regionLayers = [];

    // If feature is within a region, draw the region boundary
    if (withinRegion) {
        const regionBounds = getRegionBoundary(withinRegion);

        if (regionBounds) {
            const regionRect = L.rectangle(
                [[regionBounds.south, regionBounds.west], [regionBounds.north, regionBounds.east]],
                {
                    color: '#9d4edd',
                    weight: 2,
                    fillColor: '#9d4edd',
                    fillOpacity: 0.1,
                    dashArray: '5, 5'
                }
            ).addTo(map);

            regionRect.bindTooltip(withinRegion, { permanent: false, direction: 'center' });
            regionLayers.push(regionRect);
        }
    }

    // Add highlight marker for the specific feature
    currentHighlight = L.circleMarker([lat, lon], {
        radius: 8,
        fillColor: '#ff4a4a',
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.9
    }).addTo(map);

    // Pan and zoom to feature
    const targetZoom = withinRegion ? 4 : Math.min(map.getZoom() + 2, currentPlanet?.maxZoom || 8);
    map.setView([lat, lon], targetZoom, {
        animate: true,
        duration: 0.5
    });

    // Show feature details
    showFeatureDetails(feature);
}

// Show feature details panel
function showFeatureDetails(feature) {
    const panel = document.getElementById('featureDetails');
    const nameEl = document.getElementById('featureName');
    const infoEl = document.getElementById('featureInfo');

    const props = feature.properties;
    const [lon, lat] = feature.geometry.coordinates;

    nameEl.textContent = props.name || 'Unnamed Feature';

    let html = `
        <p><strong>Type:</strong> ${props.featureType || 'Unknown'}</p>
        <p><strong>Coordinates:</strong> ${lat.toFixed(2)}°, ${lon.toFixed(2)}°</p>
    `;

    if (props.withinRegion) {
        html += `<p><strong>Located in:</strong> ${props.withinRegion}</p>`;
    }

    html += `
        ${props.diameter ? `<p><strong>Diameter:</strong> ${props.diameter} km</p>` : ''}
        ${props.origin ? `<p><strong>Origin:</strong> ${props.origin}</p>` : ''}
        ${props.approval_date ? `<p><strong>Approved:</strong> ${props.approval_date}</p>` : ''}
    `;

    infoEl.innerHTML = html;
    panel.classList.remove('hidden');
}

// Search features by name
function searchFeatures() {
    const query = document.getElementById('featureSearch').value.toLowerCase().trim();

    if (!query) {
        // If there's a tile selected, show features in that tile
        if (selectedTileBounds) {
            filterFeaturesByTile(selectedTileBounds);
        } else {
            // Show nothing, prompt to select tile
            const sidebar = document.getElementById('featureList');
            sidebar.innerHTML = `<div class="loading">Click a tile to view features in that area, or use search above.</div>`;
        }
        return;
    }

    // Search across all features
    const filtered = features.filter(f =>
        (f.properties.name || '').toLowerCase().includes(query) ||
        (f.properties.featureType || '').toLowerCase().includes(query)
    );

    displayFeatures(filtered);
}

// Calculate tile coordinates from lat/lon at a given zoom level
function getTileCoordinates(lat, lon, zoom) {
    const n = Math.pow(2, zoom);
    const xtile = Math.floor((lon + 180) / 360 * n);
    const ytile = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * n);
    return { x: xtile, y: ytile, z: zoom };
}

// Get lat/lon bounds from tile coordinates
function getTileBounds(x, y, z) {
    const n = Math.pow(2, z);
    const lon_min = x / n * 360 - 180;
    const lon_max = (x + 1) / n * 360 - 180;
    const lat_max = Math.atan(Math.sinh(Math.PI * (1 - 2 * y / n))) * 180 / Math.PI;
    const lat_min = Math.atan(Math.sinh(Math.PI * (1 - 2 * (y + 1) / n))) * 180 / Math.PI;

    return {
        north: lat_max,
        south: lat_min,
        east: lon_max,
        west: lon_min
    };
}

// Handle tile selection on map click
function handleTileSelection(e) {
    if (!currentPlanet) return;

    const { lat, lng } = e.latlng;
    const zoom = map.getZoom();

    // Calculate tile coordinates
    const tile = getTileCoordinates(lat, lng, zoom);
    const bounds = getTileBounds(tile.x, tile.y, tile.z);

    // Store selected tile
    selectedTileBounds = bounds;

    // Remove previous tile bounds layer
    if (tileBoundsLayer) {
        map.removeLayer(tileBoundsLayer);
    }

    // Draw tile bounds rectangle
    tileBoundsLayer = L.rectangle(
        [[bounds.south, bounds.west], [bounds.north, bounds.east]],
        {
            color: '#4a9eff',
            weight: 3,
            fillColor: '#4a9eff',
            fillOpacity: 0.2,
            dashArray: '10, 5'
        }
    ).addTo(map);

    // Show tile info
    displayTileInfo(tile, bounds);

    // Filter features by tile bounds
    filterFeaturesByTile(bounds);

    // Show clear button
    document.getElementById('clearTileBtn').classList.remove('hidden');
}

// Check if two bounding boxes intersect
function boundsIntersect(bounds1, bounds2) {
    return !(bounds1.east < bounds2.west ||
             bounds1.west > bounds2.east ||
             bounds1.north < bounds2.south ||
             bounds1.south > bounds2.north);
}

// Find large geographic features that intersect with tile bounds
function findIntersectingGeographicFeatures(tileBounds) {
    if (!currentPlanet || !GEOGRAPHIC_FEATURES) return [];

    const planetFeatures = GEOGRAPHIC_FEATURES[currentPlanet.usgs_name] || [];

    return planetFeatures.filter(feature =>
        boundsIntersect(tileBounds, feature.bounds)
    );
}

// Display tile information
function displayTileInfo(tile, bounds) {
    const tileInfo = document.getElementById('tileInfo');

    // Find intersecting large features
    const largeFeatures = findIntersectingGeographicFeatures(bounds);

    let html = `
        <p><strong>Tile:</strong> z=${tile.z}, x=${tile.x}, y=${tile.y}</p>
        <p><strong>Bounds:</strong> ${bounds.north.toFixed(2)}°N to ${bounds.south.toFixed(2)}°S, ${bounds.west.toFixed(2)}°W to ${bounds.east.toFixed(2)}°E</p>
    `;

    if (largeFeatures.length > 0) {
        html += `<p><strong>Large Features:</strong></p>`;
        html += `<ul style="margin-left: 1rem; margin-top: 0.5rem;">`;
        largeFeatures.forEach(feature => {
            html += `<li style="margin-bottom: 0.25rem;">
                <strong>${feature.name}</strong> (${feature.type})<br>
                <span style="font-size: 0.8rem; color: #aaa;">${feature.description}</span>
            </li>`;
        });
        html += `</ul>`;
    }

    tileInfo.innerHTML = html;
    tileInfo.classList.remove('hidden');
}

// Filter features by tile bounds
function filterFeaturesByTile(bounds) {
    console.log(`Filtering features within tile bounds:`, bounds);
    console.log(`Sample feature coordinates (first 5):`, features.slice(0, 5).map(f => ({
        name: f.properties.name,
        coords: f.geometry.coordinates
    })));

    const filtered = features.filter(f => {
        if (!f.geometry || !f.geometry.coordinates) return false;

        let [lon, lat] = f.geometry.coordinates;

        // Check latitude (straightforward)
        const latMatch = lat >= bounds.south && lat <= bounds.north;

        // Check longitude (handle wrapping around 180/-180)
        let lonMatch;
        if (bounds.west <= bounds.east) {
            // Normal case: west to east doesn't cross antimeridian
            lonMatch = lon >= bounds.west && lon <= bounds.east;
        } else {
            // Crosses antimeridian: west is > 0, east is < 0
            // Feature is in range if: lon >= west OR lon <= east
            lonMatch = lon >= bounds.west || lon <= bounds.east;
        }

        return latMatch && lonMatch;
    });

    console.log(`Found ${filtered.length} features within tile (out of ${features.length} total)`);

    if (filtered.length === 0) {
        const sidebar = document.getElementById('featureList');
        sidebar.innerHTML = `<div class="loading">No features found in this tile. Try a different area or use search.</div>`;
    } else {
        displayFeatures(filtered);
    }
}

// Clear tile selection
function clearTileSelection() {
    // Remove tile bounds layer
    if (tileBoundsLayer) {
        map.removeLayer(tileBoundsLayer);
        tileBoundsLayer = null;
    }

    // Clear all markers and regions
    clearMarkers();

    // Reset state
    selectedTileBounds = null;

    // Hide tile info
    document.getElementById('tileInfo').classList.add('hidden');

    // Hide clear button
    document.getElementById('clearTileBtn').classList.add('hidden');

    // Reset to initial state
    const sidebar = document.getElementById('featureList');
    sidebar.innerHTML = `<div class="loading">Click a tile to view features in that area, or use search above.</div>`;
}

// Set up event listeners
function setupEventListeners() {
    document.getElementById('planetSelect').addEventListener('change', (e) => {
        loadPlanet(e.target.value);
    });

    document.getElementById('searchBtn').addEventListener('click', searchFeatures);

    document.getElementById('featureSearch').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchFeatures();
        }
    });

    document.getElementById('closeDetails').addEventListener('click', () => {
        document.getElementById('featureDetails').classList.add('hidden');
    });

    document.getElementById('clearTileBtn').addEventListener('click', clearTileSelection);
}

// Start the application
document.addEventListener('DOMContentLoaded', init);
