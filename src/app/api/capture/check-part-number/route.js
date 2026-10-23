import { connection } from "next/server";
import { descripcionParte } from "../../../libs/guardarCaptura";

export async function GET(request) {
  await connection();

  const partNumber = (new URL(request.url).searchParams.get("partNumber") || "").trim();
  if (!partNumber) {
    return Response.json(
      { error: "El número de parte no existe en la base de datos" },
      { status: 404 },
    );
  }

  try {
    const material_description = await descripcionParte(partNumber);
    if (!material_description) {
      return Response.json(
        { error: "El número de parte no existe en la base de datos" },
        { status: 404 },
      );
    }
    return Response.json({
      success: true,
      data: { material_description },
    });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Error al verificar el número de parte" },
      { status: 500 },
    );
  }
}
