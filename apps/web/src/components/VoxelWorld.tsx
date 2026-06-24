import React, { useRef, useState, useEffect, useLayoutEffect, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Line } from '@react-three/drei'
import * as THREE from 'three'
import { useVouroStore } from '../store'
import { COLORS } from '@vouro/shared'

const CONFIG = {
  seed: 421337,
  radius: 6.9,
  voxelSize: 0.46,
  shellDepth: 1.22,
  treeCount: 86,
  autoRotateSpeed: 0.22,
}

type Voxel = {
  position: THREE.Vector3
  scale: THREE.Vector3
  quaternion: THREE.Quaternion
  color: THREE.Color
}

type SurfacePoint = {
  position: THREE.Vector3
  normal: THREE.Vector3
  snowy: boolean
  priority: number
}

type PlanetData = {
  solid: Voxel[]
  water: Voxel[]
  trunks: Voxel[]
  leaves: Voxel[]
}

const UP = new THREE.Vector3(0, 1, 0)
const IDENTITY_Q = new THREE.Quaternion()
const UNIT_SCALE = new THREE.Vector3(1, 1, 1)

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hash3(x: number, y: number, z: number, seed = CONFIG.seed) {
  const value = Math.sin(
    x * 127.1 + y * 311.7 + z * 74.7 + seed * 0.00137,
  ) * 43758.5453123
  return value - Math.floor(value)
}

function smoothstep(t: number) {
  return t * t * (3 - 2 * t)
}

function valueNoise3(x: number, y: number, z: number) {
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const z0 = Math.floor(z)
  const x1 = x0 + 1
  const y1 = y0 + 1
  const z1 = z0 + 1

  const tx = smoothstep(x - x0)
  const ty = smoothstep(y - y0)
  const tz = smoothstep(z - z0)

  const c000 = hash3(x0, y0, z0)
  const c100 = hash3(x1, y0, z0)
  const c010 = hash3(x0, y1, z0)
  const c110 = hash3(x1, y1, z0)
  const c001 = hash3(x0, y0, z1)
  const c101 = hash3(x1, y0, z1)
  const c011 = hash3(x0, y1, z1)
  const c111 = hash3(x1, y1, z1)

  const x00 = THREE.MathUtils.lerp(c000, c100, tx)
  const x10 = THREE.MathUtils.lerp(c010, c110, tx)
  const x01 = THREE.MathUtils.lerp(c001, c101, tx)
  const x11 = THREE.MathUtils.lerp(c011, c111, tx)
  const yA = THREE.MathUtils.lerp(x00, x10, ty)
  const yB = THREE.MathUtils.lerp(x01, x11, ty)
  return THREE.MathUtils.lerp(yA, yB, tz)
}

function fbm3(x: number, y: number, z: number, octaves = 4) {
  let sum = 0
  let amplitude = 0.55
  let frequency = 1
  let normalization = 0

  for (let octave = 0; octave < octaves; octave += 1) {
    sum += valueNoise3(x * frequency, y * frequency, z * frequency) * amplitude
    normalization += amplitude
    frequency *= 2.03
    amplitude *= 0.49
  }

  return sum / normalization
}

function jitterColor(base: string, amount: number, random: () => number) {
  const color = new THREE.Color(base)
  const delta = (random() - 0.5) * amount
  color.offsetHSL((random() - 0.5) * amount * 0.08, delta * 0.28, delta)
  return color
}

function terrainSample(normal: THREE.Vector3) {
  const longitude = Math.atan2(normal.z, normal.x)
  const latitude = Math.asin(normal.y)

  const large = fbm3(
    normal.x * 1.18 + 2.6,
    normal.y * 1.18 - 1.1,
    normal.z * 1.18 + 4.2,
    5,
  )
  const detail = fbm3(
    normal.x * 3.6 - 7.2,
    normal.y * 3.6 + 1.4,
    normal.z * 3.6 + 5.7,
    4,
  )

  const winding = Math.abs(
    Math.sin(
      longitude * 2.12 +
        Math.sin(latitude * 3.05) * 1.55 +
        (large - 0.5) * 3.2,
    ),
  )

  const secondRiver = Math.abs(
    Math.sin(
      longitude * 1.18 -
        latitude * 3.15 +
        Math.sin(longitude * 2.7) * 0.72 +
        (detail - 0.5) * 1.25,
    ),
  )

  const northPlateau = THREE.MathUtils.smoothstep(normal.y, 0.38, 0.82)
  const riverDistance = Math.min(winding, secondRiver * 0.92)
  const lakeNoise = fbm3(
    normal.x * 2.5 + 9,
    normal.y * 2.5 - 5,
    normal.z * 2.5 + 3,
    3,
  )

  const isRiver = riverDistance < 0.16
  const isLake = lakeNoise < 0.235 && normal.y < 0.55
  const isWater = !northPlateau && (isRiver || isLake)

  const elevation =
    0.22 +
    Math.pow(large, 1.7) * 1.15 +
    Math.max(0, detail - 0.46) * 0.78 +
    northPlateau * 0.42

  const coastBand = riverDistance < 0.255 || lakeNoise < 0.285
  const snowy = normal.y > 0.53 && (large > 0.43 || detail > 0.58)
  const rocky = snowy && (elevation > 1.15 || detail > 0.68)

  return {
    isWater,
    coastBand,
    snowy,
    rocky,
    elevation,
    northPlateau,
    large,
    detail,
  }
}

function pushTree(
  surface: SurfacePoint,
  random: () => number,
  trunks: Voxel[],
  leaves: Voxel[],
) {
  const normal = surface.normal.clone()
  const quaternion = new THREE.Quaternion().setFromUnitVectors(UP, normal)
  const tangentX = new THREE.Vector3(1, 0, 0).applyQuaternion(quaternion)
  const tangentZ = new THREE.Vector3(0, 0, 1).applyQuaternion(quaternion)

  const isPine = surface.snowy || random() < 0.26
  const trunkSegments = isPine ? 4 + Math.floor(random() * 3) : 3 + Math.floor(random() * 2)
  const trunkStep = CONFIG.voxelSize * 0.72
  const trunkWidth = CONFIG.voxelSize * (0.48 + random() * 0.08)

  for (let index = 0; index < trunkSegments; index += 1) {
    trunks.push({
      position: surface.position
        .clone()
        .addScaledVector(normal, CONFIG.voxelSize * 0.42 + index * trunkStep),
      scale: new THREE.Vector3(trunkWidth, trunkStep * 1.08, trunkWidth),
      quaternion,
      color: jitterColor('#3A3A3A', 0.08, random),
    })
  }

  const canopyBase = surface.position
    .clone()
    .addScaledVector(normal, CONFIG.voxelSize * 0.35 + trunkSegments * trunkStep)

  if (isPine) {
    const layers = 4
    for (let layer = 0; layer < layers; layer += 1) {
      const width = layers - layer
      const step = CONFIG.voxelSize * 0.58
      const layerCenter = canopyBase
        .clone()
        .addScaledVector(normal, layer * CONFIG.voxelSize * 0.47)

      for (let x = -width; x <= width; x += 1) {
        for (let z = -width; z <= width; z += 1) {
          if (Math.abs(x) + Math.abs(z) > width + 1) continue
          if (random() < 0.12) continue

          leaves.push({
            position: layerCenter
              .clone()
              .addScaledVector(tangentX, x * step)
              .addScaledVector(tangentZ, z * step),
            scale: new THREE.Vector3(step, step, step),
            quaternion,
            color: jitterColor('#4D4D4D', 0.1, random),
          })
        }
      }
    }
  } else {
    const step = CONFIG.voxelSize * 0.67
    for (let x = -2; x <= 2; x += 1) {
      for (let y = -1; y <= 2; y += 1) {
        for (let z = -2; z <= 2; z += 1) {
          const radial = Math.abs(x) + Math.abs(z) + Math.abs(y * 0.72)
          if (radial > 4.4 || random() < 0.14) continue

          leaves.push({
            position: canopyBase
              .clone()
              .addScaledVector(tangentX, x * step)
              .addScaledVector(normal, y * step)
              .addScaledVector(tangentZ, z * step),
            scale: new THREE.Vector3(step, step, step),
            quaternion,
            color: jitterColor('#7F7F7F', 0.12, random),
          })
        }
      }
    }
  }
}

function generatePlanet(): PlanetData {
  const random = mulberry32(CONFIG.seed)
  const solid: Voxel[] = []
  const water: Voxel[] = []
  const trunks: Voxel[] = []
  const leaves: Voxel[] = []
  const surfacePoints: SurfacePoint[] = []

  const step = CONFIG.voxelSize
  const waterRadius = CONFIG.radius + 0.12
  const maxRadius = CONFIG.radius + 1.95
  const gridRadius = Math.ceil(maxRadius / step)

  for (let ix = -gridRadius; ix <= gridRadius; ix += 1) {
    for (let iy = -gridRadius; iy <= gridRadius; iy += 1) {
      for (let iz = -gridRadius; iz <= gridRadius; iz += 1) {
        const position = new THREE.Vector3(ix * step, iy * step, iz * step)
        const distance = position.length()
        if (distance < CONFIG.radius - CONFIG.shellDepth || distance > maxRadius) continue

        const normal = position.clone().normalize()
        const terrain = terrainSample(normal)
        const landRadius = CONFIG.radius + terrain.elevation
        const targetRadius = terrain.isWater ? waterRadius : landRadius
        const outerBand = targetRadius - distance

        if (outerBand < -step * 0.5 || outerBand > CONFIG.shellDepth) continue

        const isSurface = outerBand <= step * 0.62
        const scale = new THREE.Vector3(step * 0.98, step * 0.98, step * 0.98)

        if (terrain.isWater && distance >= waterRadius - step * 0.86) {
          water.push({
            position,
            scale,
            quaternion: IDENTITY_Q,
            color: jitterColor('#111111', 0.05, random),
          })
          continue
        }

        let baseColor = '#2D2D2D'
        if (isSurface) {
          if (terrain.snowy) {
            baseColor = terrain.rocky ? '#b9bcc0' : '#e8ecec'
          } else if (terrain.coastBand && terrain.elevation < 1.35) {
            baseColor = '#A6A6A6'
          } else if (terrain.rocky) {
            baseColor = '#8c8f8c'
          } else {
            baseColor = terrain.detail > 0.69 ? '#E6E6E6' : '#FFFFFF'
          }
        } else if (outerBand > step * 1.9 || terrain.rocky) {
          baseColor = '#6e6f69'
        }

        solid.push({
          position,
          scale,
          quaternion: IDENTITY_Q,
          color: jitterColor(baseColor, isSurface ? 0.13 : 0.08, random),
        })

        if (
          isSurface &&
          !terrain.coastBand &&
          !terrain.isWater &&
          terrain.elevation > 0.57 &&
          normal.y > -0.55
        ) {
          surfacePoints.push({
            position: position.clone().addScaledVector(normal, step * 0.53),
            normal,
            snowy: terrain.snowy,
            priority: random() + terrain.large * 0.42,
          })
        }
      }
    }
  }

  surfacePoints.sort((a, b) => b.priority - a.priority)
  const chosen: SurfacePoint[] = []
  const minimumAngularDistance = 0.16

  for (const point of surfacePoints) {
    if (chosen.length >= CONFIG.treeCount) break
    const tooClose = chosen.some(
      (other) => point.normal.angleTo(other.normal) < minimumAngularDistance,
    )
    if (tooClose) continue
    chosen.push(point)
    pushTree(point, random, trunks, leaves)
  }

  return { solid, water, trunks, leaves }
}

function InstancedVoxels({
  voxels,
  material,
  castShadow = true,
  receiveShadow = true,
}: {
  voxels: Voxel[]
  material: THREE.Material
  castShadow?: boolean
  receiveShadow?: boolean
}) {
  const ref = useRef<THREE.InstancedMesh>(null)

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return

    const matrix = new THREE.Matrix4()
    voxels.forEach((voxel, index) => {
      matrix.compose(voxel.position, voxel.quaternion, voxel.scale)
      mesh.setMatrixAt(index, matrix)
      mesh.setColorAt(index, voxel.color)
    })

    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [voxels])

  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, voxels.length]}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
      frustumCulled
    >
      <boxGeometry args={[1, 1, 1]} />
      <primitive object={material} attach="material" />
    </instancedMesh>
  )
}

function getBuildingHeight(usdReward: number): number {
  if (!usdReward || usdReward <= 0) return 0.8;
  return Math.max(0.8, Math.min(4.5, Math.log10(usdReward) * 1.1));
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'active': return COLORS.primaryLime;
    case 'verifying': return COLORS.electricCyan;
    case 'expiring': return COLORS.vaultGold;
    case 'disputed': return COLORS.rejectedRed;
    case 'completed':
    default: return COLORS.textSecondary;
  }
}

function CampaignBuilding({ 
  id, 
  title, 
  reward, 
  slots, 
  status, 
  position, 
  normal,
  isSelected, 
  onClick 
}: { 
  id: string; 
  title: string; 
  reward: number; 
  slots: number; 
  status: string; 
  position: [number, number, number]; 
  normal: [number, number, number];
  isSelected: boolean; 
  onClick: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const height = getBuildingHeight(reward || 0);
  const width = Math.max(0.4, Math.min(1.2, 0.4 + (slots || 0) * 0.15));
  const colorStr = getStatusColor(status || 'active');

  useEffect(() => {
    if (groupRef.current) {
      const normalVec = new THREE.Vector3(...(normal || [0, 1, 0])).normalize();
      const upVec = new THREE.Vector3(0, 1, 0);
      const quat = new THREE.Quaternion().setFromUnitVectors(upVec, normalVec);
      groupRef.current.setRotationFromQuaternion(quat);
    }
  }, [normal]);

  useFrame((state) => {
    if (meshRef.current) {
      const time = state.clock.getElapsedTime();
      if (status === 'verifying') {
        meshRef.current.position.y = height / 2 + Math.sin(time * 3) * 0.04;
      } else if (status === 'disputed') {
        meshRef.current.position.y = height / 2 + Math.sin(time * 8) * 0.02;
      } else {
        meshRef.current.position.y = height / 2;
      }
    }
  });

  return (
    <group ref={groupRef} position={position}>
      <mesh 
        ref={meshRef} 
        position={[0, height / 2, 0]} 
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        <boxGeometry args={[width, height, width]} />
        <meshStandardMaterial 
          color={colorStr}
          roughness={0.2}
          metalness={0.1}
          transparent={status === 'verifying'}
          opacity={status === 'verifying' ? 0.75 : 1}
          emissive={colorStr}
          emissiveIntensity={isSelected ? 0.6 : 0.12}
        />
      </mesh>

      <Line
        points={[
          [-width / 2 - 0.08, 0.01, -width / 2 - 0.08],
          [width / 2 + 0.08, 0.01, -width / 2 - 0.08],
          [width / 2 + 0.08, 0.01, width / 2 + 0.08],
          [-width / 2 - 0.08, 0.01, width / 2 + 0.08],
          [-width / 2 - 0.08, 0.01, -width / 2 - 0.08],
        ]}
        color={isSelected ? COLORS.primaryLime : COLORS.voxelGround}
        lineWidth={1.5}
      />
    </group>
  );
}

function ProofCube({ targetPos }: { targetPos: [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const startPos: [number, number, number] = [0, 0, 0];
  const [progress, setProgress] = useState(0);

  useFrame((state, delta) => {
    setProgress((prev) => {
      const next = prev + delta * 0.25;
      return next >= 1 ? 0 : next;
    });

    if (meshRef.current) {
      const startVec = new THREE.Vector3(...startPos);
      const targetVec = new THREE.Vector3(...targetPos);
      const pos = new THREE.Vector3().lerpVectors(startVec, targetVec, progress);
      const normalOffset = targetVec.clone().normalize().multiplyScalar(Math.sin(progress * Math.PI) * 1.8);
      pos.add(normalOffset);

      meshRef.current.position.copy(pos);
      meshRef.current.rotation.x += delta;
      meshRef.current.rotation.y += delta * 1.5;
    }
  });

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[0.2, 0.2, 0.2]} />
      <meshStandardMaterial 
        color={COLORS.electricCyan} 
        emissive={COLORS.electricCyan}
        emissiveIntensity={1.0} 
        transparent 
        opacity={0.9}
      />
    </mesh>
  );
}

function MovingVehicle({ routeLength = 9.2, tilt = 0.35 }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      const t = state.clock.getElapsedTime() * 0.25;
      const x = Math.cos(t) * routeLength;
      const y = Math.sin(t) * Math.sin(tilt) * routeLength;
      const z = Math.sin(t) * Math.cos(tilt) * routeLength;
      
      meshRef.current.position.set(x, y, z);

      const nextX = Math.cos(t + 0.01) * routeLength;
      const nextY = Math.sin(t + 0.01) * Math.sin(tilt) * routeLength;
      const nextZ = Math.sin(t + 0.01) * Math.cos(tilt) * routeLength;
      meshRef.current.lookAt(new THREE.Vector3(nextX, nextY, nextZ));
    }
  });

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[0.25, 0.12, 0.4]} />
      <meshStandardMaterial color={COLORS.vaultGold} emissive={COLORS.vaultGold} emissiveIntensity={0.5} />
    </mesh>
  );
}

function OrbitRing() {
  const ringRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (ringRef.current) {
      ringRef.current.rotation.x = Math.PI / 2.5;
      ringRef.current.rotation.z = state.clock.getElapsedTime() * 0.05;
    }
  });

  return (
    <mesh ref={ringRef}>
      <ringGeometry args={[9.8, 9.9, 64]} />
      <meshBasicMaterial color={COLORS.electricCyan} side={THREE.DoubleSide} transparent opacity={0.25} />
    </mesh>
  );
}

function PlanetScene({ children }: { children: React.ReactNode }) {
  const root = useRef<THREE.Group>(null)
  const data = useMemo(() => generatePlanet(), [])

  const solidMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.93,
        metalness: 0,
        flatShading: true,
      }),
    [],
  )

  const waterMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        vertexColors: true,
        roughness: 0.22,
        metalness: 0.02,
        clearcoat: 0.52,
        clearcoatRoughness: 0.22,
        transparent: true,
        opacity: 0.92,
        flatShading: true,
      }),
    [],
  )

  const trunkMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 1,
        flatShading: true,
      }),
    [],
  )

  const leafMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.96,
        flatShading: true,
      }),
    [],
  )

  useFrame((_, delta) => {
    if (!root.current) return
    root.current.rotation.y += delta * 0.018
  })

  return (
    <group ref={root} rotation={[0.08, -0.48, -0.045]}>
      <InstancedVoxels voxels={data.solid} material={solidMaterial} />
      <InstancedVoxels
        voxels={data.water}
        material={waterMaterial}
        castShadow={false}
      />
      <InstancedVoxels voxels={data.trunks} material={trunkMaterial} />
      <InstancedVoxels voxels={data.leaves} material={leafMaterial} />
      {children}
    </group>
  )
}

function PerformanceMonitor() {
  const { setGpuLagDetected, triggerToast } = useVouroStore();
  const lastTime = useRef(performance.now());
  const frameTimes = useRef<number[]>([]);
  const warned = useRef(false);

  useFrame(() => {
    const now = performance.now();
    const delta = now - lastTime.current;
    lastTime.current = now;

    // Skip the first frame or extremely long frame (like switching tabs)
    if (delta > 200) return;

    frameTimes.current.push(delta);
    if (frameTimes.current.length > 90) {
      frameTimes.current.shift();
    }

    // Only evaluate performance if we have gathered enough frames (e.g. 90 frames = 1.5 seconds)
    if (frameTimes.current.length >= 90 && !warned.current) {
      const avgDelta = frameTimes.current.reduce((a, b) => a + b, 0) / frameTimes.current.length;
      const fps = 1000 / avgDelta;

      // If FPS drops below 26, it is considered lag / high GPU load
      if (fps < 26) {
        warned.current = true;
        setGpuLagDetected(true);
        triggerToast(
          '⚠️ Performance Lag Detected: High GPU usage. We recommend switching to "LIGHTWEIGHT" mode.',
          'warning'
        );
      }
    }
  });

  return null;
}

export default function VoxelWorld({ interactive = true }: { interactive?: boolean }) {
  const { missions, selectedMissionId, selectMission, lightweightMode } = useVouroStore();

  const getMissionSphericalPosition = (index: number): { position: [number, number, number]; normal: [number, number, number] } => {
    // Surface sits at land radius which is around radius 6.9 + elevation (0.5 to 1.5). Let's target radius 7.8
    const radius = 7.7;
    const total = Math.max(1, missions.length);
    const offset = 2 / total;
    const increment = Math.PI * (3 - Math.sqrt(5));

    const y = ((index * offset) - 1) + (offset / 2);
    const r = Math.sqrt(1 - y * y);
    const phi = index * increment;
    
    const x = Math.cos(phi) * r;
    const z = Math.sin(phi) * r;
    
    return {
      position: [x * radius, y * radius, z * radius],
      normal: [x, y, z]
    };
  };

  if (lightweightMode) {
    if (!interactive) {
      return <VantaGlobeBackground />;
    }
    return <LightweightWorldView />;
  }

  return (
    <div className={`w-full h-full relative bg-black min-h-[400px] ${interactive ? '' : 'pointer-events-none'}`}>
      <Canvas
        shadows
        dpr={[1, 1.75]}
        camera={{ position: [15.8, 13.4, 18.2], fov: 31, near: 0.1, far: 100 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.outputColorSpace = THREE.SRGBColorSpace
          gl.toneMapping = THREE.ACESFilmicToneMapping
          gl.toneMappingExposure = 1.2
          gl.shadowMap.enabled = true
          gl.shadowMap.type = THREE.PCFSoftShadowMap
        }}
      >
        <PerformanceMonitor />
        <color attach="background" args={[COLORS.background]} />
        <fog attach="fog" args={[COLORS.background, 28, 58]} />

        <ambientLight intensity={1.2} />
        <hemisphereLight args={['#c9f2ff', '#102014', 1.8]} />

        <directionalLight
          castShadow
          position={[-11, 16, 14]}
          intensity={4.9}
          color="#fff5d9"
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-left={-13}
          shadow-camera-right={13}
          shadow-camera-top={13}
          shadow-camera-bottom={-13}
          shadow-camera-near={1}
          shadow-camera-far={45}
          shadow-bias={-0.00035}
        />

        <pointLight position={[9, -4, 10]} intensity={22} distance={34} color="#4da9ff" />
        <pointLight position={[-11, 2, -10]} intensity={12} distance={30} color="#6ea93c" />

        <PlanetScene>
          {/* Campaign Buildings on surface */}
          {missions.map((mission, index) => {
            const { position, normal } = getMissionSphericalPosition(index);
            const isSelected = selectedMissionId === mission.id;
            return (
              <CampaignBuilding
                key={mission.id}
                id={mission.id}
                title={mission.title}
                reward={mission.usdEstimate}
                slots={mission.slots}
                status={mission.status}
                position={position}
                normal={normal}
                isSelected={isSelected}
                onClick={() => selectMission(mission.id)}
              />
            );
          })}

          {/* Proof Cubes */}
          {missions.map((m, index) => {
            if (m.status === 'verifying') {
              const { position } = getMissionSphericalPosition(index);
              return <ProofCube key={`proof-${m.id}`} targetPos={position} />;
            }
            return null;
          })}

          {/* Orbiting Satellites */}
          <MovingVehicle routeLength={8.6} tilt={0.4} />
          <MovingVehicle routeLength={9.8} tilt={-0.3} />
          
          {/* Planetary Ring */}
          <OrbitRing />
        </PlanetScene>

        <OrbitControls
          makeDefault
          enablePan={false}
          enableRotate={interactive}
          enableZoom={interactive}
          enableDamping
          dampingFactor={0.055}
          minDistance={15}
          maxDistance={29}
          minPolarAngle={0.48}
          maxPolarAngle={2.42}
          autoRotate
          autoRotateSpeed={CONFIG.autoRotateSpeed}
          target={[0, 0.15, 0]}
        />
      </Canvas>

      {interactive && (
        <div className="absolute bottom-4 left-4 pointer-events-none bg-vouro-surface/80 border border-vouro-ground p-3 text-xs font-mono backdrop-blur-md">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 bg-vouro-lime rounded-full inline-block animate-pulse"></span>
            <span className="text-vouro-text uppercase">VOXEL GLOBE OPERATIONAL</span>
          </div>
          <div className="text-vouro-muted">Drag to rotate • Scroll to zoom • Click tower</div>
        </div>
      )}
    </div>
  );
}

// 2D Lightweight view
function LightweightWorldView() {
  const { missions, selectedMissionId, selectMission } = useVouroStore();

  const getBuildingHeight = (usdReward: number): number => {
    if (!usdReward || usdReward <= 0) return 1.5;
    return Math.max(1.5, Math.min(10, Math.log10(usdReward) * 2.0));
  };

  return (
    <div className="w-full h-full bg-vouro-bg border border-vouro-ground flex flex-col justify-between p-6 relative overflow-hidden min-h-[400px]">
      <div className="absolute inset-0 grid-bg-animated opacity-20 pointer-events-none"></div>

      <div className="z-10 flex justify-between items-start">
        <div>
          <h3 className="text-lg font-heading font-bold text-vouro-lime uppercase tracking-wider">LIGHTWEIGHT WORLD VIEW</h3>
          <p className="text-xs text-vouro-muted">System loaded in flat rendering mode due to device settings.</p>
        </div>
        <span className="px-2 py-1 text-[10px] font-mono bg-vouro-ground text-vouro-lime border border-vouro-lime/20">REDUCED_MOTION_ACTIVE</span>
      </div>

      <div className="z-10 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 my-6">
        <div className="bg-vouro-surface border-2 border-dashed border-vouro-cyan/30 p-4 flex flex-col justify-center items-center text-center">
          <span className="text-2xl">🌍</span>
          <h4 className="text-xs font-mono font-bold mt-2 text-vouro-cyan">VOURO_GLOBE_CORE</h4>
          <span className="text-[10px] text-vouro-muted">Active Shell Node</span>
        </div>

        {missions.map((mission) => {
          const isSelected = selectedMissionId === mission.id;
          const colorStr = getStatusColor(mission.status);
          const height = Math.ceil(getBuildingHeight(mission.usdEstimate));

          return (
            <button
              key={mission.id}
              onClick={() => selectMission(mission.id)}
              className={`text-left p-4 transition-all duration-200 border relative ${
                isSelected 
                  ? 'bg-vouro-ground border-vouro-lime shadow-[0_0_10px_rgba(165,255,100,0.2)]' 
                  : 'bg-vouro-surface hover:bg-vouro-ground/40 border-vouro-ground'
              }`}
            >
              <div className="flex gap-0.5 items-end h-6 mb-2">
                {Array.from({ length: height }).map((_, i) => (
                  <span 
                    key={i} 
                    className="w-1.5 rounded-sm" 
                    style={{ 
                      height: `${(i + 1) * 3 + 4}px`, 
                      backgroundColor: colorStr,
                      opacity: isSelected ? 1 : 0.6
                    }}
                  ></span>
                ))}
              </div>
              <h4 className="text-xs font-mono font-bold truncate text-vouro-text">{mission.title}</h4>
              <span className="text-[10px] font-mono mt-1 block" style={{ color: colorStr }}>
                {mission.status.toUpperCase()} • {mission.rewardAmount} {mission.rewardToken}
              </span>
            </button>
          );
        })}
      </div>

      <div className="z-10 text-xs font-mono text-vouro-muted">
        Select a card or campaign tower block to open Mission specifications.
      </div>
    </div>
  );
}

// Transparent Vanta Globe Background Component for Landing page in Lightweight mode
function VantaGlobeBackground() {
  const vantaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let vantaEffect: any = null;

    if (typeof window !== 'undefined' && (window as any).VANTA && (window as any).VANTA.GLOBE) {
      try {
        vantaEffect = (window as any).VANTA.GLOBE({
          el: vantaRef.current,
          mouseControls: false,
          touchControls: false,
          gyroControls: false,
          minHeight: 200.00,
          minWidth: 200.00,
          scale: 1.00,
          scaleMobile: 1.00,
          color: 0xffffff,
          color2: 0x444444,
          backgroundAlpha: 0.0, // Globe-only transparent background
          size: 1.05
        });
      } catch (err) {
        console.error("Vanta initialization failed", err);
      }
    }

    return () => {
      if (vantaEffect) {
        vantaEffect.destroy();
      }
    };
  }, []);

  return (
    <div 
      ref={vantaRef} 
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ backgroundColor: 'transparent' }}
    />
  );
}
