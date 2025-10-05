# Embiggen Your Eyes - AI Coding Agent Instructions

## Project Overview
This is a **Next.js 15** planetary exploration app that combines 3D interactive globes, KMZ data parsing, NASA image APIs, and timeline visualization for astronomical features. The app allows users to explore Moon, Mars, Europa, Mercury, Vesta, and Io with real scientific data.

## Architecture & Tech Stack

### Core Technologies
- **Next.js 15** with App Router (`/app` directory)
- **React 19** with TypeScript
- **Three.js** via `@react-three/fiber` and `@react-three/drei` for 3D globes
- **Radix UI** components with custom styling
- **TailwindCSS** for styling with custom CSS variables
- **JSZip** for KMZ/KML data parsing

### Key Configuration
- `next.config.ts` transpiles Three.js packages and disables `fs` for client-side
- TypeScript and ESLint errors ignored during builds (rapid prototyping setup)
- Fonts: Playfair Display (serif) and Inter (sans-serif) with CSS variables

## Project Structure & Patterns

### Data Architecture
```
lib/
├── config.ts           # Planetary configurations with WMTS URLs
├── famous-features.ts  # Curated landmark data by planet  
├── kmz-loader.ts      # KMZ/KML parser for USGS nomenclature
├── nasa-images.ts     # NASA Images API integration
├── timeline-data.ts   # Geological timeline events
└── utils/             # Coordinate transformations
```

### Component Patterns
- **Dynamic imports** for Three.js components to avoid SSR issues
- **Client-only components** with `"use client"` directive
- **Error boundaries** around Three.js components for stability
- **Async data loading** with loading states and progress messages

### Data Flow
1. **Planet Selection** → triggers KMZ loading + feature aggregation
2. **KMZ Parsing** → combines USGS nomenclature with curated famous features
3. **Feature Selection** → loads timeline data + NASA images
4. **3D Rendering** → coordinate transformation from lat/lon to Vector3

## Domain-Specific Knowledge

### Coordinate Systems
- Uses **lat/lon degrees** for feature positions
- **Vector3 transformations** via `lib/utils/coordinates.ts` for 3D globe
- **Spherical coordinate** conversion for camera positioning

### Data Sources
- **USGS Planetary Nomenclature** KMZ files in `/data` and `/public/data`
- **NASA WMTS tile services** for planetary surface imagery  
- **NASA Images API** for feature-specific photography
- **Curated timeline data** with geological periods and crater formation events

### Planetary Configurations
Each planet in `PLANETARY_CONFIG` has:
- `wmts_url`: NASA tile service endpoint
- `kmz_url`: USGS nomenclature data file
- `textureUrl`: 3D globe texture image
- `usgs_name`: Official planet designation

## Development Workflows

### Running the App
```bash
npm run dev    # Development server on :3000
npm run build  # Production build
npm run start  # Production server
```

### Data Loading Pipeline
1. Planet selection triggers `loadPlanetFeatures()` in `kmz-loader.ts`
2. KMZ files parsed using JSZip → KML → DOM parsing
3. Features combined: USGS nomenclature + famous landmarks
4. Geographic filtering by bounding boxes for performance

### 3D Globe Rendering
- **Dynamic import** `Globe3D` component to avoid SSR
- **useFrame** hook for animation loops
- **OrbitControls** for user interaction
- **Error boundaries** handle Three.js initialization failures

## Code Conventions

### State Management
- **useState** for local component state
- **useEffect** for data loading side effects
- **useMemo** for expensive computations (coordinate transformations)
- **useCallback** for event handlers to prevent re-renders

### TypeScript Patterns
- **Interface definitions** for all data structures (`FamousFeature`, `KMZFeature`, `TimelineEvent`)
- **Record types** for planet-keyed data (`Record<string, PlanetaryConfig>`)
- **Optional properties** with `?` for non-required fields

### File Organization
- **Domain separation**: planetary config, features, timeline data in separate files
- **Utility functions**: coordinate math, data filtering in `/lib/utils`
- **Component composition**: timeline, comparison, 3D globe as separate components

## External Dependencies

### NASA Services
- **WMTS Tile Service**: `trek.nasa.gov/tiles/{planet}/...` for surface imagery
- **Images API**: `images-api.nasa.gov/search` for feature photography
- **CORS enabled** for client-side API calls

### Data Processing
- **JSZip**: Unzip KMZ files client-side
- **DOMParser**: Parse KML XML for placemark extraction
- **Three.js**: 3D mathematics and rendering engine

## Performance Considerations
- **Dynamic imports** prevent large Three.js bundles on initial load
- **Geographic filtering** limits rendered features by zoom/bounds
- **Memoized calculations** for coordinate transformations
- **Background loading** with progress indicators for large KMZ files

## Common Patterns for AI Agents

When adding new features:
1. **Check existing interfaces** in `lib/` files before creating new types
2. **Use coordinate utilities** in `lib/utils/coordinates.ts` for lat/lon ↔ 3D conversion
3. **Follow the data loading pattern**: async + loading state + error handling
4. **Add planetary configurations** to `PLANETARY_CONFIG` for new celestial bodies
5. **Use client-side components** for any Three.js or browser-specific APIs