import { connection } from "next/server";
import { inventario } from "../../libs/inventario";

export async function GET() {
  await connection();

  try {
    const [rows] = await inventario.query(
      `SELECT u.rack AS id_ubicacion,
              CASE u.storage_location
                WHEN 'green' THEN 'extrusion'
                WHEN 'mp' THEN 'materia-prima'
                ELSE u.storage_location
              END AS area_ubicacion,
              COALESCE(MAX(a.estado_auditoria), 0) AS estado_auditoria
       FROM ubicaciones_conteo u
       LEFT JOIN auditoria a ON a.id_ubicacion = u.rack
       WHERE u.rack IS NOT NULL AND u.rack <> ''
       GROUP BY u.rack, u.storage_location
       ORDER BY area_ubicacion, u.rack`,
    );
    return Response.json(rows);
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "No se pudo consultar la auditoría" },
      { status: 500 },
    );
  }
}
