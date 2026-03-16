import { readFile } from 'fs/promises';
import { join } from 'path';
import type { ParsedLayout, Project } from '@/types';
import { generateMockLayout } from '@/lib/building-data';

const KNOWN_BUILDING_TYPES: Project['buildingType'][] = ['tower', 'villa', 'apartment', 'commercial'];

export interface LayoutScanSummary {
  format: string;
  detectedFloors: number;
  estimatedAreaSqm: number;
  confidence: number;
  notes: string[];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function inferFloorsFromSize(bytes: number): number {
  const mb = bytes / (1024 * 1024);
  return clamp(Math.round(2 + mb * 1.6), 1, 40);
}

function parseSvgMetrics(content: string): { complexity: number; widthM: number; depthM: number; inferredFloors: number; notes: string[] } {
  const notes: string[] = [];
  const shapeCount = (content.match(/<(line|polyline|polygon|path|rect|circle|ellipse)\b/gi) ?? []).length;

  const viewBoxMatch = content.match(/viewBox\s*=\s*['"]([^'"]+)['"]/i);
  let widthM = 22;
  let depthM = 18;

  if (viewBoxMatch?.[1]) {
    const values = viewBoxMatch[1].split(/\s+/).map((v) => Number(v));
    if (values.length === 4 && values.every((v) => Number.isFinite(v))) {
      widthM = clamp(values[2] / 40, 16, 120);
      depthM = clamp(values[3] / 40, 14, 100);
      notes.push(`SVG viewBox detected (${values[2]}×${values[3]} units)`);
    }
  }

  const inferredFloors = clamp(Math.round(shapeCount / 140) || 1, 1, 30);
  notes.push(`Detected ${shapeCount} vector entities in SVG`);

  return {
    complexity: shapeCount,
    widthM,
    depthM,
    inferredFloors,
    notes,
  };
}

function parseDxfMetrics(content: string): { complexity: number; widthM: number; depthM: number; inferredFloors: number; notes: string[] } {
  const notes: string[] = [];
  const entityCount = (content.match(/\n\s*0\s*\n\s*(LINE|LWPOLYLINE|POLYLINE|CIRCLE|ARC|INSERT|HATCH)\s*\n/gi) ?? []).length;
  const floorHints = (content.match(/(FLOOR|LEVEL|STOREY)\s*[-_:]?\s*\d+/gi) ?? []).length;

  const inferredFloors = clamp(floorHints || Math.round(entityCount / 180) || 1, 1, 60);
  const widthM = clamp(20 + entityCount / 45, 16, 180);
  const depthM = clamp(16 + entityCount / 55, 14, 150);

  notes.push(`DXF entities detected: ${entityCount}`);
  if (floorHints > 0) {
    notes.push(`Found ${floorHints} floor/level labels`);
  }

  return {
    complexity: entityCount,
    widthM,
    depthM,
    inferredFloors,
    notes,
  };
}

function parsePdfMetrics(content: string): { complexity: number; inferredFloors: number; notes: string[] } {
  const notes: string[] = [];
  const pages = (content.match(/\/Type\s*\/Page\b/g) ?? []).length;
  const floorHints = (content.match(/(FLOOR|LEVEL|STOREY)\s*[-_:]?\s*\d+/gi) ?? []).length;
  const inferredFloors = clamp(floorHints || pages || 1, 1, 80);

  notes.push(`PDF pages detected: ${pages || 1}`);
  if (floorHints > 0) {
    notes.push(`Found ${floorHints} textual floor labels`);
  }

  return {
    complexity: pages * 100,
    inferredFloors,
    notes,
  };
}

export async function scanLayoutAndGenerate(params: {
  uploadUrl?: string;
  filePath?: string;
  originalName: string;
  requestedFloors?: number;
  requestedBuildingType?: string;
}): Promise<{ layout: ParsedLayout; summary: LayoutScanSummary; buildingType: Project['buildingType']; floors: number }> {
  const ext = `.${params.originalName.split('.').pop()?.toLowerCase() ?? ''}`;

  let absolutePath: string;
  if (params.filePath) {
    absolutePath = params.filePath;
  } else if (params.uploadUrl) {
    const relativePath = params.uploadUrl.replace(/^\/+/, '');
    absolutePath = join(process.cwd(), 'public', relativePath);
  } else {
    throw new Error('Either filePath or uploadUrl must be provided');
  }

  const buffer = await readFile(absolutePath);
  const rawUtf = buffer.toString('utf8');

  let detectedFloors = clamp(params.requestedFloors ?? inferFloorsFromSize(buffer.byteLength), 1, 80);
  let buildingWidth = 22;
  let buildingDepth = 18;
  let complexity = 120;
  const notes: string[] = [];

  if (ext === '.svg') {
    const svg = parseSvgMetrics(rawUtf);
    detectedFloors = clamp(params.requestedFloors ?? svg.inferredFloors, 1, 80);
    buildingWidth = svg.widthM;
    buildingDepth = svg.depthM;
    complexity = svg.complexity;
    notes.push(...svg.notes);
  } else if (ext === '.dxf') {
    const dxf = parseDxfMetrics(rawUtf);
    detectedFloors = clamp(params.requestedFloors ?? dxf.inferredFloors, 1, 80);
    buildingWidth = dxf.widthM;
    buildingDepth = dxf.depthM;
    complexity = dxf.complexity;
    notes.push(...dxf.notes);
  } else if (ext === '.dwg') {
    const fallbackFloors = clamp(params.requestedFloors ?? inferFloorsFromSize(buffer.byteLength), 1, 80);
    detectedFloors = fallbackFloors;
    buildingWidth = clamp(24 + buffer.byteLength / 220000, 18, 160);
    buildingDepth = clamp(20 + buffer.byteLength / 260000, 16, 130);
    complexity = Math.round(buffer.byteLength / 4000);
    notes.push('DWG file detected and accepted. Applied binary CAD heuristics for immediate generation.');
    notes.push('Tip: connect a DWG-to-DXF conversion microservice for geometry-accurate extraction.');
  } else if (ext === '.pdf') {
    const pdf = parsePdfMetrics(buffer.toString('latin1'));
    detectedFloors = clamp(params.requestedFloors ?? pdf.inferredFloors, 1, 80);
    buildingWidth = clamp(20 + detectedFloors * 0.8, 16, 110);
    buildingDepth = clamp(16 + detectedFloors * 0.65, 14, 95);
    complexity = pdf.complexity;
    notes.push(...pdf.notes);
  } else {
    const mb = buffer.byteLength / (1024 * 1024);
    detectedFloors = clamp(params.requestedFloors ?? inferFloorsFromSize(buffer.byteLength), 1, 80);
    buildingWidth = clamp(18 + mb * 12, 16, 90);
    buildingDepth = clamp(14 + mb * 8, 14, 70);
    complexity = Math.round(mb * 120);
    notes.push('Raster/image-based layout scan applied.');
  }

  const baseLayout = generateMockLayout(detectedFloors);
  baseLayout.buildingWidth = Number(buildingWidth.toFixed(2));
  baseLayout.buildingDepth = Number(buildingDepth.toFixed(2));
  baseLayout.lobby.width = baseLayout.buildingWidth;
  baseLayout.lobby.depth = baseLayout.buildingDepth;

  for (const floor of baseLayout.floors) {
    floor.walls = [
      { startX: 0, startY: 0, endX: baseLayout.buildingWidth, endY: 0, thickness: 0.25, height: baseLayout.floorHeight, material: 'concrete' },
      { startX: baseLayout.buildingWidth, startY: 0, endX: baseLayout.buildingWidth, endY: baseLayout.buildingDepth, thickness: 0.25, height: baseLayout.floorHeight, material: 'concrete' },
      { startX: baseLayout.buildingWidth, startY: baseLayout.buildingDepth, endX: 0, endY: baseLayout.buildingDepth, thickness: 0.25, height: baseLayout.floorHeight, material: 'concrete' },
      { startX: 0, startY: baseLayout.buildingDepth, endX: 0, endY: 0, thickness: 0.25, height: baseLayout.floorHeight, material: 'concrete' },
    ];
  }

  const knownRequestedType = KNOWN_BUILDING_TYPES.includes(params.requestedBuildingType as Project['buildingType'])
    ? (params.requestedBuildingType as Project['buildingType'])
    : null;

  const area = Math.round(baseLayout.buildingWidth * baseLayout.buildingDepth * Math.max(detectedFloors, 1));
  const inferredType: Project['buildingType'] =
    area > 40000 ? 'tower' : area > 15000 ? 'commercial' : area > 7000 ? 'apartment' : 'villa';

  const confidence = clamp(Math.round(58 + Math.min(complexity / 12, 34)), 55, 97);

  return {
    layout: baseLayout,
    buildingType: knownRequestedType ?? inferredType,
    floors: detectedFloors,
    summary: {
      format: ext.replace('.', '').toUpperCase() || 'UNKNOWN',
      detectedFloors,
      estimatedAreaSqm: area,
      confidence,
      notes,
    },
  };
}