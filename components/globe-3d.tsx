"use client"

import React, { useRef, useMemo, useState, useEffect, type ErrorInfo } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { OrbitControls, Html, Stars, useTexture } from "@react-three/drei"
import * as THREE from "three"
import { latLonToVector3 } from "@/lib/utils/coordinates"
import { PLANETARY_CONFIG as CONFIG } from "@/lib/config"
import { createSelectionBox, getDefaultAreaBounds, filterFeaturesByBounds, cartesianToSpherical, type BoundingBox } from "@/lib/area-selection"
import { getVisibleFeatures, getFeaturesByZoom } from "@/lib/feature-visibility"

interface FamousFeature {
  name: string
  type: string
  lat: number
  lon: number
  planet?: string
  diameter?: number
  description?: string
  withinRegion?: string
}

interface AreaSelection {
  bounds: BoundingBox
  visible: boolean
  features: FamousFeature[]
}

interface ComparisonData {
  features: FamousFeature[]
  mode: boolean
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Globe3D Error:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-full" style={{ background: "#0a0a0a" }}>
          <div style={{ color: "var(--color-muted)" }}>Error loading 3D globe</div>
        </div>
      )
    }

    return this.props.children
  }
}

interface Globe3DProps {
  planet: string
  features: FamousFeature[]
  onFeatureClick: (feature: FamousFeature) => void
  searchQuery: string
  selectedFeature: FamousFeature | null
  onRotationComplete?: () => void
  showDetailsModal?: boolean
  onAreaSelect?: (bounds: BoundingBox) => void
  areaSelection?: AreaSelection | null
  comparisonMode?: boolean
  onComparisonAdd?: (feature: FamousFeature) => void
  comparisonFeatures?: FamousFeature[]
  areaSelectionMode?: boolean
}

const FeatureMarker = React.memo(function FeatureMarker({
  feature,
  onClick,
  isHighlighted,
  showDetailsModal,
  comparisonMode,
  isInComparison,
  comparisonIndex,
}: {
  feature: FamousFeature
  onClick: () => void
  isHighlighted: boolean
  showDetailsModal?: boolean
  comparisonMode?: boolean
  isInComparison?: boolean
  comparisonIndex?: number
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)

  useEffect(() => {
    if (showDetailsModal) {
      setHovered(false)
      document.body.style.cursor = "auto"
    }
  }, [showDetailsModal])

  // Convert lat/lon to 3D position
  const position = useMemo(() => {
    const pos = latLonToVector3(feature.lat, feature.lon, 2.1)
    return [pos.x, pos.y, pos.z] as [number, number, number]
  }, [feature.lat, feature.lon])

  useFrame(() => {
    if (meshRef.current) {
      const scale = hovered || isHighlighted ? 1.5 : 1
      meshRef.current.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.1)
    }
  })

  const handlePointerOut = () => {
    setHovered(false)
    document.body.style.cursor = "auto"
  }

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation()
          onClick()
        }}
        onPointerOver={(e) => {
          e.stopPropagation()
          if (!showDetailsModal) {
            setHovered(true)
            document.body.style.cursor = "pointer"
          }
        }}
        onPointerOut={handlePointerOut}
        onPointerLeave={handlePointerOut}
      >
        <sphereGeometry args={[0.02, 8, 8]} />
        <meshBasicMaterial 
          color={
            isInComparison 
              ? (comparisonIndex === 0 ? "#4a9eff" : "#ff9d4a")
              : isHighlighted 
                ? "#00FFFF" 
                : "#FFFF00"
          } 
        />
      </mesh>
      {(hovered || isHighlighted) && !showDetailsModal && (
        <Html distanceFactor={25} position={[0, 0.06, 0]}>
          <div
            className="px-0.5 py-0.5 rounded whitespace-nowrap pointer-events-none"
            style={{
              background: "rgba(26, 26, 26, 0.8)",
              color: "#ffffff",
              border: "1px solid rgba(212, 165, 116, 0.1)",
              boxShadow: "0 1px 2px rgba(0, 0, 0, 0.2)",
              fontSize: "6px",
              lineHeight: "1",
              maxWidth: "80px",
              textOverflow: "ellipsis",
              overflow: "hidden"
            }}
          >
            {feature.name}
          </div>
        </Html>
      )}
    </group>
  )
})

const GridLines = React.memo(function GridLines() {
  const gridGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry()
    const vertices: number[] = []
    const radius = 2.02 // Slightly larger than planet radius

    // Latitude lines (horizontal circles)
    for (let lat = -80; lat <= 80; lat += 20) {
      const theta = THREE.MathUtils.degToRad(90 - lat)
      const circleRadius = radius * Math.sin(theta)
      const y = radius * Math.cos(theta)

      for (let i = 0; i <= 64; i++) {
        const angle = (i / 64) * Math.PI * 2
        vertices.push(circleRadius * Math.cos(angle), y, circleRadius * Math.sin(angle))
      }
    }

    // Longitude lines (vertical circles)
    for (let lon = 0; lon < 360; lon += 30) {
      const phi = THREE.MathUtils.degToRad(lon)
      for (let i = 0; i <= 64; i++) {
        const theta = (i / 64) * Math.PI
        vertices.push(
          radius * Math.sin(theta) * Math.cos(phi),
          radius * Math.cos(theta),
          radius * Math.sin(theta) * Math.sin(phi),
        )
      }
    }

    geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3))
    return geometry
  }, [])

  return (
    <lineSegments geometry={gridGeometry}>
      <lineBasicMaterial color="#FFD700" opacity={0.8} transparent linewidth={2} />
    </lineSegments>
  )
})

const AreaSelectionBox = React.memo(function AreaSelectionBox({
  bounds,
  visible
}: {
  bounds: BoundingBox
  visible: boolean
}) {
  const geometry = useMemo(() => createSelectionBox(bounds), [bounds])
  const [opacity, setOpacity] = useState(0.3)
  
  useEffect(() => {
    // Pulse effect for better visual feedback
    const interval = setInterval(() => {
      setOpacity(prev => prev === 0.3 ? 0.8 : 0.3)
    }, 800)
    
    return () => clearInterval(interval)
  }, [])
  
  if (!visible) return null
  
  return (
    <>
      {/* Main selection border */}
      <lineSegments geometry={geometry}>
        <lineBasicMaterial color="#4a9eff" opacity={opacity} transparent linewidth={3} />
      </lineSegments>
      
      {/* Subtle fill for better visualization */}
      <mesh>
        <bufferGeometry attach="geometry">
          <bufferAttribute
            attach="attributes-position"
            array={geometry.attributes.position.array}
            count={geometry.attributes.position.count}
            itemSize={3}
          />
        </bufferGeometry>
        <meshBasicMaterial color="#4a9eff" opacity={0.1} transparent side={THREE.DoubleSide} />
      </mesh>
    </>
  )
})

// Smooth area selection with enhanced visual feedback
const AreaSelectionHandler = React.memo(function AreaSelectionHandler({
  onAreaSelect,
  isActive,
  planet
}: {
  onAreaSelect?: (bounds: BoundingBox) => void
  isActive: boolean
  planet: string
}) {
  const { camera, raycaster, gl } = useThree()
  const [isSelecting, setIsSelecting] = useState(false)
  const [startPoint, setStartPoint] = useState<THREE.Vector3 | null>(null)
  const [currentBounds, setCurrentBounds] = useState<BoundingBox | null>(null)
  const [selectionPreview, setSelectionPreview] = useState<{ start: THREE.Vector3; end: THREE.Vector3 } | null>(null)
  
  const getPointFromEvent = (event: any): THREE.Vector3 | null => {
    const canvas = gl.domElement
    const rect = canvas.getBoundingClientRect()
    
    const clientX = event.nativeEvent?.clientX || event.clientX
    const clientY = event.nativeEvent?.clientY || event.clientY
    
    const x = ((clientX - rect.left) / rect.width) * 2 - 1
    const y = -((clientY - rect.top) / rect.height) * 2 + 1
    
    raycaster.setFromCamera(new THREE.Vector2(x, y), camera)
    
    // Create a sphere at radius 2 to match the planet surface
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(2, 32, 32),
      new THREE.MeshBasicMaterial()
    )
    
    const intersects = raycaster.intersectObject(sphere)
    
    return intersects.length > 0 ? intersects[0].point.clone() : null
  }
  
  const handlePointerDown = (event: any) => {
    if (!isActive || !onAreaSelect) return
    
    event.stopPropagation()
    const point = getPointFromEvent(event)
    
    if (point) {
      setStartPoint(point)
      setIsSelecting(true)
      setCurrentBounds(null)
    }
  }
  
  const handlePointerMove = (event: any) => {
    if (!isSelecting || !startPoint) return
    
    const endPoint = getPointFromEvent(event)
    if (endPoint) {
      // Update preview for smooth visual feedback
      setSelectionPreview({ start: startPoint, end: endPoint })
      
      const start = cartesianToSpherical(startPoint)
      const end = cartesianToSpherical(endPoint)
      
      // Create smoother bounds with proper wrapping
      const bounds = {
        north: Math.max(start.lat, end.lat),
        south: Math.min(start.lat, end.lat),
        east: Math.max(start.lon, end.lon),
        west: Math.min(start.lon, end.lon)
      }
      
      // Handle longitude wrapping for better UX
      if (Math.abs(start.lon - end.lon) > 180) {
        bounds.east = Math.min(start.lon, end.lon)
        bounds.west = Math.max(start.lon, end.lon)
      }
      
      setCurrentBounds(bounds)
    }
  }
  
  const handlePointerUp = (event: any) => {
    if (!isSelecting || !startPoint || !onAreaSelect) return
    
    const endPoint = getPointFromEvent(event)
    
    if (endPoint) {
      const start = cartesianToSpherical(startPoint)
      const end = cartesianToSpherical(endPoint)
      
      const bounds: BoundingBox = {
        north: Math.max(start.lat, end.lat),
        south: Math.min(start.lat, end.lat),
        east: Math.max(start.lon, end.lon),
        west: Math.min(start.lon, end.lon)
      }
      
      // Only create selection if it's big enough
      const minSize = 5 // degrees
      if (Math.abs(bounds.north - bounds.south) > minSize || 
          Math.abs(bounds.east - bounds.west) > minSize) {
        onAreaSelect(bounds)
      }
    }
    
    setIsSelecting(false)
    setStartPoint(null)
    setCurrentBounds(null)
    setSelectionPreview(null)
  }
  
  return (
    <>
      <mesh
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        visible={false}
      >
        <sphereGeometry args={[2.1, 64, 64]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
      
      {/* Show current selection preview */}
      {currentBounds && (
        <AreaSelectionBox bounds={currentBounds} visible={true} />
      )}
      
      {/* Show smooth selection line during dragging */}
      {selectionPreview && (
        <line geometry={new THREE.BufferGeometry().setFromPoints([selectionPreview.start, selectionPreview.end])}>
          <lineBasicMaterial color="#4a9eff" opacity={0.6} transparent linewidth={2} />
        </line>
      )}
    </>
  )
})

const PlanetSphere = React.memo(function PlanetSphere({
  planet,
  textureUrl,
  fallbackColor,
  selectedFeature,
  onRotationComplete,
  features,
  onFeatureClick,
  searchQuery,
  showDetailsModal,
  onAreaSelect,
  areaSelection,
  comparisonMode,
  onComparisonAdd,
  comparisonFeatures,
}: {
  planet: string
  textureUrl: string
  fallbackColor: string
  selectedFeature: FamousFeature | null
  onRotationComplete?: () => void
  features: FamousFeature[]
  onFeatureClick: (feature: FamousFeature) => void
  searchQuery: string
  showDetailsModal?: boolean
  onAreaSelect?: (bounds: BoundingBox) => void
  areaSelection?: AreaSelection | null
  comparisonMode?: boolean
  onComparisonAdd?: (feature: FamousFeature) => void
  comparisonFeatures?: FamousFeature[]
}) {
  const groupRef = useRef<THREE.Group>(null)
  const targetRotation = useRef<{ x: number; y: number } | null>(null)
  const hasNotifiedCompletion = useRef(false)
  const texture = useTexture(textureUrl)
  const { camera } = useThree()

  useEffect(() => {
    if (texture) {
      texture.anisotropy = 16
      texture.minFilter = THREE.LinearMipmapLinearFilter
      texture.magFilter = THREE.LinearFilter
      texture.wrapS = THREE.RepeatWrapping
      texture.wrapT = THREE.ClampToEdgeWrapping
    }
  }, [texture])

  useEffect(() => {
    if (selectedFeature && groupRef.current) {
      hasNotifiedCompletion.current = false
      const lon = THREE.MathUtils.degToRad(selectedFeature.lon)
      const lat = THREE.MathUtils.degToRad(selectedFeature.lat)

      // Calculate shortest angular path for rotation
      const currentX = groupRef.current.rotation.x
      const currentY = groupRef.current.rotation.y
      
      const targetX = -lat
      const targetY = -lon

      // For Y rotation (longitude), we need to handle the wrap-around at ±π
      let deltaY = targetY - currentY
      
      // Normalize deltaY to be within [-π, π] for shortest path
      while (deltaY > Math.PI) deltaY -= 2 * Math.PI
      while (deltaY < -Math.PI) deltaY += 2 * Math.PI
      
      const finalTargetY = currentY + deltaY

      // to bring it to face the camera (which is on +Z axis)
      targetRotation.current = {
        x: targetX, // Latitude rotation
        y: finalTargetY, // Longitude rotation with shortest path
      }
    }
  }, [selectedFeature])

  useFrame(() => {
    if (!groupRef.current) return

    if (targetRotation.current) {
      groupRef.current.rotation.x += (targetRotation.current.x - groupRef.current.rotation.x) * 0.05
      groupRef.current.rotation.y += (targetRotation.current.y - groupRef.current.rotation.y) * 0.05

      const diffX = Math.abs(targetRotation.current.x - groupRef.current.rotation.x)
      const diffY = Math.abs(targetRotation.current.y - groupRef.current.rotation.y)

      if (diffX < 0.01 && diffY < 0.01) {
        targetRotation.current = null
        if (!hasNotifiedCompletion.current && onRotationComplete) {
          hasNotifiedCompletion.current = true
          onRotationComplete()
        }
      }
    }
    // else {
    //   groupRef.current.rotation.y += 0.005
    // }
  })

  const [cameraPosition, setCameraPosition] = useState(camera.position.clone())
  
  useFrame(() => {
    // Track camera changes for dynamic feature filtering
    const newPosition = camera.position.clone()
    if (newPosition.distanceTo(cameraPosition) > 0.1) {
      setCameraPosition(newPosition)
    }
  })

  const filteredFeatures = useMemo(() => {
    let result = features
    
    // Apply search query filter
    if (searchQuery) {
      result = result.filter(
        (f) =>
          f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          f.type.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    }
    
    // Apply smart visibility filtering to reduce clutter
    if (result.length > 200) {
      // Get visible features based on camera position
      const visibleFeatures = getVisibleFeatures(result, camera, 200)
      
      // Further filter by zoom level to show appropriate detail
      const cameraDistance = cameraPosition.length()
      const zoomLevel = Math.max(1, 10 - cameraDistance)
      
      return getFeaturesByZoom(visibleFeatures, zoomLevel, 150)
    }
    
    return result
  }, [features, searchQuery, camera, cameraPosition])

  return (
    <group ref={groupRef}>
      <mesh>
        <sphereGeometry args={[2, 128, 128]} />
        <meshStandardMaterial
          map={texture}
          color="#ffffff"
          roughness={0.9}
          metalness={0.1}
          emissive="#111111"
          emissiveIntensity={0.2}
        />
      </mesh>
      <GridLines />
      {areaSelection && (
        <AreaSelectionBox bounds={areaSelection.bounds} visible={areaSelection.visible} />
      )}
      <AreaSelectionHandler onAreaSelect={onAreaSelect} isActive={!!onAreaSelect} planet={planet} />
      {filteredFeatures.map((feature, index) => {
        const comparisonIndex = comparisonFeatures?.findIndex(f => f.name === feature.name)
        const isInComparison = comparisonIndex !== undefined && comparisonIndex >= 0
        
        return (
          <FeatureMarker
            key={`${planet}-${feature.name}-${index}`}
            feature={feature}
            onClick={() => {
              if (comparisonMode && onComparisonAdd) {
                onComparisonAdd(feature)
              } else {
                onFeatureClick(feature)
              }
            }}
            isHighlighted={selectedFeature === feature}
            showDetailsModal={showDetailsModal}
            comparisonMode={comparisonMode}
            isInComparison={isInComparison}
            comparisonIndex={comparisonIndex}
          />
        )
      })}
    </group>
  )
})

const Scene = React.memo(function Scene({
  planet,
  features,
  onFeatureClick,
  searchQuery,
  selectedFeature,
  onRotationComplete,
  showDetailsModal,
  onAreaSelect,
  areaSelection,
  comparisonMode,
  onComparisonAdd,
  comparisonFeatures,
  areaSelectionMode,
}: Globe3DProps) {
  const config = CONFIG[planet]

  // Scene component doesn't need filtering as it passes features to PlanetSphere
  // The PlanetSphere component handles all the smart filtering

  if (!config) {
    console.error(`No configuration found for planet: ${planet}`)
    return null
  }

  const textureUrl = config.textureUrl || `/placeholder.svg?height=2048&width=2048&query=${planet} surface texture`
  const fallbackColor = config.fallbackColor || "#808080"

  return (
    <>
      <ambientLight intensity={1.8} />
      <directionalLight position={[10, 10, 5]} intensity={2.5} castShadow />
      <directionalLight position={[-10, -10, -5]} intensity={1.5} />
      <pointLight position={[5, 0, 5]} intensity={1.2} />
      <hemisphereLight intensity={1.0} groundColor="#1a1a1a" />

      <PlanetSphere
        planet={planet}
        textureUrl={textureUrl}
        fallbackColor={fallbackColor}
        selectedFeature={selectedFeature}
        onRotationComplete={onRotationComplete}
        features={features}
        onFeatureClick={onFeatureClick}
        searchQuery={searchQuery}
        showDetailsModal={showDetailsModal}
        onAreaSelect={onAreaSelect}
        areaSelection={areaSelection}
        comparisonMode={comparisonMode}
        onComparisonAdd={onComparisonAdd}
        comparisonFeatures={comparisonFeatures}
      />

      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={!areaSelectionMode}
        minDistance={3}
        maxDistance={10}
        rotateSpeed={0.5}
        zoomSpeed={0.8}
      />
    </>
  )
})

const Globe3D = React.memo(function Globe3D({
  planet,
  features,
  onFeatureClick,
  searchQuery,
  selectedFeature,
  onRotationComplete,
  showDetailsModal,
  onAreaSelect,
  areaSelection,
  comparisonMode,
  onComparisonAdd,
  comparisonFeatures,
  areaSelectionMode,
}: Globe3DProps) {
  return (
    <ErrorBoundary>
      <div className="w-full h-full">
        <Canvas
          camera={{ position: [0, 0, 5], fov: 45 }}
          style={{ background: "#0a0a0a" }}
          gl={{ antialias: true, alpha: false }}
          dpr={[1, 2]}
          onCreated={({ gl }) => {
            gl.setClearColor(0x0a0a0a)
          }}
        >
          <Scene
            planet={planet}
            features={features}
            onFeatureClick={onFeatureClick}
            searchQuery={searchQuery}
            selectedFeature={selectedFeature}
            onRotationComplete={onRotationComplete}
            showDetailsModal={showDetailsModal}
            onAreaSelect={onAreaSelect}
            areaSelection={areaSelection}
            comparisonMode={comparisonMode}
            onComparisonAdd={onComparisonAdd}
            comparisonFeatures={comparisonFeatures}
            areaSelectionMode={areaSelectionMode}
          />
        </Canvas>
      </div>
    </ErrorBoundary>
  )
})

export default Globe3D
