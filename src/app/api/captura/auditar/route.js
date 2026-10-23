import { obtenerAuditor } from "../../../libs/auditoria";
import { inventario } from "../../../libs/inventario";

export async function POST(request) {
  try {
    const body = await request.json();
    const serial = Number.parseInt(String(body?.serial ?? "").trim(), 10);
    const empId = Number.parseInt(String(body?.emp_id ?? "").trim(), 10);

    if (!Number.isInteger(serial) || serial <= 0) {
      return Response.json(
        { error: "Ingrese un serial válido" },
        { status: 400 },
      );
    }
    if (!Number.isInteger(empId) || empId <= 0) {
      return Response.json(
        { error: "La sesión no tiene un empleado" },
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

    const [rows] = await inventario.query(
      `SELECT captura_id, serial, material, material_description, cantidad,
              ubicacion, rack, planta, num_empleado, emp_nombre, fecha, serial_auditado
       FROM captura
       WHERE serial = ?
       LIMIT 1`,
      [serial],
    );
    const captura = rows[0];
    if (!captura) {
      return Response.json(
        { error: "Ese serial no está capturado" },
        { status: 404 },
      );
    }

    if (Number(captura.serial_auditado) > 0) {
      return Response.json(
        {
          error: "Este serial ya fue auditado",
          captura,
        },
        { status: 409 },
      );
    }

    await inventario.query(
      "UPDATE captura SET serial_auditado = ? WHERE serial = ? AND serial_auditado = 0",
      [auditor.emp_id, serial],
    );

    if (captura.ubicacion) {
      await inventario.query(
        `INSERT INTO auditoria (id_ubicacion, ubicacion, area_ubicacion, emp_id, estado_auditoria)
         VALUES (?, ?, ?, ?, 1)
         ON DUPLICATE KEY UPDATE emp_id = VALUES(emp_id), estado_auditoria = 1`,
        [
          String(captura.ubicacion).slice(0, 45),
          String(captura.ubicacion).slice(0, 45),
          captura.planta ? String(captura.planta).slice(0, 45) : null,
          auditor.emp_id,
        ],
      );
    }

    return Response.json({
      ok: true,
      captura: {
        ...captura,
        serial_auditado: auditor.emp_id,
        auditor_nombre: auditor.emp_nombre,
      },
    });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "No se pudo auditar el serial" },
      { status: 500 },
    );
  }
}
