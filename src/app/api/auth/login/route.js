import { connection, NextResponse } from "next/server";
import { empleados } from "../../../libs/empleados";
import { clearAdminCookie } from "../../../libs/adminSession";

export async function POST(request) {
  await connection();
  try {
    const body = await request.json();
    const empId = String(body?.emp_id ?? "").trim();

    if (!/^\d+$/.test(empId)) {
      return Response.json(
        { success: false, error: "Ingrese su ID de empleado" },
        { status: 400 },
      );
    }

    const [rows] = await empleados.query(
      `SELECT e.emp_id, e.emp_nombre, e.emp_alias, e.emp_activo, a.acc_inventario
       FROM del_empleados e
       LEFT JOIN del_accesos a ON a.acc_id = e.emp_id
       WHERE e.emp_id = ?
       LIMIT 1`,
      [Number(empId)],
    );

    const empleado = rows[0];

    if (!empleado) {
      return Response.json(
        { success: false, error: "El ID de empleado no está registrado" },
        { status: 404 },
      );
    }

    const accessLevel =
      empleado.acc_inventario == null
        ? null
        : Number(empleado.acc_inventario);
    const permissions =
      accessLevel === 2 || accessLevel === 3
        ? ["capture", "audit"]
        : ["capture"];

    const result = NextResponse.json({
      success: true,
      permissions,
      empleado: {
        emp_id: empleado.emp_id,
        emp_nombre: empleado.emp_nombre,
        emp_alias: empleado.emp_alias,
        acc_inventario: accessLevel,
        permissions,
        isAdmin: false,
      },
    });
    clearAdminCookie(result, request);
    return result;
  } catch (error) {
    console.error(error);
    return Response.json(
      { success: false, error: "No se pudo iniciar sesión" },
      { status: 500 },
    );
  }
}
