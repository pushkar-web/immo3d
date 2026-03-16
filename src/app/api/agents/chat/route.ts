import { NextRequest, NextResponse } from 'next/server';
import { callGroqAI } from '@/lib/groq';
import { getProject } from '@/lib/projects';

const SYSTEM_PROMPT = `You are an expert AI interior design and real estate assistant for Immo3D, a 3D real estate visualization platform.

You help users with:
1. Design style suggestions - recommend interior design styles, color palettes, materials
2. Layout optimization - suggest improvements for space utilization, flow, and lighting
3. Marketing descriptions - generate compelling property listing text
4. Material recommendations - suggest specific materials for floors, walls, ceilings
5. Furniture placement - advise on furniture arrangement and selection

Keep responses concise, practical, and professional. Format with markdown for readability.
When suggesting styles, always include specific color hex codes and material names.
When optimizing layouts, reference specific rooms and their dimensions.`;

export async function POST(request: NextRequest) {
  try {
    const { projectId, message } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Build context from project data
    let projectContext = '';
    if (projectId) {
      const project = getProject(projectId);
      if (project) {
        projectContext = `\n\nCurrent project context:
- Name: ${project.name}
- Type: ${project.buildingType}
- Floors: ${project.floors}
- Style: ${project.style}
- Status: ${project.status}`;

        if (project.layoutData) {
          const totalRooms = project.layoutData.floors.reduce(
            (sum, f) => sum + f.flats.reduce((s, flat) => s + flat.rooms.length, 0),
            0
          );
          projectContext += `\n- Total rooms: ${totalRooms}
- Building dimensions: ${project.layoutData.buildingWidth}m × ${project.layoutData.buildingDepth}m
- Floor height: ${project.layoutData.floorHeight}m`;
        }
      }
    }

    const content = await callGroqAI(
      SYSTEM_PROMPT + projectContext,
      message
    );

    return NextResponse.json({ content, type: 'chat' });
  } catch (error) {
    console.error('AI Agent error:', error);
    return NextResponse.json(
      { error: 'AI service unavailable', content: 'I apologize, but I\'m currently unable to process your request. Please try again in a moment.' },
      { status: 503 }
    );
  }
}
