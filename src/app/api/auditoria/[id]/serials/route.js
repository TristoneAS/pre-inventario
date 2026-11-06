import { connection } from "next/server";
import { inventario } from "../../../../libs/inventario";
import { inventarioActivo } from "../../../../libs/inventarios";

export async function GET(_request, { params }) {
  await connection();

  const { id } = await params;
  const rack = decodeURIComponent(id || "").trim();

  try {
    const activo = await inventarioActivo();
    if (!activo) return Response.json([]);
    const [rows] = await inventario.query(
      `SELECT serial, material,
              CASE WHEN serial_auditado = 1 THEN 1 ELSE NULL END AS serial_auditado
       FROM captura
       WHERE rack = ? AND inventario_id = ?
       ORDER BY serial`,
      [rack, activo.inventario_id],
    );
    return Response.json(rows);
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "No se pudieron consultar los seriales" },
      { status: 500 },
    );
  }
}
