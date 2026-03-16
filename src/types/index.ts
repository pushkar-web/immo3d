// Types for Immo3D

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  buildingType: 'tower' | 'villa' | 'apartment' | 'commercial';
  status: 'uploading' | 'parsing' | 'generating' | 'ready' | 'error';
  floors: number;
  style: DesignStyle;
  thumbnailUrl?: string;
  modelUrl?: string;
  layoutData?: ParsedLayout;
  scanSummary?: {
    format: string;
    detectedFloors: number;
    estimatedAreaSqm: number;
    confidence: number;
    notes: string[];
  };
  uploadedFileUrl?: string;
  uploadedFileName?: string;
  createdAt: string;
  updatedAt: string;
}

export type DesignStyle = 'minimal' | 'scandinavian' | 'tropical' | 'luxury' | 'industrial' | 'classic';

// ── Building hierarchy ─────────────────────────────────────────────────────

export interface ParsedLayout {
  floors: FloorData[];
  lobby: LobbyData;
  buildingWidth: number;
  buildingDepth: number;
  floorHeight: number;
  exteriorColor: string;
}

export interface LobbyData {
  width: number;
  depth: number;
  height: number;
  receptionDesk: { x: number; z: number; width: number; depth: number };
  lifts: LiftData[];
  entranceDoors: DoorData[];
}

export interface LiftData {
  id: string;
  x: number;
  z: number;
  width: number;
  depth: number;
}

export interface CentralCore {
  lifts: LiftData[];
  stairwell: { x: number; z: number; width: number; depth: number };
  corridor: { x: number; z: number; width: number; depth: number };
}

export interface FloorData {
  level: number;
  label: string;
  flats: FlatData[];
  core: CentralCore;
  walls: WallData[];
}

export interface FlatData {
  id: string;
  name: string;
  unitNumber: string;
  position: 'north-east' | 'north-west' | 'south-east' | 'south-west';
  offsetX: number;
  offsetZ: number;
  width: number;
  depth: number;
  rooms: RoomData[];
  entryDoor: DoorData;
}

export interface RoomData {
  id: string;
  name: string;
  type: RoomType;
  x: number;
  y: number;
  width: number;
  depth: number;
  height: number;
  doors: DoorData[];
  windows: WindowData[];
  furniture: FurnitureItem[];
}

export type RoomType =
  | 'living'
  | 'bedroom'
  | 'bathroom'
  | 'kitchen'
  | 'balcony'
  | 'lobby'
  | 'corridor'
  | 'lift'
  | 'dining'
  | 'study'
  | 'storage';

export interface WallData {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  thickness: number;
  height: number;
  material: string;
}

export interface DoorData {
  x: number;
  y: number;
  width: number;
  height: number;
  wall: 'north' | 'south' | 'east' | 'west';
}

export interface WindowData {
  x: number;
  y: number;
  width: number;
  height: number;
  wall: 'north' | 'south' | 'east' | 'west';
  sillHeight: number;
}

export interface FurnitureItem {
  type: string;
  name: string;
  x: number;
  y: number;
  z: number;
  rotationY: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
}

// ── Navigation ─────────────────────────────────────────────────────────────

export type NavigationLevel = 'exterior' | 'lobby' | 'floor' | 'flat' | 'room';

export interface NavigationState {
  level: NavigationLevel;
  floorIndex: number | null;
  flatId: string | null;
  roomId: string | null;
}

// ── Styles ─────────────────────────────────────────────────────────────────

export interface StyleOption {
  id: DesignStyle;
  name: string;
  description: string;
  preview: string;
  colors: {
    wall: string;
    floor: string;
    ceiling: string;
    accent: string;
  };
}

export interface ExportOption {
  format: 'glb' | 'gltf' | 'obj' | 'fbx' | '360' | 'mp4';
  label: string;
  description: string;
  icon: string;
}

export interface StyleMaterialConfig {
  wallColor: string;
  wallMaterial: 'plaster' | 'brick';
  exteriorColor: string;
  ceilingColor: string;
  woodFloorColor: string;
  tileColor: string;
  bathroomTileColor: string;
  marbleColor: string;
  doorColor: string;
  baseboardColor: string;
  windowFrameColor: 'dark' | 'light';
  handleColor: 'chrome' | 'gold';
  sofaColor: string;
  bedColor: string;
  furnitureWoodColor: string;
}

export interface AIAgentResponse {
  type: 'style' | 'layout' | 'listing';
  content: string;
  suggestions?: string[];
  materials?: Record<string, string>;
}
