import { connection, NextResponse } from "next/server";
import { clearAdminCookie, readAdminSession } from "../../../libs/adminSession";

export async function GET() {
  const session = await readAdminSession();
  if (!session) {
    return NextResponse.json({ admin: false });
  }

  return NextResponse.json({
    admin: true,
    empleado: {
      emp_id: session.emp_id ?? null,
      emp_nombre: session.emp_nombre || session.username,
      emp_alias: session.username,
      acc_inventario: null,
      permissions: ["capture", "audit", "admin"],
      isAdmin: true,
      roles: ["Inventario_Admin"],
    },
  });
}

export async function DELETE(request) {
  await connection();
  const response = NextResponse.json({ ok: true });
  clearAdminCookie(response, request);
  return response;
}
