import { connection } from "next/server";
import { requireAdmin } from "../../../libs/adminSession";
import { excelResponse } from "../../../libs/excel";
import { inventario } from "../../../libs/inventario";

const ROJOS_COLUMNS = [
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
  const like = `%${q}%`;
  const filters = ["serial_obsoleto = 1"];
  const params = [];

  if (q) {
    filters.push(
      `(CAST(captura_id AS CHAR) LIKE ?
        OR CAST(serial AS CHAR) LIKE ?
        OR material LIKE ?
        OR material_description LIKE ?
        OR ubicacion LIKE ?
        OR rack LIKE ?
        OR planta LIKE ?
        OR emp_nombre LIKE ?)`,
    );
    params.push(like, like, like, like, like, like, like, like);
  }

  const where = `WHERE ${filters.join(" AND ")}`;
  const select = `SELECT captura_id, serial, material, material_description, cantidad,
              ubicacion, rack, planta, emp_nombre, fecha
       FROM captura ${where}
       ORDER BY captura_id DESC`;

  try {
    if (searchParams.get("format") === "xlsx") {
      const [rows] = await inventario.query(select, params);
      return excelResponse({
        filename: "rojos.xlsx",
        sheetName: "Rojos",
        columns: ROJOS_COLUMNS,
        rows,
      });
    }

    const [countRows] = await inventario.query(
      `SELECT COUNT(*) AS total FROM captura ${where}`,
      params,
    );
    const total = Number(countRows[0].total);
    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(requestedPage, pageCount);
    const offset = (page - 1) * pageSize;

    const [rows] = await inventario.query(
      `${select} LIMIT ${pageSize} OFFSET ${offset}`,
      params,
    );

    return Response.json({ total, page, pageSize, rows });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "No se pudo consultar los seriales rojos" },
      { status: 500 },
    );
  }
}
