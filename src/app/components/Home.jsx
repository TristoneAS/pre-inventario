"use client";

import { useEffect, useRef, useState } from "react";
import AuditarInventario from "./AuditarInventario";
import CapturaTable from "./CapturaTable";
import Reporte from "./Reporte";
import CapturarInventario from "./CapturarInventario";
import Login from "./Login";
import MaterialTable from "./MaterialTable";
import styles from "../page.module.css";

const SESSION_KEY = "preinventario_user";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function Home() {
  const [mb52Loading, setMb52Loading] = useState(false);
  const [zlx03Loading, setZlx03Loading] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [mb52Loaded, setMb52Loaded] = useState(false);
  const [zlx03Loaded, setZlx03Loaded] = useState(false);
  const [cargasReady, setCargasReady] = useState(false);
  const [mb52Status, setMb52Status] = useState("");
  const [zlx03Status, setZlx03Status] = useState("");
  const [materialReload, setMaterialReload] = useState(0);
  const [modal, setModal] = useState(null);
  const acceptProgress = useRef(false);
  const [view, setView] = useState("inicio");
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [sessionReady, setSessionReady] = useState(false);
  const busy = mb52Loading || zlx03Loading || cleaning;
  const canAudit =
    Boolean(user?.isAdmin) ||
    user?.permissions?.includes("audit") ||
    Number(user?.acc_inventario) === 2 ||
    Number(user?.acc_inventario) === 3;
  const canAdmin = Boolean(user?.isAdmin);

  useEffect(() => {
    let active = true;

    async function restore() {
      let stored = null;
      try {
        const raw = sessionStorage.getItem(SESSION_KEY);
        if (raw) stored = JSON.parse(raw);
      } catch {
        sessionStorage.removeItem(SESSION_KEY);
      }

      let adminUser = null;
      try {
        const response = await fetch("/api/auth/session");
        const data = await response.json();
        if (data.admin && data.empleado) adminUser = data.empleado;
      } catch {
        adminUser = null;
      }

      if (!active) return;

      if (stored?.isAdmin && !adminUser) {
        sessionStorage.removeItem(SESSION_KEY);
        setUser(null);
      } else if (adminUser) {
        const next = { ...adminUser, ...(stored?.isAdmin ? stored : {}), isAdmin: true };
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(next));
        setUser(next);
      } else if (stored) {
        const next = { ...stored, isAdmin: false };
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(next));
        setUser(next);
      }
      setSessionReady(true);
    }

    restore();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!canAdmin && (view === "consulta" || view === "cargar" || view === "reporte")) {
      setView("inicio");
    }
  }, [canAdmin, view]);

  useEffect(() => {
    if (!canAdmin) return undefined;
    let active = true;

    fetch("/api/cargas")
      .then((response) => response.json())
      .then((data) => {
        if (!active) return;
        setMb52Loaded(Boolean(data.MB52));
        setZlx03Loaded(Boolean(data.ZLX03));
      })
      .catch(() => {})
      .finally(() => {
        if (active) setCargasReady(true);
      });

    return () => {
      active = false;
    };
  }, [canAdmin]);

  useEffect(() => {
    if (!modal?.origen) return undefined;
    let active = true;

    async function poll() {
      try {
        const response = await fetch(`/api/progreso?origen=${modal.origen}`);
        const data = await response.json();
        if (!active || !response.ok || !acceptProgress.current) return;
        setModal((current) =>
          current
            ? {
                ...current,
                percent: Number(data.percent) || 0,
                label: data.label || current.label,
              }
            : current,
        );
      } catch {
        // El siguiente intento vuelve a leer el avance.
      }
    }

    const timer = setInterval(poll, 400);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [modal?.origen]);

  async function subir(origen, url, setLoading, setLoaded, setStatus) {
    setLoading(true);
    setStatus("");
    acceptProgress.current = false;
    setModal({
      origen,
      title: `Cargando ${origen}`,
      percent: 0,
      label: "Iniciando consulta",
    });

    try {
      await fetch(`/api/progreso?origen=${origen}`, { method: "DELETE" });
      acceptProgress.current = true;
      const response = await fetch(url, { method: "POST" });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (data.alreadyLoaded) setLoaded(true);
        setStatus(data.error || `Error al consultar ${origen} (${response.status})`);
        return;
      }

      setLoaded(true);
      setModal((current) =>
        current ? { ...current, percent: 100, label: "Listo" } : current,
      );
      const inserted = Number(data.inserted) || 0;
      const partial = data.truncated
        ? " La consulta llegó truncada, así que la tabla tiene solo esa parte."
        : "";
      setStatus(
        `Se agregaron ${inserted.toLocaleString("es-MX")} registros de ${origen} a material.${partial}`,
      );
      setMaterialReload((current) => current + 1);
      await wait(500);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : `No se pudo consultar ${origen}`);
    } finally {
      acceptProgress.current = false;
      setModal(null);
      setLoading(false);
    }
  }

  async function limpiarFoto() {
    setCleaning(true);
    acceptProgress.current = false;
    setModal({
      origen: "limpiar",
      title: "Limpiando material",
      percent: 10,
      label: "Vaciando la tabla",
    });

    try {
      await fetch("/api/progreso?origen=limpiar", { method: "DELETE" });
      acceptProgress.current = true;
      const response = await fetch("/api/material/limpiar", { method: "POST" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMb52Status(data.error || "No se pudo limpiar material");
        return;
      }

      setMb52Loaded(false);
      setZlx03Loaded(false);
      setMb52Status("");
      setZlx03Status("");
      setMaterialReload((current) => current + 1);
      setModal((current) =>
        current
          ? { ...current, percent: 100, label: "Botones habilitados" }
          : current,
      );
      await wait(400);
    } catch (error) {
      setMb52Status(
        error instanceof Error ? error.message : "No se pudo limpiar material",
      );
    } finally {
      acceptProgress.current = false;
      setModal(null);
      setCleaning(false);
    }
  }

  const menu = [
    { id: "inicio", label: "Menu", icon: "⌂" },
    { id: "capturar", label: "Capturar", icon: "+" },
    { id: "auditar", label: "Auditar", icon: "⌕", audit: true },
    { id: "consulta", label: "Consulta Capturas", icon: "☰", admin: true },
    { id: "cargar", label: "Cargar foto", icon: "↥", admin: true },
    { id: "reporte", label: "Reporte", icon: "▤", admin: true },
  ];

  function entrar(empleado) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(empleado));
    setUser(empleado);
    setView("inicio");
    setMenuOpen(false);
  }

  function abrirVista(id) {
    if ((id === "consulta" || id === "cargar" || id === "reporte") && !canAdmin) return;
    setView(id);
    setMenuOpen(false);
  }

  async function salir() {
    sessionStorage.removeItem(SESSION_KEY);
    setUser(null);
    setView("inicio");
    try {
      await fetch("/api/auth/session", { method: "DELETE" });
    } catch {
      // La sesión local ya se cerró.
    }
  }

  if (!sessionReady) {
    return null;
  }

  if (!user) {
    return <Login onSuccess={entrar} />;
  }

  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <button
          type="button"
          className={styles.menuToggle}
          aria-label="Abrir menú"
          onClick={() => setMenuOpen(true)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z" />
          </svg>
        </button>
        <span className={styles.topTitle}>Dashboard</span>
        <div className={styles.session}>
          <span>
            {canAdmin ? user.emp_alias || "Admin" : `ID: ${user.emp_id}`}
          </span>
          <button type="button" onClick={salir}>
            Salir
          </button>
        </div>
      </header>

      <div className={styles.layout}>
        <button
          type="button"
          className={menuOpen ? `${styles.drawerBackdrop} ${styles.drawerBackdropOpen}` : styles.drawerBackdrop}
          aria-label="Cerrar menú"
          onClick={() => setMenuOpen(false)}
        />
        <aside className={menuOpen ? `${styles.sidebar} ${styles.sidebarOpen}` : styles.sidebar}>
          <p className={styles.navLabel}>Navegación</p>
          {menu.filter((item) => !item.admin || canAdmin).map((item) => (
            <button
              key={item.id}
              type="button"
              className={
                `${styles.navButton} ${
                  view === item.id ? styles.navButtonActive : ""
                } ${item.audit && !canAudit ? styles.navButtonDisabled : ""}`
              }
              onClick={() => {
                if (item.admin && !canAdmin) return;
                if (!item.audit || canAudit) abrirVista(item.id);
              }}
              disabled={item.audit && !canAudit}
              title={
                item.audit && !canAudit
                  ? "No tiene permiso para acceder a esta función"
                  : ""
              }
            >
              <span className={styles.navIcon} aria-hidden="true">
                {item.icon}
              </span>
              {item.label}
            </button>
          ))}
        </aside>

        <main className={styles.content}>
          {view === "inicio" && (
            <section>
              <h1 className={styles.dashTitle}>Sistema de Inventario Físico</h1>
              <p className={styles.dashHint}>Seleccione una opción para continuar</p>
              <div className={styles.options}>
                <button
                  type="button"
                  className={
                    view === "capturar"
                      ? `${styles.option} ${styles.capture} ${styles.optionActive}`
                      : `${styles.option} ${styles.capture}`
                  }
                  onClick={() => abrirVista("capturar")}
                >
                  <span className={styles.optionIcon}>+</span>
                  CAPTURAR INVENTARIO
                </button>
                <button
                  type="button"
                  className={
                    view === "auditar"
                      ? `${styles.option} ${styles.audit} ${styles.optionActive}`
                      : `${styles.option} ${styles.audit}`
                  }
                  onClick={() => canAudit && abrirVista("auditar")}
                  disabled={!canAudit}
                  title={
                    canAudit ? "" : "No tiene permiso para auditar inventario"
                  }
                >
                  <span className={styles.optionIcon}>⌕</span>
                  AUDITAR INVENTARIO
                </button>
              </div>
            </section>
          )}

          {view === "capturar" && <CapturarInventario user={user} />}
          {view === "auditar" && canAudit && <AuditarInventario user={user} />}

          {view === "consulta" && canAdmin && <CapturaTable />}

          {view === "reporte" && canAdmin && <Reporte />}

          {view === "cargar" && canAdmin && (
            <section className={styles.consulta}>
              <h1 className={styles.dashTitle}>Cargar foto</h1>
              <p className={styles.dashHint}>
                Consulta MB52 o ZLX03 y carga el resultado en material.
              </p>
              <div className={styles.ctas}>
                <button
                  type="button"
                  className={styles.primary}
                  onClick={() =>
                    subir(
                      "MB52",
                      "/api/consultaMB52",
                      setMb52Loading,
                      setMb52Loaded,
                      setMb52Status,
                    )
                  }
                  disabled={busy || !cargasReady || mb52Loaded}
                >
                  {mb52Loaded
                    ? "MB52 cargado"
                    : mb52Loading
                      ? "Subiendo MB52..."
                      : "Subir MB52"}
                </button>
                <button
                  type="button"
                  className={styles.secondary}
                  onClick={() =>
                    subir(
                      "ZLX03",
                      "/api/consultaZLX03",
                      setZlx03Loading,
                      setZlx03Loaded,
                      setZlx03Status,
                    )
                  }
                  disabled={busy || !cargasReady || zlx03Loaded}
                >
                  {zlx03Loaded
                    ? "ZLX03 cargado"
                    : zlx03Loading
                      ? "Subiendo ZLX03..."
                      : "Subir ZLX03"}
                </button>
                <button
                  type="button"
                  className={styles.secondary}
                  onClick={limpiarFoto}
                  disabled={busy || !cargasReady}
                >
                  {cleaning ? "Limpiando..." : "Limpiar foto"}
                </button>
              </div>

              {(mb52Status || zlx03Status) && (
                <div className={styles.fileInfo}>
                  {mb52Status && <p>{mb52Status}</p>}
                  {zlx03Status && <p>{zlx03Status}</p>}
                </div>
              )}

              <MaterialTable key={materialReload} />
            </section>
          )}
        </main>
      </div>

      {modal && (
        <div
          className={styles.overlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="carga-titulo"
        >
          <div className={styles.dialog}>
            <h2 id="carga-titulo">{modal.title}</h2>
            <p>{modal.label}</p>
            <div className={styles.track} aria-hidden="true">
              <div className={styles.bar} style={{ width: `${modal.percent}%` }} />
            </div>
            <strong className={styles.percent}>{modal.percent}%</strong>
          </div>
        </div>
      )}
    </div>
  );
}
