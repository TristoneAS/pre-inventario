import { connection } from "next/server";
import { insertarCaptura, serialCapturado } from "../../../libs/guardarCaptura";

export async function GET(request) {
  await connection();

  const serial = (new URL(request.url).searchParams.get("serial") || "").trim();
  if (!/^\d+$/.test(serial)) {
    return Response.json({ exists: false, serial: null });
  }

  try {
    const exists = await serialCapturado(serial);
    return Response.json({ exists, serial: exists ? serial : null });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Error al verificar el serial" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    await insertarCaptura({
      serial: body.serial,
      employeeId: body.employeeId,
      bin: body.bin,
      rack: body.rack,
      area: body.area,
      planta: body.planta,
      material: body.partNumber,
      material_description: body.materialDescription,
      quantity: body.quantity,
      serial_obsoleto: body.isObsolete ? 1 : 0,
    });
    return Response.json({ ok: true });
  } catch (error) {
    console.error(error);
    if (error?.code === "ER_DUP_ENTRY") {
      return Response.json(
        { error: "Este serial ya ha sido capturado" },
        { status: 409 },
      );
    }
    return Response.json(
      { error: error.message || "Error al guardar el serial" },
      { status: error.status || 500 },
    );
  }
}
