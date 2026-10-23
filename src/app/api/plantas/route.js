import { connection } from "next/server";
import { inventario } from "../../libs/inventario";

export async function GET() {
  await connection();

  try {
    const [rows] = await inventario.query(
      `SELECT DISTINCT planta
       FROM ubicaciones_conteo
       WHERE planta IS NOT NULL AND planta <> ''
       ORDER BY planta`,
    );
    return Response.json({
      success: true,
      data: rows.map((row) => row.planta),
    });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "No se pudieron consultar las plantas" },
      { status: 500 },
    );
  }
}
