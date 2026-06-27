import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const roleId = req.nextUrl.searchParams.get('role'); // e.g. AGENT, MANAGER
    const departmentId = req.nextUrl.searchParams.get('departmentId');

    const filter: any = {};
    if (roleId) filter.roleId = roleId;
    if (departmentId) filter.departmentId = departmentId;

    const users = await db.user.findMany({
      where: filter,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        roleId: true,
        departmentId: true,
        department: { select: { name: true } },
      },
      orderBy: [
        { firstName: 'asc' },
        { lastName: 'asc' },
      ],
    });

    return NextResponse.json({ users });
  } catch (error: any) {
    console.error('Users API error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
