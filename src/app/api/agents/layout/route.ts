import { NextRequest, NextResponse } from 'next/server';
import { callGroqAI } from '@/lib/groq';
import { getProject } from '@/lib/projects';

const LAYOUT_SYSTEM_PROMPT = `You are a layout optimization advisor for Immo3D.
Analyze room layouts and suggest improvements for:
1. Space utilization efficiency
2. Natural lighting optimization
3. Traffic flow and accessibility
4. Room proportions and ergonomics
5. Ventilation and cross-ventilation

Provide 3-5 specific, actionable suggestions. For each suggestion, mention:
- Which room(s) it applies to
- The current issue
- The recommended change
- Expected improvement

Keep responses concise and practical.`;

export async function POST(request: NextRequest) {
  try {
    const { projectId } = await request.json();

    let layoutDesc = 'A standard residential building with living room, bedrooms, kitchen, and bathroom on each floor.';

    if (projectId) {
      const project = getProject(projectId);
      if (project?.layoutData) {
        const floor0 = project.layoutData.floors[0];
        if (floor0) {
          const allRooms = floor0.flats.flatMap((flat) => flat.rooms);
          const roomDescs = allRooms.map(
            (r) => `${r.name} (${r.type}): ${r.width}m × ${r.depth}m`
          );
          layoutDesc = `${project.buildingType} with ${project.floors} floors, ${floor0.flats.length} flats per floor.
Building footprint: ${project.layoutData.buildingWidth}m × ${project.layoutData.buildingDepth}m.
Ground floor rooms: ${roomDescs.join('; ')}.
Total rooms per floor: ${allRooms.length}.`;
        }
      }
    }

    const content = await callGroqAI(
      LAYOUT_SYSTEM_PROMPT,
      `Analyze and suggest optimizations for this layout:\n\n${layoutDesc}`
    );

    return NextResponse.json({ content, type: 'layout' });
  } catch (error) {
    console.error('Layout agent error:', error);
    return NextResponse.json({ error: 'Layout optimization service unavailable' }, { status: 503 });
  }
}
