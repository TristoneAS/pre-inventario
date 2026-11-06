import { connection } from "next/server";
import { requireAdmin } from "../../../libs/adminSession";
import {
  activarInventario,
  inventarioActivo,
  inventarioTieneFoto,
} from "../../../libs/inventarios";

export async function GET() {
  await connection();

  try {
    const inventario = await inventarioActivo();
    if (!inventario) return Response.json({ inventario: null });
    return Response.json({
      inventario: {
        ...inventario,
        tieneFoto: await inventarioTieneFoto(inventario.inventario_id),
      },
    });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "No se pudo consultar el inventario activo" },
      { status: 500 },
    );
  }
}

export async function PUT(request) {
  await connection();
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const body = await request.json();
    const inventario = await activarInventario(body?.inventario_id);
    return Response.json({ inventario });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: error.message || "No se pudo activar el inventario" },
      { status: error.status || 500 },
    );
  }
}
