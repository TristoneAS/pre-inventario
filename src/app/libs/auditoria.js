import { empleados } from "./empleados";
import { inventario } from "./inventario";

export async function obtenerAuditor(empId) {
  const [rows] = await empleados.query(
    `SELECT e.emp_id, e.emp_nombre, a.acc_inventario
     FROM del_empleados e
     LEFT JOIN del_accesos a ON a.acc_id = e.emp_id
     WHERE e.emp_id = ?
     LIMIT 1`,
    [empId],
  );

  const empleado = rows[0];
  const nivel = Number(empleado?.acc_inventario);
  if (!empleado || (nivel !== 2 && nivel !== 3)) return null;
  return empleado;
}

export async function estadoRack(rack) {
  const [rows] = await inventario.query(
    "SELECT estado_auditoria FROM auditoria WHERE id_ubicacion = ? LIMIT 1",
    [rack],
  );
  return Number(rows[0]?.estado_auditoria) === 1 ? 1 : 0;
}

export async function actualizarEstadoRack(rack, empId) {
  const [rows] = await inventario.query(
    `SELECT COUNT(*) total,
            SUM(CASE WHEN serial_auditado = 1 THEN 1 ELSE 0 END) auditados
     FROM captura
     WHERE rack = ?`,
    [rack],
  );
  const total = Number(rows[0]?.total || 0);
  const auditados = Number(rows[0]?.auditados || 0);
  const completo = total > 0 && total === auditados ? 1 : 0;

  const [areaRows] = await inventario.query(
    `SELECT CASE storage_location
              WHEN 'green' THEN 'extrusion'
              WHEN 'mp' THEN 'materia-prima'
              ELSE storage_location
            END AS area
     FROM ubicaciones_conteo
     WHERE rack = ?
     LIMIT 1`,
    [rack],
  );
  const area = areaRows[0]?.area || null;

  await inventario.query(
    `INSERT INTO auditoria
       (id_ubicacion, ubicacion, area_ubicacion, emp_id, estado_auditoria)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       area_ubicacion = VALUES(area_ubicacion),
       emp_id = VALUES(emp_id),
       estado_auditoria = VALUES(estado_auditoria)`,
    [rack, rack, area, empId, completo],
  );

  return completo;
}
