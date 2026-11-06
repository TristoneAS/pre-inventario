import { connection } from "next/server";
import { requireAdmin } from "../../../libs/adminSession";
import { inventario } from "../../../libs/inventario";
import { inventarioActivo } from "../../../libs/inventarios";

export async function GET(request) {
  await connection();
  const denied = await requireAdmin();
  if (denied) return denied;

  const codigo = (new URL(request.url).searchParams.get("codigo") || "").trim();
  if (!codigo) {
    return Response.json({ material: null });
  }

  try {
    const ciclo = await inventarioActivo();
    if (!ciclo) return Response.json({ material: null });
    const [rows] = await inventario.query(
      `SELECT material, material_description
       FROM material
       WHERE material = ? AND inventario_id = ?
       LIMIT 1`,
      [codigo, ciclo.inventario_id],
    );
    return Response.json({ material: rows[0] || null });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "No se pudo consultar el material" },
      { status: 500 },
    );
  }
}
