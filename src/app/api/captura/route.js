import { connection } from "next/server";
import { requireAdmin } from "../../libs/adminSession";
import { empleados } from "../../libs/empleados";
import { excelResponse } from "../../libs/excel";
import { inventario } from "../../libs/inventario";

const CAPTURA_COLUMNS = [
  { key: "captura_id", label: "ID" },
  { key: "serial", label: "Serial" },
  { key: "material", label: "Material" },
  { key: "material_description", label: "Descripción" },
  { key: "cantidad", label: "Cantidad" },
  { key: "ubicacion", label: "Ubicación" },
  { key: "rack", label: "Rack" },
  { key: "planta", label: "Planta" },
  { key: "emp_nombre", label: "Empleado" },
  { key: "fecha", label: "Fecha" },
  { key: "auditado", label: "Auditado" },
];

const PAGE_SIZES = new Set([10, 30, 50, 100]);

export async function GET(request) {
  await connection();
  const denied = await requireAdmin();
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();
  const pageSize = PAGE_SIZES.has(Number(searchParams.get("pageSize")))
    ? Number(searchParams.get("pageSize"))
    : 30;
  const requestedPage = Math.max(
    1,
    Number.parseInt(searchParams.get("page") || "1", 10) || 1,
  );

  const empleado = Number.parseInt(searchParams.get("empleado") || "", 10);
  const like = `%${q}%`;
  const filters = [];
  const filterParams = [];

  if (q) {
    filters.push(
      `(CAST(captura_id AS CHAR) LIKE ?
        OR CAST(serial AS CHAR) LIKE ?
        OR material LIKE ?
        OR material_description LIKE ?
        OR ubicacion LIKE ?
        OR rack LIKE ?
        OR planta LIKE ?
        OR emp_nombre LIKE ?
        OR CAST(cantidad AS CHAR) LIKE ?)`,
    );
    filterParams.push(like, like, like, like, like, like, like, like, like);
  }

  if (Number.isInteger(empleado) && empleado > 0) {
    filters.push("num_empleado = ?");
    filterParams.push(empleado);
  }

  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  const select = `SELECT captura_id, serial, material, material_description, cantidad,
              ubicacion, rack, planta, emp_nombre, fecha, serial_auditado
       FROM captura ${where}
       ORDER BY captura_id DESC`;

  try {
    if (searchParams.get("format") === "xlsx") {
      const [rows] = await inventario.query(select, filterParams);
      return excelResponse({
        filename: "consulta-capturas.xlsx",
        sheetName: "Consulta capturas",
        columns: CAPTURA_COLUMNS,
        rows,
      });
    }

    const [countRows] = await inventario.query(
      `SELECT COUNT(*) AS total FROM captura ${where}`,
      filterParams,
    );
    const total = Number(countRows[0].total);
    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(requestedPage, pageCount);
    const offset = (page - 1) * pageSize;

    const [rows] = await inventario.query(
      `${select} LIMIT ${pageSize} OFFSET ${offset}`,
      filterParams,
    );

    return Response.json({ total, page, pageSize, rows });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "No se pudo consultar la tabla captura" },
      { status: 500 },
    );
  }
}

function text(value, max) {
  const clean = String(value ?? "").trim();
  if (!clean) return null;
  return clean.slice(0, max);
}

export async function POST(request) {
  try {
    const body = await request.json();
    const serial = Number.parseInt(String(body?.serial ?? "").trim(), 10);
    const cantidad = Number(body?.cantidad);
    const empId = Number.parseInt(String(body?.emp_id ?? "").trim(), 10);
    const material = text(body?.material, 45);
    const ubicacion = text(body?.ubicacion, 45);
    const planta = text(body?.planta, 45);
    const rack = text(body?.rack, 45);
    let descripcion = text(body?.material_description, 250);

    if (!Number.isInteger(serial) || serial <= 0) {
      return Response.json(
        { error: "Ingrese un serial válido" },
        { status: 400 },
      );
    }
    if (!material) {
      return Response.json({ error: "Ingrese el material" }, { status: 400 });
    }
    if (!Number.isFinite(cantidad) || cantidad < 0) {
      return Response.json(
        { error: "Ingrese una cantidad válida" },
        { status: 400 },
      );
    }
    if (!ubicacion) {
      return Response.json({ error: "Ingrese la ubicación" }, { status: 400 });
    }
    if (!planta) {
      return Response.json({ error: "Seleccione la planta" }, { status: 400 });
    }
    if (!Number.isInteger(empId) || empId <= 0) {
      return Response.json(
        { error: "La sesión no tiene un empleado" },
        { status: 400 },
      );
    }

    const [empleadosRows] = await empleados.query(
      "SELECT emp_id, emp_nombre, emp_activo FROM del_empleados WHERE emp_id = ? LIMIT 1",
      [empId],
    );
    const empleado = empleadosRows[0];
    if (!empleado || Number(empleado.emp_activo) !== 1) {
      return Response.json(
        { error: "El empleado no está activo" },
        { status: 403 },
      );
    }

    if (!descripcion) {
      const [materialRows] = await inventario.query(
        "SELECT material_description FROM material WHERE material = ? AND material_description IS NOT NULL LIMIT 1",
        [material],
      );
      descripcion = text(materialRows[0]?.material_description, 250);
    }

    const grupo = text(`${planta}-${ubicacion}`, 45);

    try {
      const [result] = await inventario.query(
        `INSERT INTO captura
          (captura_grupo, serial, material, material_description, cantidad,
           ubicacion, num_empleado, emp_nombre, fecha, serial_obsoleto,
           serial_auditado, rack, planta)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), 0, 0, ?, ?)`,
        [
          grupo,
          serial,
          material,
          descripcion,
          cantidad,
          ubicacion,
          empleado.emp_id,
          text(empleado.emp_nombre, 250),
          rack,
          planta,
        ],
      );

      return Response.json({
        ok: true,
        captura_id: result.insertId,
      });
    } catch (error) {
      if (error?.code === "ER_DUP_ENTRY") {
        return Response.json(
          { error: "Ese serial ya fue capturado" },
          { status: 409 },
        );
      }
      throw error;
    }
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "No se pudo guardar la captura" },
      { status: 500 },
    );
  }
}
