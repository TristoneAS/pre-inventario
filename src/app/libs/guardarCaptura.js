import { empleados } from "./empleados";
import { inventario } from "./inventario";

function text(value, max) {
  const clean = String(value ?? "").trim();
  if (!clean) return null;
  return clean.slice(0, max);
}

export async function empleadoActivo(empId) {
  const [rows] = await empleados.query(
    "SELECT emp_id, emp_nombre, emp_activo FROM del_empleados WHERE emp_id = ? LIMIT 1",
    [empId],
  );
  const empleado = rows[0];
  if (!empleado || Number(empleado.emp_activo) !== 1) return null;
  return empleado;
}

export async function materialPorSerial(serial) {
  const [rows] = await inventario.query(
    `SELECT material, material_description, stock
     FROM material
     WHERE storage_unit = ?
     LIMIT 1`,
    [serial],
  );
  return rows[0] || null;
}

export async function serialCapturado(serial) {
  const [rows] = await inventario.query(
    "SELECT serial FROM captura WHERE serial = ? LIMIT 1",
    [serial],
  );
  return Boolean(rows[0]);
}

export async function descripcionParte(partNumber) {
  const [rows] = await inventario.query(
    `SELECT material_description
     FROM material
     WHERE material = ? AND material_description IS NOT NULL
     LIMIT 1`,
    [partNumber],
  );
  return rows[0]?.material_description || null;
}

export async function insertarCaptura(item) {
  const empleado = await empleadoActivo(Number(item.employeeId));
  if (!empleado) {
    const error = new Error("El empleado no está activo");
    error.status = 403;
    throw error;
  }

  const serial = Number(item.serial);
  if (!Number.isSafeInteger(serial) || serial <= 0) {
    const error = new Error("Serial inválido");
    error.status = 400;
    throw error;
  }

  await inventario.query(
    `INSERT INTO captura
      (captura_grupo, serial, material, material_description, cantidad,
       ubicacion, num_empleado, emp_nombre, fecha, serial_obsoleto,
       serial_auditado, rack, planta)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, 0, ?, ?)`,
    [
      text(item.area, 45),
      serial,
      text(item.material, 45),
      text(item.material_description, 250),
      Number(item.stock ?? item.quantity),
      text(item.bin, 45),
      empleado.emp_id,
      text(empleado.emp_nombre, 250),
      item.serial_obsoleto || item.isObsolete ? 1 : 0,
      text(item.rack, 45),
      text(item.planta, 45),
    ],
  );
}
