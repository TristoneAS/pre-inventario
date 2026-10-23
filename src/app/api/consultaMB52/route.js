import { requireAdmin } from "../../libs/adminSession";
import {
  appendMaterial,
  crecerProgreso,
  leerConsulta,
  loadedOrigins,
  toMaterialRow,
} from "../../libs/cargarMaterial";

const MB52_URL = process.env.MB52_API_URL;

export async function POST() {
  const denied = await requireAdmin();
  if (denied) return denied;

  if (!MB52_URL) {
    return Response.json(
      { error: "Falta MB52_API_URL en .env.local" },
      { status: 500 },
    );
  }

  const loaded = await loadedOrigins();
  if (loaded.some((row) => row.origen === "MB52")) {
    return Response.json(
      { error: "MB52 ya fue cargado", alreadyLoaded: true },
      { status: 409 },
    );
  }

  const detenerAvance = crecerProgreso(
    "MB52",
    3,
    45,
    35000,
    "Consultando MB52",
  );

  let response;
  try {
    response = await fetch(MB52_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        material: "*",
        plant: "5210",
      }),
      cache: "no-store",
    });
  } finally {
    detenerAvance();
  }

  const textBody = await leerConsulta(response, "MB52");
  let payload;

  try {
    payload = JSON.parse(textBody);
  } catch {
    return Response.json(
      { error: "La respuesta de MB52 no es JSON" },
      { status: 502 },
    );
  }

  if (!response.ok) {
    return Response.json(
      { error: payload?.error || payload?.message || "Error al consultar MB52" },
      { status: response.status },
    );
  }

  if (!Array.isArray(payload?.data) || payload.data.length === 0) {
    return Response.json(
      { error: "La consulta MB52 no devolvió registros" },
      { status: 502 },
    );
  }

  try {
    const result = await appendMaterial("MB52", payload.data.map(toMaterialRow));
    if (result.alreadyLoaded) {
      return Response.json(
        { error: "MB52 ya fue cargado", alreadyLoaded: true },
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
      { error: "No se pudo guardar MB52 en la tabla material" },
      { status: 500 },
    );
  }
}
