import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password required' },
        { status: 400 }
      );
    }

    // In production, hash password and store in DB
    return NextResponse.json(
      {
        message: 'Account created successfully',
        user: { id: `user-${Date.now()}`, email, name },
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
