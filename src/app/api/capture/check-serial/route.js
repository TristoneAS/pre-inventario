import { connection } from "next/server";
import { materialPorSerial, serialCapturado } from "../../../libs/guardarCaptura";

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
    const material = await materialPorSerial(serial);
    const isCaptured = await serialCapturado(serial);
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
