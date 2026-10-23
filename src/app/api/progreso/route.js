import { connection } from "next/server";
import { requireAdmin } from "../../libs/adminSession";
import { getProgress, resetProgress } from "../../libs/cargarMaterial";

const ORIGINS = new Set(["MB52", "ZLX03", "limpiar"]);

export async function GET(request) {
  await connection();
  const denied = await requireAdmin();
  if (denied) return denied;
  const origen = new URL(request.url).searchParams.get("origen");
  if (!ORIGINS.has(origen)) {
    return Response.json({ error: "Origen no válido" }, { status: 400 });
  }
  return Response.json(getProgress(origen));
}

export async function DELETE(request) {
  await connection();
  const denied = await requireAdmin();
  if (denied) return denied;
  const origen = new URL(request.url).searchParams.get("origen");
  if (!ORIGINS.has(origen)) {
    return Response.json({ error: "Origen no válido" }, { status: 400 });
  }
  resetProgress(origen);
  return Response.json(getProgress(origen));
}
