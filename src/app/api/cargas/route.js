import { connection } from "next/server";
import { requireAdmin } from "../../libs/adminSession";
import { loadedOrigins } from "../../libs/cargarMaterial";

export async function GET() {
  await connection();
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const rows = await loadedOrigins();
    const loaded = Object.fromEntries(rows.map((row) => [row.origen, true]));
    return Response.json({
      MB52: Boolean(loaded.MB52),
      ZLX03: Boolean(loaded.ZLX03),
    });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "No se pudo consultar las cargas" },
      { status: 500 },
    );
  }
}
