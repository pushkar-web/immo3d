import { NextRequest, NextResponse } from 'next/server';
import { getAllProjects, createProject, updateProject, getProject } from '@/lib/projects';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  const projects = getAllProjects();
  return NextResponse.json(projects);
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';

    let name: string;
    let description = '';
    let buildingType: string;
    let floors: number;
    let style = 'minimal';
    let file: File | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      name = formData.get('name') as string;
      description = (formData.get('description') as string) || '';
      buildingType = formData.get('buildingType') as string;
      floors = parseInt(formData.get('floors') as string, 10);
      style = (formData.get('style') as string) || 'minimal';
      file = formData.get('file') as File | null;
    } else {
      const body = await request.json();
      name = body.name;
      description = body.description || '';
      buildingType = body.buildingType;
      floors = body.floors;
      style = body.style || 'minimal';
    }

    if (!name || !buildingType || !floors) {
      return NextResponse.json(
        { error: 'Missing required fields: name, buildingType, floors' },
        { status: 400 }
      );
    }

    const project = createProject({
      name,
      description,
      buildingType: buildingType as 'tower' | 'villa' | 'apartment' | 'commercial',
      floors,
      style: style as 'minimal' | 'scandinavian' | 'tropical' | 'luxury' | 'industrial' | 'classic',
    });

    if (file && file.size > 0) {
      // File-based generation: save to tmp, scan synchronously
      try {
        const originalName = file.name;
        const ext = '.' + (originalName.split('.').pop()?.toLowerCase() || 'bin');
        const fileId = uuidv4();
        const uploadDir = join(tmpdir(), 'immo3d-uploads');
        await mkdir(uploadDir, { recursive: true });
        const filePath = join(uploadDir, `${fileId}${ext}`);

        const bytes = await file.arrayBuffer();
        await writeFile(filePath, Buffer.from(bytes));

        updateProject(project.id, { status: 'parsing', uploadedFileName: originalName });

        const { scanLayoutAndGenerate } = await import('@/lib/layout-scan');
        const result = await scanLayoutAndGenerate({
          filePath,
          originalName,
          requestedFloors: floors,
          requestedBuildingType: buildingType,
        });

        updateProject(project.id, {
          status: 'ready',
          layoutData: result.layout,
          floors: result.floors,
          buildingType: result.buildingType,
          scanSummary: result.summary,
        });
      } catch (error) {
        console.error('Layout scan failed:', error);
        const { generateMockLayout } = await import('@/lib/building-data');
        updateProject(project.id, {
          status: 'ready',
          layoutData: generateMockLayout(floors),
          scanSummary: {
            format: 'FALLBACK',
            detectedFloors: floors,
            estimatedAreaSqm: 0,
            confidence: 0,
            notes: ['Layout scan failed, generated default layout. Error: ' + String(error)],
          },
        });
      }
    } else {
      // No file: use mock layout generation
      const { generateMockLayout } = await import('@/lib/building-data');
      updateProject(project.id, {
        status: 'ready',
        layoutData: generateMockLayout(floors),
      });
    }

    const readyProject = getProject(project.id);
    return NextResponse.json(readyProject, { status: 201 });
  } catch (err) {
    console.error('Project creation error:', err);
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
