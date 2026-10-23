import mysql from "mysql2/promise";

const globalForDb = globalThis;

export const inventario =
  globalForDb.inventarioPool ??
  mysql.createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE_INVENTARIO || "preinventario",
    waitForConnections: true,
    connectionLimit: Number(process.env.MYSQL_CONNECTION_LIMIT) || 10,
    queueLimit: 0,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.inventarioPool = inventario;
}
