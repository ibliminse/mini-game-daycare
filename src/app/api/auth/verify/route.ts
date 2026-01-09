import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { valid: false, error: 'Token is required' },
        { status: 400 }
      );
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return NextResponse.json(
        { valid: false, error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const secret = new TextEncoder().encode(jwtSecret);
    const { payload } = await jwtVerify(token, secret);

    return NextResponse.json({
      valid: true,
      role: payload.role,
      username: payload.username
    });

  } catch (error) {
    // Token is invalid or expired
    return NextResponse.json(
      { valid: false, error: 'Invalid or expired token' },
      { status: 401 }
    );
  }
}
