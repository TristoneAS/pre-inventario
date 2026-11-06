import { connection } from "next/server";
import { materialPorSerial, serialCapturado } from "../../../libs/guardarCaptura";
import { inventarioActivo, inventarioTieneFoto } from "../../../libs/inventarios";

export async function GET(request) {
  await connection();

  const serial = (new URL(request.url).searchParams.get("serial") || "").trim();
  if (!/^\d+$/.test(serial)) {
    return Response.json({
      exists: false,
      isCaptured: false,
      material: null,
      message: "Serial no encontrado en la base de datos",
    });
  }

  try {
    const ciclo = await inventarioActivo();
    if (!ciclo) {
      return Response.json({
        exists: false,
        isCaptured: false,
        sinInventario: true,
        material: null,
        message: "No hay un inventario activo",
      });
    }
    if (!(await inventarioTieneFoto(ciclo.inventario_id))) {
      return Response.json({
        exists: false,
        isCaptured: false,
        sinFoto: true,
        material: null,
        message: `El inventario ${ciclo.nombre} no tiene foto cargada`,
      });
    }
    const material = await materialPorSerial(serial);
    const isCaptured = await serialCapturado(serial, ciclo.inventario_id);
    return Response.json({
      exists: Boolean(material),
      isCaptured,
      material,
      message: material ? undefined : "Serial no encontrado en la base de datos",
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Error al verificar el serial" }, { status: 500 });
  }
}
