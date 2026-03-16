import type { Project, ParsedLayout } from '@/types';
import { generateMockLayout } from './building-data';
import { v4 as uuidv4 } from 'uuid';

// In-memory store for demo (replace with DB in production)
const projectsStore = new Map<string, Project>();

// Demo project definitions (layoutData generated lazily on first access)
interface DemoProjectDef {
  id: string;
  name: string;
  description: string;
  buildingType: Project['buildingType'];
  status: Project['status'];
  floors: number;
  style: Project['style'];
  thumbnailUrl: string;
  createdAt: string;
  updatedAt: string;
}

const DEMO_DEFS: DemoProjectDef[] = [
  {
    id: 'demo-tower-1',
    name: 'Skyline Tower',
    description: 'A modern 10-floor residential tower with premium amenities',
    buildingType: 'tower',
    status: 'ready',
    floors: 10,
    style: 'luxury',
    thumbnailUrl: '/thumbnails/tower.jpg',
    createdAt: '2026-03-10T10:00:00Z',
    updatedAt: '2026-03-10T12:00:00Z',
  },
  {
    id: 'demo-villa-1',
    name: 'Ocean Breeze Villa',
    description: 'Luxury 2-story villa with panoramic sea views',
    buildingType: 'villa',
    status: 'ready',
    floors: 2,
    style: 'tropical',
    thumbnailUrl: '/thumbnails/villa.jpg',
    createdAt: '2026-03-08T14:00:00Z',
    updatedAt: '2026-03-08T16:00:00Z',
  },
  {
    id: 'demo-apt-1',
    name: 'Urban Nest Apartments',
    description: 'Contemporary 5-floor apartment complex',
    buildingType: 'apartment',
    status: 'ready',
    floors: 5,
    style: 'scandinavian',
    thumbnailUrl: '/thumbnails/apartment.jpg',
    createdAt: '2026-03-05T09:00:00Z',
    updatedAt: '2026-03-05T11:00:00Z',
  },
];

// Seed with lazy layout — each demo generates layout on first getProject() call
DEMO_DEFS.forEach((def) => {
  projectsStore.set(def.id, { ...def } as Project);
});

/** Ensure a project has layoutData, generating it lazily if missing */
function ensureLayout(project: Project): Project {
  if (!project.layoutData && project.status === 'ready') {
    project.layoutData = generateMockLayout(project.floors);
    projectsStore.set(project.id, project);
  }
  return project;
}

export function getAllProjects(): Project[] {
  return Array.from(projectsStore.values())
    .map(ensureLayout)
    .sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
}

export function getProject(id: string): Project | undefined {
  const p = projectsStore.get(id);
  if (!p) {
    // Check if it is a known demo ID — re-seed it (handles Vercel cold starts)
    const def = DEMO_DEFS.find((d) => d.id === id);
    if (def) {
      const project: Project = { ...def, layoutData: generateMockLayout(def.floors) } as Project;
      projectsStore.set(id, project);
      return project;
    }
    return undefined;
  }
  return ensureLayout(p);
}

export function createProject(data: {
  name: string;
  description: string;
  buildingType: Project['buildingType'];
  floors: number;
  style: Project['style'];
}): Project {
  const project: Project = {
    id: uuidv4(),
    ...data,
    status: 'uploading',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  projectsStore.set(project.id, project);
  return project;
}

export function updateProject(id: string, updates: Partial<Project>): Project | undefined {
  const existing = projectsStore.get(id) ?? (() => {
    // Re-seed demo if needed (Vercel cold start)
    const def = DEMO_DEFS.find((d) => d.id === id);
    if (def) {
      const p: Project = { ...def } as Project;
      projectsStore.set(id, p);
      return p;
    }
    return undefined;
  })();
  if (!existing) return undefined;
  const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
  projectsStore.set(id, updated);
  return updated;
}

export function deleteProject(id: string): boolean {
  return projectsStore.delete(id);
}

export function simulateLayoutParsing(): ParsedLayout {
  // In production, this would use CV/ML to parse uploaded floor plans
  return generateMockLayout(3);
}
