import { inventario } from "./inventario";

let esquemaListo = null;
const ESQUEMA = 3;

function nombreSeguro(value) {
  const nombre = String(value ?? "").replace(/\s+/g, " ").trim();
  if (nombre.length < 3 || nombre.length > 80) return null;
  return nombre;
}

async function migrar() {
  await inventario.query(
    `CREATE TABLE IF NOT EXISTS inventarios (
       inventario_id INT NOT NULL AUTO_INCREMENT,
       nombre VARCHAR(80) NOT NULL,
       activo TINYINT NOT NULL DEFAULT 0,
       creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
       PRIMARY KEY (inventario_id),
       UNIQUE KEY nombre_unico (nombre)
     )`,
  );

  const [capturaCols] = await inventario.query("SHOW COLUMNS FROM captura");
  if (!capturaCols.some((column) => column.Field === "inventario_id")) {
    await inventario.query("ALTER TABLE captura ADD COLUMN inventario_id INT NULL");
    await inventario.query(
      "ALTER TABLE captura ADD INDEX idx_captura_inventario (inventario_id)",
    );
  }

  const [capturaIdx] = await inventario.query("SHOW INDEX FROM captura");
  const porClave = new Map();
  for (const row of capturaIdx) {
    if (!porClave.has(row.Key_name)) porClave.set(row.Key_name, []);
    porClave.get(row.Key_name).push(row);
  }
  for (const [name, columns] of porClave) {
    if (name === "PRIMARY" || name === "serial_inventario") continue;
    if (!/^[A-Za-z0-9_]+$/.test(name)) continue;
    const soloSerial =
      columns.length === 1 &&
      columns[0].Column_name === "serial" &&
      Number(columns[0].Non_unique) === 0;
    if (soloSerial) {
      await inventario.query(`ALTER TABLE captura DROP INDEX \`${name}\``);
    }
  }
  if (!porClave.has("serial_inventario")) {
    await inventario.query(
      "ALTER TABLE captura ADD UNIQUE KEY serial_inventario (inventario_id, serial)",
    );
  }

  const [auditoriaCols] = await inventario.query("SHOW COLUMNS FROM auditoria");
  if (!auditoriaCols.some((column) => column.Field === "inventario_id")) {
    await inventario.query(
      "ALTER TABLE auditoria ADD COLUMN inventario_id INT NOT NULL DEFAULT 0",
    );
  }
  const [auditoriaPk] = await inventario.query(
    "SHOW INDEX FROM auditoria WHERE Key_name = 'PRIMARY'",
  );
  if (!auditoriaPk.some((row) => row.Column_name === "inventario_id")) {
    await inventario.query(
      "ALTER TABLE auditoria DROP PRIMARY KEY, ADD PRIMARY KEY (inventario_id, id_ubicacion)",
    );
  }

  const [materialCols] = await inventario.query("SHOW COLUMNS FROM material");
  if (!materialCols.some((column) => column.Field === "inventario_id")) {
    await inventario.query("ALTER TABLE material ADD COLUMN inventario_id INT NULL");
  }
  const [materialIdx] = await inventario.query("SHOW INDEX FROM material");
  const ordenMaterial = materialIdx
    .filter((row) => row.Key_name === "idx_material_inventario")
    .sort((a, b) => a.Seq_in_index - b.Seq_in_index)
    .map((row) => row.Column_name)
    .join(",");
  if (ordenMaterial !== "inventario_id,storage_unit,material_id") {
    if (ordenMaterial) {
      await inventario.query("ALTER TABLE material DROP INDEX idx_material_inventario");
    }
    await inventario.query(
      "ALTER TABLE material ADD INDEX idx_material_inventario (inventario_id, storage_unit, material_id)",
    );
  }

  const [tablasCarga] = await inventario.query("SHOW TABLES LIKE 'carga'");
  if (!tablasCarga.length) {
    await inventario.query(
      `CREATE TABLE carga (
         inventario_id INT NOT NULL,
         origen VARCHAR(10) NOT NULL,
         registros INT NOT NULL,
         fecha DATETIME NOT NULL,
         PRIMARY KEY (inventario_id, origen)
       )`,
    );
  } else {
    const [cargaCols] = await inventario.query("SHOW COLUMNS FROM carga");
    if (!cargaCols.some((column) => column.Field === "inventario_id")) {
      await inventario.query(
        "ALTER TABLE carga ADD COLUMN inventario_id INT NOT NULL DEFAULT 0",
      );
    }
    const [cargaPk] = await inventario.query(
      "SHOW INDEX FROM carga WHERE Key_name = 'PRIMARY'",
    );
    if (!cargaPk.some((row) => row.Column_name === "inventario_id")) {
      await inventario.query(
        "ALTER TABLE carga DROP PRIMARY KEY, ADD PRIMARY KEY (inventario_id, origen)",
      );
    }
  }

  const [capturasSueltas] = await inventario.query(
    "SELECT COUNT(*) AS total FROM captura WHERE inventario_id IS NULL",
  );
  const [materialSuelto] = await inventario.query(
    "SELECT COUNT(*) AS total FROM material WHERE inventario_id IS NULL",
  );
  const [cargaSuelta] = await inventario.query(
    "SELECT COUNT(*) AS total FROM carga WHERE inventario_id = 0",
  );
  if (
    Number(capturasSueltas[0]?.total) > 0 ||
    Number(materialSuelto[0]?.total) > 0 ||
    Number(cargaSuelta[0]?.total) > 0
  ) {
    const inventarioId = await inventarioAnteriorId();
    if (Number(capturasSueltas[0]?.total) > 0) {
      await inventario.query(
        "UPDATE captura SET inventario_id = ? WHERE inventario_id IS NULL",
        [inventarioId],
      );
    }
    if (Number(materialSuelto[0]?.total) > 0) {
      await inventario.query(
        "UPDATE material SET inventario_id = ? WHERE inventario_id IS NULL",
        [inventarioId],
      );
    }
    if (Number(cargaSuelta[0]?.total) > 0) {
      await inventario.query(
        "UPDATE carga SET inventario_id = ? WHERE inventario_id = 0",
        [inventarioId],
      );
    }
  }
}

async function inventarioAnteriorId() {
  const [existentes] = await inventario.query(
    "SELECT inventario_id FROM inventarios WHERE nombre = ? LIMIT 1",
    ["Inventario anterior"],
  );
  if (existentes[0]) return existentes[0].inventario_id;
  const [creado] = await inventario.query(
    "INSERT INTO inventarios (nombre, activo) VALUES (?, 0)",
    ["Inventario anterior"],
  );
  return creado.insertId;
}

export function asegurarInventarios() {
  if (!esquemaListo || esquemaListo.version !== ESQUEMA) {
    const promesa = migrar().catch((error) => {
      if (esquemaListo === promesa) esquemaListo = null;
      throw error;
    });
    promesa.version = ESQUEMA;
    esquemaListo = promesa;
  }
  return esquemaListo;
}

export async function inventarioActivo() {
  await asegurarInventarios();
  const [rows] = await inventario.query(
    `SELECT inventario_id, nombre, activo, creado_en
     FROM inventarios
     WHERE activo = 1
     ORDER BY inventario_id DESC
     LIMIT 1`,
  );
  return rows[0] || null;
}

export async function inventarioTieneFoto(inventarioId) {
  await asegurarInventarios();
  const id = Number(inventarioId);
  if (!Number.isInteger(id) || id <= 0) return false;
  const [rows] = await inventario.query(
    "SELECT 1 AS ok FROM material WHERE inventario_id = ? LIMIT 1",
    [id],
  );
  return rows.length > 0;
}

export async function listarInventarios() {
  await asegurarInventarios();
  const [rows] = await inventario.query(
    `SELECT i.inventario_id, i.nombre, i.activo, i.creado_en,
            (SELECT COUNT(*) FROM captura c WHERE c.inventario_id = i.inventario_id) AS capturas,
            (SELECT COUNT(*) FROM material m WHERE m.inventario_id = i.inventario_id) AS materiales
     FROM inventarios i
     ORDER BY i.activo DESC, i.creado_en DESC, i.inventario_id DESC`,
  );
  return rows.map((row) => ({
    ...row,
    activo: Number(row.activo) === 1,
    capturas: Number(row.capturas),
    materiales: Number(row.materiales),
  }));
}

export async function crearInventario(nombreRaw) {
  const nombre = nombreSeguro(nombreRaw);
  if (!nombre) {
    const error = new Error("Escriba un nombre de 3 a 80 caracteres");
    error.status = 400;
    throw error;
  }

  await asegurarInventarios();
  const activo = await inventarioActivo();
  try {
    const [result] = await inventario.query(
      "INSERT INTO inventarios (nombre, activo) VALUES (?, ?)",
      [nombre, activo ? 0 : 1],
    );
    return {
      inventario_id: result.insertId,
      nombre,
      activo: !activo,
    };
  } catch (error) {
    if (error?.code === "ER_DUP_ENTRY") {
      const duplicate = new Error("Ya existe un inventario con ese nombre");
      duplicate.status = 409;
      throw duplicate;
    }
    throw error;
  }
}

export async function activarInventario(inventarioId) {
  const id = Number(inventarioId);
  if (!Number.isInteger(id) || id <= 0) {
    const error = new Error("Seleccione un inventario");
    error.status = 400;
    throw error;
  }

  await asegurarInventarios();
  const connection = await inventario.getConnection();
  try {
    await connection.beginTransaction();
    const [found] = await connection.query(
      "SELECT inventario_id, nombre FROM inventarios WHERE inventario_id = ? LIMIT 1",
      [id],
    );
    if (!found[0]) {
      const error = new Error("Ese inventario no existe");
      error.status = 404;
      throw error;
    }
    await connection.query("UPDATE inventarios SET activo = 0");
    await connection.query(
      "UPDATE inventarios SET activo = 1 WHERE inventario_id = ?",
      [id],
    );
    await connection.commit();
    return { ...found[0], activo: true };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function inventarioDeConsulta(searchParams) {
  await asegurarInventarios();
  const raw = searchParams.get("inventario");
  if (raw) {
    const id = Number.parseInt(raw, 10);
    if (!Number.isInteger(id) || id <= 0) {
      const error = new Error("Inventario inválido");
      error.status = 400;
      throw error;
    }
    const [rows] = await inventario.query(
      "SELECT inventario_id, nombre FROM inventarios WHERE inventario_id = ? LIMIT 1",
      [id],
    );
    if (!rows[0]) {
      const error = new Error("Ese inventario no existe");
      error.status = 404;
      throw error;
    }
    return rows[0];
  }
  return inventarioActivo();
}
