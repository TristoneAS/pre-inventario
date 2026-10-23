import { connection } from "next/server";
import { requireAdmin } from "../../libs/adminSession";
import { inventario } from "../../libs/inventario";

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
  const filters = q
    ? [
        "CAST(material_id AS CHAR) LIKE ?",
        "material LIKE ?",
        "material_description LIKE ?",
        "storage_location LIKE ?",
        "unidad_medida LIKE ?",
        "CAST(stock AS CHAR) LIKE ?",
        "special_stock LIKE ?",
      ]
    : [];
  const where = filters.length ? `WHERE ${filters.join(" OR ")}` : "";
  const filterParams = q ? filters.map(() => like) : [];

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

    return Response.json({ total, page, pageSize, rows });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "No se pudo consultar la tabla material" },
      { status: 500 },
    );
  }
}
