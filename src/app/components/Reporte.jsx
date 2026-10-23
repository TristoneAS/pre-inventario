"use client";

import { useEffect, useState } from "react";
import styles from "./CapturaTable.module.css";

function formatFecha(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date
    .toLocaleString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    })
    .replace(" AM", " a.m.")
    .replace(" PM", " p.m.");
}

function cellValue(column, row) {
  if (column === "fecha") return formatFecha(row.fecha);
  const value = row[column];
  if (value === null || value === undefined || value === "") return "";
  return String(value);
}

function ReportTable({ title, hint, endpoint, columns, rowKey, placeholder, empty, filename }) {
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
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
        const response = await fetch(`${endpoint}?${params}`, {
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "No se pudo consultar el reporte");
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
  }, [endpoint, query, page, pageSize]);

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  function buscar(event) {
    event.preventDefault();
    setPage(1);
    setQuery(draft.trim());
  }

  async function descargar() {
    setDownloading(true);
    setError("");
    try {
      const params = new URLSearchParams({ q: query, format: "xlsx" });
      const response = await fetch(`${endpoint}?${params}`);
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "No se pudo descargar el Excel");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo descargar el Excel");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <section className={styles.card}>
      <div className={styles.head}>
        <div className={styles.titleRow}>
          <h2>{title}</h2>
          <span className={styles.badge}>
            {total.toLocaleString("es-MX")} registros
          </span>
        </div>
        <p className={styles.hint}>{hint}</p>
      </div>

      <form className={styles.searchRow} onSubmit={buscar}>
        <input
          type="search"
          value={draft}
          placeholder={placeholder}
          onChange={(event) => setDraft(event.target.value)}
        />
        <button type="submit">BUSCAR</button>
        <button
          type="button"
          className={styles.excel}
          onClick={descargar}
          disabled={downloading}
        >
          {downloading ? "Descargando..." : "Descargar Excel"}
        </button>
      </form>

      {error ? <p className={styles.message}>{error}</p> : null}

      <div className={styles.wrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key}>{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row[rowKey]}>
                {columns.map((column) => (
                  <td key={column.key}>{cellValue(column.key, row)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!error && !loading && rows.length === 0 ? (
        <p className={styles.empty}>{empty}</p>
      ) : null}
      {loading ? <p className={styles.empty}>Cargando...</p> : null}

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
            onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
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

const ROJOS = [
  { key: "captura_id", label: "ID" },
  { key: "serial", label: "Serial" },
  { key: "material", label: "Material" },
  { key: "material_description", label: "Descripción" },
  { key: "cantidad", label: "Cantidad" },
  { key: "ubicacion", label: "Ubicación" },
  { key: "rack", label: "Rack" },
  { key: "planta", label: "Planta" },
  { key: "emp_nombre", label: "Empleado" },
  { key: "fecha", label: "Fecha" },
];

const FALTANTES = [
  { key: "storage_unit", label: "Serial" },
  { key: "material", label: "Material" },
  { key: "material_description", label: "Descripción" },
  { key: "stock", label: "Cantidad" },
  { key: "storage_location", label: "Ubicación" },
  { key: "unidad_medida", label: "Unidad" },
  { key: "special_stock", label: "Stock especial" },
];

export default function Reporte() {
  return (
    <div className={styles.stack}>
      <ReportTable
        title="Rojos"
        hint="Capturas guardadas con serial obsoleto."
        endpoint="/api/reporte/rojos"
        filename="rojos.xlsx"
        columns={ROJOS}
        rowKey="captura_id"
        placeholder="Buscar por serial, material, rack, empleado, ubicación..."
        empty="No hay seriales obsoletos."
      />
      <ReportTable
        title="Faltan de capturar"
        hint="Seriales que están en material y todavía no aparecen en captura."
        endpoint="/api/reporte/faltantes"
        filename="faltan-de-capturar.xlsx"
        columns={FALTANTES}
        rowKey="material_id"
        placeholder="Buscar por serial, material, descripción o ubicación..."
        empty="No falta ningún serial de material por capturar."
      />
    </div>
  );
}
