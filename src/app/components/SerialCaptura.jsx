"use client";

import { useEffect, useRef, useState } from "react";
import shell from "../page.module.css";
import { playSound } from "../libs/sound";
import styles from "./Operacion.module.css";

export default function SerialCaptura({ user, planta, area, rack, bin, onBack, onDone }) {
  const [serialInput, setSerialInput] = useState("");
  const [serials, setSerials] = useState([]);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cajas, setCajas] = useState("");
  const [cajasError, setCajasError] = useState(false);
  const [avisoObsoleto, setAvisoObsoleto] = useState(false);
  const [modalObsoleto, setModalObsoleto] = useState(false);
  const [serialObsoleto, setSerialObsoleto] = useState("");
  const [parte, setParte] = useState("");
  const [parteError, setParteError] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [confirma, setConfirma] = useState("");
  const [confirmaError, setConfirmaError] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const parteRef = useRef(null);
  const cantidadRef = useRef(null);
  const confirmaRef = useRef(null);

  async function agregarSerial(event) {
    event.preventDefault();
    setMensaje("");
    setError("");
    const serial = serialInput.trim();
    if (!/^[SsMm].+/.test(serial) || serial.length < 10 || serial.length > 11) {
      playSound("error");
      setError("Serial inválido");
      setSerialInput("");
      return;
    }
    const clean = serial.substring(1);
    if (!/^\d+$/.test(clean)) {
      playSound("error");
      setError("Serial inválido");
      setSerialInput("");
      return;
    }
    if (serials.some((item) => item.serial === clean)) {
      playSound("error");
      setError(`El serial ${clean} ya ha sido capturado`);
      setSerialInput("");
      return;
    }

    try {
      const response = await fetch(`/api/capture/check-serial?serial=${clean}`);
      const data = await response.json();
      if (data.isCaptured) {
        playSound("error");
        setError(`El serial ${clean} ya ha sido capturado anteriormente`);
        setSerialInput("");
        return;
      }
      if (data.exists) {
        setSerials((actual) => [
          ...actual,
          {
            serial: clean,
            material: data.material.material,
            material_description: data.material.material_description,
            stock: data.material.stock,
            serial_obsoleto: 0,
          },
        ]);
        playSound("success");
        setMensaje(`Serial ${clean} agregado a la lista`);
        setSerialInput("");
        return;
      }
      playSound("error");
      setSerialObsoleto(clean);
      setParte("");
      setParteError("");
      setDescripcion("");
      setCantidad("");
      setConfirma("");
      setConfirmaError(false);
      setAvisoObsoleto(true);
    } catch {
      playSound("error");
      setError("Error al verificar el serial");
      setSerialInput("");
    }
  }

  useEffect(() => {
    if (modalObsoleto) parteRef.current?.focus();
  }, [modalObsoleto]);

  function limpiarObsoleto() {
    setAvisoObsoleto(false);
    setModalObsoleto(false);
    setSerialObsoleto("");
    setSerialInput("");
    setParte("");
    setParteError("");
    setDescripcion("");
    setCantidad("");
    setConfirma("");
    setConfirmaError(false);
  }

  async function validarParte(value) {
    const clean = String(value ?? "").replace(/^[Pp]/, "").trim();
    if (!clean) return;
    try {
      const response = await fetch(
        `/api/capture/check-part-number?partNumber=${encodeURIComponent(clean)}`,
      );
      const data = await response.json();
      if (!response.ok) {
        setParteError(data.error || "El número de parte no existe en la base de datos");
        setParte("");
        setDescripcion("");
        playSound("error");
        parteRef.current?.focus();
        return;
      }
      setDescripcion(data.data.material_description || "");
      setParteError("");
      playSound("success");
    } catch {
      setParteError("Error al verificar el número de parte");
      setParte("");
      setDescripcion("");
      playSound("error");
      parteRef.current?.focus();
    }
  }

  function guardarObsoleto() {
    if (!parte || !cantidad || parteError) return;
    if (Number.parseInt(confirma, 10) !== Number.parseInt(cantidad, 10)) {
      setConfirmaError(true);
      playSound("error");
      return;
    }
    setSerials((actual) => [
      ...actual,
      {
        serial: serialObsoleto,
        material: parte,
        material_description: descripcion,
        stock: Number.parseInt(cantidad, 10),
        serial_obsoleto: 1,
      },
    ]);
    playSound("success");
    setMensaje(`Serial ${serialObsoleto} agregado a la lista`);
    limpiarObsoleto();
  }

  function cancelarConfirmacion() {
    setConfirmOpen(false);
    setCajas("");
    setCajasError(false);
  }

  async function confirmarGuardado(event) {
    event.preventDefault();
    if (Number(cajas) !== serials.length) {
      playSound("error");
      setCajasError(true);
      return;
    }
    setCajasError(false);
    playSound("success");
    setGuardando(true);
    setError("");
    try {
      const response = await fetch("/api/capture/insert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: serials.map((item) => ({
            ...item,
            employeeId: user.emp_id,
            bin,
            rack,
            area: area.id,
            planta,
          })),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        playSound("error");
        setError(data.error || "Error al guardar");
        return;
      }
      setConfirmOpen(false);
      onDone();
    } catch {
      playSound("error");
      setError("Error al guardar");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.crumbs}>
        <button type="button" onClick={onBack}>Rack {rack}</button>
        <span>{bin}</span>
      </div>
      <div>
        <h1 className={shell.dashTitle}>Ingresar Serial</h1>
        <p className={shell.dashHint}>
          {planta} · {area.name} · {rack} · {bin}
        </p>
      </div>

      <div className={styles.split}>
        <div>
          <form className={styles.form} onSubmit={agregarSerial}>
            <label className={styles.field}>
              Serial
              <input
                value={serialInput}
                autoFocus
                onChange={(event) => setSerialInput(event.target.value)}
              />
            </label>
          </form>

          <button
            type="button"
            className={styles.save}
            disabled={serials.length === 0}
            onClick={() => {
              setConfirmOpen(true);
              setCajas("");
              setCajasError(false);
              setError("");
            }}
          >
            Terminar captura
          </button>
        </div>

        <div>
          <h2 className={shell.dashTitle}>Seriales capturados</h2>
          {serials.length === 0 ? (
            <p className={shell.dashHint}>No hay seriales capturados</p>
          ) : (
            <ul className={styles.serialList}>
              {serials.map((item, index) => (
                <li key={item.serial}>
                  <span>
                    {item.serial} · {item.material} · {item.stock}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setSerials((actual) => actual.filter((_, i) => i !== index))
                    }
                  >
                    Eliminar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {mensaje && <p className={`${styles.message} ${styles.ok}`}>{mensaje}</p>}
      {error && <p className={`${styles.message} ${styles.error}`}>{error}</p>}

      {confirmOpen && (
        <div className={styles.backdrop} role="presentation" onClick={cancelarConfirmacion}>
          <form
            className={`${styles.modalCard} ${styles.confirmCard}`}
            role="dialog"
            aria-labelledby="confirm-capture-title"
            onClick={(event) => event.stopPropagation()}
            onSubmit={confirmarGuardado}
          >
            <h2 id="confirm-capture-title" className={styles.modalTitle}>Confirmar Captura</h2>
            <p className={styles.modalHint}>
              Para confirmar que ha capturado todos los seriales correctamente, por favor ingrese la cantidad de cajas escaneadas:
            </p>
            <label className={cajasError ? `${styles.field} ${styles.fieldError}` : styles.field}>
              Cantidad de Cajas
              <input
                autoFocus
                inputMode="numeric"
                value={cajas}
                onChange={(event) => {
                  setCajas(event.target.value.replace(/\D/g, ""));
                  setCajasError(false);
                }}
              />
              {cajasError && (
                <span className={styles.helper}>
                  La cantidad ingresada no coincide con los seriales capturados
                </span>
              )}
            </label>
            {error && <p className={styles.helper}>{error}</p>}
            <div className={styles.modalActions}>
              <button type="button" className={styles.textButton} onClick={cancelarConfirmacion}>
                Cancelar
              </button>
              <button type="submit" className={styles.acceptButton} disabled={guardando || !cajas}>
                {guardando ? "Guardando..." : "Confirmar"}
              </button>
            </div>
          </form>
        </div>
      )}

      {avisoObsoleto && (
        <div
          className={styles.backdrop}
          role="presentation"
          onClick={() => {
            setAvisoObsoleto(false);
            setModalObsoleto(true);
          }}
        >
          <div
            className={styles.dialog}
            role="dialog"
            aria-labelledby="obsolete-title"
            onClick={(event) => event.stopPropagation()}
          >
            <svg className={styles.warningIcon} viewBox="0 0 24 24" aria-hidden="true">
              <path fill="currentColor" d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
            </svg>
            <h2 id="obsolete-title" className={styles.dialogTitle}>Serial Obsoleto</h2>
            <p className={styles.dialogText}>
              El serial {serialObsoleto} se guardara como obsoleto, debe capturar el numero de parte y cantidad en la siguiente ventana
            </p>
            <div className={styles.dialogActions}>
              <button
                type="button"
                className={styles.acceptButton}
                onClick={() => {
                  setAvisoObsoleto(false);
                  setModalObsoleto(true);
                }}
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}

      {modalObsoleto && (
        <div className={styles.backdrop} role="presentation" onClick={limpiarObsoleto}>
          <div
            className={styles.modalCard}
            role="dialog"
            aria-labelledby="part-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="part-title" className={styles.modalTitle}>Serial Obsoleto</h2>
            <p className={styles.modalHint}>
              El serial {serialObsoleto} no existe en la base de datos. Por favor, ingrese el número de parte y la cantidad.
            </p>
            <label className={`${styles.field} ${parteError ? styles.fieldError : ""}`}>
              Número de Parte
              <input
                ref={parteRef}
                value={parte}
                onChange={(event) => {
                  setParte(event.target.value.replace(/^[Pp]/, ""));
                  setParteError("");
                  setDescripcion("");
                }}
                onBlur={(event) => validarParte(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    validarParte(event.currentTarget.value);
                    cantidadRef.current?.focus();
                  }
                }}
              />
              {parteError && <span className={styles.helper}>{parteError}</span>}
            </label>
            {descripcion && <p className={styles.description}>Descripción: {descripcion}</p>}
            <label className={styles.field}>
              Cantidad
              <input
                ref={cantidadRef}
                type="number"
                value={cantidad}
                onChange={(event) => setCantidad(event.target.value)}
                onKeyDown={(event) => {
                  setCantidad((actual) => actual.replace(/[Qq]/, ""));
                  if (event.key === "Enter" && parte && cantidad) {
                    event.preventDefault();
                    confirmaRef.current?.focus();
                  }
                }}
              />
            </label>
            <label className={`${styles.field} ${confirmaError ? styles.fieldError : ""}`}>
              Confirmar Cantidad
              <input
                ref={confirmaRef}
                type="number"
                value={confirma}
                onChange={(event) => {
                  setConfirma(event.target.value);
                  setConfirmaError(false);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && parte && cantidad && confirma) {
                    event.preventDefault();
                    guardarObsoleto();
                  }
                }}
              />
              {confirmaError && (
                <span className={styles.helper}>La cantidad de confirmación no coincide</span>
              )}
            </label>
            <div className={styles.modalActions}>
              <button type="button" className={styles.textButton} onClick={limpiarObsoleto}>
                Cancelar
              </button>
              <button
                type="button"
                className={styles.acceptButton}
                onClick={guardarObsoleto}
                disabled={!parte || !cantidad || !confirma || Boolean(parteError)}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
