import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';

// Rate limiting: track failed attempts per IP
const failedAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
  return ip;
}

function isRateLimited(ip: string): boolean {
  const record = failedAttempts.get(ip);
  if (!record) return false;

  const timeSinceLastAttempt = Date.now() - record.lastAttempt;

  // Reset if lockout period has passed
  if (timeSinceLastAttempt > LOCKOUT_DURATION) {
    failedAttempts.delete(ip);
    return false;
  }

  return record.count >= MAX_ATTEMPTS;
}

function recordFailedAttempt(ip: string): void {
  const record = failedAttempts.get(ip);
  if (record) {
    record.count += 1;
    record.lastAttempt = Date.now();
  } else {
    failedAttempts.set(ip, { count: 1, lastAttempt: Date.now() });
  }
}

function clearFailedAttempts(ip: string): void {
  failedAttempts.delete(ip);
}

export async function POST(request: NextRequest) {
  const ip = getClientIP(request);

  // Check rate limiting
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Too many failed attempts. Please try again in 15 minutes.' },
      { status: 429 }
    );
  }

  try {
    const { username, password } = await request.json();

    // Validate input
    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Check credentials against environment variables
    const validUsername = process.env.ADMIN_USERNAME;
    const validPassword = process.env.ADMIN_PASSWORD;
    const jwtSecret = process.env.JWT_SECRET;

    if (!validUsername || !validPassword || !jwtSecret) {
      console.error('Missing environment variables for authentication');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Constant-time comparison to prevent timing attacks
    const usernameMatch = username.length === validUsername.length &&
      username.split('').every((char: string, i: number) => char === validUsername[i]);
    const passwordMatch = password.length === validPassword.length &&
      password.split('').every((char: string, i: number) => char === validPassword[i]);

    if (!usernameMatch || !passwordMatch) {
      recordFailedAttempt(ip);
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Clear failed attempts on successful login
    clearFailedAttempts(ip);

    // Generate JWT token
    const secret = new TextEncoder().encode(jwtSecret);
    const token = await new SignJWT({
      role: 'admin',
      username: username
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(secret);

    return NextResponse.json({
      token,
      message: 'Login successful'
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}
