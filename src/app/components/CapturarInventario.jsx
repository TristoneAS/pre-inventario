"use client";

import { useEffect, useMemo, useState } from "react";
import { PLANTA_COLORS, areasForPlanta } from "../libs/areas";
import shell from "../page.module.css";
import styles from "./Operacion.module.css";
import SerialCaptura from "./SerialCaptura";
import SpecialCaptura from "./SpecialCaptura";

const PAGE_SIZE = 24;

function FactoryIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M3 21V9l5 3V9l5 3V7h8v14H3zm2-2h2v-2H5v2zm4 0h2v-2H9v2zm4 0h2v-2h-2v2zm4 0h2v-2h-2v2z"
      />
    </svg>
  );
}

function Selector({ items, query, onQuery, page, setPage, render }) {
  const filtered = items.filter((item) =>
    item.name.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const visible = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  return (
    <>
      <input
        className={styles.search}
        value={query}
        placeholder="Buscar..."
        onChange={(event) => {
          onQuery(event.target.value);
          setPage(1);
        }}
      />
      <div className={styles.tiles}>
        {visible.map((item) => render(item))}
      </div>
      {pages > 1 && (
        <div className={styles.pager}>
          <button type="button" disabled={current === 1} onClick={() => setPage(current - 1)}>
            Anterior
          </button>
          <span>
            {current} de {pages}
          </span>
          <button
            type="button"
            disabled={current === pages}
            onClick={() => setPage(current + 1)}
          >
            Siguiente
          </button>
        </div>
      )}
    </>
  );
}

export default function CapturarInventario({ user }) {
  const [step, setStep] = useState("planta");
  const [plantas, setPlantas] = useState([]);
  const [planta, setPlanta] = useState("");
  const [area, setArea] = useState(null);
  const [racks, setRacks] = useState([]);
  const [bins, setBins] = useState([]);
  const [rack, setRack] = useState("");
  const [bin, setBin] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch("/api/plantas")
      .then((response) => response.json())
      .then((data) => {
        if (active) setPlantas(data.data || []);
      })
      .catch(() => {
        if (active) setError("No se pudieron consultar las plantas");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const areas = useMemo(() => areasForPlanta(planta), [planta]);

  async function elegirPlanta(value) {
    setPlanta(value);
    setArea(null);
    setError("");
    setStep("area");
  }

  async function elegirArea(value) {
    setArea(value);
    setQuery("");
    setPage(1);
    setError("");
    setLoading(true);
    setStep("rack");
    try {
      const params = new URLSearchParams({ planta, area: value.id });
      const response = await fetch(`/api/racks?${params}`);
      const data = await response.json();
      setRacks(data.racks || []);
    } catch {
      setError("No se pudieron consultar los racks");
      setRacks([]);
    } finally {
      setLoading(false);
    }
  }

  async function elegirRack(value) {
    setRack(value);
    setQuery("");
    setPage(1);
    setError("");
    setLoading(true);
    setStep("bin");
    try {
      const params = new URLSearchParams({ planta, area: area.id, rack: value });
      const response = await fetch(`/api/bins?${params}`);
      const data = await response.json();
      setBins(data.bins || []);
    } catch {
      setError("No se pudieron consultar las ubicaciones");
      setBins([]);
    } finally {
      setLoading(false);
    }
  }

  function elegirBin(value) {
    setBin(value);
    setStep("captura");
  }

  return (
    <section className={styles.wrap}>
      {step === "planta" && (
        <>
          <div>
            <h1 className={shell.dashTitle}>Seleccionar Planta</h1>
            <p className={shell.dashHint}>
              Elija la planta donde desea capturar el inventario
            </p>
          </div>
          {loading && <p>Cargando plantas...</p>}
          {!loading && plantas.length === 0 && (
            <p>No se encontraron plantas configuradas. Verifique la tabla ubicaciones_conteo.</p>
          )}
          <div className={styles.choices}>
            {plantas.map((item) => {
              const color = PLANTA_COLORS[item] || PLANTA_COLORS.DEL;
              return (
                <button
                  key={item}
                  type="button"
                  className={styles.choice}
                  style={{ background: color.color }}
                  onClick={() => elegirPlanta(item)}
                >
                  <FactoryIcon />
                  {item}
                </button>
              );
            })}
          </div>
        </>
      )}

      {step === "area" && (
        <>
          <div className={styles.crumbs}>
            <button type="button" onClick={() => setStep("planta")}>
              Plantas
            </button>
            <span>{planta}</span>
          </div>
          <div>
            <h1 className={shell.dashTitle}>Seleccionar Área</h1>
            <p className={shell.dashHint}>
              Planta: <strong>{planta}</strong>
            </p>
            <p className={shell.dashHint}>
              Elija el área donde desea capturar el inventario
            </p>
          </div>
          <div className={styles.choices}>
            {areas.map((item) => (
              <button
                key={item.id}
                type="button"
                className={styles.choice}
                style={{ background: item.color }}
                onClick={() => elegirArea(item)}
              >
                {item.name}
              </button>
            ))}
          </div>
        </>
      )}

      {step === "rack" && area && (
        <>
          <div className={styles.crumbs}>
            <button type="button" onClick={() => setStep("planta")}>Plantas</button>
            <button type="button" onClick={() => setStep("area")}>{planta}</button>
            <span>{area.name}</span>
          </div>
          <h1 className={shell.dashTitle}>{area.name}</h1>
          {loading ? (
            <p>Cargando racks...</p>
          ) : (
            <Selector
              items={racks}
              query={query}
              onQuery={setQuery}
              page={page}
              setPage={setPage}
              render={(item) => (
                <button
                  key={item.id}
                  type="button"
                  className={styles.tile}
                  style={{ background: area.color }}
                  onClick={() => elegirRack(item.id)}
                >
                  {item.name}
                </button>
              )}
            />
          )}
        </>
      )}

      {step === "bin" && area && (
        <>
          <div className={styles.crumbs}>
            <button type="button" onClick={() => setStep("planta")}>Plantas</button>
            <button type="button" onClick={() => setStep("area")}>{planta}</button>
            <button type="button" onClick={() => elegirArea(area)}>{area.name}</button>
            <span>Rack {rack}</span>
          </div>
          <h1 className={shell.dashTitle}>Rack {rack}</h1>
          {loading ? (
            <p>Cargando ubicaciones...</p>
          ) : (
            <Selector
              items={bins}
              query={query}
              onQuery={setQuery}
              page={page}
              setPage={setPage}
              render={(item) => (
                <button
                  key={item.id}
                  type="button"
                  className={styles.tile}
                  style={{ background: area.color }}
                  onClick={() => elegirBin(item.id)}
                >
                  {item.name}
                </button>
              )}
            />
          )}
        </>
      )}

      {step === "captura" && area && (
        area.special ? (
          <SpecialCaptura
            user={user}
            planta={planta}
            area={area}
            rack={rack}
            bin={bin}
            onBack={() => setStep("bin")}
          />
        ) : (
          <SerialCaptura
            user={user}
            planta={planta}
            area={area}
            rack={rack}
            bin={bin}
            onBack={() => setStep("bin")}
            onDone={() => elegirRack(rack)}
          />
        )
      )}

      {error && <p className={`${styles.message} ${styles.error}`}>{error}</p>}
    </section>
  );
}
