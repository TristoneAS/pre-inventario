/* import mysql from "serverless-mysql";
 */
// db.js
import mysql from "mysql2/promise";

export const empleados = mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  //port: 3306,
  database: process.env.MYSQL_DATABASE_EMP,
  waitForConnections: true,
  connectionLimit: 10, // Número máximo de conexiones
  queueLimit: 0, // Límite de solicitudes en cola (0 para ilimitado)
});
