// Main application state
let map = null;
let currentPlanet = null;
let features = [];
let featureMarkers = [];
let currentHighlight = null;
let selectedTileBounds = null;
let tileBoundsLayer = null;
let regionLayers = [];  // Store region boundary rectangles
let timelineCache = {};  // Cache for fetched timelines
let comparisonMode = false;  // Track if in comparison mode
let comparisonFeatures = [];  // Store selected features for comparison
let featureAnalyzer = null;  // AI-based feature analyzer

// Initialize the application
function init() {
    // Initialize AI feature analyzer
    if (typeof FeatureAnalyzer !== 'undefined') {
        featureAnalyzer = new FeatureAnalyzer();
        console.log('✓ Feature analyzer initialized');
    }

    setupPlanetSelector();
    initMap();
    setupEventListeners();

    // Load Moon by default
    loadPlanet('Moon');
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
        maxBoundsViscosity: 1.0,
        editable: true
    });

    map.attributionControl.addAttribution('Tiles: NASA/USGS');

    // Enable draggable rectangle selection
    map.on('click', startRectangleSelection);
}

// Load a specific planet
async function loadPlanet(planetKey) {
    if (!planetKey) {
        // Default to Moon if no planet selected
        planetKey = 'Moon';
        document.getElementById('planetSelect').value = planetKey;
    }

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
                source: 'kmz',
                withinRegion: null  // Will be determined after loading
            },
            geometry: {
                coordinates: [lon, lat]
            }
        });
    }

    console.log(`Successfully parsed ${parsedFeatures.length} features, skipped ${skippedCount}`);
    return parsedFeatures;
}

// Load features from USGS KMZ file or curated Earth features
async function loadFeatures(planetName) {
    const sidebar = document.getElementById('featureList');
    sidebar.innerHTML = '<div class="loading">Loading features...</div>';

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

        // Assign geographic regions to features
        try {
            // Get the planet key from PLANETARY_CONFIG
            const planetKey = Object.keys(PLANETARY_CONFIG).find(
                key => PLANETARY_CONFIG[key].usgs_name === planetName
            );
            if (planetKey) {
                assignRegionsToFeatures(features, planetKey);
                console.log('✓ Assigned geographic regions to features');
            }
        } catch (regionError) {
            console.warn('Failed to assign regions:', regionError);
        }

    } catch (error) {
        console.error('Failed to load KMZ, using famous features:', error);
        features = famousFeatures;
        console.log(`Using ${features.length} famous features as fallback`);
    }

    console.log(`Final feature count: ${features.length}`);

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
// Detect which region a feature is within
function detectFeatureRegion(feature, planetKey) {
    if (!GEOGRAPHIC_FEATURES[planetKey]) return null;

    const [lon, lat] = feature.geometry.coordinates;

    for (const region of GEOGRAPHIC_FEATURES[planetKey]) {
        const bounds = region.bounds;

        // Check if coordinates fall within region bounds
        if (lat >= bounds.south && lat <= bounds.north &&
            lon >= bounds.west && lon <= bounds.east) {
            return region.name;
        }
    }

    return null;
}

// Apply region detection to all features
function assignRegionsToFeatures(featureList, planetKey) {
    featureList.forEach(feature => {
        if (!feature.properties.withinRegion) {
            feature.properties.withinRegion = detectFeatureRegion(feature, planetKey);
        }
    });
}

function getRegionBoundary(regionName) {
    if (!currentPlanet || !GEOGRAPHIC_FEATURES) return null;

    const planetFeatures = GEOGRAPHIC_FEATURES[currentPlanet.usgs_name] || [];
    const region = planetFeatures.find(f => f.name === regionName);

    return region ? region.bounds : null;
}

// Display features in sidebar
// Organize features into parent-child hierarchy
function organizeFeatureHierarchy(featureList) {
    const hierarchy = [];
    const parentMap = new Map();
    const childMap = new Map();

    // First pass: identify parents and children
    featureList.forEach(feature => {
        const name = feature.properties.name || 'Unnamed';

        // Check if this is a subfeature (has letter suffix like "A", "B", "AA", etc.)
        const subfeatureMatch = name.match(/^(.+?)\s+([A-Z]{1,2})$/);

        if (subfeatureMatch) {
            const parentName = subfeatureMatch[1].trim();
            const suffix = subfeatureMatch[2];

            // Store this as a child
            if (!childMap.has(parentName)) {
                childMap.set(parentName, []);
            }
            childMap.get(parentName).push({ feature, suffix });
        } else {
            // This could be a parent feature
            parentMap.set(name, feature);
        }
    });

    // Second pass: build hierarchy
    const processedChildren = new Set();

    featureList.forEach(feature => {
        const name = feature.properties.name || 'Unnamed';

        // Skip if already processed as a child
        if (processedChildren.has(name)) return;

        // Check if this is a subfeature
        const subfeatureMatch = name.match(/^(.+?)\s+([A-Z]{1,2})$/);
        if (subfeatureMatch) {
            processedChildren.add(name);
            return; // Will be added under parent
        }

        // Add parent feature
        const hierarchyItem = {
            feature: feature,
            children: []
        };

        // Add children if any
        if (childMap.has(name)) {
            const children = childMap.get(name);
            // Sort children by suffix (A, B, C... then AA, AB, etc.)
            children.sort((a, b) => {
                if (a.suffix.length !== b.suffix.length) {
                    return a.suffix.length - b.suffix.length;
                }
                return a.suffix.localeCompare(b.suffix);
            });

            children.forEach(child => {
                hierarchyItem.children.push(child.feature);
                processedChildren.add(child.feature.properties.name);
            });
        }

        hierarchy.push(hierarchyItem);
    });

    return hierarchy;
}

function displayFeatures(featureList) {
    const sidebar = document.getElementById('featureList');
    sidebar.innerHTML = '';

    if (featureList.length === 0) {
        sidebar.innerHTML = '<div class="loading">No features found</div>';
        return;
    }

    displayList = featureList;

    // Organize into hierarchy
    const hierarchy = organizeFeatureHierarchy(featureList);

    hierarchy.forEach(item => {
        const feature = item.feature;
        const parentItem = document.createElement('div');
        parentItem.className = 'feature-item';

        const name = feature.properties.name || 'Unnamed';
        const type = feature.properties.featureType || 'Unknown';
        const withinRegion = feature.properties.withinRegion;

        let html = `<h4>${name}</h4><p>${type}`;

        if (withinRegion) {
            html += ` <span style="color: #4a9eff;">in ${withinRegion}</span>`;
        }

        html += `</p>`;
        parentItem.innerHTML = html;

        parentItem.addEventListener('click', () => highlightFeature(feature));
        sidebar.appendChild(parentItem);

        // Add children if any
        if (item.children.length > 0) {
            const childContainer = document.createElement('div');
            childContainer.className = 'subfeatures';

            item.children.forEach(childFeature => {
                const childItem = document.createElement('div');
                childItem.className = 'subfeature-item';

                const childName = childFeature.properties.name || 'Unnamed';
                const suffix = childName.match(/\s+([A-Z]{1,2})$/)?.[1] || '';

                childItem.innerHTML = `<span class="subfeature-icon">•</span><span class="subfeature-suffix">${suffix}</span> ${childName}`;
                childItem.addEventListener('click', (e) => {
                    e.stopPropagation();
                    highlightFeature(childFeature);
                });

                childContainer.appendChild(childItem);
            });

            sidebar.appendChild(childContainer);
        }
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
        const name = feature.properties.name || 'Unnamed';

        // Check if this is a subfeature (has letter suffix like "A", "B", etc.)
        const isSubfeature = /^(.+?)\s+([A-Z]{1,2})$/.test(name);

        let marker;

        if (isSubfeature) {
            // Small blue dot for subfeatures
            marker = L.circleMarker([lat, lon], {
                radius: 3,
                fillColor: '#4a9eff',
                color: '#fff',
                weight: 1,
                opacity: 1,
                fillOpacity: 0.7
            }).addTo(map);
        } else {
            // Yellow star for main features
            const starIcon = L.icon({
                iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MCIgaGVpZ2h0PSI1MCIgdmlld0JveD0iMCAwIDUwIDUwIj48cGF0aCBmaWxsPSIjRkZDMTMzIiBkPSJNMjUgMi41bDYuNSAxMy41IDE1IC41LTExIDEwLjUgMyAxNC41LTEzLjUtNy0xMy41IDcgMy0xNC41LTExLTEwLjUgMTUtLjV6Ii8+PC9zdmc+',
                iconSize: [24, 24],
                iconAnchor: [12, 12],
                popupAnchor: [0, -12]
            });

            marker = L.marker([lat, lon], {
                icon: starIcon
            }).addTo(map);
        }

        marker.bindTooltip(name, {
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

// Determine if a feature is notable enough to fetch timeline
function isNotableFeature(feature) {
    const props = feature.properties;

    // Check if in famous features
    if (props.source === 'famous') return true;

    // Large features (>50km diameter)
    if (props.diameter && props.diameter > 50) return true;

    // Important feature types
    const notableTypes = ['Mons', 'Tholus', 'Patera', 'Planum', 'Mare', 'Vallis', 'Chasma'];
    if (notableTypes.some(type => props.featureType?.includes(type))) return true;

    return false;
}

// Fetch timeline from Wikipedia
async function fetchWikipediaTimeline(featureName, planetName) {
    try {
        // Search for the Wikipedia page
        const searchUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(featureName)}&limit=1&format=json&origin=*`;
        const searchResponse = await fetch(searchUrl);
        const searchData = await searchResponse.json();

        if (!searchData[1] || searchData[1].length === 0) {
            return null; // No Wikipedia page found
        }

        const pageTitle = searchData[1][0];

        // Get page with revisions to access wikitext (for infobox parsing)
        const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(pageTitle)}&prop=revisions&rvprop=content&rvslots=main&format=json&origin=*`;
        const wikiResponse = await fetch(wikiUrl);
        const wikiData = await wikiResponse.json();

        const wikiPages = wikiData.query.pages;
        const wikiPageId = Object.keys(wikiPages)[0];
        const wikitext = wikiPages[wikiPageId]?.revisions?.[0]?.slots?.main?.['*'] || '';

        // Get FULL page text (not just intro) to find more detailed dates
        const pageUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(pageTitle)}&prop=extracts&explaintext=true&format=json&origin=*`;
        const pageResponse = await fetch(pageUrl);
        const pageData = await pageResponse.json();

        const pages = pageData.query.pages;
        const pageId = Object.keys(pages)[0];
        const fullText = pages[pageId].extract;

        // Also get just the intro for description
        const introUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(pageTitle)}&prop=extracts&exintro=true&explaintext=true&format=json&origin=*`;
        const introResponse = await fetch(introUrl);
        const introData = await introResponse.json();
        const introPages = introData.query.pages;
        const introPageId = Object.keys(introPages)[0];
        const intro = introPages[introPageId].extract;

        // Parse infobox data
        const infoboxData = parseInfobox(wikitext);

        return {
            source: 'wikipedia',
            pageTitle: pageTitle,
            extract: intro,
            fullText: fullText,
            infobox: infoboxData,
            url: searchData[3][0]
        };
    } catch (error) {
        console.error('Wikipedia fetch error:', error);
        return null;
    }
}

// Parse Wikipedia infobox for structured data
function parseInfobox(wikitext) {
    const data = {};

    // Look for infobox
    const infoboxMatch = wikitext.match(/\{\{Infobox[^}]*\n([\s\S]*?)\n\}\}/i);
    if (!infoboxMatch) return data;

    const infoboxContent = infoboxMatch[1];

    // Parse age field
    const ageMatch = infoboxContent.match(/\|\s*age\s*=\s*([^\n|]+)/i);
    if (ageMatch) {
        data.age = ageMatch[1].trim();
    }

    // Parse last eruption field
    const eruptionMatch = infoboxContent.match(/\|\s*last[_\s]eruption\s*=\s*([^\n|]+)/i);
    if (eruptionMatch) {
        data.lastEruption = eruptionMatch[1].trim();
    }

    // Parse formed field
    const formedMatch = infoboxContent.match(/\|\s*formed\s*=\s*([^\n|]+)/i);
    if (formedMatch) {
        data.formed = formedMatch[1].trim();
    }

    return data;
}

// Parse timeline events from Wikipedia data or generate generic timeline
async function generateTimeline(feature, wikiData) {
    const props = feature.properties;
    const featureName = props.name;
    const featureType = props.featureType || 'Unknown';
    const diameter = props.diameter;

    // Check structured timeline data first (highest priority)
    if (typeof TIMELINE_DATA !== 'undefined' &&
        TIMELINE_DATA[currentPlanet?.usgs_name] &&
        TIMELINE_DATA[currentPlanet.usgs_name][featureName]) {

        const structuredTimeline = TIMELINE_DATA[currentPlanet.usgs_name][featureName];
        console.log(`Using structured timeline data for ${featureName}`);

        // Return structured data (already has years property)
        return structuredTimeline.map(event => ({
            phase: event.phase,
            timeframe: formatYearsToTimeframe(event.years),
            description: event.description,
            source: event.source,
            years: event.years
        }));
    }

    // If we have Wikipedia data, try to parse it
    if (wikiData && wikiData.fullText) {
        const extract = wikiData.extract;
        const fullText = wikiData.fullText;
        const infobox = wikiData.infobox || {};
        const events = [];

        console.log('Infobox data:', infobox);

        // 1. Formation event - prioritize infobox, then full text
        let formationTimeStr = null;
        let formationDesc = `${featureType} formation`;

        // Try infobox first
        if (infobox.age) {
            formationTimeStr = infobox.age;
            formationDesc = `Formed ${infobox.age}`;
        } else if (infobox.formed) {
            formationTimeStr = infobox.formed;
            formationDesc = `Formed ${infobox.formed}`;
        } else {
            // Search full text
            const formationMatch = fullText.match(/formed?\s+(?:about|around|approximately)?\s*([\d.]+)\s*(billion|million|thousand)\s*years?\s*ago/i);
            if (formationMatch) {
                formationTimeStr = `~${formationMatch[1]} ${formationMatch[2]} years ago`;
                const matchIndex = fullText.indexOf(formationMatch[0]);
                const contextStart = Math.max(0, matchIndex - 50);
                const contextEnd = Math.min(fullText.length, matchIndex + 100);
                formationDesc = fullText.substring(contextStart, contextEnd).trim().split('.')[0];
            } else {
                // Use estimated formation time
                formationTimeStr = getEstimatedFormationTime(featureType, currentPlanet?.usgs_name);
            }
        }

        events.push({
            phase: 'Formation',
            timeframe: formationTimeStr,
            description: formationDesc,
            source: infobox.age || infobox.formed ? 'Wikipedia (Infobox)' : 'Wikipedia',
            years: parseTimeframeToYears(formationTimeStr)
        });

        // 2. Major activity/eruption events - prioritize infobox
        if (infobox.lastEruption) {
            events.push({
                phase: 'Last Eruption',
                timeframe: infobox.lastEruption,
                description: `Last eruption: ${infobox.lastEruption}`,
                source: 'Wikipedia (Infobox)',
                years: parseTimeframeToYears(infobox.lastEruption)
            });
        } else {
            // Search full text for eruptions
            const eruptions = [
                fullText.match(/last\s+(?:eruption|erupted|active|activity)\s+(?:was\s+)?(?:about|around|approximately)?\s*([\d.]+)\s*(billion|million|thousand)\s*years?\s*ago/i),
                fullText.match(/(?:eruption|erupted|active|activity)\s+(?:about|around|approximately)?\s*([\d.]+)\s*(billion|million|thousand)\s*years?\s*ago/i),
                fullText.match(/volcanic\s+activity.*?([\d.]+)\s*(billion|million|thousand)\s*years?\s*ago/i)
            ].filter(m => m !== null);

            if (eruptions.length > 0) {
                // Use the most recent (smallest number)
                const mostRecent = eruptions.reduce((prev, curr) => {
                    const prevNum = parseFloat(prev[1]);
                    const currNum = parseFloat(curr[1]);
                    return currNum < prevNum ? curr : prev;
                });

                const timeStr = `~${mostRecent[1]} ${mostRecent[2]} years ago`;
                const matchIndex = fullText.indexOf(mostRecent[0]);
                const contextStart = Math.max(0, matchIndex - 50);
                const contextEnd = Math.min(fullText.length, matchIndex + 100);
                const context = fullText.substring(contextStart, contextEnd).trim();

                events.push({
                    phase: 'Last Major Activity',
                    timeframe: timeStr,
                    description: context.split('.')[0],
                    source: 'Wikipedia',
                    years: parseTimeframeToYears(timeStr)
                });
            } else if (fullText.match(/volcan|erupt|lava/i)) {
                // Estimate if no specific date found
                const formationTime = getEstimatedFormationTime(featureType, currentPlanet?.usgs_name);
                const formationYears = parseTimeframeToYears(formationTime);
                if (formationYears && formationYears > 1e9) {
                    const midTime = formationYears / 2;
                    const timeframe = `~${(midTime / 1e9).toFixed(1)} billion years ago`;
                    events.push({
                        phase: 'Major Activity',
                        timeframe: timeframe,
                        description: 'Volcanic activity period',
                        source: 'Estimated',
                        years: parseTimeframeToYears(timeframe)
                    });
                }
            }
        }

        // 3. Current state
        events.push({
            phase: 'Current State',
            timeframe: 'Present day',
            description: extract.split('.')[0] + '.',
            source: 'Wikipedia',
            url: wikiData.url,
            years: 0
        });

        return events;
    }

    // Use AI feature analyzer if available (scientific model-based)
    if (featureAnalyzer) {
        console.log(`Using AI analyzer for ${featureName}`);
        const analyzedEvents = featureAnalyzer.analyzeFeature(feature, currentPlanet?.usgs_name);

        if (analyzedEvents && analyzedEvents.length > 0) {
            return analyzedEvents.map(event => ({
                phase: event.phase,
                timeframe: formatYearsToTimeframe(event.years),
                description: event.description,
                source: event.source + (event.confidence ? ` (${event.confidence} confidence)` : ''),
                years: event.years
            }));
        }
    }

    // Fallback: Generate generic timeline without Wikipedia data
    const formationTime = getEstimatedFormationTime(featureType, currentPlanet?.usgs_name);

    return [
        {
            phase: 'Formation',
            timeframe: formationTime,
            description: `${featureType} formed through ${getFormationProcess(featureType)}`,
            source: 'Estimated',
            years: parseTimeframeToYears(formationTime)
        },
        {
            phase: 'Current State',
            timeframe: 'Present day',
            description: `${featureType} with ${diameter ? diameter + ' km diameter' : 'unknown dimensions'}`,
            source: 'USGS Data',
            years: 0
        }
    ];
}

// Estimate formation time based on feature type and planet
function getEstimatedFormationTime(featureType, planetName) {
    const type = featureType.toLowerCase();

    if (planetName === 'MOON') {
        if (type.includes('mare')) return '~3.0-3.8 billion years ago';
        if (type.includes('crater')) return '~0.1-4 billion years ago';
        return '~3-4 billion years ago';
    } else if (planetName === 'MARS') {
        if (type.includes('mons') || type.includes('volcan')) return '~3.5 billion years ago';
        if (type.includes('vallis') || type.includes('channel')) return '~3.5 billion years ago';
        if (type.includes('crater')) return '~0.1-4 billion years ago';
        return '~3-4 billion years ago';
    }

    return 'Ancient (billions of years ago)';
}

// Get formation process description
function getFormationProcess(featureType) {
    const type = featureType.toLowerCase();

    if (type.includes('crater')) return 'meteorite impact';
    if (type.includes('mons') || type.includes('tholus')) return 'volcanic activity';
    if (type.includes('mare')) return 'ancient lava flows';
    if (type.includes('vallis')) return 'water or lava erosion';
    if (type.includes('chasma')) return 'tectonic activity';

    return 'geological processes';
}

// Parse timeframe string to years ago (for graphing)
function parseTimeframeToYears(timeframe) {
    if (!timeframe || timeframe === 'Present day') return 0;

    // Match patterns like "3.5 billion years ago", "~2 million years ago", "0.1-4 billion years ago"
    const billionMatch = timeframe.match(/([\d.]+)(?:-[\d.]+)?\s*billion/i);
    if (billionMatch) {
        return parseFloat(billionMatch[1]) * 1e9;
    }

    const millionMatch = timeframe.match(/([\d.]+)(?:-[\d.]+)?\s*million/i);
    if (millionMatch) {
        return parseFloat(millionMatch[1]) * 1e6;
    }

    const thousandMatch = timeframe.match(/([\d.]+)(?:-[\d.]+)?\s*thousand/i);
    if (thousandMatch) {
        return parseFloat(thousandMatch[1]) * 1e3;
    }

    // Match "Ancient (billions of years ago)" - default to 4 billion
    if (timeframe.toLowerCase().includes('ancient') || timeframe.toLowerCase().includes('billions of years ago')) {
        return 4e9;
    }

    // Default to null for truly unparseable timeframes
    return null;
}

// Format years for display
function formatYears(years) {
    if (years === 0) return 'Present';
    if (years >= 1e9) return `${(years / 1e9).toFixed(2)} Bya`;
    if (years >= 1e6) return `${(years / 1e6).toFixed(1)} Mya`;
    if (years >= 1e3) return `${(years / 1e3).toFixed(0)} Kya`;
    return `${years} years ago`;
}

// Format years to timeframe string (for structured data)
function formatYearsToTimeframe(years) {
    if (years === 0) return 'Present day';
    if (years >= 1e9) {
        const bya = (years / 1e9).toFixed(1);
        return `${bya} billion years ago`;
    }
    if (years >= 1e6) {
        const mya = (years / 1e6).toFixed(0);
        return `${mya} million years ago`;
    }
    if (years >= 1e3) {
        const kya = (years / 1e3).toFixed(0);
        return `${kya} thousand years ago`;
    }
    return `${years} years ago`;
}

// Show feature details in sidebar with timeline
async function showFeatureDetails(feature) {
    // If in comparison mode, add to comparison list
    if (comparisonMode) {
        addToComparison(feature);
        return;
    }

    const sidebar = document.getElementById('featureList');
    const props = feature.properties;
    const [lon, lat] = feature.geometry.coordinates;

    // Remove any existing feature details box
    const existingDetails = sidebar.querySelector('.feature-details-box');
    if (existingDetails) {
        existingDetails.remove();
    }

    // Build basic info HTML
    let html = `
        <div class="feature-details-box" style="background: #0a0e27; padding: 1rem; border-radius: 4px; border: 2px solid #4a9eff; margin-bottom: 1rem;">
            <h3 style="color: #4a9eff; margin-bottom: 1rem;">${props.name || 'Unnamed Feature'}</h3>
            <p><strong>Type:</strong> ${props.featureType || 'Unknown'}</p>
            <p><strong>Coordinates:</strong> ${lat.toFixed(2)}°, ${lon.toFixed(2)}°</p>
            ${props.withinRegion ? `<p><strong>Located in:</strong> ${props.withinRegion}</p>` : ''}
            ${props.diameter ? `<p><strong>Diameter:</strong> ${props.diameter} km</p>` : ''}
            ${props.origin ? `<p><strong>Origin:</strong> ${props.origin}</p>` : ''}
            ${props.approval_date ? `<p><strong>Approved:</strong> ${props.approval_date}</p>` : ''}
    `;

    // Check if notable and fetch timeline
    if (isNotableFeature(feature)) {
        const cacheKey = `${currentPlanet?.usgs_name}_${props.name}`;

        // Show loading message
        html += `<div id="timelineSection"><p style="margin-top: 1rem;"><strong>Timeline:</strong></p><p style="color: #aaa;">Loading timeline...</p></div>`;
        html += `</div>`;

        // Prepend to sidebar (show at top)
        sidebar.insertAdjacentHTML('afterbegin', html);

        // Check cache first
        let timeline;
        if (timelineCache[cacheKey]) {
            timeline = timelineCache[cacheKey];
        } else {
            // Fetch from Wikipedia
            const wikiData = await fetchWikipediaTimeline(props.name, currentPlanet?.usgs_name);
            timeline = await generateTimeline(feature, wikiData);
            timelineCache[cacheKey] = timeline;
        }

        // Display timeline
        let timelineHTML = '<div id="timelineSection" style="margin-top: 1rem;"><p><strong>Timeline:</strong></p><ul style="margin-left: 1rem; margin-top: 0.5rem; list-style: none; padding: 0;">';
        timeline.forEach(event => {
            timelineHTML += `
                <li style="margin-bottom: 0.75rem; padding: 0.5rem; background: #1a1f3a; border-radius: 4px; border-left: 3px solid #4a9eff;">
                    <strong style="color: #4a9eff;">${event.phase}</strong><br>
                    <span style="color: #fff; font-size: 0.85rem;">${event.timeframe}</span><br>
                    <span style="font-size: 0.85rem; color: #ccc;">${event.description}</span><br>
                    <span style="font-size: 0.75rem; color: #888;">Source: ${event.source}</span>
                    ${event.url ? `<br><a href="${event.url}" target="_blank" style="font-size: 0.75rem; color: #4a9eff;">Read more →</a>` : ''}
                </li>
            `;
        });
        timelineHTML += '</ul></div></div>';

        // Update the timeline section
        const timelineSection = document.getElementById('timelineSection');
        if (timelineSection) {
            timelineSection.outerHTML = timelineHTML;
        }
    } else {
        html += `</div>`;
        // Prepend to sidebar (show at top)
        sidebar.insertAdjacentHTML('afterbegin', html);
    }

    // Scroll to top of sidebar
    sidebar.scrollTop = 0;
}

// Toggle comparison mode
function toggleComparisonMode() {
    comparisonMode = !comparisonMode;
    const btn = document.getElementById('compareBtn');
    const panel = document.getElementById('comparisonPanel');

    if (comparisonMode) {
        // Clear timeline cache when entering comparison mode
        timelineCache = {};

        btn.classList.add('active');
        btn.textContent = 'Cancel Comparison';
        comparisonFeatures = [];

        // Clear any existing highlights
        featureMarkers.forEach(marker => {
            marker.setStyle({
                fillColor: '#4a9eff',
                radius: 4
            });
        });

        // Show comparison panel
        panel.classList.remove('hidden');
        updateComparisonPanel();
    } else {
        btn.classList.remove('active');
        btn.textContent = 'Compare Features';
        comparisonFeatures = [];

        // Clear visual indicators
        featureMarkers.forEach(marker => {
            marker.setStyle({
                fillColor: '#4a9eff',
                radius: 4
            });
        });

        // Hide comparison panel
        panel.classList.add('hidden');
    }
}

// Update comparison panel UI
function updateComparisonPanel() {
    const countEl = document.getElementById('comparisonCount');
    const selectionsEl = document.getElementById('comparisonSelections');
    const compareBtn = document.getElementById('compareNowBtn');

    if (countEl) {
        countEl.textContent = comparisonFeatures.length;
    }

    if (selectionsEl) {
        if (comparisonFeatures.length === 0) {
            selectionsEl.innerHTML = '';
        } else {
            selectionsEl.innerHTML = comparisonFeatures.map((f, idx) => {
                const color = idx === 0 ? '#4a9eff' : '#ff9d4a';
                return `
                    <div class="comparison-selection-item">
                        <div class="comparison-color-dot" style="background: ${color};"></div>
                        <div>
                            <div class="comparison-selection-name">${f.properties.name}</div>
                            <div class="comparison-selection-type">${f.properties.featureType}</div>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    // Show/hide compare button
    if (compareBtn) {
        if (comparisonFeatures.length === 2) {
            compareBtn.classList.remove('hidden');
        } else {
            compareBtn.classList.add('hidden');
        }
    }
}

// Add feature to comparison
async function addToComparison(feature) {
    // Check if feature is notable
    if (!isNotableFeature(feature)) {
        alert('Please select notable features with timeline data for comparison.');
        return;
    }

    // Check if already selected
    if (comparisonFeatures.find(f => f.properties.name === feature.properties.name)) {
        alert('This feature is already selected for comparison.');
        return;
    }

    // Add to comparison list
    comparisonFeatures.push(feature);

    // Update visual indicator for this feature's marker
    const [lon, lat] = feature.geometry.coordinates;
    featureMarkers.forEach(marker => {
        const markerLatLng = marker.getLatLng();
        if (Math.abs(markerLatLng.lat - lat) < 0.001 && Math.abs(markerLatLng.lng - lon) < 0.001) {
            const color = comparisonFeatures.length === 1 ? '#4a9eff' : '#ff9d4a';
            marker.setStyle({
                fillColor: color,
                radius: 8,
                weight: 2
            });
        }
    });

    // Update comparison panel
    updateComparisonPanel();

    // If we have 2 features, they can now click Compare Now button
    // Auto-compare removed - let user click the button
}

// Show side-by-side comparison of two features
async function showComparison() {
    // Hide comparison panel
    const panel = document.getElementById('comparisonPanel');
    if (panel) {
        panel.classList.add('hidden');
    }

    const sidebar = document.getElementById('featureList');
    const feature1 = comparisonFeatures[0];
    const feature2 = comparisonFeatures[1];

    sidebar.innerHTML = `
        <div style="background: #9d4edd; padding: 1rem; border-radius: 4px; margin-bottom: 1rem;">
            <h3 style="color: #fff; margin-bottom: 0.5rem;">Comparing Timelines</h3>
            <button onclick="toggleComparisonMode()" style="background: #fff; color: #9d4edd; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; font-weight: 600; margin-top: 0.5rem;">New Comparison</button>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-bottom: 1rem;">
            <div id="comparison1" style="background: #0a0e27; padding: 0.75rem; border-radius: 4px; border: 2px solid #4a9eff;">
                <h4 style="color: #4a9eff; font-size: 0.9rem; margin-bottom: 0.5rem;">${feature1.properties.name}</h4>
                <p style="font-size: 0.75rem; color: #aaa;">Loading...</p>
            </div>
            <div id="comparison2" style="background: #0a0e27; padding: 0.75rem; border-radius: 4px; border: 2px solid #ff9d4a;">
                <h4 style="color: #ff9d4a; font-size: 0.9rem; margin-bottom: 0.5rem;">${feature2.properties.name}</h4>
                <p style="font-size: 0.75rem; color: #aaa;">Loading...</p>
            </div>
        </div>
        <div id="timelineComparison"></div>
    `;

    // Fetch timelines for both features
    const cacheKey1 = `${currentPlanet?.usgs_name}_${feature1.properties.name}`;
    const cacheKey2 = `${currentPlanet?.usgs_name}_${feature2.properties.name}`;

    let timeline1 = timelineCache[cacheKey1];
    if (!timeline1) {
        const wikiData1 = await fetchWikipediaTimeline(feature1.properties.name, currentPlanet?.usgs_name);
        timeline1 = await generateTimeline(feature1, wikiData1);
        timelineCache[cacheKey1] = timeline1;
    }

    let timeline2 = timelineCache[cacheKey2];
    if (!timeline2) {
        const wikiData2 = await fetchWikipediaTimeline(feature2.properties.name, currentPlanet?.usgs_name);
        timeline2 = await generateTimeline(feature2, wikiData2);
        timelineCache[cacheKey2] = timeline2;
    }

    // Check if elements still exist after async operations
    const comp1 = document.getElementById('comparison1');
    const comp2 = document.getElementById('comparison2');
    const timelineComparisonEl = document.getElementById('timelineComparison');

    if (!comp1 || !comp2 || !timelineComparisonEl) {
        console.warn('Comparison was cancelled or sidebar was replaced during loading');
        return;
    }

    comp1.innerHTML = `
        <h4 style="color: #4a9eff; font-size: 0.9rem; margin-bottom: 0.5rem;">${feature1.properties.name}</h4>
        <p style="font-size: 0.75rem;"><strong>Type:</strong> ${feature1.properties.featureType}</p>
        ${feature1.properties.diameter ? `<p style="font-size: 0.75rem;"><strong>Diameter:</strong> ${feature1.properties.diameter} km</p>` : ''}
    `;

    comp2.innerHTML = `
        <h4 style="color: #ff9d4a; font-size: 0.9rem; margin-bottom: 0.5rem;">${feature2.properties.name}</h4>
        <p style="font-size: 0.75rem;"><strong>Type:</strong> ${feature2.properties.featureType}</p>
        ${feature2.properties.diameter ? `<p style="font-size: 0.75rem;"><strong>Diameter:</strong> ${feature2.properties.diameter} km</p>` : ''}
    `;

    // Filter out events with null years (events should already have years property)
    const validEvents1 = timeline1.filter(e => e.years !== null && e.years !== undefined);
    const validEvents2 = timeline2.filter(e => e.years !== null && e.years !== undefined);

    // Debug: log timeframes and parsed values
    console.log('Feature 1 timeline:', timeline1);
    console.log('Feature 1 valid events:', validEvents1);
    console.log('Feature 2 timeline:', timeline2);
    console.log('Feature 2 valid events:', validEvents2);

    // Fixed scale: Solar system formation (4.5 Bya) to Present
    const maxAge = 4.5e9; // 4.5 billion years
    const minAge = 0; // Present day

    console.log('All years:', [...validEvents1.map(e => e.years), ...validEvents2.map(e => e.years)]);

    // Create horizontal timeline graph
    let comparisonHTML = '<div style="margin-bottom: 1rem;">';
    comparisonHTML += '<h4 style="color: #fff; font-size: 0.9rem; margin-bottom: 1rem;">Timeline Comparison</h4>';

    // Horizontal timeline
    const graphWidth = 100; // percentage
    const graphHeight = 300;
    comparisonHTML += `<div style="position: relative; height: ${graphHeight}px; background: #0a0e27; border-radius: 4px; padding: 2rem 1rem; margin-bottom: 1rem; overflow-x: auto;">`;

    // Time axis labels (bottom)
    const numLabels = 5;
    for (let i = 0; i <= numLabels; i++) {
        const years = maxAge * ((numLabels - i) / numLabels); // Reverse: left = old, right = present
        const position = (i / numLabels) * 100;
        comparisonHTML += `
            <div style="position: absolute; left: ${position}%; bottom: 10px; font-size: 0.7rem; color: #888; transform: translateX(-50%);">
                ${formatYears(years)}
            </div>
            <div style="position: absolute; left: ${position}%; top: 30px; bottom: 40px; width: 1px; background: #2a3f5f;"></div>
        `;
    }

    // Center horizontal axis line
    comparisonHTML += `<div style="position: absolute; left: 0; right: 0; top: 50%; height: 2px; background: #2a3f5f; transform: translateY(-50%);"></div>`;

    // Plot Feature 1 events (top half)
    validEvents1.forEach(event => {
        const position = ((maxAge - event.years) / maxAge) * 100; // Left = old, right = present
        comparisonHTML += `
            <div style="position: absolute; left: ${position}%; top: 30px; transform: translateX(-50%); z-index: 10; max-width: 150px;">
                <div style="display: flex; flex-direction: column; align-items: center; gap: 0.5rem;">
                    <div style="background: #1a1f3a; padding: 0.5rem; border-radius: 4px; border: 1px solid #4a9eff; text-align: center;">
                        <div style="font-size: 0.75rem; color: #4a9eff; font-weight: 600; margin-bottom: 0.25rem;">${event.phase}</div>
                        <div style="font-size: 0.65rem; color: #aaa;">${event.timeframe}</div>
                    </div>
                    <div style="width: 2px; height: 20px; background: #4a9eff;"></div>
                    <div style="width: 14px; height: 14px; background: #4a9eff; border: 2px solid #fff; border-radius: 50%;"></div>
                </div>
            </div>
        `;
    });

    // Plot Feature 2 events (bottom half)
    validEvents2.forEach(event => {
        const position = ((maxAge - event.years) / maxAge) * 100; // Left = old, right = present
        comparisonHTML += `
            <div style="position: absolute; left: ${position}%; bottom: 50px; transform: translateX(-50%); z-index: 10; max-width: 150px;">
                <div style="display: flex; flex-direction: column-reverse; align-items: center; gap: 0.5rem;">
                    <div style="background: #1a1f3a; padding: 0.5rem; border-radius: 4px; border: 1px solid #ff9d4a; text-align: center;">
                        <div style="font-size: 0.75rem; color: #ff9d4a; font-weight: 600; margin-bottom: 0.25rem;">${event.phase}</div>
                        <div style="font-size: 0.65rem; color: #aaa;">${event.timeframe}</div>
                    </div>
                    <div style="width: 2px; height: 20px; background: #ff9d4a;"></div>
                    <div style="width: 14px; height: 14px; background: #ff9d4a; border: 2px solid #fff; border-radius: 50%;"></div>
                </div>
            </div>
        `;
    });

    comparisonHTML += '</div>'; // Close graph container

    // Legend
    comparisonHTML += `
        <div style="display: flex; gap: 1rem; justify-content: center; font-size: 0.8rem;">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <div style="width: 12px; height: 12px; background: #4a9eff; border-radius: 50%;"></div>
                <span>${feature1.properties.name}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <div style="width: 12px; height: 12px; background: #ff9d4a; border-radius: 50%;"></div>
                <span>${feature2.properties.name}</span>
            </div>
        </div>
    `;

    comparisonHTML += '</div>';

    // Final check before rendering
    const finalCheck = document.getElementById('timelineComparison');
    if (!finalCheck) {
        console.warn('Comparison was cancelled before rendering timeline');
        return;
    }

    finalCheck.innerHTML = comparisonHTML;

    // Exit comparison mode (but don't clear features - user might want to see the result)
    comparisonMode = false;
    const compareBtn = document.getElementById('compareBtn');
    if (compareBtn) {
        compareBtn.classList.remove('active');
        compareBtn.textContent = 'Compare Features';
    }
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

// Start rectangle selection on map click
function startRectangleSelection(e) {
    if (!currentPlanet) return;

    const { lat, lng } = e.latlng;

    // Remove previous tile bounds layer
    if (tileBoundsLayer) {
        tileBoundsLayer.disableEdit();
        map.removeLayer(tileBoundsLayer);
    }

    // Create initial rectangle with small default size
    const defaultSize = 10; // degrees
    const bounds = [
        [Math.max(lat - defaultSize / 2, -90), Math.max(lng - defaultSize / 2, -180)],
        [Math.min(lat + defaultSize / 2, 90), Math.min(lng + defaultSize / 2, 180)]
    ];

    // Create editable rectangle
    tileBoundsLayer = L.rectangle(bounds, {
        color: '#4a9eff',
        weight: 3,
        fillColor: '#4a9eff',
        fillOpacity: 0.2,
        dashArray: '10, 5'
    }).addTo(map);

    // Enable editing (dragging and resizing)
    tileBoundsLayer.enableEdit();

    // Update bounds when rectangle is edited
    tileBoundsLayer.on('editable:vertex:dragend', updateRectangleBounds);
    tileBoundsLayer.on('editable:dragend', updateRectangleBounds);

    // Initial update
    updateRectangleBounds();

    // Show clear button
    document.getElementById('clearTileBtn').classList.remove('hidden');
}

// Update bounds when rectangle is dragged or resized
function updateRectangleBounds() {
    const latLngBounds = tileBoundsLayer.getBounds();

    selectedTileBounds = {
        north: latLngBounds.getNorth(),
        south: latLngBounds.getSouth(),
        east: latLngBounds.getEast(),
        west: latLngBounds.getWest()
    };

    // Update info and filter features
    displayRectangleInfo(selectedTileBounds);
    filterFeaturesByTile(selectedTileBounds);
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

// Display rectangle information
function displayRectangleInfo(bounds) {
    const tileInfo = document.getElementById('tileInfo');

    // Find intersecting large features
    const largeFeatures = findIntersectingGeographicFeatures(bounds);

    let html = `
        <p><strong>Selection Area</strong></p>
        <p><strong>Bounds:</strong> ${bounds.north.toFixed(2)}°N to ${bounds.south.toFixed(2)}°S, ${bounds.west.toFixed(2)}°W to ${bounds.east.toFixed(2)}°E</p>
        <p style="font-size: 0.85rem; color: #aaa;">Drag to move, resize handles to adjust</p>
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
        tileBoundsLayer.disableEdit();
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
    sidebar.innerHTML = `<div class="loading">Click the map to create a selection area, or use search above.</div>`;
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

    document.getElementById('compareBtn').addEventListener('click', toggleComparisonMode);

    document.getElementById('clearTileBtn').addEventListener('click', clearTileSelection);

    // Comparison panel buttons
    document.getElementById('cancelComparison').addEventListener('click', toggleComparisonMode);

    document.getElementById('compareNowBtn').addEventListener('click', async () => {
        if (comparisonFeatures.length === 2) {
            await showComparison();
        }
    });
}

// Start the application
document.addEventListener('DOMContentLoaded', init);
