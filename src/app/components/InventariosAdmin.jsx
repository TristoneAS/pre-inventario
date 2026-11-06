"use client";

import { useEffect, useState } from "react";
import styles from "../page.module.css";

function fecha(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function InventariosAdmin({ onChange }) {
  const [nombre, setNombre] = useState("");
  const [inventarios, setInventarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function cargar() {
    const response = await fetch("/api/inventarios");
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "No se pudieron consultar los inventarios");
    }
    setInventarios(data.inventarios);
    const activo = data.inventarios.find((item) => item.activo) || null;
    onChange?.(activo);
  }

  useEffect(() => {
    let active = true;
    cargar()
      .catch((err) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function crear(event) {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      const response = await fetch("/api/inventarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "No se pudo crear el inventario");
      }
      setNombre("");
      await cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function activar(inventarioId) {
    setError("");
    setSaving(true);
    try {
      const response = await fetch("/api/inventarios/activo", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inventario_id: inventarioId }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "No se pudo activar el inventario");
      }
      await cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className={styles.consulta}>
      <div>
        <h1 className={styles.dashTitle}>Inventarios</h1>
        <p className={styles.dashHint}>
          Cree cada periodo, por ejemplo Inventario mayo 2026 o Inventario
          diciembre 2026, y active el que se está capturando. Las capturas
          nuevas se guardan solo en el inventario activo.
        </p>
      </div>

      <form className={styles.inventarioForm} onSubmit={crear}>
        <input
          value={nombre}
          placeholder="Inventario diciembre 2026"
          onChange={(event) => setNombre(event.target.value)}
          disabled={saving}
          maxLength={80}
        />
        <button type="submit" className={styles.primary} disabled={saving || !nombre.trim()}>
          Crear inventario
        </button>
      </form>

      {error ? <p className={styles.activoBannerOff}>{error}</p> : null}
      {loading ? <p className={styles.dashHint}>Cargando inventarios...</p> : null}

      {!loading && inventarios.length === 0 ? (
        <p className={styles.dashHint}>Todavía no hay inventarios.</p>
      ) : null}

      <ul className={styles.inventarioList}>
        {inventarios.map((item) => (
          <li key={item.inventario_id}>
            <div>
              <strong>{item.nombre}</strong>
              <span>
                {fecha(item.creado_en)}
                {" · "}
                {item.capturas.toLocaleString("es-MX")} capturas
                {" · "}
                {item.materiales.toLocaleString("es-MX")} en la foto
              </span>
            </div>
            {item.activo ? (
              <span className={styles.inventarioActivo}>Activo</span>
            ) : (
              <button type="button" onClick={() => activar(item.inventario_id)} disabled={saving}>
                Activar
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
