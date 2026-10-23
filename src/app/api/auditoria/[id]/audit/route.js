import { obtenerAuditor, actualizarEstadoRack } from "../../../../libs/auditoria";
import { inventario } from "../../../../libs/inventario";

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const rack = decodeURIComponent(id || "").trim();
    const body = await request.json();
    const scanned = String(body?.serial ?? "").trim();
    const empId = Number.parseInt(String(body?.emp_id ?? ""), 10);

    if (!/^[SsMm]\d+$/.test(scanned)) {
      return Response.json(
        { error: "El serial debe comenzar con S, s, M o m" },
        { status: 400 },
      );
    }

    const auditor = await obtenerAuditor(empId);
    if (!auditor) {
      return Response.json(
        { error: "No tiene permiso para auditar inventario" },
        { status: 403 },
      );
    }

    const serial = scanned.substring(1);
    const [rows] = await inventario.query(
      `SELECT serial, serial_auditado
       FROM captura
       WHERE rack = ? AND serial = ?
       LIMIT 1`,
      [rack, serial],
    );
    const captura = rows[0];

    if (!captura) {
      return Response.json(
        { error: "El serial no pertenece a este rack" },
        { status: 404 },
      );
    }
    if (Number(captura.serial_auditado) === 1) {
      return Response.json(
        { error: "Este serial ya fue auditado" },
        { status: 409 },
      );
    }

    await inventario.query(
      "UPDATE captura SET serial_auditado = 1 WHERE rack = ? AND serial = ?",
      [rack, serial],
    );

    const estado = await actualizarEstadoRack(rack, auditor.emp_id);
    return Response.json({ ok: true, estado_auditoria: estado });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Error al auditar serial" },
      { status: 500 },
    );
  }
}
