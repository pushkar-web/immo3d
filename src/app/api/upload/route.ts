import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.svg', '.dxf', '.dwg'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!allowedExtensions.includes(ext)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${ext}. Allowed: ${allowedExtensions.join(', ')}` },
        { status: 400 }
      );
    }

    // Save file to temp directory (works on Vercel serverless + local)
    const uploadDir = join(tmpdir(), 'immo3d-uploads');
    await mkdir(uploadDir, { recursive: true });

    const fileId = uuidv4();
    const filename = `${fileId}${ext}`;
    const filepath = join(uploadDir, filename);

    const bytes = await file.arrayBuffer();
    await writeFile(filepath, Buffer.from(bytes));

    return NextResponse.json({
      fileId,
      filename,
      originalName: file.name,
      size: file.size,
      url: `/uploads/${filename}`,
      filePath: filepath,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
