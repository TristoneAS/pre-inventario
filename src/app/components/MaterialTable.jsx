"use client";

import { useEffect, useState } from "react";
import styles from "./MaterialTable.module.css";

const COLUMNS = [
  "material_id",
  "material",
  "material_description",
  "stock",
  "unidad_medida",
  "storage_location",
  "storage_unit",
  "special_stock",
].map((key) => ({ key, label: key.replaceAll("_", " ") }));

function cellValue(value) {
  if (value === null || value === undefined || value === "") return "";
  return String(value);
}

export default function MaterialTable() {
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError("");
      const params = new URLSearchParams({
        q: query,
        page: String(page),
        pageSize: String(pageSize),
      });

      try {
        const response = await fetch(`/api/material?${params}`, {
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "No se pudo consultar material");
        }
        setRows(data.rows);
        setTotal(data.total);
        if (data.page !== page) setPage(data.page);
      } catch (err) {
        if (err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Error de consulta");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    load();
    return () => controller.abort();
  }, [query, page, pageSize]);

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  function buscar(event) {
    event.preventDefault();
    setPage(1);
    setQuery(draft.trim());
  }

  return (
    <section className={styles.card}>
      <div className={styles.head}>
        <div className={styles.titleRow}>
          <h2>Material</h2>
          <span className={styles.badge}>
            {total.toLocaleString("es-MX")} registros
          </span>
        </div>
        <p className={styles.hint}>
          Visualización paginada de la tabla material, base preinventario.
        </p>
      </div>

      <form className={styles.searchRow} onSubmit={buscar}>
        <input
          type="search"
          value={draft}
          placeholder="Buscar por material, descripción, ubicación..."
          onChange={(event) => setDraft(event.target.value)}
        />
        <button type="submit">BUSCAR</button>
      </form>

      {error ? <p className={styles.message}>{error}</p> : null}

      <div className={styles.wrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              {COLUMNS.map((column) => (
                <th key={column.key}>{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.material_id}>
                {COLUMNS.map((column) => (
                  <td key={column.key}>{cellValue(row[column.key])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!error && !loading && rows.length === 0 ? (
        <p className={styles.empty}>No hay registros en material.</p>
      ) : null}
      {loading ? <p className={styles.empty}>Cargando material...</p> : null}

      <div className={styles.pager}>
        <label>
          Registros por página
          <select
            value={pageSize}
            onChange={(event) => {
              setPage(1);
              setPageSize(Number(event.target.value));
            }}
          >
            <option value={10}>10</option>
            <option value={30}>30</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </label>
        <span>
          {from.toLocaleString("es-MX")}–{to.toLocaleString("es-MX")} de{" "}
          {total.toLocaleString("es-MX")}
        </span>
        <div className={styles.pages}>
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page <= 1 || loading}
            aria-label="Página anterior"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() =>
              setPage((current) => Math.min(pageCount, current + 1))
            }
            disabled={page >= pageCount || loading}
            aria-label="Página siguiente"
          >
            ›
          </button>
        </div>
      </div>
    </section>
  );
}
