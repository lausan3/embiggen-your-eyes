"use client"

import React, { useRef, useMemo, useState, useEffect, type ErrorInfo } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { OrbitControls, Html, Stars } from "@react-three/drei"
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
  onRotationComplete?: () => void
}

const FeatureMarker = React.memo(function FeatureMarker({
  feature,
  onClick,
  isHighlighted,
}: {
  feature: FamousFeature
  onClick: () => void
  isHighlighted: boolean
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)

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
          setHovered(true)
          document.body.style.cursor = "pointer"
        }}
        onPointerOut={() => {
          setHovered(false)
          document.body.style.cursor = "auto"
        }}
      >
        <sphereGeometry args={[0.02, 16, 16]} />
        <meshBasicMaterial color={isHighlighted ? "#FFD700" : "#D4A574"} />
      </mesh>
      {(hovered || isHighlighted) && (
        <Html distanceFactor={10} position={[0, 0.05, 0]}>
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

const PlanetSphere = React.memo(function PlanetSphere({
  planet,
  textureUrl,
  fallbackColor,
  selectedFeature,
  onRotationComplete,
}: {
  planet: string
  textureUrl: string
  fallbackColor: string
  selectedFeature: FamousFeature | null
  onRotationComplete?: () => void
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [textureLoaded, setTextureLoaded] = useState(false)
  const [loadedTexture, setLoadedTexture] = useState<THREE.Texture | null>(null)
  const targetRotation = useRef<{ x: number; y: number } | null>(null)
  const hasNotifiedCompletion = useRef(false)

  // FIXED: Moved texture loading to useEffect
  useEffect(() => {
    console.log(`[v0] ========================================`)
    console.log(`[v0] Loading texture for ${planet}`)
    console.log(`[v0] URL being loaded: ${textureUrl}`)
    console.log(`[v0] ========================================`)

    const loader = new THREE.TextureLoader()
    loader.load(
      textureUrl,
      (texture) => {
        console.log(`[v0] ✓ Successfully loaded texture for ${planet}`)
        texture.anisotropy = 16
        texture.minFilter = THREE.LinearMipmapLinearFilter
        texture.magFilter = THREE.LinearFilter
        texture.generateMipmaps = true
        texture.needsUpdate = true
        setLoadedTexture(texture)
        setTextureLoaded(true)
      },
      undefined,
      (error) => {
        console.warn(`[v0] ✗ Failed to load texture for ${planet}`)
        console.log(`[v0] Error details:`, error)
        console.log(`[v0] Using fallback color: ${fallbackColor}`)
        setTextureLoaded(false)
        setLoadedTexture(null)
      },
    )

    return () => {
      if (loadedTexture) {
        loadedTexture.dispose()
      }
    }
  }, [textureUrl, planet, fallbackColor])

  useEffect(() => {
    if (selectedFeature && meshRef.current) {
      hasNotifiedCompletion.current = false
      const lon = THREE.MathUtils.degToRad(selectedFeature.lon)
      const lat = THREE.MathUtils.degToRad(selectedFeature.lat)
      targetRotation.current = {
        x: lat,
        y: -lon + Math.PI / 2,
      }
    }
  }, [selectedFeature])

  useFrame(() => {
    if (meshRef.current) {
      if (targetRotation.current) {
        meshRef.current.rotation.x += (targetRotation.current.x - meshRef.current.rotation.x) * 0.05
        meshRef.current.rotation.y += (targetRotation.current.y - meshRef.current.rotation.y) * 0.05

        const diffX = Math.abs(targetRotation.current.x - meshRef.current.rotation.x)
        const diffY = Math.abs(targetRotation.current.y - meshRef.current.rotation.y)

        if (diffX < 0.01 && diffY < 0.01) {
          targetRotation.current = null
          if (!hasNotifiedCompletion.current && onRotationComplete) {
            hasNotifiedCompletion.current = true
            onRotationComplete()
          }
        }
      } else {
        meshRef.current.rotation.y += 0.001
      }
    }
  })

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[2, 128, 128]} />
      <meshStandardMaterial
        map={loadedTexture}
        roughness={textureLoaded ? 0.95 : 0.8}
        metalness={0.0}
        color={textureLoaded ? undefined : fallbackColor}
        emissive={textureLoaded ? "#000000" : fallbackColor}
        emissiveIntensity={textureLoaded ? 0 : 0.15}
        displacementScale={0}
      />
    </mesh>
  )
})

const Scene = React.memo(function Scene({
  planet,
  features,
  onFeatureClick,
  searchQuery,
  selectedFeature,
  onRotationComplete,
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
      {/* FIXED: Reduced light intensity */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={1.0} castShadow />
      <directionalLight position={[-10, -10, -5]} intensity={0.3} />
      <pointLight position={[5, 0, 5]} intensity={0.3} />
      <hemisphereLight intensity={0.3} groundColor="#0a0a0a" />

      <PlanetSphere
        planet={planet}
        textureUrl={textureUrl}
        fallbackColor={fallbackColor}
        selectedFeature={selectedFeature}
        onRotationComplete={onRotationComplete}
      />

      {filteredFeatures.map((feature, index) => (
        <FeatureMarker
          key={`${planet}-${feature.name}-${index}`}
          feature={feature}
          onClick={() => onFeatureClick(feature)}
          isHighlighted={selectedFeature === feature}
        />
      ))}

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
          />
        </Canvas>
      </div>
    </ErrorBoundary>
  )
})

export default Globe3D