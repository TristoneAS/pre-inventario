import { connection } from "next/server";
import { requireAdmin } from "../../libs/adminSession";
import { inventario } from "../../libs/inventario";
import { inventarioDeConsulta } from "../../libs/inventarios";

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
  let ciclo;
  try {
    ciclo = await inventarioDeConsulta(searchParams);
  } catch (error) {
    return Response.json(
      { error: error.message || "Inventario inválido" },
      { status: error.status || 400 },
    );
  }
  if (!ciclo) {
    return Response.json({ total: 0, page: 1, pageSize, rows: [], inventario: null });
  }
  const filters = ["inventario_id = ?"];
  const filterParams = [ciclo.inventario_id];
  if (q) {
    filters.push(
      `(CAST(material_id AS CHAR) LIKE ?
        OR material LIKE ?
        OR material_description LIKE ?
        OR storage_location LIKE ?
        OR unidad_medida LIKE ?
        OR CAST(stock AS CHAR) LIKE ?
        OR special_stock LIKE ?)`,
    );
    filterParams.push(like, like, like, like, like, like, like);
  }
  const where = `WHERE ${filters.join(" AND ")}`;

  try {
    const [countRows] = await inventario.query(
      `SELECT COUNT(*) AS total FROM material ${where}`,
      filterParams,
    );
    const total = Number(countRows[0].total);
    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(requestedPage, pageCount);
    const offset = (page - 1) * pageSize;

    const [rows] = await inventario.query(
      `SELECT material_id, storage_location, material, material_description,
              unidad_medida, stock, storage_unit, special_stock
       FROM material ${where}
       ORDER BY material_id ASC
       LIMIT ${pageSize} OFFSET ${offset}`,
      filterParams,
    );

    return Response.json({ total, page, pageSize, rows, inventario: ciclo });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "No se pudo consultar la tabla material" },
      { status: 500 },
    );
  }
}
