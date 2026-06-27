import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ user: null });
    }

    // Fetch latest user data from DB to reflect any role/department updates
    const user = await db.user.findUnique({
      where: { id: session.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        roleId: true,
        departmentId: true,
        role: { select: { name: true } },
        department: { select: { name: true } },
      },
    });

    if (!user) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.roleId, // ADMIN, MANAGER, AGENT
        roleName: user.role.name,
        departmentId: user.departmentId,
        departmentName: user.department?.name || null,
      },
    });
  } catch (error: any) {
    console.error('Session API error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
