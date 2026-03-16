'use client';

import { useRef, useState, useCallback, useEffect, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  OrbitControls,
  PointerLockControls,
  Environment,
  ContactShadows,
  Sky,
} from '@react-three/drei';
import {
  EffectComposer,
  Bloom,
  ToneMapping,
  Vignette,
} from '@react-three/postprocessing';
import * as THREE from 'three';
import type {
  ParsedLayout, FloorData, FlatData, RoomData, DoorData, WindowData,
  FurnitureItem, CentralCore, LobbyData, NavigationLevel, NavigationState,
  DesignStyle, StyleMaterialConfig,
} from '@/types';
import { getStyleMaterials } from '@/lib/building-data';
import { isWebGLAvailable, WebGLErrorBoundary } from '@/lib/webgl';

// ── Props ──────────────────────────────────────────────────────────────────

interface ThreeViewerProps {
  layout: ParsedLayout;
  style: DesignStyle;
  selectedFloor: number;
  selectedRoom: RoomData | null;
  cameraMode: 'walkthrough' | 'flythrough' | 'orbit';
  isNightMode: boolean;
  showFurniture: boolean;
  onRoomClick: (room: RoomData) => void;
  navigation: NavigationState;
  onNavigate: (nav: Partial<NavigationState>) => void;
}

// ── Texture helpers ────────────────────────────────────────────────────────

function createCanvasTexture(
  width: number, height: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  repeatX = 1, repeatY = 1,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  draw(ctx, width, height);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = 16;
  return tex;
}

function woodTexture(color: string, rx = 4, ry = 4) {
  return createCanvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, w, h);
    const base = new THREE.Color(color);
    for (let i = 0; i < 60; i++) {
      const y = Math.random() * h;
      const dark = base.clone().offsetHSL(0, 0, -0.05 - Math.random() * 0.08);
      ctx.strokeStyle = `#${dark.getHexString()}`;
      ctx.lineWidth = 0.5 + Math.random() * 1.5;
      ctx.globalAlpha = 0.3 + Math.random() * 0.3;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(w * 0.3, y + (Math.random() - 0.5) * 6, w * 0.7, y + (Math.random() - 0.5) * 6, w, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }, rx, ry);
}

function tileTexture(color: string, rx = 4, ry = 4) {
  return createCanvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, w, h);
    const tileW = w / 2;
    const tileH = h / 2;
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 2;
    for (let r = 0; r <= 2; r++) {
      ctx.beginPath(); ctx.moveTo(0, r * tileH); ctx.lineTo(w, r * tileH); ctx.stroke();
    }
    for (let c = 0; c <= 2; c++) {
      ctx.beginPath(); ctx.moveTo(c * tileW, 0); ctx.lineTo(c * tileW, h); ctx.stroke();
    }
  }, rx, ry);
}

function brickTexture(color: string, rx = 3, ry = 3) {
  return createCanvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#888';
    ctx.fillRect(0, 0, w, h);
    const bw = w / 4; const bh = h / 8;
    const base = new THREE.Color(color);
    for (let row = 0; row < 8; row++) {
      const off = row % 2 === 0 ? 0 : bw / 2;
      for (let col = -1; col < 5; col++) {
        const c = base.clone().offsetHSL(0, (Math.random() - 0.5) * 0.05, (Math.random() - 0.5) * 0.06);
        ctx.fillStyle = `#${c.getHexString()}`;
        ctx.fillRect(col * bw + off + 1, row * bh + 1, bw - 2, bh - 2);
      }
    }
  }, rx, ry);
}

function plasterNormalMap() {
  return createCanvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#8080ff';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 8000; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const v = 118 + Math.random() * 20;
      ctx.fillStyle = `rgb(${v}, ${v}, 255)`;
      ctx.fillRect(x, y, 1 + Math.random(), 1 + Math.random());
    }
  });
}

// ── Material factory hooks ─────────────────────────────────────────────────

function useBuildingMaterials(mat: StyleMaterialConfig) {
  return useMemo(() => {
    const normalMap = plasterNormalMap();

    const wallMat = new THREE.MeshStandardMaterial({
      color: mat.wallColor,
      roughness: 0.85,
      metalness: 0,
      normalMap: mat.wallMaterial === 'brick' ? brickTexture(mat.wallColor) : normalMap,
      normalScale: new THREE.Vector2(0.3, 0.3),
    });

    const exteriorMat = new THREE.MeshStandardMaterial({
      color: mat.exteriorColor,
      roughness: 0.7,
      metalness: 0.05,
      map: mat.wallMaterial === 'brick' ? brickTexture(mat.exteriorColor) : undefined,
    });

    const ceilingMat = new THREE.MeshStandardMaterial({
      color: mat.ceilingColor,
      roughness: 0.9,
      metalness: 0,
    });

    const woodFloorMat = new THREE.MeshStandardMaterial({
      color: mat.woodFloorColor,
      roughness: 0.6,
      metalness: 0.02,
      map: woodTexture(mat.woodFloorColor),
    });

    const tileMat = new THREE.MeshStandardMaterial({
      color: mat.tileColor,
      roughness: 0.35,
      metalness: 0.05,
      map: tileTexture(mat.tileColor),
    });

    const bathroomTileMat = new THREE.MeshStandardMaterial({
      color: mat.bathroomTileColor,
      roughness: 0.2,
      metalness: 0.08,
      map: tileTexture(mat.bathroomTileColor),
    });

    const marbleMat = new THREE.MeshStandardMaterial({
      color: mat.marbleColor,
      roughness: 0.12,
      metalness: 0.1,
      envMapIntensity: 1.8,
    });

    const doorMat = new THREE.MeshStandardMaterial({
      color: mat.doorColor,
      roughness: 0.5,
      metalness: 0.02,
      map: woodTexture(mat.doorColor, 1, 2),
    });

    const baseboardMat = new THREE.MeshStandardMaterial({
      color: mat.baseboardColor,
      roughness: 0.5,
      metalness: 0.02,
    });

    const frameDark = mat.windowFrameColor === 'dark';
    const windowFrameMat = new THREE.MeshStandardMaterial({
      color: frameDark ? '#2a2a2a' : '#e8e4dc',
      roughness: 0.4,
      metalness: frameDark ? 0.6 : 0.1,
    });

    const glassMat = new THREE.MeshStandardMaterial({
      color: '#b8d8f8',
      roughness: 0.05,
      metalness: 0.1,
      transparent: true,
      opacity: 0.3,
      envMapIntensity: 1.5,
    });

    const handleMat = new THREE.MeshStandardMaterial({
      color: mat.handleColor === 'gold' ? '#c9a84c' : '#b0b0b0',
      roughness: 0.2,
      metalness: 0.9,
    });

    const concreteMat = new THREE.MeshStandardMaterial({
      color: '#888',
      roughness: 0.9,
      metalness: 0,
    });

    const grassMat = new THREE.MeshStandardMaterial({
      color: '#4a7a3a',
      roughness: 0.95,
      metalness: 0,
    });

    return {
      wall: wallMat, exterior: exteriorMat, ceiling: ceilingMat,
      woodFloor: woodFloorMat, tile: tileMat, bathroomTile: bathroomTileMat,
      marble: marbleMat, door: doorMat, baseboard: baseboardMat,
      windowFrame: windowFrameMat, glass: glassMat, handle: handleMat,
      concrete: concreteMat, grass: grassMat,
    };
  }, [mat]);
}

function useFurnitureMaterials(mat: StyleMaterialConfig) {
  return useMemo(() => ({
    sofa: new THREE.MeshStandardMaterial({ color: mat.sofaColor, roughness: 0.8, metalness: 0 }),
    bed: new THREE.MeshStandardMaterial({ color: mat.bedColor, roughness: 0.85, metalness: 0 }),
    wood: new THREE.MeshStandardMaterial({
      color: mat.furnitureWoodColor, roughness: 0.55, metalness: 0.02,
      map: woodTexture(mat.furnitureWoodColor, 2, 2),
    }),
    metal: new THREE.MeshStandardMaterial({ color: '#888', roughness: 0.3, metalness: 0.8 }),
    fabric: new THREE.MeshStandardMaterial({ color: '#d8d0c0', roughness: 0.9, metalness: 0 }),
    white: new THREE.MeshStandardMaterial({ color: '#f0f0f0', roughness: 0.7, metalness: 0.05 }),
    counter: new THREE.MeshStandardMaterial({ color: '#e0dcd4', roughness: 0.3, metalness: 0.08 }),
  }), [mat]);
}

// ── Door component with animation ─────────────────────────────────────────

function AnimatedDoor({
  position, rotation, width, height, material, handleMaterial,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  width: number;
  height: number;
  material: THREE.Material;
  handleMaterial: THREE.Material;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const [open, setOpen] = useState(false);
  const targetAngle = useRef(0);
  const currentAngle = useRef(0);

  useEffect(() => { targetAngle.current = open ? -Math.PI / 2 : 0; }, [open]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    currentAngle.current = THREE.MathUtils.lerp(currentAngle.current, targetAngle.current, delta * 4);
    groupRef.current.rotation.y = currentAngle.current;
  });

  return (
    <group position={position} rotation={rotation}>
      <group ref={groupRef}>
        {/* Door panel — pivot at left edge */}
        <mesh
          position={[width / 2, height / 2, 0]}
          material={material}
          onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
         
        >
          <boxGeometry args={[width, height, 0.045]} />
        </mesh>
        {/* Handle */}
        <mesh position={[width * 0.85, height * 0.45, 0.035]} material={handleMaterial}>
          <boxGeometry args={[0.02, 0.12, 0.06]} />
        </mesh>
        <mesh position={[width * 0.85, height * 0.45, -0.035]} material={handleMaterial}>
          <boxGeometry args={[0.02, 0.12, 0.06]} />
        </mesh>
      </group>
      {/* Door frame */}
      <mesh position={[-0.03, height / 2, 0]} castShadow>
        <boxGeometry args={[0.06, height + 0.06, 0.1]} />
        <meshStandardMaterial color="#555" roughness={0.5} metalness={0.3} />
      </mesh>
      <mesh position={[width + 0.03, height / 2, 0]} castShadow>
        <boxGeometry args={[0.06, height + 0.06, 0.1]} />
        <meshStandardMaterial color="#555" roughness={0.5} metalness={0.3} />
      </mesh>
      <mesh position={[width / 2, height + 0.03, 0]} castShadow>
        <boxGeometry args={[width + 0.12, 0.06, 0.1]} />
        <meshStandardMaterial color="#555" roughness={0.5} metalness={0.3} />
      </mesh>
    </group>
  );
}

// ── Window component ───────────────────────────────────────────────────────

function WindowUnit({
  position, rotation, width, height, sillHeight,
  frameMaterial, glassMaterial,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  width: number;
  height: number;
  sillHeight: number;
  frameMaterial: THREE.Material;
  glassMaterial: THREE.Material;
}) {
  const frameT = 0.04;
  return (
    <group position={position} rotation={rotation}>
      {/* Glass */}
      <mesh position={[0, sillHeight + height / 2, 0]} material={glassMaterial}>
        <boxGeometry args={[width - frameT * 2, height - frameT * 2, 0.02]} />
      </mesh>
      {/* Frame – top */}
      <mesh position={[0, sillHeight + height, 0]} material={frameMaterial} castShadow>
        <boxGeometry args={[width, frameT, 0.06]} />
      </mesh>
      {/* Frame – bottom (sill) */}
      <mesh position={[0, sillHeight, 0]} material={frameMaterial} castShadow>
        <boxGeometry args={[width + 0.08, frameT * 1.5, 0.08]} />
      </mesh>
      {/* Frame – left */}
      <mesh position={[-width / 2, sillHeight + height / 2, 0]} material={frameMaterial} castShadow>
        <boxGeometry args={[frameT, height, 0.06]} />
      </mesh>
      {/* Frame – right */}
      <mesh position={[width / 2, sillHeight + height / 2, 0]} material={frameMaterial} castShadow>
        <boxGeometry args={[frameT, height, 0.06]} />
      </mesh>
      {/* Middle divider */}
      <mesh position={[0, sillHeight + height / 2, 0]} material={frameMaterial}>
        <boxGeometry args={[frameT * 0.6, height, 0.04]} />
      </mesh>
    </group>
  );
}

// ── Furniture components ───────────────────────────────────────────────────

function SofaModel({ materials }: { materials: ReturnType<typeof useFurnitureMaterials> }) {
  return (
    <group>
      {/* Base */}
      <mesh position={[0, 0.2, 0]} material={materials.sofa} castShadow>
        <boxGeometry args={[2, 0.4, 0.9]} />
      </mesh>
      {/* Back */}
      <mesh position={[0, 0.55, -0.35]} material={materials.sofa} castShadow>
        <boxGeometry args={[2, 0.5, 0.2]} />
      </mesh>
      {/* Left arm */}
      <mesh position={[-0.9, 0.4, 0]} material={materials.sofa} castShadow>
        <boxGeometry args={[0.2, 0.4, 0.9]} />
      </mesh>
      {/* Right arm */}
      <mesh position={[0.9, 0.4, 0]} material={materials.sofa} castShadow>
        <boxGeometry args={[0.2, 0.4, 0.9]} />
      </mesh>
      {/* Cushions */}
      {[-0.45, 0.45].map((x, i) => (
        <mesh key={i} position={[x, 0.45, 0.05]} material={materials.sofa} castShadow>
          <boxGeometry args={[0.8, 0.12, 0.7]} />
        </mesh>
      ))}
      {/* Legs */}
      {[[-0.85, -0.35], [-0.85, 0.35], [0.85, -0.35], [0.85, 0.35]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.03, z]} material={materials.metal}>
          <cylinderGeometry args={[0.02, 0.02, 0.06, 8]} />
        </mesh>
      ))}
    </group>
  );
}

function BedModel({ materials, scale }: { materials: ReturnType<typeof useFurnitureMaterials>; scale: number }) {
  return (
    <group scale={scale}>
      {/* Frame */}
      <mesh position={[0, 0.2, 0]} material={materials.wood} castShadow>
        <boxGeometry args={[1.6, 0.25, 2.1]} />
      </mesh>
      {/* Mattress */}
      <mesh position={[0, 0.4, 0.05]} material={materials.bed} castShadow>
        <boxGeometry args={[1.5, 0.18, 2]} />
      </mesh>
      {/* Headboard */}
      <mesh position={[0, 0.65, -1]} material={materials.wood} castShadow>
        <boxGeometry args={[1.6, 0.7, 0.08]} />
      </mesh>
      {/* Pillows */}
      {[-0.35, 0.35].map((x, i) => (
        <mesh key={i} position={[x, 0.55, -0.7]} material={materials.fabric} castShadow>
          <boxGeometry args={[0.5, 0.12, 0.35]} />
        </mesh>
      ))}
      {/* Blanket */}
      <mesh position={[0, 0.52, 0.45]} material={materials.bed} castShadow>
        <boxGeometry args={[1.5, 0.06, 1]} />
      </mesh>
    </group>
  );
}

function TableModel({ materials }: { materials: ReturnType<typeof useFurnitureMaterials> }) {
  return (
    <group>
      {/* Top */}
      <mesh position={[0, 0.74, 0]} material={materials.wood} castShadow receiveShadow>
        <boxGeometry args={[1.2, 0.04, 0.7]} />
      </mesh>
      {/* Legs */}
      {[[-0.5, -0.28], [-0.5, 0.28], [0.5, -0.28], [0.5, 0.28]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.36, z]} material={materials.wood} castShadow>
          <boxGeometry args={[0.05, 0.72, 0.05]} />
        </mesh>
      ))}
    </group>
  );
}

function ChairModel({ materials }: { materials: ReturnType<typeof useFurnitureMaterials> }) {
  return (
    <group>
      {/* Seat */}
      <mesh position={[0, 0.44, 0]} material={materials.wood} castShadow>
        <boxGeometry args={[0.45, 0.04, 0.45]} />
      </mesh>
      {/* Back */}
      <mesh position={[0, 0.74, -0.2]} material={materials.wood} castShadow>
        <boxGeometry args={[0.4, 0.56, 0.03]} />
      </mesh>
      {/* Legs */}
      {[[-0.18, -0.18], [-0.18, 0.18], [0.18, -0.18], [0.18, 0.18]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.22, z]} material={materials.wood} castShadow>
          <cylinderGeometry args={[0.015, 0.015, 0.44, 8]} />
        </mesh>
      ))}
    </group>
  );
}

function DeskModel({ materials }: { materials: ReturnType<typeof useFurnitureMaterials> }) {
  return (
    <group>
      {/* Top */}
      <mesh position={[0, 0.74, 0]} material={materials.wood} castShadow>
        <boxGeometry args={[1.2, 0.04, 0.6]} />
      </mesh>
      {/* Left panel */}
      <mesh position={[-0.55, 0.37, 0]} material={materials.wood} castShadow>
        <boxGeometry args={[0.04, 0.74, 0.58]} />
      </mesh>
      {/* Right panel */}
      <mesh position={[0.55, 0.37, 0]} material={materials.wood} castShadow>
        <boxGeometry args={[0.04, 0.74, 0.58]} />
      </mesh>
      {/* Drawer */}
      <mesh position={[0.3, 0.6, 0]} material={materials.wood} castShadow>
        <boxGeometry args={[0.5, 0.15, 0.55]} />
      </mesh>
      <mesh position={[0.3, 0.6, 0.28]} material={materials.metal}>
        <boxGeometry args={[0.1, 0.03, 0.02]} />
      </mesh>
    </group>
  );
}

function WardrobeModel({ materials }: { materials: ReturnType<typeof useFurnitureMaterials> }) {
  return (
    <group>
      {/* Main body */}
      <mesh position={[0, 1, 0]} material={materials.wood} castShadow>
        <boxGeometry args={[1.4, 2, 0.6]} />
      </mesh>
      {/* Door line */}
      <mesh position={[0, 1, 0.305]} material={materials.metal}>
        <boxGeometry args={[0.01, 1.9, 0.01]} />
      </mesh>
      {/* Handles */}
      <mesh position={[-0.08, 1, 0.31]} material={materials.metal}>
        <boxGeometry args={[0.02, 0.15, 0.03]} />
      </mesh>
      <mesh position={[0.08, 1, 0.31]} material={materials.metal}>
        <boxGeometry args={[0.02, 0.15, 0.03]} />
      </mesh>
    </group>
  );
}

function NightstandModel({ materials }: { materials: ReturnType<typeof useFurnitureMaterials> }) {
  return (
    <group>
      <mesh position={[0, 0.3, 0]} material={materials.wood} castShadow>
        <boxGeometry args={[0.5, 0.6, 0.4]} />
      </mesh>
      {/* Drawer */}
      <mesh position={[0, 0.35, 0.205]} material={materials.metal}>
        <boxGeometry args={[0.08, 0.03, 0.02]} />
      </mesh>
    </group>
  );
}

function KitchenCounterModel({ materials }: { materials: ReturnType<typeof useFurnitureMaterials> }) {
  return (
    <group>
      {/* Counter top */}
      <mesh position={[0, 0.88, 0]} material={materials.counter} castShadow>
        <boxGeometry args={[2, 0.04, 0.65]} />
      </mesh>
      {/* Base cabinets */}
      <mesh position={[0, 0.43, 0]} material={materials.wood} castShadow>
        <boxGeometry args={[2, 0.86, 0.6]} />
      </mesh>
      {/* Sink */}
      <mesh position={[0.4, 0.89, 0]} material={materials.metal}>
        <boxGeometry args={[0.5, 0.02, 0.4]} />
      </mesh>
      {/* Faucet */}
      <mesh position={[0.4, 1.05, -0.2]} material={materials.metal}>
        <cylinderGeometry args={[0.015, 0.015, 0.3, 8]} />
      </mesh>
      <mesh position={[0.4, 1.15, -0.1]} material={materials.metal} rotation={[Math.PI / 4, 0, 0]}>
        <cylinderGeometry args={[0.01, 0.01, 0.2, 8]} />
      </mesh>
    </group>
  );
}

function FridgeModel({ materials }: { materials: ReturnType<typeof useFurnitureMaterials> }) {
  return (
    <group>
      <mesh position={[0, 0.9, 0]} material={materials.white} castShadow>
        <boxGeometry args={[0.75, 1.8, 0.7]} />
      </mesh>
      {/* Handle */}
      <mesh position={[0.32, 1.2, 0.36]} material={materials.metal}>
        <boxGeometry args={[0.03, 0.4, 0.03]} />
      </mesh>
      <mesh position={[0.32, 0.45, 0.36]} material={materials.metal}>
        <boxGeometry args={[0.03, 0.3, 0.03]} />
      </mesh>
      {/* Door line */}
      <mesh position={[0, 0.65, 0.355]} material={materials.metal}>
        <boxGeometry args={[0.72, 0.01, 0.01]} />
      </mesh>
    </group>
  );
}

function ShelfModel({ materials }: { materials: ReturnType<typeof useFurnitureMaterials> }) {
  return (
    <group>
      {/* TV Unit */}
      <mesh position={[0, 0.3, 0]} material={materials.wood} castShadow>
        <boxGeometry args={[1.8, 0.5, 0.45]} />
      </mesh>
      {/* TV Screen */}
      <mesh position={[0, 0.9, -0.15]}>
        <boxGeometry args={[1.2, 0.7, 0.04]} />
        <meshStandardMaterial color="#111" roughness={0.1} metalness={0.5} />
      </mesh>
    </group>
  );
}

function ToiletModel({ materials }: { materials: ReturnType<typeof useFurnitureMaterials> }) {
  return (
    <group>
      {/* Bowl */}
      <mesh position={[0, 0.2, 0]} material={materials.white} castShadow>
        <boxGeometry args={[0.4, 0.4, 0.55]} />
      </mesh>
      {/* Tank */}
      <mesh position={[0, 0.45, -0.2]} material={materials.white} castShadow>
        <boxGeometry args={[0.35, 0.35, 0.2]} />
      </mesh>
      {/* Flush */}
      <mesh position={[0, 0.65, -0.2]} material={materials.metal}>
        <cylinderGeometry args={[0.03, 0.03, 0.02, 12]} />
      </mesh>
    </group>
  );
}

function VanityModel({ materials }: { materials: ReturnType<typeof useFurnitureMaterials> }) {
  return (
    <group>
      {/* Cabinet */}
      <mesh position={[0, 0.4, 0]} material={materials.wood} castShadow>
        <boxGeometry args={[0.8, 0.8, 0.5]} />
      </mesh>
      {/* Basin */}
      <mesh position={[0, 0.82, 0]} material={materials.white}>
        <boxGeometry args={[0.6, 0.04, 0.4]} />
      </mesh>
      {/* Mirror */}
      <mesh position={[0, 1.4, -0.24]}>
        <boxGeometry args={[0.55, 0.7, 0.02]} />
        <meshPhysicalMaterial color="#ddd" roughness={0.05} metalness={0.9} />
      </mesh>
    </group>
  );
}

function ShowerModel({ materials }: { materials: ReturnType<typeof useFurnitureMaterials> }) {
  return (
    <group>
      {/* Tray */}
      <mesh position={[0, 0.03, 0]} material={materials.white} castShadow>
        <boxGeometry args={[0.9, 0.06, 0.9]} />
      </mesh>
      {/* Glass panel */}
      <mesh position={[0.45, 1, 0]}>
        <boxGeometry args={[0.02, 2, 0.88]} />
        <meshPhysicalMaterial color="#cce8ff" roughness={0.05} transmission={0.85} transparent opacity={0.25} />
      </mesh>
      {/* Shower head pipe */}
      <mesh position={[-0.35, 1.8, -0.35]} material={materials.metal}>
        <cylinderGeometry args={[0.015, 0.015, 0.8, 8]} />
      </mesh>
      {/* Shower head */}
      <mesh position={[-0.35, 2.15, -0.25]} material={materials.metal} rotation={[0.4, 0, 0]}>
        <cylinderGeometry args={[0.06, 0.04, 0.04, 12]} />
      </mesh>
    </group>
  );
}

function LampModel({ materials }: { materials: ReturnType<typeof useFurnitureMaterials> }) {
  return (
    <group>
      {/* Pole */}
      <mesh position={[0, 0.7, 0]} material={materials.metal}>
        <cylinderGeometry args={[0.015, 0.02, 1.4, 8]} />
      </mesh>
      {/* Base */}
      <mesh position={[0, 0.01, 0]} material={materials.metal}>
        <cylinderGeometry args={[0.15, 0.15, 0.02, 16]} />
      </mesh>
      {/* Shade */}
      <mesh position={[0, 1.45, 0]}>
        <cylinderGeometry args={[0.1, 0.18, 0.25, 16]} />
        <meshStandardMaterial color="#f5ecd7" roughness={0.9} metalness={0} emissive="#f5ecd7" emissiveIntensity={0.3} />
      </mesh>
      {/* Point light */}
      <pointLight position={[0, 1.35, 0]} intensity={0.5} distance={4} color="#ffe8c0" />
    </group>
  );
}

// ── Furniture dispatcher ───────────────────────────────────────────────────

function FurnitureDispatcher({
  item, furnitureMaterials,
}: {
  item: FurnitureItem;
  furnitureMaterials: ReturnType<typeof useFurnitureMaterials>;
}) {
  const scale = Math.min(item.scaleX, item.scaleY, item.scaleZ);
  return (
    <group
      position={[item.x, item.y, item.z]}
      rotation={[0, item.rotationY, 0]}
      scale={[item.scaleX, item.scaleY, item.scaleZ]}
    >
      {item.type === 'sofa' && <SofaModel materials={furnitureMaterials} />}
      {item.type === 'bed' && <BedModel materials={furnitureMaterials} scale={scale} />}
      {item.type === 'table' && <TableModel materials={furnitureMaterials} />}
      {item.type === 'chair' && <ChairModel materials={furnitureMaterials} />}
      {item.type === 'desk' && <DeskModel materials={furnitureMaterials} />}
      {item.type === 'wardrobe' && <WardrobeModel materials={furnitureMaterials} />}
      {item.type === 'nightstand' && <NightstandModel materials={furnitureMaterials} />}
      {item.type === 'counter' && <KitchenCounterModel materials={furnitureMaterials} />}
      {item.type === 'fridge' && <FridgeModel materials={furnitureMaterials} />}
      {item.type === 'shelf' && <ShelfModel materials={furnitureMaterials} />}
      {item.type === 'toilet' && <ToiletModel materials={furnitureMaterials} />}
      {item.type === 'vanity' && <VanityModel materials={furnitureMaterials} />}
      {item.type === 'shower' && <ShowerModel materials={furnitureMaterials} />}
      {item.type === 'lamp' && <LampModel materials={furnitureMaterials} />}
    </group>
  );
}

// ── Room component ─────────────────────────────────────────────────────────

function RoomComponent({
  room, offsetX, offsetZ, floorY, materials, furnitureMaterials, showFurniture, onClick,
}: {
  room: RoomData;
  offsetX: number;
  offsetZ: number;
  floorY: number;
  materials: ReturnType<typeof useBuildingMaterials>;
  furnitureMaterials: ReturnType<typeof useFurnitureMaterials>;
  showFurniture: boolean;
  onClick: () => void;
}) {
  const rx = offsetX + room.x;
  const rz = offsetZ + room.y;
  const w = room.width;
  const d = room.depth;
  const h = room.height;
  const wallT = 0.1;

  const isWet = room.type === 'bathroom' || room.type === 'kitchen';
  const isBalcony = room.type === 'balcony';
  const floorMat = isWet ? (room.type === 'bathroom' ? materials.bathroomTile : materials.tile) : materials.woodFloor;

  return (
    <group position={[rx, floorY, rz]}>
      {/* Floor */}
      <mesh
        position={[w / 2, 0.001, d / 2]}
        rotation={[-Math.PI / 2, 0, 0]}
        material={floorMat}
        receiveShadow
        onClick={(e) => { e.stopPropagation(); onClick(); }}
      >
        <planeGeometry args={[w, d]} />
      </mesh>

      {/* Ceiling */}
      {!isBalcony && (
        <mesh position={[w / 2, h, d / 2]} rotation={[Math.PI / 2, 0, 0]} material={materials.ceiling}>
          <planeGeometry args={[w, d]} />
        </mesh>
      )}

      {/* Walls – 4 sides with door/window cutouts approximated by solid walls */}
      {/* South wall (y=0 side) */}
      <mesh position={[w / 2, h / 2, 0]} material={materials.wall} castShadow receiveShadow>
        <boxGeometry args={[w, h, wallT]} />
      </mesh>
      {/* North wall */}
      <mesh position={[w / 2, h / 2, d]} material={materials.wall} castShadow receiveShadow>
        <boxGeometry args={[w, h, wallT]} />
      </mesh>
      {/* West wall */}
      <mesh position={[0, h / 2, d / 2]} material={materials.wall} castShadow receiveShadow>
        <boxGeometry args={[wallT, h, d]} />
      </mesh>
      {/* East wall */}
      <mesh position={[w, h / 2, d / 2]} material={materials.wall} castShadow receiveShadow>
        <boxGeometry args={[wallT, h, d]} />
      </mesh>

      {/* Baseboard on all 4 walls */}
      {[
        [w / 2, 0.04, wallT / 2 + 0.001, w, 0.08, 0.01, 0] as const,
        [w / 2, 0.04, d - wallT / 2 - 0.001, w, 0.08, 0.01, 0] as const,
        [wallT / 2 + 0.001, 0.04, d / 2, 0.01, 0.08, d, 0] as const,
        [w - wallT / 2 - 0.001, 0.04, d / 2, 0.01, 0.08, d, 0] as const,
      ].map(([px, py, pz, bw, bh, bd], i) => (
        <mesh key={`bb-${i}`} position={[px, py, pz]} material={materials.baseboard}>
          <boxGeometry args={[bw, bh, bd]} />
        </mesh>
      ))}

      {/* Doors */}
      {room.doors.map((door, di) => {
        const dp = doorWorldPos(door, w, d);
        return (
          <AnimatedDoor
            key={`door-${di}`}
            position={[dp.x, 0, dp.z]}
            rotation={[0, dp.ry, 0]}
            width={door.width}
            height={door.height}
            material={materials.door}
            handleMaterial={materials.handle}
          />
        );
      })}

      {/* Windows */}
      {room.windows.map((win, wi) => {
        const wp = windowWorldPos(win, w, d);
        return (
          <WindowUnit
            key={`win-${wi}`}
            position={[wp.x, 0, wp.z]}
            rotation={[0, wp.ry, 0]}
            width={win.width}
            height={win.height}
            sillHeight={win.sillHeight}
            frameMaterial={materials.windowFrame}
            glassMaterial={materials.glass}
          />
        );
      })}

      {/* Room light */}
      <pointLight
        position={[w / 2, h - 0.2, d / 2]}
        intensity={0.8}
        distance={Math.max(w, d) * 2}
        color="#fff5e0"
        castShadow
      />
      {/* Secondary fill light for larger rooms */}
      {w * d > 10 && (
        <pointLight
          position={[w * 0.25, h - 0.3, d * 0.75]}
          intensity={0.3}
          distance={Math.max(w, d) * 1.2}
          color="#ffe8c0"
        />
      )}

      {/* Furniture */}
      {showFurniture && room.furniture.map((item, fi) => (
        <FurnitureDispatcher key={`furn-${fi}`} item={item} furnitureMaterials={furnitureMaterials} />
      ))}
    </group>
  );
}

// ── Flat component ─────────────────────────────────────────────────────────

function FlatComponent({
  flat, floorY, materials, furnitureMaterials, showFurniture, onRoomClick,
}: {
  flat: FlatData;
  floorY: number;
  materials: ReturnType<typeof useBuildingMaterials>;
  furnitureMaterials: ReturnType<typeof useFurnitureMaterials>;
  showFurniture: boolean;
  onRoomClick: (room: RoomData) => void;
}) {
  return (
    <group>
      {flat.rooms.map((room) => (
        <RoomComponent
          key={room.id}
          room={room}
          offsetX={flat.offsetX}
          offsetZ={flat.offsetZ}
          floorY={floorY}
          materials={materials}
          furnitureMaterials={furnitureMaterials}
          showFurniture={showFurniture}
          onClick={() => onRoomClick(room)}
        />
      ))}
      {/* Flat entry door */}
      {(() => {
        const ed = flat.entryDoor;
        const dp = {
          x: ed.wall === 'east' ? flat.width : ed.wall === 'west' ? 0 : ed.x - flat.offsetX,
          z: ed.y - flat.offsetZ,
          ry: ed.wall === 'east' ? 0 : ed.wall === 'west' ? Math.PI : ed.wall === 'north' ? Math.PI / 2 : -Math.PI / 2,
        };
        return (
          <AnimatedDoor
            position={[flat.offsetX + dp.x, floorY, flat.offsetZ + dp.z]}
            rotation={[0, dp.ry, 0]}
            width={ed.width}
            height={ed.height}
            material={materials.door}
            handleMaterial={materials.handle}
          />
        );
      })()}
    </group>
  );
}

// ── Floor slab + core ──────────────────────────────────────────────────────

function FloorSlabAndCore({
  floor, floorY, buildingWidth, buildingDepth, floorHeight, materials,
}: {
  floor: FloorData;
  floorY: number;
  buildingWidth: number;
  buildingDepth: number;
  floorHeight: number;
  materials: ReturnType<typeof useBuildingMaterials>;
}) {
  const core = floor.core;
  // Generate stair steps
  const stairSteps = useMemo(() => {
    const steps: { x: number; y: number; z: number; w: number; h: number; d: number }[] = [];
    const stepCount = 16;
    const stepH = floorHeight / stepCount;
    const stepD = core.stairwell.depth / stepCount;
    const stepW = core.stairwell.width - 0.2;
    for (let i = 0; i < stepCount; i++) {
      steps.push({
        x: core.stairwell.x + core.stairwell.width / 2,
        y: floorY + stepH * i + stepH / 2,
        z: core.stairwell.z + 0.1 + stepD * i + stepD / 2,
        w: stepW,
        h: stepH,
        d: stepD,
      });
    }
    return steps;
  }, [core.stairwell, floorY, floorHeight]);

  return (
    <group>
      {/* Floor slab */}
      <mesh
        position={[buildingWidth / 2, floorY - 0.1, buildingDepth / 2]}
        material={materials.concrete}
        receiveShadow
      >
        <boxGeometry args={[buildingWidth + 0.5, 0.2, buildingDepth + 0.5]} />
      </mesh>

      {/* Core corridor floor */}
      <mesh
        position={[core.corridor.x + core.corridor.width / 2, floorY + 0.002, core.corridor.z + core.corridor.depth / 2]}
        rotation={[-Math.PI / 2, 0, 0]}
        material={materials.marble}
        receiveShadow
      >
        <planeGeometry args={[core.corridor.width, core.corridor.depth]} />
      </mesh>

      {/* Lift shafts — hollow with visible interior walls and doors on both sides */}
      {core.lifts.map((lift) => (
        <group key={lift.id}>
          {/* Left wall */}
          <mesh position={[lift.x, floorY + floorHeight / 2, lift.z + lift.depth / 2]}>
            <boxGeometry args={[0.1, floorHeight, lift.depth]} />
            <meshStandardMaterial color="#555" roughness={0.3} metalness={0.6} />
          </mesh>
          {/* Right wall */}
          <mesh position={[lift.x + lift.width, floorY + floorHeight / 2, lift.z + lift.depth / 2]}>
            <boxGeometry args={[0.1, floorHeight, lift.depth]} />
            <meshStandardMaterial color="#555" roughness={0.3} metalness={0.6} />
          </mesh>
          {/* Back wall */}
          <mesh position={[lift.x + lift.width / 2, floorY + floorHeight / 2, lift.z + lift.depth]}>
            <boxGeometry args={[lift.width, floorHeight, 0.1]} />
            <meshStandardMaterial color="#666" roughness={0.3} metalness={0.5} />
          </mesh>
          {/* Lift floor */}
          <mesh position={[lift.x + lift.width / 2, floorY + 0.02, lift.z + lift.depth / 2]}>
            <boxGeometry args={[lift.width - 0.1, 0.04, lift.depth - 0.1]} />
            <meshStandardMaterial color="#444" roughness={0.2} metalness={0.5} />
          </mesh>
          {/* Front lift doors (corridor-facing) — metallic sliding doors */}
          <mesh position={[lift.x + lift.width / 2, floorY + 1.1, lift.z - 0.01]}>
            <boxGeometry args={[0.9, 2.2, 0.04]} />
            <meshStandardMaterial color="#999" roughness={0.15} metalness={0.85} />
          </mesh>
          {/* Door frame */}
          <mesh position={[lift.x + lift.width / 2, floorY + 1.15, lift.z - 0.02]}>
            <boxGeometry args={[1.1, 2.35, 0.02]} />
            <meshStandardMaterial color="#666" roughness={0.3} metalness={0.7} />
          </mesh>
          {/* Door center line */}
          <mesh position={[lift.x + lift.width / 2, floorY + 1.1, lift.z + 0.005]}>
            <boxGeometry args={[0.01, 2.1, 0.01]} />
            <meshStandardMaterial color="#333" roughness={0.2} metalness={0.9} />
          </mesh>
          {/* Floor indicator above door */}
          <mesh position={[lift.x + lift.width / 2, floorY + 2.35, lift.z - 0.02]}>
            <boxGeometry args={[0.25, 0.12, 0.02]} />
            <meshStandardMaterial color="#222" roughness={0.1} metalness={0.5} emissive="#0f3" emissiveIntensity={0.3} />
          </mesh>
          {/* Interior light */}
          <pointLight position={[lift.x + lift.width / 2, floorY + floorHeight - 0.3, lift.z + lift.depth / 2]} intensity={0.4} distance={3} color="#fff5e0" />
        </group>
      ))}

      {/* Stairwell — actual steps instead of solid block */}
      <group>
        {/* Stairwell side walls */}
        <mesh position={[core.stairwell.x, floorY + floorHeight / 2, core.stairwell.z + core.stairwell.depth / 2]} material={materials.concrete}>
          <boxGeometry args={[0.1, floorHeight, core.stairwell.depth]} />
        </mesh>
        <mesh position={[core.stairwell.x + core.stairwell.width, floorY + floorHeight / 2, core.stairwell.z + core.stairwell.depth / 2]} material={materials.concrete}>
          <boxGeometry args={[0.1, floorHeight, core.stairwell.depth]} />
        </mesh>
        {/* Back wall */}
        <mesh position={[core.stairwell.x + core.stairwell.width / 2, floorY + floorHeight / 2, core.stairwell.z + core.stairwell.depth]} material={materials.concrete}>
          <boxGeometry args={[core.stairwell.width, floorHeight, 0.1]} />
        </mesh>
        {/* Individual stair steps */}
        {stairSteps.map((step, si) => (
          <mesh key={`step-${si}`} position={[step.x, step.y, step.z]} material={materials.concrete} castShadow>
            <boxGeometry args={[step.w, step.h, step.d * 0.9]} />
          </mesh>
        ))}
        {/* Handrail */}
        <mesh position={[core.stairwell.x + 0.15, floorY + floorHeight * 0.55, core.stairwell.z + core.stairwell.depth / 2]}>
          <boxGeometry args={[0.04, 0.04, core.stairwell.depth - 0.2]} />
          <meshStandardMaterial color="#666" roughness={0.3} metalness={0.7} />
        </mesh>
        {/* Handrail posts */}
        {[0.2, 0.4, 0.6, 0.8].map((t, pi) => (
          <mesh key={`post-${pi}`} position={[core.stairwell.x + 0.15, floorY + floorHeight * t, core.stairwell.z + core.stairwell.depth * t]}>
            <cylinderGeometry args={[0.02, 0.02, 0.6, 6]} />
            <meshStandardMaterial color="#666" roughness={0.3} metalness={0.7} />
          </mesh>
        ))}
        {/* Stairwell light */}
        <pointLight position={[core.stairwell.x + core.stairwell.width / 2, floorY + floorHeight - 0.3, core.stairwell.z + core.stairwell.depth / 2]} intensity={0.5} distance={5} color="#fff5e0" />
      </group>

      {/* Corridor walls */}
      <mesh
        position={[core.corridor.x, floorY + floorHeight / 2, core.corridor.z + core.corridor.depth / 2]}
        material={materials.wall}
      >
        <boxGeometry args={[0.12, floorHeight, core.corridor.depth]} />
      </mesh>
      <mesh
        position={[core.corridor.x + core.corridor.width, floorY + floorHeight / 2, core.corridor.z + core.corridor.depth / 2]}
        material={materials.wall}
      >
        <boxGeometry args={[0.12, floorHeight, core.corridor.depth]} />
      </mesh>

      {/* Corridor end walls (north and south) */}
      <mesh position={[core.corridor.x + core.corridor.width / 2, floorY + floorHeight / 2, core.corridor.z]} material={materials.wall}>
        <boxGeometry args={[core.corridor.width, floorHeight, 0.12]} />
      </mesh>
      <mesh position={[core.corridor.x + core.corridor.width / 2, floorY + floorHeight / 2, core.corridor.z + core.corridor.depth]} material={materials.wall}>
        <boxGeometry args={[core.corridor.width, floorHeight, 0.12]} />
      </mesh>

      {/* Corridor ceiling */}
      <mesh position={[core.corridor.x + core.corridor.width / 2, floorY + floorHeight - 0.01, core.corridor.z + core.corridor.depth / 2]} material={materials.ceiling}>
        <boxGeometry args={[core.corridor.width, 0.02, core.corridor.depth]} />
      </mesh>

      {/* Corridor ceiling lights (multiple for even illumination) */}
      {[0.25, 0.5, 0.75].map((t, i) => (
        <pointLight
          key={`corr-light-${i}`}
          position={[core.corridor.x + core.corridor.width / 2, floorY + floorHeight - 0.3, core.corridor.z + core.corridor.depth * t]}
          intensity={0.6}
          distance={6}
          color="#fff5e0"
          castShadow={i === 1}
        />
      ))}
    </group>
  );
}

// ── Exterior facade ────────────────────────────────────────────────────────

function ExteriorFacade({
  layout, materials, navigation,
}: {
  layout: ParsedLayout;
  materials: ReturnType<typeof useBuildingMaterials>;
  navigation: NavigationState;
}) {
  // Always render exterior facade so the building shell is visible as context at all levels

  const { buildingWidth: bw, buildingDepth: bd, floorHeight: fh, floors } = layout;
  const totalH = floors.length * fh;
  const wallT = 0.2;

  return (
    <group>
      {/* 4 exterior walls */}
      {/* South */}
      <mesh position={[bw / 2, totalH / 2, -wallT / 2]} material={materials.exterior} castShadow receiveShadow>
        <boxGeometry args={[bw + wallT * 2, totalH, wallT]} />
      </mesh>
      {/* North */}
      <mesh position={[bw / 2, totalH / 2, bd + wallT / 2]} material={materials.exterior} castShadow receiveShadow>
        <boxGeometry args={[bw + wallT * 2, totalH, wallT]} />
      </mesh>
      {/* West */}
      <mesh position={[-wallT / 2, totalH / 2, bd / 2]} material={materials.exterior} castShadow receiveShadow>
        <boxGeometry args={[wallT, totalH, bd + wallT * 2]} />
      </mesh>
      {/* East */}
      <mesh position={[bw + wallT / 2, totalH / 2, bd / 2]} material={materials.exterior} castShadow receiveShadow>
        <boxGeometry args={[wallT, totalH, bd + wallT * 2]} />
      </mesh>

      {/* Roof slab */}
      <mesh position={[bw / 2, totalH + 0.1, bd / 2]} material={materials.concrete} castShadow>
        <boxGeometry args={[bw + 1, 0.3, bd + 1]} />
      </mesh>

      {/* Floor demarcation lines (horizontal bands between floors) */}
      {floors.map((_, fi) => {
        const fy = fi * fh;
        return (
          <group key={`floor-line-${fi}`}>
            {/* South band */}
            <mesh position={[bw / 2, fy + 0.02, -wallT / 2 - 0.01]}>
              <boxGeometry args={[bw + wallT * 2, 0.06, 0.01]} />
              <meshStandardMaterial color="#888" roughness={0.3} metalness={0.4} />
            </mesh>
            {/* North band */}
            <mesh position={[bw / 2, fy + 0.02, bd + wallT / 2 + 0.01]}>
              <boxGeometry args={[bw + wallT * 2, 0.06, 0.01]} />
              <meshStandardMaterial color="#888" roughness={0.3} metalness={0.4} />
            </mesh>
            {/* West band */}
            <mesh position={[-wallT / 2 - 0.01, fy + 0.02, bd / 2]}>
              <boxGeometry args={[0.01, 0.06, bd + wallT * 2]} />
              <meshStandardMaterial color="#888" roughness={0.3} metalness={0.4} />
            </mesh>
            {/* East band */}
            <mesh position={[bw + wallT / 2 + 0.01, fy + 0.02, bd / 2]}>
              <boxGeometry args={[0.01, 0.06, bd + wallT * 2]} />
              <meshStandardMaterial color="#888" roughness={0.3} metalness={0.4} />
            </mesh>
          </group>
        );
      })}

      {/* Entrance canopy */}
      <mesh position={[bw / 2, 3.5, -1.5]} material={materials.concrete} castShadow>
        <boxGeometry args={[5, 0.15, 3]} />
      </mesh>

      {/* Entrance pillars */}
      {[-2, 2].map((xOff, i) => (
        <mesh key={`pillar-${i}`} position={[bw / 2 + xOff, 1.75, -2.8]} castShadow>
          <cylinderGeometry args={[0.12, 0.12, 3.5, 12]} />
          <meshStandardMaterial color="#c0b8a8" roughness={0.4} metalness={0.2} />
        </mesh>
      ))}

      {/* Entrance accent light */}
      <pointLight position={[bw / 2, 3.3, -1.5]} intensity={1} color="#fff5e0" distance={8} />

      {/* Window rows on south/north facades */}
      {floors.map((floor, fi) => {
        const fy = fi * fh;
        const windowPositions = [3, 7, 11, 15, 19];
        return windowPositions.map((wx, wi) => (
          <group key={`ext-win-s-${fi}-${wi}`}>
            {/* South facade windows */}
            {wx < bw && (
              <WindowUnit
                position={[wx, fy, -wallT - 0.01]}
                rotation={[0, 0, 0]}
                width={1.4}
                height={1.5}
                sillHeight={0.9}
                frameMaterial={materials.windowFrame}
                glassMaterial={materials.glass}
              />
            )}
            {/* North facade windows */}
            {wx < bw && (
              <WindowUnit
                position={[wx, fy, bd + wallT + 0.01]}
                rotation={[0, Math.PI, 0]}
                width={1.4}
                height={1.5}
                sillHeight={0.9}
                frameMaterial={materials.windowFrame}
                glassMaterial={materials.glass}
              />
            )}
          </group>
        ));
      })}

      {/* Balcony rails on exterior */}
      {floors.map((floor, fi) => {
        const fy = fi * fh;
        return floor.flats.map((flat) => {
          const balcony = flat.rooms.find((r) => r.type === 'balcony');
          if (!balcony) return null;
          const bx = flat.offsetX + balcony.x;
          const bz = flat.offsetZ + balcony.y + balcony.depth;
          return (
            <group key={`balc-${fi}-${flat.id}`} position={[bx, fy, bz]}>
              {/* Balcony slab */}
              <mesh position={[balcony.width / 2, 0, 0.5]} material={materials.concrete} castShadow>
                <boxGeometry args={[balcony.width, 0.15, 1.5]} />
              </mesh>
              {/* Railing */}
              <mesh position={[balcony.width / 2, 0.55, 1.2]}>
                <boxGeometry args={[balcony.width, 0.04, 0.04]} />
                <meshStandardMaterial color="#555" roughness={0.3} metalness={0.7} />
              </mesh>
              {/* Railing posts */}
              {Array.from({ length: Math.ceil(balcony.width / 0.5) + 1 }, (_, pi) => (
                <mesh key={pi} position={[pi * 0.5, 0.3, 1.2]}>
                  <cylinderGeometry args={[0.015, 0.015, 0.6, 6]} />
                  <meshStandardMaterial color="#555" roughness={0.3} metalness={0.7} />
                </mesh>
              ))}
            </group>
          );
        });
      })}
    </group>
  );
}

// ── Chandelier component for premium lobby ─────────────────────────────────

function ChandelierModel({ height }: { height: number }) {
  return (
    <group>
      {/* Central rod */}
      <mesh position={[0, height - 0.3, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.6, 8]} />
        <meshStandardMaterial color="#c9a84c" roughness={0.2} metalness={0.9} />
      </mesh>
      {/* Top canopy */}
      <mesh position={[0, height, 0]}>
        <cylinderGeometry args={[0.15, 0.08, 0.06, 12]} />
        <meshStandardMaterial color="#c9a84c" roughness={0.2} metalness={0.9} />
      </mesh>
      {/* Main ring */}
      <mesh position={[0, height - 0.6, 0]}>
        <torusGeometry args={[0.5, 0.03, 8, 24]} />
        <meshStandardMaterial color="#c9a84c" roughness={0.15} metalness={0.95} />
      </mesh>
      {/* Inner ring */}
      <mesh position={[0, height - 0.5, 0]}>
        <torusGeometry args={[0.3, 0.02, 8, 20]} />
        <meshStandardMaterial color="#c9a84c" roughness={0.15} metalness={0.95} />
      </mesh>
      {/* Crystal drops around outer ring */}
      {Array.from({ length: 12 }, (_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        return (
          <group key={`crystal-${i}`} position={[Math.cos(angle) * 0.5, height - 0.7, Math.sin(angle) * 0.5]}>
            <mesh>
              <boxGeometry args={[0.02, 0.12, 0.02]} />
              <meshPhysicalMaterial color="#f0e8d8" roughness={0.02} metalness={0.1} transmission={0.5} transparent opacity={0.7} />
            </mesh>
          </group>
        );
      })}
      {/* Crystal drops around inner ring */}
      {Array.from({ length: 8 }, (_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        return (
          <group key={`crystal-inner-${i}`} position={[Math.cos(angle) * 0.3, height - 0.6, Math.sin(angle) * 0.3]}>
            <mesh>
              <boxGeometry args={[0.015, 0.08, 0.015]} />
              <meshPhysicalMaterial color="#f0e8d8" roughness={0.02} metalness={0.1} transmission={0.5} transparent opacity={0.7} />
            </mesh>
          </group>
        );
      })}
      {/* Warm light */}
      <pointLight position={[0, height - 0.7, 0]} intensity={1.5} distance={10} color="#ffe8c0" castShadow />
      <pointLight position={[0, height - 0.4, 0]} intensity={0.8} distance={6} color="#fff0d0" />
    </group>
  );
}

// ── Potted plant decorative component ──────────────────────────────────────

function PottedPlant({ scale = 1 }: { scale?: number }) {
  return (
    <group scale={scale}>
      {/* Pot */}
      <mesh position={[0, 0.2, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.14, 0.4, 12]} />
        <meshStandardMaterial color="#6a4a2a" roughness={0.7} metalness={0.05} />
      </mesh>
      {/* Pot rim */}
      <mesh position={[0, 0.41, 0]}>
        <cylinderGeometry args={[0.2, 0.18, 0.04, 12]} />
        <meshStandardMaterial color="#6a4a2a" roughness={0.6} metalness={0.05} />
      </mesh>
      {/* Soil */}
      <mesh position={[0, 0.39, 0]}>
        <cylinderGeometry args={[0.16, 0.16, 0.02, 12]} />
        <meshStandardMaterial color="#3a2a1a" roughness={0.95} />
      </mesh>
      {/* Trunk */}
      <mesh position={[0, 0.7, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.04, 0.6, 6]} />
        <meshStandardMaterial color="#5a3a1a" roughness={0.9} />
      </mesh>
      {/* Foliage spheres */}
      {[[0, 1.1, 0], [0.12, 0.95, 0.1], [-0.1, 1.0, -0.08], [0.08, 1.05, -0.1]].map(([x, y, z], i) => (
        <mesh key={`leaf-${i}`} position={[x, y, z]} castShadow>
          <sphereGeometry args={[0.18 + i * 0.02, 8, 8]} />
          <meshStandardMaterial color={i % 2 === 0 ? '#2a6a2a' : '#3a7a3a'} roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

// ── Side table for lobby ──────────────────────────────────────────────────

function SideTableModel({ materials }: { materials: ReturnType<typeof useFurnitureMaterials> }) {
  return (
    <group>
      {/* Top */}
      <mesh position={[0, 0.55, 0]} material={materials.wood} castShadow>
        <cylinderGeometry args={[0.3, 0.3, 0.03, 16]} />
      </mesh>
      {/* Central leg */}
      <mesh position={[0, 0.27, 0]} material={materials.metal}>
        <cylinderGeometry args={[0.03, 0.03, 0.55, 8]} />
      </mesh>
      {/* Base */}
      <mesh position={[0, 0.01, 0]} material={materials.metal}>
        <cylinderGeometry args={[0.2, 0.2, 0.02, 16]} />
      </mesh>
    </group>
  );
}

// ── Lobby component ────────────────────────────────────────────────────────

function LobbyComponent({
  lobby, materials, furnitureMaterials,
}: {
  lobby: LobbyData;
  materials: ReturnType<typeof useBuildingMaterials>;
  furnitureMaterials: ReturnType<typeof useFurnitureMaterials>;
}) {
  const h = lobby.height;
  const lw = lobby.width;
  const ld = lobby.depth;
  const wallT = 0.2;
  return (
    <group>
      {/* Lobby floor – marble */}
      <mesh position={[lw / 2, 0.001, ld / 2]} rotation={[-Math.PI / 2, 0, 0]} material={materials.marble} receiveShadow>
        <planeGeometry args={[lw, ld]} />
      </mesh>

      {/* ── Premium marble floor inlay pattern ── */}
      {/* Center circular motif */}
      <mesh position={[lw / 2, 0.004, ld * 0.3]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <ringGeometry args={[1.5, 2, 32]} />
        <meshStandardMaterial color="#c9a84c" roughness={0.2} metalness={0.6} />
      </mesh>
      <mesh position={[lw / 2, 0.005, ld * 0.3]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[1.5, 32]} />
        <meshStandardMaterial color="#e8dcc4" roughness={0.1} metalness={0.15} />
      </mesh>
      {/* Border strips along floor edges */}
      <mesh position={[lw / 2, 0.003, 0.3]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[lw - 1, 0.08]} />
        <meshStandardMaterial color="#c9a84c" roughness={0.2} metalness={0.5} />
      </mesh>
      <mesh position={[lw / 2, 0.003, ld - 0.3]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[lw - 1, 0.08]} />
        <meshStandardMaterial color="#c9a84c" roughness={0.2} metalness={0.5} />
      </mesh>

      {/* Lobby ceiling */}
      <mesh position={[lw / 2, h, ld / 2]} rotation={[Math.PI / 2, 0, 0]} material={materials.ceiling}>
        <planeGeometry args={[lw, ld]} />
      </mesh>

      {/* ── Ceiling decorative molding / coffer ── */}
      {/* Ceiling border molding */}
      {[[lw / 2, h - 0.01, 0.15, lw - 0.3, 0.06, 0.3],
        [lw / 2, h - 0.01, ld - 0.15, lw - 0.3, 0.06, 0.3],
        [0.15, h - 0.01, ld / 2, 0.3, 0.06, ld - 0.3],
        [lw - 0.15, h - 0.01, ld / 2, 0.3, 0.06, ld - 0.3],
      ].map(([x, y, z, w, hh, d], i) => (
        <mesh key={`mold-${i}`} position={[x, y, z]} castShadow>
          <boxGeometry args={[w, hh, d]} />
          <meshStandardMaterial color="#e8e0d0" roughness={0.5} metalness={0.15} />
        </mesh>
      ))}

      {/* ── Lobby walls ── */}
      {/* South wall (entrance side) — with opening for entrance doors */}
      <mesh position={[lw * 0.25, h / 2, -wallT / 2]} material={materials.exterior} castShadow>
        <boxGeometry args={[lw * 0.4, h, wallT]} />
      </mesh>
      <mesh position={[lw * 0.75, h / 2, -wallT / 2]} material={materials.exterior} castShadow>
        <boxGeometry args={[lw * 0.4, h, wallT]} />
      </mesh>
      {/* Above entrance */}
      <mesh position={[lw / 2, h * 0.85, -wallT / 2]} material={materials.exterior}>
        <boxGeometry args={[lw * 0.25, h * 0.3, wallT]} />
      </mesh>
      {/* North wall */}
      <mesh position={[lw / 2, h / 2, ld + wallT / 2]} material={materials.exterior} castShadow>
        <boxGeometry args={[lw + wallT * 2, h, wallT]} />
      </mesh>
      {/* West wall */}
      <mesh position={[-wallT / 2, h / 2, ld / 2]} material={materials.exterior} castShadow>
        <boxGeometry args={[wallT, h, ld + wallT * 2]} />
      </mesh>
      {/* East wall */}
      <mesh position={[lw + wallT / 2, h / 2, ld / 2]} material={materials.exterior} castShadow>
        <boxGeometry args={[wallT, h, ld + wallT * 2]} />
      </mesh>

      {/* ── Wall wainscoting / dado rail (lower wall panels) ── */}
      {/* West wall wainscoting */}
      <mesh position={[0.01, 0.5, ld / 2]}>
        <boxGeometry args={[0.02, 1, ld - 1]} />
        <meshStandardMaterial color="#d8ceb8" roughness={0.5} metalness={0.1} />
      </mesh>
      {/* East wall wainscoting */}
      <mesh position={[lw - 0.01, 0.5, ld / 2]}>
        <boxGeometry args={[0.02, 1, ld - 1]} />
        <meshStandardMaterial color="#d8ceb8" roughness={0.5} metalness={0.1} />
      </mesh>
      {/* North wall wainscoting */}
      <mesh position={[lw / 2, 0.5, ld - 0.01]}>
        <boxGeometry args={[lw - 1, 1, 0.02]} />
        <meshStandardMaterial color="#d8ceb8" roughness={0.5} metalness={0.1} />
      </mesh>

      {/* ── Lobby lift shafts ── */}
      {lobby.lifts.map((lift, li) => (
        <group key={`lobby-lift-${li}`}>
          {/* Lift shaft walls */}
          <mesh position={[lift.x, h / 2, lift.z + lift.depth / 2]}>
            <boxGeometry args={[0.1, h, lift.depth]} />
            <meshStandardMaterial color="#555" roughness={0.3} metalness={0.6} />
          </mesh>
          <mesh position={[lift.x + lift.width, h / 2, lift.z + lift.depth / 2]}>
            <boxGeometry args={[0.1, h, lift.depth]} />
            <meshStandardMaterial color="#555" roughness={0.3} metalness={0.6} />
          </mesh>
          <mesh position={[lift.x + lift.width / 2, h / 2, lift.z + lift.depth]}>
            <boxGeometry args={[lift.width, h, 0.1]} />
            <meshStandardMaterial color="#666" roughness={0.3} metalness={0.5} />
          </mesh>
          {/* Lift doors in lobby — polished gold-tinted metallic */}
          <mesh position={[lift.x + lift.width / 2, 1.1, lift.z - 0.01]}>
            <boxGeometry args={[0.9, 2.2, 0.04]} />
            <meshStandardMaterial color="#b8a878" roughness={0.1} metalness={0.9} />
          </mesh>
          {/* Door frame — ornate dark */}
          <mesh position={[lift.x + lift.width / 2, 1.15, lift.z - 0.02]}>
            <boxGeometry args={[1.1, 2.35, 0.02]} />
            <meshStandardMaterial color="#4a3a2a" roughness={0.3} metalness={0.7} />
          </mesh>
          {/* Door center line */}
          <mesh position={[lift.x + lift.width / 2, 1.1, lift.z + 0.005]}>
            <boxGeometry args={[0.01, 2.1, 0.01]} />
            <meshStandardMaterial color="#333" roughness={0.2} metalness={0.9} />
          </mesh>
          {/* Floor indicator — glowing green */}
          <mesh position={[lift.x + lift.width / 2, 2.35, lift.z - 0.02]}>
            <boxGeometry args={[0.25, 0.12, 0.02]} />
            <meshStandardMaterial color="#222" roughness={0.1} metalness={0.5} emissive="#0f3" emissiveIntensity={0.3} />
          </mesh>
          {/* Decorative arch above lift door */}
          <mesh position={[lift.x + lift.width / 2, 2.55, lift.z - 0.025]}>
            <boxGeometry args={[1.2, 0.08, 0.02]} />
            <meshStandardMaterial color="#c9a84c" roughness={0.2} metalness={0.8} />
          </mesh>
        </group>
      ))}

      {/* ── Stairwell entrance in lobby ── */}
      <group>
        {/* Stairwell walls visible from lobby */}
        <mesh position={[12, h / 2, 7.5 + 2.5]}>
          <boxGeometry args={[0.1, h, 5]} />
          <meshStandardMaterial color="#777" roughness={0.7} metalness={0.1} />
        </mesh>
        <mesh position={[14, h / 2, 7.5 + 2.5]}>
          <boxGeometry args={[0.1, h, 5]} />
          <meshStandardMaterial color="#777" roughness={0.7} metalness={0.1} />
        </mesh>
        {/* Stairwell entry opening frame — ornate */}
        <mesh position={[13, 2.3, 7.45]}>
          <boxGeometry args={[1.8, 0.1, 0.1]} />
          <meshStandardMaterial color="#4a3a2a" roughness={0.4} metalness={0.3} />
        </mesh>
        {/* First few visible steps — marble */}
        {Array.from({ length: 6 }, (_, i) => (
          <mesh key={`lobby-step-${i}`} position={[13, 0.1 + i * 0.18, 7.8 + i * 0.3]} material={materials.marble} castShadow>
            <boxGeometry args={[1.6, 0.18, 0.28]} />
          </mesh>
        ))}
        {/* STAIRS sign — premium dark green with gold text */}
        <mesh position={[13, 2.0, 7.42]}>
          <boxGeometry args={[1.0, 0.3, 0.02]} />
          <meshStandardMaterial color="#1a3a0a" roughness={0.3} metalness={0.2} />
        </mesh>
        {/* Stairwell handrail */}
        <mesh position={[12.2, 0.7, 8.5]}>
          <boxGeometry args={[0.04, 0.04, 2]} />
          <meshStandardMaterial color="#c9a84c" roughness={0.2} metalness={0.8} />
        </mesh>
      </group>

      {/* ── Central corridor between flat clusters ── */}
      {/* Gold-bordered corridor floor strip */}
      <mesh position={[lw / 2, 0.003, ld / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[4, ld - 2]} />
        <meshStandardMaterial color="#d8d0c0" roughness={0.4} metalness={0.05} />
      </mesh>
      {/* Corridor gold border lines */}
      <mesh position={[lw / 2 - 2, 0.004, ld / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.04, ld - 2]} />
        <meshStandardMaterial color="#c9a84c" roughness={0.2} metalness={0.5} />
      </mesh>
      <mesh position={[lw / 2 + 2, 0.004, ld / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.04, ld - 2]} />
        <meshStandardMaterial color="#c9a84c" roughness={0.2} metalness={0.5} />
      </mesh>

      {/* ── Reception desk — premium design ── */}
      <group position={[lobby.receptionDesk.x, 0, lobby.receptionDesk.z]}>
        {/* Main desk body — dark wood */}
        <mesh position={[lobby.receptionDesk.width / 2, 0.55, 0]} material={furnitureMaterials.wood} castShadow>
          <boxGeometry args={[lobby.receptionDesk.width, 1.1, lobby.receptionDesk.depth]} />
        </mesh>
        {/* Counter top — thick marble slab */}
        <mesh position={[lobby.receptionDesk.width / 2, 1.12, 0]} material={materials.marble} castShadow>
          <boxGeometry args={[lobby.receptionDesk.width + 0.15, 0.06, lobby.receptionDesk.depth + 0.15]} />
        </mesh>
        {/* Gold accent strip on front */}
        <mesh position={[lobby.receptionDesk.width / 2, 0.9, -lobby.receptionDesk.depth / 2 - 0.01]}>
          <boxGeometry args={[lobby.receptionDesk.width + 0.05, 0.04, 0.01]} />
          <meshStandardMaterial color="#c9a84c" roughness={0.15} metalness={0.9} />
        </mesh>
        {/* Desktop flower vase */}
        <mesh position={[0.5, 1.2, 0]}>
          <cylinderGeometry args={[0.06, 0.08, 0.15, 12]} />
          <meshStandardMaterial color="#f0e8d0" roughness={0.15} metalness={0.3} />
        </mesh>
        {/* Flowers */}
        {[-0.03, 0, 0.03].map((ox, i) => (
          <mesh key={`flower-${i}`} position={[0.5 + ox, 1.35, ox * 2]}>
            <sphereGeometry args={[0.03, 6, 6]} />
            <meshStandardMaterial color={['#c43a3a', '#e86060', '#d85050'][i]} roughness={0.8} />
          </mesh>
        ))}
        {/* Monitor/laptop on desk */}
        <mesh position={[1.5, 1.2, 0.1]}>
          <boxGeometry args={[0.5, 0.35, 0.02]} />
          <meshStandardMaterial color="#222" roughness={0.1} metalness={0.4} />
        </mesh>
        <mesh position={[1.5, 1.03, 0.2]}>
          <boxGeometry args={[0.3, 0.02, 0.2]} />
          <meshStandardMaterial color="#555" roughness={0.3} metalness={0.5} />
        </mesh>
      </group>

      {/* ── Chandeliers — premium royal lighting ── */}
      <group position={[lw * 0.25, 0, ld * 0.3]}>
        <ChandelierModel height={h} />
      </group>
      <group position={[lw * 0.75, 0, ld * 0.3]}>
        <ChandelierModel height={h} />
      </group>
      <group position={[lw / 2, 0, ld * 0.6]}>
        <ChandelierModel height={h} />
      </group>

      {/* Lobby ambient lighting — warm and distributed */}
      <pointLight position={[lw * 0.25, h - 0.5, ld * 0.3]} intensity={0.6} distance={12} color="#fff5e0" castShadow />
      <pointLight position={[lw * 0.75, h - 0.5, ld * 0.3]} intensity={0.6} distance={12} color="#fff5e0" />
      <pointLight position={[lw * 0.25, h - 0.5, ld * 0.7]} intensity={0.6} distance={12} color="#fff5e0" />
      <pointLight position={[lw * 0.75, h - 0.5, ld * 0.7]} intensity={0.6} distance={12} color="#fff5e0" />
      <pointLight position={[lw / 2, h - 0.5, ld / 2]} intensity={0.8} distance={15} color="#fff5e0" castShadow />

      {/* ── Wall sconce lights ── */}
      {[[0.08, 2.5, ld * 0.25], [0.08, 2.5, ld * 0.5], [0.08, 2.5, ld * 0.75],
        [lw - 0.08, 2.5, ld * 0.25], [lw - 0.08, 2.5, ld * 0.5], [lw - 0.08, 2.5, ld * 0.75],
      ].map(([x, y, z], i) => (
        <group key={`sconce-${i}`} position={[x, y, z]}>
          {/* Sconce body */}
          <mesh>
            <boxGeometry args={[0.06, 0.2, 0.08]} />
            <meshStandardMaterial color="#c9a84c" roughness={0.2} metalness={0.85} />
          </mesh>
          {/* Shade */}
          <mesh position={[x < lw / 2 ? 0.06 : -0.06, 0.05, 0]}>
            <boxGeometry args={[0.08, 0.15, 0.06]} />
            <meshStandardMaterial color="#f5ecd7" roughness={0.8} emissive="#f5ecd7" emissiveIntensity={0.4} />
          </mesh>
          <pointLight position={[x < lw / 2 ? 0.15 : -0.15, 0, 0]} intensity={0.3} distance={4} color="#ffe8c0" />
        </group>
      ))}

      {/* Entrance doors */}
      {lobby.entranceDoors.map((door, di) => (
        <AnimatedDoor
          key={`lobby-door-${di}`}
          position={[door.x, 0, -0.2]}
          rotation={[0, 0, 0]}
          width={door.width}
          height={door.height}
          material={materials.glass}
          handleMaterial={materials.handle}
        />
      ))}

      {/* ══════════════════════════════════════════════════════════════════════
         ── LEFT SEATING ZONE — Premium L-shaped arrangement ──
         ══════════════════════════════════════════════════════════════════════ */}
      {/* Main sofa — facing right */}
      <group position={[2.5, 0, 3.5]}>
        <SofaModel materials={furnitureMaterials} />
      </group>
      {/* Second sofa facing first — creating conversation zone */}
      <group position={[2.5, 0, 6]} rotation={[0, Math.PI, 0]}>
        <SofaModel materials={furnitureMaterials} />
      </group>
      {/* Coffee table between sofas */}
      <group position={[2.5, 0, 4.8]}>
        <TableModel materials={furnitureMaterials} />
      </group>
      {/* Side table with lamp */}
      <group position={[1, 0, 3.2]}>
        <SideTableModel materials={furnitureMaterials} />
      </group>
      <group position={[1, 0, 3.2]}>
        <LampModel materials={furnitureMaterials} />
      </group>
      {/* Accent chair */}
      <group position={[4.5, 0, 4.8]} rotation={[0, -Math.PI / 2, 0]}>
        <ChairModel materials={furnitureMaterials} />
      </group>

      {/* ══════════════════════════════════════════════════════════════════════
         ── RIGHT SEATING ZONE — Mirror arrangement ──
         ══════════════════════════════════════════════════════════════════════ */}
      {/* Main sofa */}
      <group position={[lw - 2.5, 0, 3.5]} rotation={[0, Math.PI, 0]}>
        <SofaModel materials={furnitureMaterials} />
      </group>
      {/* Second sofa facing first */}
      <group position={[lw - 2.5, 0, 6]}>
        <SofaModel materials={furnitureMaterials} />
      </group>
      {/* Coffee table between sofas */}
      <group position={[lw - 2.5, 0, 4.8]}>
        <TableModel materials={furnitureMaterials} />
      </group>
      {/* Side table with lamp */}
      <group position={[lw - 1, 0, 3.2]}>
        <SideTableModel materials={furnitureMaterials} />
      </group>
      <group position={[lw - 1, 0, 3.2]}>
        <LampModel materials={furnitureMaterials} />
      </group>
      {/* Accent chair */}
      <group position={[lw - 4.5, 0, 4.8]} rotation={[0, Math.PI / 2, 0]}>
        <ChairModel materials={furnitureMaterials} />
      </group>

      {/* ══════════════════════════════════════════════════════════════════════
         ── BACK SEATING AREA — near lift/stairs area ──
         ══════════════════════════════════════════════════════════════════════ */}
      {/* Bench/sofa near lift area */}
      <group position={[8, 0, 8]} rotation={[0, Math.PI / 2, 0]}>
        <SofaModel materials={furnitureMaterials} />
      </group>
      {/* Small table */}
      <group position={[8, 0, 10]}>
        <SideTableModel materials={furnitureMaterials} />
      </group>

      {/* ══════════════════════════════════════════════════════════════════════
         ── DECORATIVE ELEMENTS ──
         ══════════════════════════════════════════════════════════════════════ */}
      {/* Potted plants — strategically placed */}
      <group position={[1, 0, 1]}><PottedPlant scale={1.2} /></group>
      <group position={[lw - 1, 0, 1]}><PottedPlant scale={1.2} /></group>
      <group position={[1, 0, ld - 1]}><PottedPlant /></group>
      <group position={[lw - 1, 0, ld - 1]}><PottedPlant /></group>
      {/* Plants flanking entrance */}
      <group position={[lw / 2 - 2.5, 0, 0.5]}><PottedPlant scale={1.5} /></group>
      <group position={[lw / 2 + 2.5, 0, 0.5]}><PottedPlant scale={1.5} /></group>
      {/* Plants near lifts */}
      <group position={[8.5, 0, 7]}><PottedPlant /></group>
      <group position={[15, 0, 7]}><PottedPlant /></group>

      {/* ── Decorative columns — premium marble finish ── */}
      {[3, lw - 3].map((cx, ci) => (
        <group key={`col-${ci}`}>
          {[ld * 0.2, ld * 0.5, ld * 0.8].map((cz, czi) => (
            <group key={`col-${ci}-${czi}`} position={[cx, 0, cz]}>
              {/* Column body */}
              <mesh position={[0, h / 2, 0]} castShadow>
                <cylinderGeometry args={[0.15, 0.17, h - 0.2, 16]} />
                <meshStandardMaterial color="#e0d8c8" roughness={0.3} metalness={0.2} />
              </mesh>
              {/* Column base — ornate */}
              <mesh position={[0, 0.1, 0]}>
                <cylinderGeometry args={[0.22, 0.22, 0.2, 16]} />
                <meshStandardMaterial color="#d0c8b8" roughness={0.3} metalness={0.15} />
              </mesh>
              {/* Column capital — ornate */}
              <mesh position={[0, h - 0.1, 0]}>
                <cylinderGeometry args={[0.22, 0.15, 0.2, 16]} />
                <meshStandardMaterial color="#d0c8b8" roughness={0.3} metalness={0.15} />
              </mesh>
              {/* Gold ring at top */}
              <mesh position={[0, h - 0.22, 0]}>
                <torusGeometry args={[0.16, 0.01, 8, 16]} />
                <meshStandardMaterial color="#c9a84c" roughness={0.2} metalness={0.85} />
              </mesh>
            </group>
          ))}
        </group>
      ))}

      {/* ── Large decorative mirror on north wall ── */}
      <mesh position={[lw / 2, h * 0.5, ld - 0.01]}>
        <boxGeometry args={[3, 2, 0.02]} />
        <meshPhysicalMaterial color="#ddd" roughness={0.02} metalness={0.95} />
      </mesh>
      {/* Mirror frame — gold */}
      {[
        [lw / 2, h * 0.5 + 1.02, ld - 0.015, 3.1, 0.06, 0.04],
        [lw / 2, h * 0.5 - 1.02, ld - 0.015, 3.1, 0.06, 0.04],
        [lw / 2 - 1.52, h * 0.5, ld - 0.015, 0.06, 2.1, 0.04],
        [lw / 2 + 1.52, h * 0.5, ld - 0.015, 0.06, 2.1, 0.04],
      ].map(([x, y, z, fw, fh, fd], i) => (
        <mesh key={`mirror-frame-${i}`} position={[x, y, z]}>
          <boxGeometry args={[fw, fh, fd]} />
          <meshStandardMaterial color="#c9a84c" roughness={0.2} metalness={0.85} />
        </mesh>
      ))}

      {/* ── Welcome mat / rug area near entrance ── */}
      <mesh position={[lw / 2, 0.006, 1.5]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[4, 2.5]} />
        <meshStandardMaterial color="#3a1a1a" roughness={0.95} metalness={0} />
      </mesh>
      {/* Rug border */}
      <mesh position={[lw / 2, 0.007, 1.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.8, 2, 4]} />
        <meshStandardMaterial color="#c9a84c" roughness={0.5} metalness={0.3} />
      </mesh>
    </group>
  );
}

// ── Landscape ──────────────────────────────────────────────────────────────

function Landscape({ buildingWidth, buildingDepth, materials }: {
  buildingWidth: number;
  buildingDepth: number;
  materials: ReturnType<typeof useBuildingMaterials>;
}) {
  return (
    <group>
      {/* Ground plane */}
      <mesh position={[buildingWidth / 2, -0.01, buildingDepth / 2]} rotation={[-Math.PI / 2, 0, 0]} material={materials.grass} receiveShadow>
        <planeGeometry args={[buildingWidth + 40, buildingDepth + 40]} />
      </mesh>

      {/* Entrance plaza */}
      <mesh position={[buildingWidth / 2, 0.005, -3]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[8, 8]} />
        <meshStandardMaterial color="#8a8070" roughness={0.4} metalness={0.2} />
      </mesh>

      {/* Trees */}
      {[
        [-4, 0, -3], [-4, 0, 8], [-4, 0, buildingDepth + 3],
        [buildingWidth + 4, 0, -3], [buildingWidth + 4, 0, 8], [buildingWidth + 4, 0, buildingDepth + 3],
      ].map(([x, y, z], i) => (
        <group key={`tree-${i}`} position={[x, y, z]}>
          {/* Trunk */}
          <mesh position={[0, 1.5, 0]} castShadow>
            <cylinderGeometry args={[0.15, 0.2, 3, 8]} />
            <meshStandardMaterial color="#5a3a1a" roughness={0.9} />
          </mesh>
          {/* Canopy */}
          <mesh position={[0, 4, 0]} castShadow>
            <sphereGeometry args={[1.8, 12, 12]} />
            <meshStandardMaterial color="#3a6a2a" roughness={0.95} />
          </mesh>
        </group>
      ))}

      {/* Hedges along sides */}
      {[-3, buildingDepth + 3].map((z, i) => (
        <mesh key={`hedge-${i}`} position={[buildingWidth / 2, 0.4, z]} castShadow>
          <boxGeometry args={[buildingWidth + 2, 0.8, 0.6]} />
          <meshStandardMaterial color="#2a5a1a" roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
}

// ── Camera controller (stable, pre-allocated objects) ─────────────────────

function CameraController({
  cameraMode, navigation, layout,
}: {
  cameraMode: 'walkthrough' | 'flythrough' | 'orbit';
  navigation: NavigationState;
  layout: ParsedLayout;
}) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const moveState = useRef({ forward: false, backward: false, left: false, right: false });
  // Pre-allocate reusable THREE objects to avoid GC pressure and jitter
  const smoothVelocity = useRef(new THREE.Vector3());
  const inputVelocity = useRef(new THREE.Vector3());
  const dirVec = useRef(new THREE.Vector3());
  const rightVec = useRef(new THREE.Vector3());
  const targetPos = useRef(new THREE.Vector3(11, 25, -20));
  const targetLookAt = useRef(new THREE.Vector3());
  const isTransitioning = useRef(false);
  // Pre-allocated for smooth lookAt (avoids camera.clone() per frame)
  const targetQuaternion = useRef(new THREE.Quaternion());
  const lookMatrix = useRef(new THREE.Matrix4());
  const upVec = useRef(new THREE.Vector3(0, 1, 0));

  // First-person controls (WASD)
  useEffect(() => {
    if (cameraMode !== 'walkthrough') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyW') moveState.current.forward = true;
      if (e.code === 'KeyS') moveState.current.backward = true;
      if (e.code === 'KeyA') moveState.current.left = true;
      if (e.code === 'KeyD') moveState.current.right = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyW') moveState.current.forward = false;
      if (e.code === 'KeyS') moveState.current.backward = false;
      if (e.code === 'KeyA') moveState.current.left = false;
      if (e.code === 'KeyD') moveState.current.right = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [cameraMode]);

  useFrame((_, rawDelta) => {
    // Clamp delta to prevent large jumps on lag frames
    const delta = Math.min(rawDelta, 0.05);

    if (cameraMode === 'walkthrough') {
      const speed = 5;
      const damping = 0.85; // velocity decay for smooth movement
      camera.getWorldDirection(dirVec.current);
      dirVec.current.y = 0;
      dirVec.current.normalize();
      rightVec.current.crossVectors(dirVec.current, camera.up).normalize();

      inputVelocity.current.set(0, 0, 0);
      if (moveState.current.forward) inputVelocity.current.add(dirVec.current);
      if (moveState.current.backward) inputVelocity.current.sub(dirVec.current);
      if (moveState.current.left) inputVelocity.current.sub(rightVec.current);
      if (moveState.current.right) inputVelocity.current.add(rightVec.current);

      if (inputVelocity.current.length() > 0) {
        inputVelocity.current.normalize().multiplyScalar(speed * delta);
      }
      // Smooth velocity with damping to prevent jerky movement
      smoothVelocity.current.lerp(inputVelocity.current, 1 - Math.pow(1 - damping, delta * 60));

      if (smoothVelocity.current.length() > 0.0001) {
        camera.position.add(smoothVelocity.current);
      }
      return;
    }

    // Smooth camera transition for orbit/flythrough modes
    if (!isTransitioning.current) return;

    const lerpFactor = 1 - Math.exp(-3 * delta);
    camera.position.lerp(targetPos.current, lerpFactor);

    // Smooth lookAt via quaternion slerp — NO camera.clone(), use pre-allocated matrix
    lookMatrix.current.lookAt(camera.position, targetLookAt.current, upVec.current);
    targetQuaternion.current.setFromRotationMatrix(lookMatrix.current);
    camera.quaternion.slerp(targetQuaternion.current, lerpFactor);

    if (camera.position.distanceTo(targetPos.current) < 0.05) {
      isTransitioning.current = false;
    }
  });

  // Set camera target based on navigation level (smooth transition)
  useEffect(() => {
    const bw = layout.buildingWidth;
    const bd = layout.buildingDepth;
    const cx = bw / 2;
    const cz = bd / 2;
    const totalH = layout.floors.length * layout.floorHeight;

    if (navigation.level === 'exterior') {
      targetPos.current.set(cx + 15, totalH * 0.5, -18);
      targetLookAt.current.set(cx, totalH * 0.35, cz);
    } else if (navigation.level === 'lobby') {
      targetPos.current.set(cx, 1.7, 2);
      targetLookAt.current.set(cx, 1.5, cz * 0.6);
    } else if (navigation.level === 'floor' && navigation.floorIndex !== null) {
      const fy = navigation.floorIndex * layout.floorHeight;
      // Elevated oblique view — see all 4 flats, corridor, lifts, and stairs
      targetPos.current.set(cx + 12, fy + 18, cz - 14);
      targetLookAt.current.set(cx, fy + 1, cz);
    } else if (navigation.level === 'flat' && navigation.floorIndex !== null && navigation.flatId) {
      const floor = layout.floors[navigation.floorIndex];
      const flat = floor?.flats.find((f) => f.id === navigation.flatId);
      if (flat) {
        const fy = navigation.floorIndex * layout.floorHeight;
        targetPos.current.set(flat.offsetX + flat.width / 2, fy + 1.7, flat.offsetZ + 1.5);
        targetLookAt.current.set(flat.offsetX + flat.width / 2, fy + 1.5, flat.offsetZ + flat.depth / 2);
      }
    } else if (navigation.level === 'room' && navigation.floorIndex !== null && navigation.flatId && navigation.roomId) {
      const floor = layout.floors[navigation.floorIndex];
      const flat = floor?.flats.find((f) => f.id === navigation.flatId);
      const room = flat?.rooms.find((r) => r.id === navigation.roomId);
      if (flat && room) {
        const fy = navigation.floorIndex * layout.floorHeight;
        const rx = flat.offsetX + room.x + room.width / 2;
        const rz = flat.offsetZ + room.y + room.depth / 2;
        targetPos.current.set(rx - room.width * 0.3, fy + 1.7, rz - room.depth * 0.3);
        targetLookAt.current.set(rx + room.width * 0.2, fy + 1.4, rz + room.depth * 0.2);
      }
    }
    isTransitioning.current = true;
  }, [navigation, layout]);

  if (cameraMode === 'walkthrough') {
    return <PointerLockControls />;
  }
  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.12}
      minDistance={3}
      maxDistance={80}
      maxPolarAngle={Math.PI * 0.48}
      rotateSpeed={0.6}
    />
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function doorWorldPos(door: DoorData, roomW: number, roomD: number) {
  switch (door.wall) {
    case 'south': return { x: door.x, z: 0, ry: 0 };
    case 'north': return { x: door.x, z: roomD, ry: Math.PI };
    case 'west': return { x: 0, z: door.y, ry: Math.PI / 2 };
    case 'east': return { x: roomW, z: door.y, ry: -Math.PI / 2 };
  }
}

function windowWorldPos(win: WindowData, roomW: number, roomD: number) {
  switch (win.wall) {
    case 'south': return { x: win.x, z: 0, ry: 0 };
    case 'north': return { x: win.x, z: roomD, ry: Math.PI };
    case 'west': return { x: 0, z: win.y, ry: Math.PI / 2 };
    case 'east': return { x: roomW, z: win.y, ry: -Math.PI / 2 };
  }
}

// ── Scene content ──────────────────────────────────────────────────────────

function SceneContent({
  layout, style, selectedFloor, selectedRoom, cameraMode, isNightMode,
  showFurniture, onRoomClick, navigation, onNavigate,
}: ThreeViewerProps) {
  const mat = useMemo(() => getStyleMaterials(style), [style]);
  const materials = useBuildingMaterials(mat);
  const furnitureMaterials = useFurnitureMaterials(mat);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={isNightMode ? 0.3 : 0.6} />
      <directionalLight
        position={[20, 30, 10]}
        intensity={isNightMode ? 0.3 : 1.2}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
        shadow-camera-near={1}
        shadow-camera-far={60}
        shadow-bias={-0.0002}
      />
      {/* Fill light from the opposite side */}
      <directionalLight
        position={[-15, 20, -10]}
        intensity={isNightMode ? 0.1 : 0.3}
        color="#c8d8f0"
      />
      {!isNightMode && <hemisphereLight args={['#c0d8ff', '#80a060', 0.4]} />}

      {/* Environment IBL for realistic reflections */}
      <Environment preset={isNightMode ? 'night' : 'apartment'} background={false} environmentIntensity={isNightMode ? 0.3 : 0.8} />

      {/* Sky background */}
      <Sky
        distance={4500}
        sunPosition={isNightMode ? [0, -1, 0] : [50, 30, 20]}
        inclination={isNightMode ? 0 : 0.5}
        azimuth={0.25}
      />
      {/* Fallback background color so scene is never blank */}
      <color attach="background" args={[isNightMode ? '#0a0f1a' : '#87CEEB']} />

      {/* Fog for depth — adjusted per view level */}
      <fog attach="fog" args={[
        isNightMode ? '#0a0f1a' : (navigation.level === 'exterior' ? '#b8c8e0' : '#e8e0d0'),
        navigation.level === 'exterior' ? 40 : navigation.level === 'lobby' ? 20 : 10,
        navigation.level === 'exterior' ? 150 : navigation.level === 'lobby' ? 80 : 100,
      ]} />

      {/* Camera */}
      <CameraController cameraMode={cameraMode} navigation={navigation} layout={layout} />

      {/* Landscape always rendered so there's always a ground plane / environment */}
      <Landscape buildingWidth={layout.buildingWidth} buildingDepth={layout.buildingDepth} materials={materials} />

      {/* Contact shadows (exterior only) */}
      {navigation.level === 'exterior' && (
        <ContactShadows position={[layout.buildingWidth / 2, 0, layout.buildingDepth / 2]} opacity={0.3} scale={50} blur={2} far={20} />
      )}

      {/* Exterior */}
      <ExteriorFacade layout={layout} materials={materials} navigation={navigation} />

      {/* Lobby (ground floor) — always rendered for structural context */}
      <LobbyComponent lobby={layout.lobby} materials={materials} furnitureMaterials={furnitureMaterials} />

      {/* Floors — only render interiors for the active floor to save GPU */}
      {layout.floors.map((floor, fi) => {
        const floorY = fi * layout.floorHeight;
        const isActiveFloor = navigation.floorIndex !== null && fi === navigation.floorIndex;
        // Render interiors only for the selected floor at floor/flat/room levels
        const showInterior = isActiveFloor && (
          navigation.level === 'floor'
          || navigation.level === 'flat'
          || navigation.level === 'room'
        );

        return (
          <group key={`floor-${fi}`}>
            <FloorSlabAndCore
              floor={floor}
              floorY={floorY}
              buildingWidth={layout.buildingWidth}
              buildingDepth={layout.buildingDepth}
              floorHeight={layout.floorHeight}
              materials={materials}
            />
            {showInterior && floor.flats.map((flat) => {
              // At floor level, show all flats; at flat/room level, only show the selected one
              if (navigation.level !== 'floor' && navigation.flatId && navigation.flatId !== flat.id) {
                return null;
              }

              return (
                <FlatComponent
                  key={flat.id}
                  flat={flat}
                  floorY={floorY}
                  materials={materials}
                  furnitureMaterials={furnitureMaterials}
                  showFurniture={showFurniture}
                  onRoomClick={onRoomClick}
                />
              );
            })}
          </group>
        );
      })}

      {/* Post-processing — lightweight for fast rendering */}
      <EffectComposer multisampling={2}>
        <Bloom luminanceThreshold={0.9} luminanceSmoothing={0.4} intensity={0.2} mipmapBlur />
        <ToneMapping mode={4} />
        <Vignette offset={0.3} darkness={0.3} />
      </EffectComposer>
    </>
  );
}

// ── Fallback UI ───────────────────────────────────────────────────────────

function ViewerFallback() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-slate-100 rounded-2xl">
      <div className="text-center px-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-primary-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-slate-800 mb-1">WebGL Not Available</h3>
        <p className="text-sm text-slate-500">Your browser or device doesn&apos;t support 3D rendering.<br/>Try using a modern browser with hardware acceleration enabled.</p>
      </div>
    </div>
  );
}

// ── Loading overlay ───────────────────────────────────────────────────────

function LoadingOverlay() {
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-900/90 backdrop-blur-sm">
      <div className="relative w-16 h-16 mb-6">
        <div className="absolute inset-0 rounded-full border-4 border-teal-500/20" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-teal-400 animate-spin" />
        <div className="absolute inset-2 rounded-full border-4 border-transparent border-t-teal-300 animate-spin" style={{ animationDuration: '0.8s', animationDirection: 'reverse' }} />
      </div>
      <p className="text-white text-lg font-semibold tracking-wide">Loading 3D Scene</p>
      <p className="text-slate-400 text-sm mt-1">Initializing GPU rendering...</p>
    </div>
  );
}

// ── In-canvas fallback mesh (shows while Suspense loads) ───────────────

function InCanvasLoader() {
  return (
    <group>
      <ambientLight intensity={0.5} />
      <color attach="background" args={['#87CEEB']} />
    </group>
  );
}

// ── In-canvas loader (triggers Suspense) ──────────────────────────────────

function SceneReady({ onReady }: { onReady: () => void }) {
  useEffect(() => {
    // Signal loaded after first frame renders
    const id = requestAnimationFrame(() => onReady());
    return () => cancelAnimationFrame(id);
  }, [onReady]);
  return null;
}

// ── Main component ─────────────────────────────────────────────────────────

export default function ThreeViewer(props: ThreeViewerProps) {
  const [webGLOk, setWebGLOk] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setWebGLOk(isWebGLAvailable());
  }, []);

  const handleReady = useCallback(() => {
    setLoading(false);
  }, []);

  if (!webGLOk) return <ViewerFallback />;

  return (
    <WebGLErrorBoundary fallback={<ViewerFallback />}>
      <div className="relative w-full h-full">
        {loading && <LoadingOverlay />}
        <Canvas
          shadows
          dpr={[1, 1.5]}
          gl={{
            antialias: true,
            powerPreference: 'high-performance',
            failIfMajorPerformanceCaveat: false,
            alpha: false,
          }}
          onCreated={({ gl, scene }) => {
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.2;
            gl.outputColorSpace = THREE.SRGBColorSpace;
            gl.setClearColor('#87CEEB', 1);
            scene.background = new THREE.Color('#87CEEB');
          }}
          camera={{ fov: 55, near: 0.1, far: 300, position: [11, 25, -20] }}
          style={{ width: '100%', height: '100%' }}
        >
          <Suspense fallback={<InCanvasLoader />}>
            <SceneContent {...props} />
            <SceneReady onReady={handleReady} />
          </Suspense>
        </Canvas>
      </div>
    </WebGLErrorBoundary>
  );
}
