import { connection } from "next/server";
import { inventario } from "../../libs/inventario";

export async function GET(request) {
  await connection();

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();
  const planta = (searchParams.get("planta") || "").trim();

  if (q.length < 1) {
    return Response.json({ rows: [] });
  }

  try {
    const like = `%${q}%`;
    const [rows] = await inventario.query(
      `SELECT rack, storage_bin AS ubicacion, storage_location, planta
       FROM ubicaciones_conteo
       WHERE (? = '' OR planta = ?)
         AND (storage_bin LIKE ? OR rack LIKE ?)
       ORDER BY storage_bin
       LIMIT 15`,
      [planta, planta, like, like],
    );

    return Response.json({ rows });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "No se pudieron consultar las ubicaciones" },
      { status: 500 },
    );
  }
}
