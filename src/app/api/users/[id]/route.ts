import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const adminRoleId = req.headers.get('x-user-role');

    // Only administrators can edit user profiles
    if (adminRoleId !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { roleId, departmentId } = await req.json();

    const updateData: any = {};
    if (roleId !== undefined) updateData.roleId = roleId;
    if (departmentId !== undefined) updateData.departmentId = departmentId;

    const user = await db.user.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ user });
  } catch (error: any) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
