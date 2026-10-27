"use client";

import { useState } from "react";
import styles from "./Login.module.css";

export default function Login({ onSuccess }) {
  const [comoAdmin, setComoAdmin] = useState(false);
  const [empId, setEmpId] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(comoAdmin ? "/api/auth/admin" : "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          comoAdmin
            ? { username: username.trim(), password }
            : { emp_id: empId.trim() },
        ),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(
          data.error ||
            (comoAdmin
              ? "Usuario o contraseña incorrectos"
              : "El ID de empleado no está registrado"),
        );
        return;
      }

      onSuccess(data.empleado);
    } catch {
      setError("No se pudo conectar con el servidor");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.screen}>
      <form className={styles.card} onSubmit={submit}>
        <div className={styles.stripe} />
        <div className={styles.body}>
          <div className={styles.logo}>
            <img src="/tristone.png" alt="Tristone" />
          </div>
          <h1>Inventario Físico</h1>
          <p className={styles.hint}>
            {comoAdmin
              ? "Ingrese su usuario y contraseña de administrador"
              : "Ingrese su ID de empleado para continuar"}
          </p>

          <div className={styles.switchRow}>
            <span id="admin-switch-label">Entrar como administrador</span>
            <button
              type="button"
              role="switch"
              aria-checked={comoAdmin}
              aria-labelledby="admin-switch-label"
              className={comoAdmin ? `${styles.switch} ${styles.switchOn}` : styles.switch}
              disabled={loading}
              onClick={() => {
                setComoAdmin((value) => !value);
                setError("");
              }}
            >
              <span />
            </button>
          </div>

          {comoAdmin ? (
            <div className={styles.fields}>
              <label className={styles.field}>
                <span className={styles.legend}>Usuario</span>
                <span className={styles.person} aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <circle cx="12" cy="8" r="3.2" />
                    <path d="M5.5 19.2c.8-3.2 3.2-4.8 6.5-4.8s5.7 1.6 6.5 4.8" />
                  </svg>
                </span>
                <input
                  name="username"
                  autoComplete="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  disabled={loading}
                />
              </label>
              <label className={styles.field}>
                <span className={styles.legend}>Contraseña</span>
                <span className={styles.person} aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <rect x="6" y="10" width="12" height="9" rx="1.5" />
                    <path d="M8.5 10V8a3.5 3.5 0 0 1 7 0v2" />
                  </svg>
                </span>
                <input
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={loading}
                />
              </label>
            </div>
          ) : (
            <label className={styles.field}>
              <span className={styles.legend}>ID de Empleado</span>
              <span className={styles.person} aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <circle cx="12" cy="8" r="3.2" />
                  <path d="M5.5 19.2c.8-3.2 3.2-4.8 6.5-4.8s5.7 1.6 6.5 4.8" />
                </svg>
              </span>
              <input
                name="emp_id"
                inputMode="numeric"
                autoComplete="off"
                value={empId}
                onChange={(event) => setEmpId(event.target.value.replace(/\D/g, ""))}
                disabled={loading}
              />
            </label>
          )}

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className={styles.submit} disabled={loading}>
            {loading ? "Entrando..." : "Ingresar"}
          </button>
        </div>
      </form>
    </main>
  );
}
