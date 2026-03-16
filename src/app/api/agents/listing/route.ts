import { NextRequest, NextResponse } from 'next/server';
import { callGroqAI } from '@/lib/groq';
import { getProject } from '@/lib/projects';

const LISTING_SYSTEM_PROMPT = `You are a real estate marketing copywriter for Immo3D.
Generate compelling, professional property listing descriptions that:
1. Highlight key features and selling points
2. Use vivid, aspirational language
3. Include specific details about rooms, materials, and finishes
4. Appeal to target buyers/renters
5. Are SEO-friendly

Structure the listing with:
- A catchy headline
- 2-3 paragraph description
- Key highlights as bullet points
- A closing call-to-action

Keep the tone professional yet warm. Avoid overused clichés.`;

export async function POST(request: NextRequest) {
  try {
    const { projectId } = await request.json();

    let propertyDesc = 'A modern residential property with multiple rooms and contemporary design.';

    if (projectId) {
      const project = getProject(projectId);
      if (project) {
        const totalRooms = project.layoutData?.floors.reduce(
          (sum, f) => sum + f.flats.reduce((s, flat) => s + flat.rooms.length, 0), 0
        ) || 0;
        const flatsPerFloor = project.layoutData?.floors[0]?.flats.length || 0;
        const allRoomTypes = project.layoutData?.floors[0]?.flats.flatMap((flat) => flat.rooms.map((r) => r.type)) || [];
        const uniqueTypes = Array.from(new Set(allRoomTypes));

        propertyDesc = `Property: "${project.name}"
Type: ${project.buildingType}
Floors: ${project.floors}
Flats per floor: ${flatsPerFloor}
Design style: ${project.style}
Total rooms: ${totalRooms}
Building size: ${project.layoutData?.buildingWidth || 0}m × ${project.layoutData?.buildingDepth || 0}m per floor
Room types: ${uniqueTypes.join(', ')}`;
      }
    }

    const content = await callGroqAI(
      LISTING_SYSTEM_PROMPT,
      `Generate a property listing for:\n\n${propertyDesc}`
    );

    return NextResponse.json({ content, type: 'listing' });
  } catch (error) {
    console.error('Listing agent error:', error);
    return NextResponse.json({ error: 'Listing service unavailable' }, { status: 503 });
  }
}
