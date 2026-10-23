import { connection } from "next/server";
import { areaById } from "../../libs/areas";
import { inventario } from "../../libs/inventario";

export async function GET(request) {
  await connection();

  const { searchParams } = new URL(request.url);
  const planta = (searchParams.get("planta") || "").trim();
  const rack = (searchParams.get("rack") || "").trim();
  const area = areaById(searchParams.get("area") || "");

  if (!planta || !rack || !area) {
    return Response.json({ bins: [] });
  }

  try {
    const [rows] = await inventario.query(
      `SELECT storage_bin
       FROM ubicaciones_conteo
       WHERE planta = ? AND rack = ? AND storage_location = ?
         AND storage_bin IS NOT NULL AND storage_bin <> ''
       ORDER BY storage_bin`,
      [planta, rack, area.location],
    );
    return Response.json({
      bins: rows.map((row) => ({ id: row.storage_bin, name: row.storage_bin })),
    });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "No se pudieron consultar las ubicaciones" },
      { status: 500 },
    );
  }
}
