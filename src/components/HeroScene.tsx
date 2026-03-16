'use client';

import { useRef, useMemo, useState, useEffect, useCallback, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  Environment,
  MeshReflectorMaterial,
  Stars,
  Sparkles,
} from '@react-three/drei';
import {
  EffectComposer,
  Bloom,
  ChromaticAberration,
  Vignette,
  ToneMapping,
  N8AO,
} from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import { isWebGLAvailable, WebGLErrorBoundary } from '@/lib/webgl';

/* ── Props ─────────────────────────────────────────────────────────────── */

interface HeroSceneProps {
  scrollRef: React.MutableRefObject<number>;
}

/* ── Fallback UI ───────────────────────────────────────────────────────── */

function Fallback() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#0a0f1a] to-[#111827]">
      <div className="text-center px-8">
        <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-teal-500/10 flex items-center justify-center">
          <svg className="w-10 h-10 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 7.5l-2.25-1.313M21 7.5v2.25m0-2.25l-2.25 1.313M3 7.5l2.25-1.313M3 7.5l2.25 1.313M3 7.5v2.25m9 3l2.25-1.313M12 12.75l-2.25-1.313M12 12.75V15m0 6.75l2.25-1.313M12 21.75V15m0 0l-2.25 1.313" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-white mb-1">3D Preview</h3>
        <p className="text-sm text-slate-400">Interactive 3D building visualization</p>
      </div>
    </div>
  );
}

/* ── Scroll-driven camera ──────────────────────────────────────────────── */

function ScrollCamera({ scrollRef }: { scrollRef: React.MutableRefObject<number> }) {
  const { camera } = useThree();
  const currentPos = useRef(new THREE.Vector3(8, 4, 12));
  const currentTarget = useRef(new THREE.Vector3(0, 1.5, 0));

  useFrame((state, delta) => {
    const t = scrollRef.current;
    const lerpSpeed = 1 - Math.exp(-2.0 * delta);

    // Idle orbit when at top
    const idleAngle = state.clock.elapsedTime * 0.08;

    let targetPos: THREE.Vector3;
    let targetLookAt: THREE.Vector3;

    if (t < 0.2) {
      // Hero: wide establishing shot with subtle orbit
      const orbitR = 12;
      const baseX = Math.sin(idleAngle) * orbitR;
      const baseZ = Math.cos(idleAngle) * orbitR;
      const st = t / 0.2;
      targetPos = new THREE.Vector3(
        baseX * (1 - st * 0.3),
        4 + st * 1.5,
        baseZ * (1 - st * 0.3)
      );
      targetLookAt = new THREE.Vector3(0, 1.5 + st * 0.5, 0);
    } else if (t < 0.45) {
      // Stats / Features: orbit closer, higher angle
      const st = (t - 0.2) / 0.25;
      const angle = idleAngle + st * 1.2;
      targetPos = new THREE.Vector3(
        Math.sin(angle) * 8,
        5 + st * 2,
        Math.cos(angle) * 8
      );
      targetLookAt = new THREE.Vector3(0, 2 + st, 0);
    } else if (t < 0.7) {
      // How It Works: dramatic high angle
      const st = (t - 0.45) / 0.25;
      const angle = idleAngle + 1.2 + st * 0.8;
      targetPos = new THREE.Vector3(
        Math.sin(angle) * 6,
        8 + st * 3,
        Math.cos(angle) * 6
      );
      targetLookAt = new THREE.Vector3(0, 2, 0);
    } else {
      // CTA: close detail shot
      const st = (t - 0.7) / 0.3;
      const angle = idleAngle + 2.0 + st * 0.5;
      targetPos = new THREE.Vector3(
        Math.sin(angle) * 5,
        3 - st * 0.5,
        Math.cos(angle) * 5
      );
      targetLookAt = new THREE.Vector3(0, 2, 0);
    }

    currentPos.current.lerp(targetPos, lerpSpeed);
    currentTarget.current.lerp(targetLookAt, lerpSpeed);

    camera.position.copy(currentPos.current);
    camera.lookAt(currentTarget.current);
  });

  return null;
}

/* ── Main tower ────────────────────────────────────────────────────────── */

function CityBuilding() {
  const groupRef = useRef<THREE.Group>(null);
  const floorCount = 14;
  const floorH = 0.38;
  const baseW = 2.8;
  const baseD = 2.0;

  // Emissive window intensities (randomized once)
  const windowEmissive = useMemo(() =>
    Array.from({ length: floorCount * 5 }, () => 0.1 + Math.random() * 0.5),
  []);

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* Foundation / podium */}
      <mesh position={[0, 0.1, 0]} castShadow receiveShadow>
        <boxGeometry args={[baseW + 0.8, 0.2, baseD + 0.8]} />
        <meshStandardMaterial color="#1a1a2e" roughness={0.3} metalness={0.5} />
      </mesh>

      {/* Podium accent strip */}
      <mesh position={[0, 0.21, 0]}>
        <boxGeometry args={[baseW + 0.82, 0.01, baseD + 0.82]} />
        <meshStandardMaterial color="#0d9488" emissive="#0d9488" emissiveIntensity={0.4} roughness={0.2} metalness={0.6} />
      </mesh>

      {/* Floor stack */}
      {Array.from({ length: floorCount }, (_, i) => {
        const y = i * floorH + 0.3;
        const setback = i > 10 ? (i - 10) * 0.1 : 0;
        const w = baseW - setback;
        const d = baseD - setback;

        return (
          <group key={i}>
            {/* Floor slab edge */}
            <mesh position={[0, y, 0]} castShadow>
              <boxGeometry args={[w + 0.04, 0.025, d + 0.04]} />
              <meshStandardMaterial color="#2a2a3e" roughness={0.4} metalness={0.3} />
            </mesh>

            {/* Glass curtain wall — front (south -z) */}
            {Array.from({ length: 5 }, (_, wi) => {
              const panelW = (w - 0.08) / 5;
              const px = -w / 2 + 0.04 + panelW * wi + panelW / 2;
              const ei = Math.min(i * 5 + wi, windowEmissive.length - 1);
              return (
                <mesh key={`sf-${wi}`} position={[px, y + floorH / 2, -d / 2 - 0.005]}>
                  <boxGeometry args={[panelW - 0.015, floorH - 0.03, 0.012]} />
                  <meshPhysicalMaterial
                    color="#88ccff"
                    roughness={0.05}
                    metalness={0.1}
                    transmission={0.5}
                    transparent
                    opacity={0.35}
                    emissive="#4488aa"
                    emissiveIntensity={windowEmissive[ei]}
                  />
                </mesh>
              );
            })}

            {/* Glass curtain wall — back (north +z) */}
            {Array.from({ length: 5 }, (_, wi) => {
              const panelW = (w - 0.08) / 5;
              const px = -w / 2 + 0.04 + panelW * wi + panelW / 2;
              return (
                <mesh key={`sn-${wi}`} position={[px, y + floorH / 2, d / 2 + 0.005]}>
                  <boxGeometry args={[panelW - 0.015, floorH - 0.03, 0.012]} />
                  <meshPhysicalMaterial
                    color="#88ccff"
                    roughness={0.05}
                    metalness={0.1}
                    transmission={0.5}
                    transparent
                    opacity={0.35}
                    emissive="#4488aa"
                    emissiveIntensity={0.1 + Math.random() * 0.3}
                  />
                </mesh>
              );
            })}

            {/* Glass curtain wall — left (-x) */}
            {Array.from({ length: 4 }, (_, wi) => {
              const panelD = (d - 0.08) / 4;
              const pz = -d / 2 + 0.04 + panelD * wi + panelD / 2;
              return (
                <mesh key={`sl-${wi}`} position={[-w / 2 - 0.005, y + floorH / 2, pz]}>
                  <boxGeometry args={[0.012, floorH - 0.03, panelD - 0.015]} />
                  <meshPhysicalMaterial
                    color="#88ccff"
                    roughness={0.05}
                    metalness={0.1}
                    transmission={0.5}
                    transparent
                    opacity={0.35}
                    emissive="#4488aa"
                    emissiveIntensity={0.15 + Math.random() * 0.25}
                  />
                </mesh>
              );
            })}

            {/* Glass curtain wall — right (+x) */}
            {Array.from({ length: 4 }, (_, wi) => {
              const panelD = (d - 0.08) / 4;
              const pz = -d / 2 + 0.04 + panelD * wi + panelD / 2;
              return (
                <mesh key={`sr-${wi}`} position={[w / 2 + 0.005, y + floorH / 2, pz]}>
                  <boxGeometry args={[0.012, floorH - 0.03, panelD - 0.015]} />
                  <meshPhysicalMaterial
                    color="#88ccff"
                    roughness={0.05}
                    metalness={0.1}
                    transmission={0.5}
                    transparent
                    opacity={0.35}
                    emissive="#4488aa"
                    emissiveIntensity={0.15 + Math.random() * 0.25}
                  />
                </mesh>
              );
            })}

            {/* Mullions (vertical frames) — front */}
            {Array.from({ length: 6 }, (_, mi) => {
              const mx = -w / 2 + (w / 5) * mi;
              return (
                <mesh key={`mf-${mi}`} position={[mx, y + floorH / 2, -d / 2 - 0.01]}>
                  <boxGeometry args={[0.012, floorH, 0.02]} />
                  <meshStandardMaterial color="#1a1a2e" roughness={0.2} metalness={0.8} />
                </mesh>
              );
            })}

            {/* Mullions — back */}
            {Array.from({ length: 6 }, (_, mi) => {
              const mx = -w / 2 + (w / 5) * mi;
              return (
                <mesh key={`mb-${mi}`} position={[mx, y + floorH / 2, d / 2 + 0.01]}>
                  <boxGeometry args={[0.012, floorH, 0.02]} />
                  <meshStandardMaterial color="#1a1a2e" roughness={0.2} metalness={0.8} />
                </mesh>
              );
            })}
          </group>
        );
      })}

      {/* Roof accent edge */}
      <mesh position={[0, floorCount * floorH + 0.32, 0]}>
        <boxGeometry args={[baseW + 0.08, 0.02, baseD + 0.08]} />
        <meshStandardMaterial color="#0d9488" roughness={0.2} metalness={0.6} emissive="#0d9488" emissiveIntensity={0.4} />
      </mesh>

      {/* Roof mechanical penthouse */}
      <mesh position={[0, floorCount * floorH + 0.52, 0]} castShadow>
        <boxGeometry args={[baseW * 0.35, 0.38, baseD * 0.35]} />
        <meshStandardMaterial color="#1a1a2e" roughness={0.3} metalness={0.5} />
      </mesh>

      {/* Roof antenna / spire */}
      <mesh position={[0, floorCount * floorH + 0.92, 0]}>
        <cylinderGeometry args={[0.015, 0.005, 0.5, 6]} />
        <meshStandardMaterial color="#0d9488" emissive="#0d9488" emissiveIntensity={0.6} roughness={0.1} metalness={0.9} />
      </mesh>

      {/* Entrance canopy */}
      <mesh position={[0, 0.35, -baseD / 2 - 0.5]} castShadow>
        <boxGeometry args={[1.4, 0.025, 0.9]} />
        <meshStandardMaterial color="#0d9488" roughness={0.2} metalness={0.5} emissive="#0d9488" emissiveIntensity={0.2} />
      </mesh>

      {/* Entrance lights */}
      <pointLight position={[0, 0.3, -baseD / 2 - 0.3]} intensity={0.5} color="#0d9488" distance={3} />
    </group>
  );
}

/* ── Secondary buildings ───────────────────────────────────────────────── */

function SecondaryBuildings() {
  const buildings = useMemo(() => [
    { pos: [-5, 0, -2] as [number, number, number], floors: 7, w: 1.6, d: 1.3 },
    { pos: [5.5, 0, 1.5] as [number, number, number], floors: 9, w: 1.3, d: 1.1 },
    { pos: [-3.5, 0, 4] as [number, number, number], floors: 5, w: 1.9, d: 1.2 },
    { pos: [3.5, 0, -4] as [number, number, number], floors: 6, w: 1.4, d: 1.4 },
  ], []);

  return (
    <group>
      {buildings.map((b, bi) => {
        const h = b.floors * 0.35;
        return (
          <group key={bi} position={b.pos}>
            {/* Main body */}
            <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[b.w, h, b.d]} />
              <meshStandardMaterial color="#12122a" roughness={0.6} metalness={0.2} />
            </mesh>

            {/* Window rows (emissive strips) */}
            {Array.from({ length: b.floors }, (_, fi) => (
              <group key={fi}>
                <mesh position={[0, fi * 0.35 + 0.2, -b.d / 2 - 0.001]}>
                  <planeGeometry args={[b.w - 0.12, 0.14]} />
                  <meshStandardMaterial
                    color="#335577"
                    transparent
                    opacity={0.25}
                    emissive="#5588aa"
                    emissiveIntensity={0.15 + (fi % 3) * 0.15}
                  />
                </mesh>
                <mesh position={[0, fi * 0.35 + 0.2, b.d / 2 + 0.001]}>
                  <planeGeometry args={[b.w - 0.12, 0.14]} />
                  <meshStandardMaterial
                    color="#335577"
                    transparent
                    opacity={0.25}
                    emissive="#5588aa"
                    emissiveIntensity={0.1 + (fi % 2) * 0.2}
                  />
                </mesh>
              </group>
            ))}

            {/* Roof accent */}
            <mesh position={[0, h + 0.01, 0]}>
              <boxGeometry args={[b.w + 0.04, 0.015, b.d + 0.04]} />
              <meshStandardMaterial color="#1e1e3a" roughness={0.3} metalness={0.4} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/* ── Reflective ground ─────────────────────────────────────────────────── */

function ReflectiveGround() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
      <planeGeometry args={[60, 60]} />
      <MeshReflectorMaterial
        blur={[400, 100]}
        resolution={1024}
        mixBlur={1}
        mixStrength={15}
        roughness={1}
        depthScale={1.2}
        minDepthThreshold={0.4}
        maxDepthThreshold={1.4}
        color="#080812"
        metalness={0.5}
        mirror={0.5}
      />
    </mesh>
  );
}

/* ── Grid lines on ground ──────────────────────────────────────────────── */

function GroundGrid() {
  const geometry = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const size = 25;
    const step = 2;
    for (let i = -size; i <= size; i += step) {
      points.push(new THREE.Vector3(i, 0.001, -size), new THREE.Vector3(i, 0.001, size));
      points.push(new THREE.Vector3(-size, 0.001, i), new THREE.Vector3(size, 0.001, i));
    }
    return new THREE.BufferGeometry().setFromPoints(points);
  }, []);

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color="#0d9488" transparent opacity={0.06} />
    </lineSegments>
  );
}

/* ── Enhanced particles ────────────────────────────────────────────────── */

function EnhancedParticles() {
  return (
    <group>
      <Sparkles
        count={200}
        scale={[18, 12, 18]}
        size={2.5}
        speed={0.3}
        opacity={0.4}
        color="#0d9488"
      />
      <Sparkles
        count={100}
        scale={[14, 10, 14]}
        size={1.2}
        speed={0.2}
        opacity={0.2}
        color="#ffffff"
      />
    </group>
  );
}

/* ── Scene ──────────────────────────────────────────────────────────────── */

function Scene({ scrollRef }: { scrollRef: React.MutableRefObject<number> }) {
  return (
    <>
      {/* HDR Environment for IBL reflections */}
      <Environment preset="city" background={false} />

      {/* Lighting */}
      <ambientLight intensity={0.12} />
      <directionalLight
        position={[10, 15, 8]}
        intensity={1.2}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
        shadow-camera-near={0.5}
        shadow-camera-far={40}
        shadow-bias={-0.0002}
      />
      <pointLight position={[0, 10, 0]} intensity={0.4} color="#0d9488" distance={25} />
      <pointLight position={[-5, 4, -3]} intensity={0.2} color="#4488cc" distance={15} />
      <hemisphereLight args={['#1a1a3e', '#080812', 0.25]} />

      {/* Scroll-driven camera */}
      <ScrollCamera scrollRef={scrollRef} />

      {/* Scene objects */}
      <CityBuilding />
      <SecondaryBuildings />
      <ReflectiveGround />
      <GroundGrid />
      <EnhancedParticles />

      {/* Stars background */}
      <Stars radius={60} depth={50} count={1500} factor={4} saturation={0} fade speed={0.5} />

      {/* Atmospheric fog */}
      <fog attach="fog" args={['#0a0f1a', 15, 45]} />

      {/* Post-processing */}
      <EffectComposer>
        <Bloom
          luminanceThreshold={0.5}
          luminanceSmoothing={0.4}
          intensity={0.8}
        />
        <N8AO
          halfRes
          aoRadius={2}
          intensity={1}
          aoSamples={6}
          denoiseSamples={4}
        />
        <ChromaticAberration
          offset={new THREE.Vector2(0.0005, 0.0005)}
          radialModulation
          modulationOffset={0.5}
        />
        <Vignette offset={0.3} darkness={0.7} />
        <ToneMapping mode={4} />
      </EffectComposer>
    </>
  );
}

/* ── Ready signal ──────────────────────────────────────────────────────── */

function HeroSceneReady({ onReady }: { onReady: () => void }) {
  useEffect(() => {
    const id = requestAnimationFrame(() => onReady());
    return () => cancelAnimationFrame(id);
  }, [onReady]);
  return null;
}

/* ── Export ─────────────────────────────────────────────────────────────── */

export default function HeroScene({ scrollRef }: HeroSceneProps) {
  const [webGLOk, setWebGLOk] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setWebGLOk(isWebGLAvailable());
  }, []);

  const handleReady = useCallback(() => setLoading(false), []);

  if (!webGLOk) return <Fallback />;

  return (
    <WebGLErrorBoundary fallback={<Fallback />}>
      <div className="relative w-full h-full">
        {loading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#0a0f1a]">
            <div className="relative w-14 h-14 mb-4">
              <div className="absolute inset-0 rounded-full border-4 border-teal-500/20" />
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-teal-400 animate-spin" />
              <div className="absolute inset-2 rounded-full border-4 border-transparent border-t-teal-300 animate-spin" style={{ animationDuration: '0.8s', animationDirection: 'reverse' }} />
            </div>
            <p className="text-white text-sm font-medium">Loading 3D Scene...</p>
          </div>
        )}
        <Canvas
          shadows
          gl={{
            antialias: true,
            powerPreference: 'high-performance',
            failIfMajorPerformanceCaveat: false,
          }}
          onCreated={({ gl }) => {
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.0;
            gl.outputColorSpace = THREE.SRGBColorSpace;
          }}
          camera={{ fov: 45, near: 0.1, far: 100, position: [8, 4, 12] }}
          style={{ width: '100%', height: '100%' }}
        >
          <Suspense fallback={null}>
            <Scene scrollRef={scrollRef} />
            <HeroSceneReady onReady={handleReady} />
          </Suspense>
        </Canvas>
      </div>
    </WebGLErrorBoundary>
  );
}
