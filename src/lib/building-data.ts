import type {
  ParsedLayout, FloorData, FlatData, RoomData, LobbyData, CentralCore, LiftData,
  DesignStyle, StyleOption, StyleMaterialConfig,
} from '@/types';

// ── Design styles ──────────────────────────────────────────────────────────

export const DESIGN_STYLES: StyleOption[] = [
  {
    id: 'minimal',
    name: 'Minimal Modern',
    description: 'Clean lines, neutral colors, and open spaces',
    preview: '/styles/minimal.jpg',
    colors: { wall: '#f5f5f0', floor: '#d4c5a9', ceiling: '#ffffff', accent: '#2d2d2d' },
  },
  {
    id: 'scandinavian',
    name: 'Scandinavian',
    description: 'Light wood, white walls, cozy textiles',
    preview: '/styles/scandinavian.jpg',
    colors: { wall: '#fafaf7', floor: '#c9a96e', ceiling: '#ffffff', accent: '#5c7a6f' },
  },
  {
    id: 'tropical',
    name: 'Indian Tropical',
    description: 'Warm tones, natural materials, lush greenery',
    preview: '/styles/tropical.jpg',
    colors: { wall: '#fdf6e3', floor: '#8b6914', ceiling: '#fefcf3', accent: '#2d5016' },
  },
  {
    id: 'luxury',
    name: 'Luxury Modern',
    description: 'Premium materials, gold accents, bold statements',
    preview: '/styles/luxury.jpg',
    colors: { wall: '#1a1a2e', floor: '#4a3c2a', ceiling: '#2d2d3d', accent: '#c9a84c' },
  },
  {
    id: 'industrial',
    name: 'Industrial Loft',
    description: 'Exposed brick, metal, raw concrete',
    preview: '/styles/industrial.jpg',
    colors: { wall: '#8b8b8b', floor: '#696969', ceiling: '#a0a0a0', accent: '#c75000' },
  },
  {
    id: 'classic',
    name: 'Classic Elegant',
    description: 'Timeless design, ornate details, rich fabrics',
    preview: '/styles/classic.jpg',
    colors: { wall: '#f0ead6', floor: '#6b4423', ceiling: '#f5f0e1', accent: '#800020' },
  },
];

// ── PBR Material configuration per design style ─────────────────────────────

const STYLE_MATERIALS: Record<DesignStyle, StyleMaterialConfig> = {
  minimal: {
    wallColor: '#f0ede6', wallMaterial: 'plaster', exteriorColor: '#e8e4dc',
    ceilingColor: '#fafafa', woodFloorColor: '#bfa87a', tileColor: '#e0dcd4',
    bathroomTileColor: '#d8d4cc', marbleColor: '#f0ece4', doorColor: '#c4a882',
    baseboardColor: '#d4c5a9', windowFrameColor: 'dark', handleColor: 'chrome',
    sofaColor: '#8a8880', bedColor: '#c8c0b4', furnitureWoodColor: '#b09878',
  },
  scandinavian: {
    wallColor: '#f8f6f0', wallMaterial: 'plaster', exteriorColor: '#edead8',
    ceilingColor: '#ffffff', woodFloorColor: '#c9a96e', tileColor: '#f0ece4',
    bathroomTileColor: '#e8e4dc', marbleColor: '#f5f0e5', doorColor: '#d4b888',
    baseboardColor: '#d4c0a0', windowFrameColor: 'light', handleColor: 'chrome',
    sofaColor: '#7a8a7a', bedColor: '#d8d0c4', furnitureWoodColor: '#c4a870',
  },
  tropical: {
    wallColor: '#f8f0dc', wallMaterial: 'plaster', exteriorColor: '#ece0c8',
    ceilingColor: '#faf6ec', woodFloorColor: '#8b6914', tileColor: '#d4b088',
    bathroomTileColor: '#c8a878', marbleColor: '#ede0c8', doorColor: '#7a5a30',
    baseboardColor: '#8a6a40', windowFrameColor: 'dark', handleColor: 'gold',
    sofaColor: '#6a8458', bedColor: '#c4a880', furnitureWoodColor: '#7a5a30',
  },
  luxury: {
    wallColor: '#2a2838', wallMaterial: 'plaster', exteriorColor: '#1a1828',
    ceilingColor: '#353340', woodFloorColor: '#4a3c2a', tileColor: '#3a3530',
    bathroomTileColor: '#2a2828', marbleColor: '#e8e0d0', doorColor: '#3a302a',
    baseboardColor: '#2a2420', windowFrameColor: 'dark', handleColor: 'gold',
    sofaColor: '#3a3535', bedColor: '#4a4040', furnitureWoodColor: '#3a2a1a',
  },
  industrial: {
    wallColor: '#a08878', wallMaterial: 'brick', exteriorColor: '#8a7060',
    ceilingColor: '#989088', woodFloorColor: '#686058', tileColor: '#787068',
    bathroomTileColor: '#686060', marbleColor: '#a09890', doorColor: '#484038',
    baseboardColor: '#484038', windowFrameColor: 'dark', handleColor: 'chrome',
    sofaColor: '#605850', bedColor: '#787068', furnitureWoodColor: '#484038',
  },
  classic: {
    wallColor: '#f0ead6', wallMaterial: 'plaster', exteriorColor: '#e8dcc4',
    ceilingColor: '#f5f0e1', woodFloorColor: '#6b4423', tileColor: '#c8b8a0',
    bathroomTileColor: '#d0c0a8', marbleColor: '#efe8d8', doorColor: '#5a3a1a',
    baseboardColor: '#6a4a28', windowFrameColor: 'dark', handleColor: 'gold',
    sofaColor: '#6a2030', bedColor: '#7a4830', furnitureWoodColor: '#5a3a1a',
  },
};

export function getStyleMaterials(style: DesignStyle): StyleMaterialConfig {
  return STYLE_MATERIALS[style] ?? STYLE_MATERIALS.minimal;
}

export function getStyleColors(style: DesignStyle) {
  return DESIGN_STYLES.find((s) => s.id === style)?.colors ?? DESIGN_STYLES[0].colors;
}

// ── Flat positions around central core ─────────────────────────────────────

type FlatPosition = 'north-east' | 'north-west' | 'south-east' | 'south-west';

const FLAT_CONFIGS: { position: FlatPosition; offsetX: number; offsetZ: number; entryWall: 'north' | 'south' | 'east' | 'west' }[] = [
  { position: 'north-west', offsetX: 0, offsetZ: 0, entryWall: 'east' },
  { position: 'north-east', offsetX: 11, offsetZ: 0, entryWall: 'west' },
  { position: 'south-west', offsetX: 0, offsetZ: 9, entryWall: 'east' },
  { position: 'south-east', offsetX: 11, offsetZ: 9, entryWall: 'west' },
];

// ── Room generators per flat ───────────────────────────────────────────────

function generateFlatRooms(flatId: string, flatW: number, flatD: number): RoomData[] {
  const h = 3;
  // NOTE: All furniture x/z, door x/y, window x/y coordinates are ROOM-LOCAL
  // (relative to room origin 0,0), NOT absolute world or flat coordinates.
  // The RoomComponent places the room group at [offsetX + room.x, floorY, offsetZ + room.y].
  return [
    {
      id: `${flatId}-living`, name: 'Living Room', type: 'living',
      x: 0, y: 0, width: 5.5, depth: 4.5, height: h,
      doors: [{ x: 5.5, y: 2, width: 0.9, height: 2.4, wall: 'east' }],
      windows: [
        { x: 2.5, y: 0, width: 2, height: 1.6, wall: 'south', sillHeight: 0.85 },
        { x: 0, y: 2, width: 1.5, height: 1.6, wall: 'west', sillHeight: 0.85 },
      ],
      furniture: [
        { type: 'sofa', name: 'L-Shaped Sofa', x: 1.5, y: 0, z: 1.2, rotationY: 0, scaleX: 1.2, scaleY: 1, scaleZ: 1 },
        { type: 'table', name: 'Coffee Table', x: 3, y: 0, z: 2.2, rotationY: 0, scaleX: 1, scaleY: 1, scaleZ: 1 },
        { type: 'shelf', name: 'TV Unit', x: 4.8, y: 0, z: 0.3, rotationY: Math.PI, scaleX: 1.4, scaleY: 1, scaleZ: 0.6 },
        { type: 'lamp', name: 'Floor Lamp', x: 0.5, y: 0, z: 0.5, rotationY: 0, scaleX: 1, scaleY: 1, scaleZ: 1 },
      ],
    },
    {
      // Master Bedroom starts at flat-local (5.5, 0), size 4×4
      // Furniture coords are room-local: 0..4 for x, 0..4 for z
      id: `${flatId}-bedroom1`, name: 'Master Bedroom', type: 'bedroom',
      x: 5.5, y: 0, width: 4, depth: 4, height: h,
      doors: [{ x: 0, y: 2, width: 0.9, height: 2.4, wall: 'west' }],
      windows: [{ x: 2, y: 0, width: 1.8, height: 1.6, wall: 'south', sillHeight: 0.85 }],
      furniture: [
        { type: 'bed', name: 'King Bed', x: 2, y: 0, z: 1.5, rotationY: 0, scaleX: 1, scaleY: 1, scaleZ: 1 },
        { type: 'wardrobe', name: 'Wardrobe', x: 0.4, y: 0, z: 0.4, rotationY: 0, scaleX: 1.6, scaleY: 1, scaleZ: 1 },
        { type: 'nightstand', name: 'Nightstand', x: 3.5, y: 0, z: 1, rotationY: 0, scaleX: 1, scaleY: 1, scaleZ: 1 },
        { type: 'lamp', name: 'Bedside Lamp', x: 3.5, y: 0.6, z: 1, rotationY: 0, scaleX: 0.5, scaleY: 0.5, scaleZ: 0.5 },
      ],
    },
    {
      // Bedroom 2 starts at flat-local (5.5, 4), size 3.5×3.5
      // Furniture coords are room-local: 0..3.5 for x, 0..3.5 for z
      id: `${flatId}-bedroom2`, name: 'Bedroom 2', type: 'bedroom',
      x: 5.5, y: 4, width: 3.5, depth: 3.5, height: h,
      doors: [{ x: 0, y: 1, width: 0.9, height: 2.4, wall: 'west' }],
      windows: [{ x: 1.5, y: 3.5, width: 1.5, height: 1.4, wall: 'north', sillHeight: 0.9 }],
      furniture: [
        { type: 'bed', name: 'Single Bed', x: 1.5, y: 0, z: 1.5, rotationY: 0, scaleX: 0.8, scaleY: 1, scaleZ: 0.8 },
        { type: 'desk', name: 'Study Desk', x: 3, y: 0, z: 3, rotationY: Math.PI, scaleX: 0.8, scaleY: 1, scaleZ: 0.8 },
        { type: 'chair', name: 'Desk Chair', x: 3, y: 0, z: 2.2, rotationY: 0, scaleX: 0.8, scaleY: 0.8, scaleZ: 0.8 },
      ],
    },
    {
      // Kitchen starts at flat-local (0, 4.5), size 3.5×3
      // Furniture coords are room-local: 0..3.5 for x, 0..3 for z
      id: `${flatId}-kitchen`, name: 'Kitchen', type: 'kitchen',
      x: 0, y: 4.5, width: 3.5, depth: 3, height: h,
      doors: [{ x: 3.5, y: 1, width: 0.9, height: 2.4, wall: 'east' }],
      windows: [{ x: 0, y: 1, width: 1.2, height: 1.2, wall: 'west', sillHeight: 1 }],
      furniture: [
        { type: 'counter', name: 'Kitchen Counter', x: 0.3, y: 0, z: 0.5, rotationY: 0, scaleX: 1.4, scaleY: 1, scaleZ: 1 },
        { type: 'fridge', name: 'Refrigerator', x: 3, y: 0, z: 0.4, rotationY: Math.PI, scaleX: 1, scaleY: 1, scaleZ: 1 },
        { type: 'table', name: 'Dining Table', x: 1.8, y: 0, z: 2, rotationY: 0, scaleX: 0.9, scaleY: 1, scaleZ: 1 },
        { type: 'chair', name: 'Chair', x: 1, y: 0, z: 2, rotationY: Math.PI / 2, scaleX: 0.8, scaleY: 0.8, scaleZ: 0.8 },
        { type: 'chair', name: 'Chair', x: 2.6, y: 0, z: 2, rotationY: -Math.PI / 2, scaleX: 0.8, scaleY: 0.8, scaleZ: 0.8 },
      ],
    },
    {
      // Bathroom starts at flat-local (3.5, 4.5), size 2×3
      // Furniture coords are room-local: 0..2 for x, 0..3 for z
      id: `${flatId}-bathroom`, name: 'Bathroom', type: 'bathroom',
      x: 3.5, y: 4.5, width: 2, depth: 3, height: h,
      doors: [{ x: 0, y: 1, width: 0.8, height: 2.1, wall: 'west' }],
      windows: [{ x: 1, y: 3, width: 0.6, height: 0.6, wall: 'north', sillHeight: 1.5 }],
      furniture: [
        { type: 'toilet', name: 'Toilet', x: 0.5, y: 0, z: 2.5, rotationY: Math.PI, scaleX: 1, scaleY: 1, scaleZ: 1 },
        { type: 'vanity', name: 'Vanity', x: 1.6, y: 0, z: 0.5, rotationY: -Math.PI / 2, scaleX: 1, scaleY: 1, scaleZ: 1 },
        { type: 'shower', name: 'Shower', x: 0.5, y: 0, z: 0.5, rotationY: 0, scaleX: 1, scaleY: 1, scaleZ: 1 },
      ],
    },
    {
      // Balcony starts at flat-local (0, 7.5), size 3×1.5
      // Furniture coords are room-local: 0..3 for x, 0..1.5 for z
      id: `${flatId}-balcony`, name: 'Balcony', type: 'balcony',
      x: 0, y: 7.5, width: 3, depth: 1.5, height: h,
      doors: [{ x: 1.5, y: 0, width: 1.8, height: 2.4, wall: 'south' }],
      windows: [],
      furniture: [
        { type: 'chair', name: 'Lounger', x: 1.5, y: 0, z: 0.75, rotationY: 0, scaleX: 1, scaleY: 0.7, scaleZ: 1.2 },
      ],
    },
  ];
}

// ── Full building generator ────────────────────────────────────────────────

export function generateMockLayout(floors: number = 5): ParsedLayout {
  const buildingWidth = 22;
  const buildingDepth = 18;
  const floorHeight = 3;
  const flatW = 9.5;
  const flatD = 9;

  // Central core (lifts + stairs + corridor)
  const coreLifts: LiftData[] = [
    { id: 'lift-1', x: 9.5, z: 7.5, width: 2, depth: 2 },
    { id: 'lift-2', x: 9.5, z: 10.5, width: 2, depth: 2 },
  ];

  const core: CentralCore = {
    lifts: coreLifts,
    stairwell: { x: 12, z: 7.5, width: 2, depth: 5 },
    corridor: { x: 9.5, z: 6, width: 3, depth: 8 },
  };

  // Lobby (ground floor special area)
  const lobby: LobbyData = {
    width: buildingWidth,
    depth: buildingDepth,
    height: 4.5,
    receptionDesk: { x: 11, z: 3, width: 3, depth: 1.2 },
    lifts: coreLifts,
    entranceDoors: [
      { x: 11, y: 0, width: 3, height: 3, wall: 'south' },
    ],
  };

  // Generate flats for each floor
  const floorData: FloorData[] = Array.from({ length: floors }, (_, i) => {
    const flats: FlatData[] = FLAT_CONFIGS.map((cfg, fi) => {
      const flatId = `f${i}-flat${fi}`;
      return {
        id: flatId,
        name: `Unit ${i}${String.fromCharCode(65 + fi)}`,
        unitNumber: `${i}${String.fromCharCode(65 + fi)}`,
        position: cfg.position,
        offsetX: cfg.offsetX,
        offsetZ: cfg.offsetZ,
        width: flatW,
        depth: flatD,
        rooms: generateFlatRooms(flatId, flatW, flatD),
        entryDoor: { x: cfg.offsetX + (cfg.entryWall === 'east' ? flatW : 0), y: cfg.offsetZ + flatD / 2, width: 1, height: 2.4, wall: cfg.entryWall },
      };
    });

    const outerWalls: {
      startX: number; startY: number; endX: number; endY: number;
      thickness: number; height: number; material: string;
    }[] = [
      { startX: 0, startY: 0, endX: buildingWidth, endY: 0, thickness: 0.25, height: floorHeight, material: 'concrete' },
      { startX: buildingWidth, startY: 0, endX: buildingWidth, endY: buildingDepth, thickness: 0.25, height: floorHeight, material: 'concrete' },
      { startX: buildingWidth, startY: buildingDepth, endX: 0, endY: buildingDepth, thickness: 0.25, height: floorHeight, material: 'concrete' },
      { startX: 0, startY: buildingDepth, endX: 0, endY: 0, thickness: 0.25, height: floorHeight, material: 'concrete' },
    ];

    return {
      level: i,
      label: i === 0 ? 'Ground Floor' : `Floor ${i}`,
      flats,
      core,
      walls: outerWalls,
    };
  });

  return {
    floors: floorData,
    lobby,
    buildingWidth,
    buildingDepth,
    floorHeight,
    exteriorColor: '#d0ccc4',
  };
}
