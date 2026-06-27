import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const { email, password, firstName, lastName, departmentId, roleId } = await req.json();

    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'Required fields: email, password, firstName, lastName' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 400 }
      );
    }

    // Default role is AGENT if not specified
    const targetRoleId = roleId || 'AGENT';

    // Hash the password
    const hashed = await bcrypt.hash(password, 10);

    const user = await db.user.create({
      data: {
        email,
        passwordHash: hashed,
        firstName,
        lastName,
        roleId: targetRoleId,
        departmentId: departmentId || null,
      },
      include: {
        role: true,
        department: true,
      },
    });

    return NextResponse.json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role.name,
        department: user.department?.name || null,
      },
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
