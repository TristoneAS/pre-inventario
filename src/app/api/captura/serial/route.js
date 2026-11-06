import { connection } from "next/server";
import { inventario } from "../../../libs/inventario";
import { inventarioActivo } from "../../../libs/inventarios";

export async function GET(request) {
  await connection();

  const serial = Number.parseInt(
    new URL(request.url).searchParams.get("serial") || "",
    10,
  );
  if (!Number.isInteger(serial) || serial <= 0) {
    return Response.json({ error: "Ingrese un serial válido" }, { status: 400 });
  }

  try {
    const activo = await inventarioActivo();
    if (!activo) {
      return Response.json(
        { error: "No hay un inventario activo" },
        { status: 409 },
      );
    }

    const [rows] = await inventario.query(
      `SELECT captura_id, serial, material, material_description, cantidad,
              ubicacion, rack, planta, num_empleado, emp_nombre, fecha, serial_auditado
       FROM captura
       WHERE serial = ? AND inventario_id = ?
       LIMIT 1`,
      [serial, activo.inventario_id],
    );

    if (!rows[0]) {
      return Response.json(
        { error: "Ese serial no está capturado" },
        { status: 404 },
      );
    }

    return Response.json({ captura: rows[0] });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "No se pudo consultar el serial" },
      { status: 500 },
    );
  }
}
