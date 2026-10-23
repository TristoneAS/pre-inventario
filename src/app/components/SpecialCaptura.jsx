"use client";

import { useRef, useState } from "react";
import shell from "../page.module.css";
import { playSound } from "../libs/sound";
import styles from "./Operacion.module.css";

export default function SpecialCaptura({ user, planta, area, rack, bin, onBack }) {
  const [serialInput, setSerialInput] = useState("");
  const [parte, setParte] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [confirma, setConfirma] = useState("");
  const [obsoleto, setObsoleto] = useState(false);
  const [avisoObsoleto, setAvisoObsoleto] = useState(false);
  const [serialAviso, setSerialAviso] = useState("");
  const [seriales, setSeriales] = useState([]);
  const parteRef = useRef(null);
  const omitirBlur = useRef(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  async function validarSerial() {
    const serial = serialInput.trim().toUpperCase();
    if (!serial) return false;
    if (!/^[Ss].{9,10}$/.test(serial)) {
      playSound("error");
      setError("Serial inválido");
      setSerialInput("");
      return false;
    }
    const clean = serial.substring(1);
    try {
      const materialResponse = await fetch(`/api/capture/check-serial?serial=${clean}`);
      const materialData = await materialResponse.json();
      if (!materialData.exists) {
        setObsoleto(true);
        setSerialAviso(serial);
        setAvisoObsoleto(true);
        playSound("error");
        return false;
      }
      const captureResponse = await fetch(`/api/capture/special?serial=${clean}`);
      const captureData = await captureResponse.json();
      if (captureData.exists) {
        playSound("error");
        setError("Este serial ya ha sido capturado");
        setSerialInput("");
        return false;
      }
    } catch {
      playSound("error");
      setError("Error al verificar el serial");
      return false;
    }
    setError("");
    return true;
  }

  function cerrarAvisoObsoleto() {
    setAvisoObsoleto(false);
    omitirBlur.current = true;
    setTimeout(() => {
      parteRef.current?.focus();
      setTimeout(() => {
        omitirBlur.current = false;
      }, 50);
    }, 100);
  }

  async function validarParte() {
    const value = parte.trim().toUpperCase();
    if (!value) return false;
    if (!/^[Pp]./.test(value)) {
      playSound("error");
      setError("Número de parte inválido");
      setParte("");
      return false;
    }
    const clean = value.substring(1);
    try {
      const response = await fetch(
        `/api/capture/check-part-number?partNumber=${encodeURIComponent(clean)}`,
      );
      const data = await response.json();
      if (!data.success) {
        playSound("error");
        setError("Número de parte no encontrado");
        setParte("");
        return false;
      }
      setParte(value);
      setDescripcion(data.data.material_description || "");
      setError("");
      return true;
    } catch {
      playSound("error");
      setError("Error al verificar el número de parte");
      setParte("");
      return false;
    }
  }

  async function guardar(event) {
    event.preventDefault();
    setMensaje("");
    if (Number(confirma) !== Number(cantidad)) {
      playSound("error");
      setError("La cantidad de confirmación no coincide");
      return;
    }
    setGuardando(true);
    try {
      const response = await fetch("/api/capture/special", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serial: serialInput.trim().substring(1),
          partNumber: parte.trim().replace(/^[Pp]/, ""),
          materialDescription: descripcion,
          quantity: Number(cantidad),
          area: area.id,
          rack,
          bin,
          employeeId: user.emp_id,
          isObsolete: obsoleto,
          planta,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        playSound("error");
        setError(data.error || "Error al guardar el serial");
        return;
      }
      setSeriales((actual) => [
        ...actual,
        { serial: serialInput.trim(), parte, cantidad },
      ]);
      playSound("success");
      setMensaje(`Serial ${serialInput.trim()} capturado`);
      setSerialInput("");
      setParte("");
      setCantidad("");
      setConfirma("");
      setDescripcion("");
      setObsoleto(false);
      setError("");
    } catch {
      playSound("error");
      setError("Error al capturar el serial");
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
        <h1 className={shell.dashTitle}>Ingresar datos</h1>
        <p className={shell.dashHint}>
          {planta} · {area.name} · {rack} · {bin}
        </p>
      </div>
      <div className={styles.split}>
        <form className={styles.form} onSubmit={guardar}>
        <label className={styles.field}>
          Serial
          <input
            value={serialInput}
            autoFocus
            onChange={(event) => setSerialInput(event.target.value.toUpperCase())}
            onBlur={() => {
              if (!omitirBlur.current) validarSerial();
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                validarSerial();
              }
            }}
          />
        </label>
        <label className={styles.field}>
          Número de parte
          <input
            ref={parteRef}
            value={parte}
            onChange={(event) => setParte(event.target.value.toUpperCase())}
            onBlur={validarParte}
          />
        </label>
        <label className={styles.field}>
          Cantidad
          <input
            inputMode="numeric"
            value={cantidad}
            onChange={(event) => setCantidad(event.target.value.replace(/\D/g, ""))}
          />
        </label>
        <label className={styles.field}>
          Confirmar cantidad
          <input
            inputMode="numeric"
            value={confirma}
            onChange={(event) => setConfirma(event.target.value.replace(/\D/g, ""))}
          />
        </label>
        <button type="submit" className={styles.save} disabled={guardando}>
          {guardando ? "Guardando..." : "Guardar serial"}
        </button>
      </form>
      <div>
        {mensaje && <p className={`${styles.message} ${styles.ok}`}>{mensaje}</p>}
        {error && <p className={`${styles.message} ${styles.error}`}>{error}</p>}
        {seriales.length > 0 && (
          <ul className={styles.serialList}>
            {seriales.map((item) => (
              <li key={item.serial}>
                <span>
                  {item.serial} · {item.parte} · {item.cantidad}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      </div>
      {avisoObsoleto && (
        <div className={styles.backdrop} role="presentation" onClick={cerrarAvisoObsoleto}>
          <div
            className={styles.dialog}
            role="dialog"
            aria-labelledby="special-obsolete-title"
            onClick={(event) => event.stopPropagation()}
          >
            <svg className={styles.warningIcon} viewBox="0 0 24 24" aria-hidden="true">
              <path fill="currentColor" d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
            </svg>
            <h2 id="special-obsolete-title" className={styles.dialogTitle}>Serial Obsoleto</h2>
            <p className={styles.dialogText}>
              El serial {serialAviso} no se encontró en la tabla de materiales.
              Se guardará como serial obsoleto.
            </p>
            <div className={styles.dialogActions}>
              <button type="button" className={styles.acceptButton} onClick={cerrarAvisoObsoleto}>
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
