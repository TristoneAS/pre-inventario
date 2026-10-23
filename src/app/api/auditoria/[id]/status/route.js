import { connection } from "next/server";
import { estadoRack } from "../../../../libs/auditoria";

export async function GET(_request, { params }) {
  await connection();

  const { id } = await params;
  const rack = decodeURIComponent(id || "").trim();

  try {
    return Response.json({ estado_auditoria: await estadoRack(rack) });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "No se pudo consultar el estado de auditoría" },
      { status: 500 },
    );
  }
}
