"use client"

import React, { useRef, useMemo, useState, useEffect, type ErrorInfo } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { OrbitControls, Html, Stars, useTexture } from "@react-three/drei"
import * as THREE from "three"
import { latLonToVector3 } from "@/lib/utils/coordinates"
import { PLANETARY_CONFIG as CONFIG } from "@/lib/config"

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
  onRotationComplete?: () => void // Added callback for when rotation animation completes
  showDetailsModal?: boolean // Added to know when details modal is open
}

const FeatureMarker = React.memo(function FeatureMarker({
  feature,
  onClick,
  isHighlighted,
  showDetailsModal,
}: {
  feature: FamousFeature
  onClick: () => void
  isHighlighted: boolean
  showDetailsModal?: boolean
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
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshBasicMaterial color={isHighlighted ? "#00FFFF" : "#FFFF00"} />
      </mesh>
      {(hovered || isHighlighted) && !showDetailsModal && (
        <Html distanceFactor={10} position={[0, 0.1, 0]}>
          <div
            className="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap pointer-events-none"
            style={{
              background: "rgba(26, 26, 26, 0.95)",
              color: "#ffffff",
              border: "1px solid rgba(212, 165, 116, 0.3)",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.5)",
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
}) {
  const groupRef = useRef<THREE.Group>(null)
  const targetRotation = useRef<{ x: number; y: number } | null>(null)
  const hasNotifiedCompletion = useRef(false)
  const texture = useTexture(textureUrl)

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

      // to bring it to face the camera (which is on +Z axis)
      targetRotation.current = {
        x: -lat, // Negative to rotate globe opposite to latitude
        y: -lon, // Negative to rotate globe opposite to longitude
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

  const filteredFeatures = useMemo(() => {
    if (!searchQuery) return features
    return features.filter(
      (f) =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.type.toLowerCase().includes(searchQuery.toLowerCase()),
    )
  }, [features, searchQuery])

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
      {filteredFeatures.map((feature, index) => (
        <FeatureMarker
          key={`${planet}-${feature.name}-${index}`}
          feature={feature}
          onClick={() => onFeatureClick(feature)}
          isHighlighted={selectedFeature === feature}
          showDetailsModal={showDetailsModal}
        />
      ))}
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
}: Globe3DProps) {
  const config = CONFIG[planet]

  const filteredFeatures = useMemo(() => {
    if (!searchQuery) return features
    return features.filter(
      (f) =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.type.toLowerCase().includes(searchQuery.toLowerCase()),
    )
  }, [features, searchQuery])

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
      />

      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
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
          />
        </Canvas>
      </div>
    </ErrorBoundary>
  )
})

export default Globe3D
