import { connection } from "next/server";
import { areaById } from "../../libs/areas";
import { inventario } from "../../libs/inventario";

export async function GET(request) {
  await connection();

  const { searchParams } = new URL(request.url);
  const planta = (searchParams.get("planta") || "").trim();
  const area = areaById(searchParams.get("area") || "");

  if (!planta || !area) {
    return Response.json({ racks: [] });
  }

  try {
    const [rows] = await inventario.query(
      `SELECT DISTINCT rack
       FROM ubicaciones_conteo
       WHERE planta = ? AND storage_location = ? AND rack IS NOT NULL AND rack <> ''
       ORDER BY rack`,
      [planta, area.location],
    );
    return Response.json({
      racks: rows.map((row) => ({ id: row.rack, name: row.rack })),
    });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "No se pudieron consultar los racks" },
      { status: 500 },
    );
  }
}
