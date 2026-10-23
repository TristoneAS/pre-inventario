import { connection } from "next/server";
import { requireAdmin } from "../../../libs/adminSession";
import { clearMaterial } from "../../../libs/cargarMaterial";

export async function POST() {
  await connection();
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    await clearMaterial();
    return Response.json({ ok: true });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "No se pudo limpiar la tabla material" },
      { status: 500 },
    );
  }
}
