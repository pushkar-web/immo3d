import { NextRequest, NextResponse } from 'next/server';
import { callGroqAI } from '@/lib/groq';
import { getProject } from '@/lib/projects';

const STYLE_SYSTEM_PROMPT = `You are a design style recommendation engine for Immo3D.
Given a building's layout and user preferences, suggest 3 design styles with:
1. Style name and brief description
2. Color palette (wall, floor, ceiling, accent) as hex codes
3. Key materials for floors, walls, and fixtures
4. Furniture style recommendations
5. Lighting approach

Respond in valid JSON format:
{
  "suggestions": [
    {
      "name": "Style Name",
      "description": "Brief description",
      "colors": { "wall": "#hex", "floor": "#hex", "ceiling": "#hex", "accent": "#hex" },
      "materials": { "floor": "material", "wall": "material", "ceiling": "material" },
      "furniture": "Brief furniture style description",
      "lighting": "Brief lighting approach"
    }
  ]
}`;

export async function POST(request: NextRequest) {
  try {
    const { projectId, preferences } = await request.json();

    let context = 'A residential building';
    if (projectId) {
      const project = getProject(projectId);
      if (project) {
        context = `A ${project.floors}-floor ${project.buildingType} named "${project.name}" currently styled as "${project.style}"`;
      }
    }

    const userMessage = `Suggest 3 design styles for: ${context}. User preferences: ${preferences || 'modern, clean, and well-lit'}`;

    const content = await callGroqAI(STYLE_SYSTEM_PROMPT, userMessage);

    // Try to parse as JSON, fallback to raw text
    try {
      const parsed = JSON.parse(content);
      return NextResponse.json(parsed);
    } catch {
      return NextResponse.json({ suggestions: [], rawContent: content });
    }
  } catch (error) {
    console.error('Style agent error:', error);
    return NextResponse.json({ error: 'Style service unavailable' }, { status: 503 });
  }
}
