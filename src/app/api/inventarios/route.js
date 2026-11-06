import { connection } from "next/server";
import { requireAdmin } from "../../libs/adminSession";
import { crearInventario, listarInventarios } from "../../libs/inventarios";

export async function GET() {
  await connection();
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const inventarios = await listarInventarios();
    return Response.json({ inventarios });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "No se pudieron consultar los inventarios" },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  await connection();
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const body = await request.json();
    const inventario = await crearInventario(body?.nombre);
    return Response.json({ inventario }, { status: 201 });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: error.message || "No se pudo crear el inventario" },
      { status: error.status || 500 },
    );
  }
}
