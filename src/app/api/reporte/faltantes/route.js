import { connection } from "next/server";
import { requireAdmin } from "../../../libs/adminSession";
import { inventario } from "../../../libs/inventario";

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
  const filters = [
    "m.storage_unit IS NOT NULL",
    "m.storage_unit <> 0",
    `NOT EXISTS (
       SELECT 1 FROM captura c WHERE c.serial = m.storage_unit
     )`,
  ];
  const params = [];

  if (q) {
    filters.push(
      `(CAST(m.storage_unit AS CHAR) LIKE ?
        OR m.material LIKE ?
        OR m.material_description LIKE ?
        OR m.storage_location LIKE ?)`,
    );
    params.push(like, like, like, like);
  }

  const where = `WHERE ${filters.join(" AND ")}`;

  try {
    const [countRows] = await inventario.query(
      `SELECT COUNT(*) AS total FROM material m ${where}`,
      params,
    );
    const total = Number(countRows[0].total);
    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(requestedPage, pageCount);
    const offset = (page - 1) * pageSize;

    const [rows] = await inventario.query(
      `SELECT m.material_id, m.storage_unit, m.material, m.material_description,
              m.stock, m.storage_location, m.unidad_medida, m.special_stock
       FROM material m ${where}
       ORDER BY m.storage_unit, m.material_id
       LIMIT ${pageSize} OFFSET ${offset}`,
      params,
    );

    return Response.json({ total, page, pageSize, rows });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "No se pudo consultar lo que falta de capturar" },
      { status: 500 },
    );
  }
}
