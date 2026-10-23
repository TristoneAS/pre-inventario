import { requireAdmin } from "../../libs/adminSession";
import {
  appendMaterial,
  crecerProgreso,
  leerConsulta,
  loadedOrigins,
  toMaterialRow,
} from "../../libs/cargarMaterial";

const ZLX03_URL = process.env.ZLX03_API_URL;

export async function POST() {
  const denied = await requireAdmin();
  if (denied) return denied;

  if (!ZLX03_URL) {
    return Response.json(
      { error: "Falta ZLX03_API_URL en .env.local" },
      { status: 500 },
    );
  }

  const loaded = await loadedOrigins();
  if (loaded.some((row) => row.origen === "ZLX03")) {
    return Response.json(
      { error: "ZLX03 ya fue cargado", alreadyLoaded: true },
      { status: 409 },
    );
  }

  const detenerAvance = crecerProgreso(
    "ZLX03",
    3,
    45,
    20000,
    "Consultando ZLX03",
  );

  let response;
  try {
    response = await fetch(ZLX03_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "",
      cache: "no-store",
    });
  } finally {
    detenerAvance();
  }

  const textBody = await leerConsulta(response, "ZLX03");
  let payload;

  try {
    payload = JSON.parse(textBody);
  } catch {
    return Response.json(
      { error: "La respuesta de ZLX03 no es JSON" },
      { status: 502 },
    );
  }

  if (!response.ok) {
    return Response.json(
      {
        error: payload?.error || payload?.message || "Error al consultar ZLX03",
      },
      { status: response.status },
    );
  }

  if (!Array.isArray(payload?.data) || payload.data.length === 0) {
    return Response.json(
      { error: "La consulta ZLX03 no devolvió registros" },
      { status: 502 },
    );
  }

  try {
    const result = await appendMaterial(
      "ZLX03",
      payload.data.map(toMaterialRow),
    );
    if (result.alreadyLoaded) {
      return Response.json(
        { error: "ZLX03 ya fue cargado", alreadyLoaded: true },
        { status: 409 },
      );
    }

    return Response.json({
      inserted: result.inserted,
      truncated: Boolean(payload.truncated),
    });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "No se pudo guardar ZLX03 en la tabla material" },
      { status: 500 },
    );
  }
}
