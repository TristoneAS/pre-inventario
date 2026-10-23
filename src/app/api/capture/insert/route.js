import { insertarCaptura } from "../../../libs/guardarCaptura";

export async function POST(request) {
  try {
    const body = await request.json();
    const items = Array.isArray(body?.items) ? body.items : [];
    if (!items.length) {
      return Response.json({ error: "No hay seriales para guardar" }, { status: 400 });
    }

    for (const item of items) {
      await insertarCaptura(item);
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error(error);
    if (error?.code === "ER_DUP_ENTRY") {
      return Response.json(
        { error: "Algunos seriales no se guardaron correctamente. Por favor verifique todos los seriales escaneados." },
        { status: 409 },
      );
    }
    return Response.json(
      { error: error.message || "Error al guardar" },
      { status: error.status || 500 },
    );
  }
}
