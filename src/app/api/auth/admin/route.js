import { connection, NextResponse } from "next/server";
import { empleados } from "../../../libs/empleados";
import { attachAdminCookie } from "../../../libs/adminSession";

const ADMIN_ROLE = "Inventario_Admin";

function authBaseUrl() {
  return String(process.env.NEXT_PUBLIC_AUTH_SERVER_URL ?? "")
    .trim()
    .replace(/\/+$/, "");
}

function rolesDe(authData) {
  const roles = Array.isArray(authData?.roles) ? authData.roles : [];
  return roles.map((role) => String(role));
}

function mensajeAuth(authData) {
  const raw = String(
    authData?.error_description || authData?.message || authData?.error || "",
  ).trim();
  const lower = raw.toLowerCase();
  if (lower.includes("sin rol")) return "No tiene el rol Inventario_Admin";
  if (lower.includes("locked")) return "La cuenta está bloqueada";
  if (lower.includes("expired")) return "La contraseña ha expirado";
  return "Usuario o contraseña incorrectos";
}

export async function POST(request) {
  await connection();
  try {
    const body = await request.json();
    const username = String(body?.username ?? "").trim();
    const password = String(body?.password ?? "");

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: "Ingrese usuario y contraseña" },
        { status: 400 },
      );
    }

    const baseUrl = authBaseUrl();
    if (!baseUrl) {
      return NextResponse.json(
        { success: false, error: "Falta NEXT_PUBLIC_AUTH_SERVER_URL" },
        { status: 500 },
      );
    }
    if (!process.env.AUTH_SESSION_SECRET) {
      return NextResponse.json(
        { success: false, error: "Falta AUTH_SESSION_SECRET" },
        { status: 500 },
      );
    }

    let authData = {};
    try {
      const response = await fetch(`${baseUrl}/Inventario/AUTHENTICATE`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
        cache: "no-store",
      });
      authData = await response.json().catch(() => ({}));
      if (!response.ok) {
        return NextResponse.json(
          { success: false, error: mensajeAuth(authData) },
          { status: 401 },
        );
      }
    } catch (error) {
      console.error("Error contactando el servidor de autenticación:", error);
      return NextResponse.json(
        { success: false, error: "No se pudo conectar con el servidor de autenticación" },
        { status: 502 },
      );
    }

    const authorized =
      String(authData?.authorization ?? "").trim().toLowerCase() === "authorized";
    const roles = rolesDe(authData);
    if (!authorized || !roles.includes(ADMIN_ROLE)) {
      return NextResponse.json(
        {
          success: false,
          error: authorized
            ? "No tiene el rol Inventario_Admin"
            : mensajeAuth(authData),
        },
        { status: 403 },
      );
    }

    let empleado = null;
    try {
      const [rows] = await empleados.query(
        `SELECT e.emp_id, e.emp_nombre, e.emp_alias
         FROM del_empleados e
         WHERE e.emp_alias = ?
         LIMIT 1`,
        [username],
      );
      empleado = rows[0] || null;
    } catch (error) {
      console.error(error);
    }

    const displayName =
      empleado?.emp_nombre ||
      authData?.data?.users?.[0]?.displayName ||
      username;
    const sessionUser = {
      emp_id: empleado?.emp_id ?? null,
      emp_nombre: displayName,
      emp_alias: username,
      acc_inventario: null,
      permissions: ["capture", "audit", "admin"],
      isAdmin: true,
      roles: [ADMIN_ROLE],
    };

    const result = NextResponse.json({ success: true, empleado: sessionUser });
    attachAdminCookie(result, {
      username,
      emp_id: sessionUser.emp_id,
      emp_nombre: displayName,
    }, request);
    return result;
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: "No se pudo iniciar sesión" },
      { status: 500 },
    );
  }
}
