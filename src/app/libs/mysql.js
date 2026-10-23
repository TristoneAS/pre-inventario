// lib/db.js
import mysql from "mysql2/promise";

export const conn = mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  // port: process.env.MYSQL_HOST,
  database: process.env.MYSQL_DATABASE_MFM,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});
