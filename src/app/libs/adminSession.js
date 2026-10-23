import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { connection } from "next/server";

export const ADMIN_COOKIE = "preinventario_admin";
const MAX_AGE = 60 * 60 * 12;

function secret() {
  return process.env.AUTH_SESSION_SECRET || "";
}

function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const mac = createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${mac}`;
}

function verify(token) {
  if (!secret() || !token || !token.includes(".")) return null;
  const [body, mac] = token.split(".");
  if (!body || !mac) return null;
  const expected = createHmac("sha256", secret()).update(body).digest("base64url");
  const actual = Buffer.from(mac);
  const wanted = Buffer.from(expected);
  if (actual.length !== wanted.length || !timingSafeEqual(actual, wanted)) {
    return null;
  }

  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (data?.role !== "Inventario_Admin" || !data.exp || data.exp < Date.now()) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function attachAdminCookie(response, user) {
  response.cookies.set(
    ADMIN_COOKIE,
    sign({
      role: "Inventario_Admin",
      username: user.username,
      emp_id: user.emp_id ?? null,
      emp_nombre: user.emp_nombre ?? "",
      exp: Date.now() + MAX_AGE * 1000,
    }),
    {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: MAX_AGE,
      secure: process.env.NODE_ENV === "production",
    },
  );
}

export function clearAdminCookie(response) {
  response.cookies.set(ADMIN_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function readAdminSession() {
  await connection();
  const jar = await cookies();
  return verify(jar.get(ADMIN_COOKIE)?.value);
}

export async function requireAdmin() {
  const session = await readAdminSession();
  if (session) return null;
  return Response.json({ error: "No tiene acceso" }, { status: 403 });
}
