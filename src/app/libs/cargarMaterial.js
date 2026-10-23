import { inventario } from "./inventario";

const INSERT_CHUNK = 400;

const progressStore = globalThis.__cargaProgress ?? {
  MB52: { percent: 0, label: "" },
  ZLX03: { percent: 0, label: "" },
  limpiar: { percent: 0, label: "" },
};
globalThis.__cargaProgress = progressStore;

export function setProgress(origen, percent, label = "") {
  const current = progressStore[origen] ?? { percent: 0, label: "" };
  const rounded = Math.max(0, Math.min(100, Math.round(percent)));
  progressStore[origen] = {
    percent: rounded === 0 ? 0 : Math.max(current.percent, rounded),
    label: label || current.label,
  };
}

export function getProgress(origen) {
  return progressStore[origen] ?? { percent: 0, label: "" };
}

export function resetProgress(origen) {
  progressStore[origen] = { percent: 0, label: "" };
}

export function crecerProgreso(origen, from, to, durationMs, label) {
  const started = Date.now();
  setProgress(origen, from, label);
  const timer = setInterval(() => {
    const ratio = Math.min(1, (Date.now() - started) / durationMs);
    setProgress(origen, from + (to - from) * ratio, label);
    if (ratio >= 1) clearInterval(timer);
  }, 400);
  return () => clearInterval(timer);
}

export async function leerConsulta(response, origen) {
  setProgress(origen, 8, "Descargando consulta");

  if (!response.body) {
    const text = await response.text();
    setProgress(origen, 45, "Preparando registros");
    return text;
  }

  const total = Number(response.headers.get("content-length")) || 0;
  const reader = response.body.getReader();
  const chunks = [];
  let received = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.byteLength;
    const ratio =
      total > 0
        ? Math.min(1, received / total)
        : Math.min(0.95, received / (16 * 1024 * 1024));
    setProgress(origen, 8 + ratio * 37, "Descargando consulta");
  }

  setProgress(origen, 48, "Preparando registros");
  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString("utf8");
}

function text(value, max) {
  if (value === null || value === undefined) return null;
  const clean = String(value).trim();
  if (!clean) return null;
  return clean.slice(0, max);
}

function numberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function toMaterialRow(row) {
  return [
    text(row.storage_location, 5),
    text(row.material, 45),
    text(row.material_description, 100),
    text(row.unidad_medida, 45),
    numberOrNull(row.stock),
    numberOrNull(row.storage_unit),
    text(row.special_stock, 1),
  ];
}

export async function ensureCargaTable() {
  await inventario.query(`
    CREATE TABLE IF NOT EXISTS carga (
      origen VARCHAR(10) NOT NULL PRIMARY KEY,
      registros INT NOT NULL,
      fecha DATETIME NOT NULL
    )
  `);
}

export async function loadedOrigins() {
  await ensureCargaTable();
  const [rows] = await inventario.query(
    "SELECT origen, registros FROM carga",
  );
  return rows;
}

export async function appendMaterial(origen, rows) {
  await ensureCargaTable();
  const connection = await inventario.getConnection();
  let transactionStarted = false;

  try {
    const [lockRows] = await connection.query(
      "SELECT GET_LOCK(?, 20) AS locked",
      [`material_${origen}`],
    );
    if (Number(lockRows[0].locked) !== 1) {
      throw new Error("No se pudo reservar la carga");
    }

    const [existing] = await connection.query(
      "SELECT origen FROM carga WHERE origen = ?",
      [origen],
    );
    if (existing.length > 0) {
      return { alreadyLoaded: true, inserted: 0 };
    }

    await connection.beginTransaction();
    transactionStarted = true;

    for (let index = 0; index < rows.length; index += INSERT_CHUNK) {
      const chunk = rows.slice(index, index + INSERT_CHUNK);
      await connection.query(
        `INSERT INTO material
          (storage_location, material, material_description, unidad_medida, stock, storage_unit, special_stock)
         VALUES ?`,
        [chunk],
      );
      const saved = Math.min(rows.length, index + chunk.length);
      setProgress(
        origen,
        50 + (saved / rows.length) * 47,
        `Guardando ${saved.toLocaleString("es-MX")} de ${rows.length.toLocaleString("es-MX")}`,
      );
    }

    await connection.query(
      "INSERT INTO carga (origen, registros, fecha) VALUES (?, ?, NOW())",
      [origen, rows.length],
    );
    await connection.commit();
    setProgress(origen, 100, "Listo");
    return { alreadyLoaded: false, inserted: rows.length };
  } catch (error) {
    if (transactionStarted) await connection.rollback();
    throw error;
  } finally {
    await connection.query("SELECT RELEASE_LOCK(?)", [`material_${origen}`]);
    connection.release();
  }
}

export async function clearMaterial() {
  setProgress("limpiar", 25, "Vaciando la tabla material");
  await ensureCargaTable();
  const connection = await inventario.getConnection();

  try {
    await connection.query("TRUNCATE TABLE material");
    setProgress("limpiar", 70, "Habilitando los botones");
    await connection.query("DELETE FROM carga");
    resetProgress("MB52");
    resetProgress("ZLX03");
    setProgress("limpiar", 100, "Listo");
  } finally {
    connection.release();
  }
}
