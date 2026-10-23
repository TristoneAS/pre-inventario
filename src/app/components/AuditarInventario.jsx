"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import shell from "../page.module.css";
import { playSound } from "../libs/sound";
import styles from "./AuditarInventario.module.css";

const AREA_NAMES = {
  mp: "Materia Prima",
  "materia-prima": "Materia Prima",
  green: "Extrusión",
  extrusion: "Extrusión",
  terminado: "Terminado",
  vulcanizado: "Vulcanizado",
  subensamble: "Subensamble",
};

const AREA_COLORS = {
  terminado: "rgba(76, 175, 80, 0.5)",
  vulcanizado: "rgba(25, 118, 210, 0.5)",
  "materia-prima": "rgba(255, 152, 0, 0.5)",
  mp: "rgba(255, 152, 0, 0.5)",
  extrusion: "rgba(156, 39, 176, 0.5)",
  green: "rgba(156, 39, 176, 0.5)",
  subensamble: "rgba(0, 188, 212, 0.5)",
};

function Progress({ value, color = "#4caf50" }) {
  return (
    <div className={styles.track}>
      <div
        className={styles.bar}
        style={{ width: `${value}%`, backgroundColor: color }}
      />
    </div>
  );
}

export default function AuditarInventario({ user }) {
  const [areas, setAreas] = useState([]);
  const [rack, setRack] = useState("");
  const [serials, setSerials] = useState([]);
  const [estado, setEstado] = useState(0);
  const [scanned, setScanned] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadDashboard = useCallback(async () => {
    try {
      const response = await fetch("/api/auditoria");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      const grouped = new Map();
      for (const row of data) {
        const area = row.area_ubicacion || "sin-area";
        if (!grouped.has(area)) grouped.set(area, []);
        grouped.get(area).push({
          rack: row.id_ubicacion,
          estado: Number(row.estado_auditoria),
        });
      }
      setAreas(
        [...grouped.entries()].map(([id, racks]) => ({
          id,
          racks: racks.sort((a, b) =>
            a.rack.localeCompare(b.rack, undefined, { numeric: true }),
          ),
        })),
      );
      setError("");
    } catch {
      setError("No se pudo consultar la auditoría");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRack = useCallback(async (rackId) => {
    try {
      const encoded = encodeURIComponent(rackId);
      const [serialResponse, statusResponse] = await Promise.all([
        fetch(`/api/auditoria/${encoded}/serials`),
        fetch(`/api/auditoria/${encoded}/status`),
      ]);
      const serialData = await serialResponse.json();
      const statusData = await statusResponse.json();
      if (!serialResponse.ok) throw new Error(serialData.error);
      setSerials(serialData);
      setEstado(Number(statusData.estado_auditoria) || 0);
      setError("");
    } catch {
      setError("No se pudieron consultar los seriales");
    }
  }, []);

  useEffect(() => {
    loadDashboard();
    const interval = setInterval(loadDashboard, 30000);
    return () => clearInterval(interval);
  }, [loadDashboard]);

  useEffect(() => {
    if (!rack) return undefined;
    loadRack(rack);
    const interval = setInterval(() => loadRack(rack), 30000);
    return () => clearInterval(interval);
  }, [rack, loadRack]);

  const totals = useMemo(() => {
    const all = areas.flatMap((area) => area.racks);
    return {
      total: all.length,
      done: all.filter((item) => item.estado === 1).length,
    };
  }, [areas]);

  const audited = serials.filter(
    (item) => Number(item.serial_auditado) === 1,
  ).length;
  const rackProgress = serials.length
    ? Math.round((audited / serials.length) * 100)
    : 0;
  const globalProgress = totals.total
    ? Math.round((totals.done / totals.total) * 100)
    : 0;

  async function auditSerial(event) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    setError("");
    setMessage("");

    if (!/^[SsMm]\d+$/.test(scanned.trim())) {
      playSound("error");
      setError("El serial debe comenzar con S, s, M o m");
      setScanned("");
      return;
    }

    try {
      const response = await fetch(
        `/api/auditoria/${encodeURIComponent(rack)}/audit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            serial: scanned.trim(),
            emp_id: user.emp_id,
          }),
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      playSound("success");
      setMessage("Serial auditado correctamente");
      await loadRack(rack);
      await loadDashboard();
    } catch (err) {
      playSound("error");
      setError(err.message || "Error al auditar serial");
    } finally {
      setScanned("");
    }
  }

  if (rack) {
    return (
      <section className={styles.wrap}>
        <button
          type="button"
          className={styles.crumb}
          onClick={() => {
            setRack("");
            setError("");
            setMessage("");
          }}
        >
          Auditoría de Racks
        </button>
        <h1 className={shell.dashTitle}>Auditoría de Rack {rack}</h1>

        <div className={styles.panel}>
          <p className={styles.progressLabel}>Progreso: {rackProgress}%</p>
          <Progress value={rackProgress} />
          <p className={styles.progressLabel}>
            {audited} de {serials.length} seriales auditados
          </p>
          {estado === 1 && (
            <div className={styles.success}>
              ¡Felicitaciones! Has completado la auditoría
            </div>
          )}
        </div>

        <div className={styles.panel}>
          <h2 className={shell.dashTitle}>Escanear Serial</h2>
          <input
            className={styles.scanner}
            value={scanned}
            onChange={(event) => setScanned(event.target.value)}
            onKeyDown={auditSerial}
            placeholder="Escanee el serial"
            autoFocus
          />
        </div>

        {message && <p className={styles.message}>{message}</p>}
        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.panel}>
          <div className={styles.chips}>
            {serials.map((item) => (
              <span
                key={item.serial}
                className={
                  Number(item.serial_auditado) === 1
                    ? `${styles.chip} ${styles.chipDone}`
                    : styles.chip
                }
              >
                {Number(item.serial_auditado) === 1 ? "✓ " : ""}
                {item.serial}
              </span>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.wrap}>
      <h1 className={shell.dashTitle}>Auditoría de Racks</h1>
      <div>
        <p className={styles.progressLabel}>
          Progreso General: {globalProgress}%
        </p>
        <Progress value={globalProgress} />
      </div>

      {loading && <p>Cargando auditoría...</p>}
      {error && <p className={styles.error}>{error}</p>}

      {areas.map((area) => {
        const done = area.racks.filter((item) => item.estado === 1).length;
        const progress = area.racks.length
          ? Math.round((done / area.racks.length) * 100)
          : 0;
        const color = AREA_COLORS[area.id] || "rgba(158, 158, 158, 0.5)";

        return (
          <article key={area.id} className={styles.areaCard}>
            <h2 className={styles.areaTitle} style={{ color }}>
              {AREA_NAMES[area.id] || area.id}
            </h2>
            <p className={styles.progressLabel}>Avance: {progress}%</p>
            <Progress value={progress} color={color} />
            <div className={styles.racks}>
              {area.racks.map((item) => (
                <button
                  key={item.rack}
                  type="button"
                  className={styles.rack}
                  style={
                    item.estado === 1 ? { backgroundColor: color } : undefined
                  }
                  onClick={() => {
                    setRack(item.rack);
                    setError("");
                    setMessage("");
                  }}
                >
                  {item.rack}
                </button>
              ))}
            </div>
          </article>
        );
      })}
    </section>
  );
}
