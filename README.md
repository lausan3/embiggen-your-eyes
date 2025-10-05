# embiggen-your-eyes
Team Incognito Mode's repository for the 2025 NASA Space Apps Challenge!

## Planetary Map Explorer

A dynamic planetary map system with feature highlighting, tile-based filtering, and USGS nomenclature data.

## How to Run

⚠️ **IMPORTANT**: The app needs to be served from a web server (not opened directly as `file://`) to avoid CORS issues when fetching KMZ data.

### Option 1: Python HTTP Server (Recommended)

```bash
cd /Users/kxclly/Documents/Coding/NASA_Space_App
python3 -m http.server 8000
```

Then open: **http://localhost:8000**

### Option 2: Node.js HTTP Server

```bash
cd /Users/kxclly/Documents/Coding/NASA_Space_App
npx http-server -p 8000
```

Then open: **http://localhost:8000**

### Option 3: VS Code Live Server

1. Install "Live Server" extension in VS Code
2. Right-click `index.html` → "Open with Live Server"

## Features

- **Planetary Maps**: Moon, Mars, Mercury, Vesta
- **Tile-based Feature Loading**: Click any tile to see features within that coordinate range
- **USGS Data**: Automatically downloads thousands of features from USGS nomenclature database
- **Search**: Search features by name or type
- **Hierarchical Regions**: Shows large geographic features (maria, plains, etc.) with boundaries
- **Dynamic Filtering**: Filters features by tile coordinates in real-time

## Troubleshooting

**Issue: "Failed to load KMZ"**
- You're opening the file directly (`file://` protocol)
- Solution: Use one of the server options above

**Issue: "No features found in this tile"**
- The selected tile area may genuinely have no named features
- Try a different area or use the search function
- Check console for debugging info
