import { useRef, useState } from 'react';
import { serializePlan } from '../../services/storageService.js';
import styles from './StorageControls.module.css';

export default function StorageControls({ plan, status, error, onReset, onImport }) {
  const [confirmReset, setConfirmReset] = useState(false);
  const [importError, setImportError] = useState('');
  const fileInput = useRef(null);
  const statusLabel = status === 'saved' ? 'Datos guardados en este navegador'
    : status === 'error' ? 'No se pudieron guardar los datos' : 'Sin datos guardados todavía';

  function exportJson() {
    const json = serializePlan(plan);
    const href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.download = `plaonner-respaldo-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
  }

  async function importJson(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      if (file.size > 1024 * 1024) throw new Error('El archivo supera el tamaño máximo de 1 MB.');
      const text = await file.text();
      onImport(text);
      setImportError('');
    } catch (err) {
      setImportError(err.message || 'No se pudo importar el respaldo.');
    } finally { event.target.value = ''; }
  }

  return (
    <section className={styles.storage} aria-label="Almacenamiento y respaldo">
      <div className={`${styles.status} ${status === 'error' ? styles.error : ''}`} role="status">
        <span aria-hidden="true">{status === 'saved' ? '✓' : status === 'error' ? '!' : '○'}</span> {statusLabel}
      </div>
      {error && <p className={styles.errorText}>{error}</p>}
      <p className={styles.help}>Los datos personales y del equipo se guardan sólo en este navegador. Para compartirlos, exportá un JSON y pedí que lo importen en otro dispositivo. La importación reemplaza todos los datos locales.</p>
      <div className={styles.backupActions}>
        <button type="button" onClick={exportJson}>Exportar JSON</button>
        <button type="button" onClick={() => fileInput.current?.click()}>Importar JSON</button>
      </div>
      <input ref={fileInput} className={styles.srOnly} type="file" accept=".json,application/json" onChange={importJson} aria-label="Seleccionar respaldo JSON" />
      {importError && <p className={styles.errorText} role="alert">{importError}</p>}
      {!confirmReset ? <button type="button" className={styles.resetButton} onClick={() => setConfirmReset(true)}>Borrar datos y reiniciar</button>
        : <div className={styles.confirm} role="group" aria-label="Confirmación para borrar datos">
            <p>¿Borrar los tramos personales, los feriados, las personas, responsabilidades y vacaciones del equipo guardados en este navegador?</p>
            <div className={styles.backupActions}>
              <button type="button" onClick={() => setConfirmReset(false)}>Cancelar</button>
              <button type="button" className={styles.danger} onClick={() => { if (onReset()) { setConfirmReset(false); setImportError(''); } }}>Sí, borrar todo</button>
            </div>
          </div>}
    </section>
  );
}
