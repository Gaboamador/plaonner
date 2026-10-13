import { useEffect, useState } from 'react';
import { formatDate } from '../../utils/dateUtils.js';
import { simulateVacation } from '../../utils/teamUtils.js';
import styles from './TeamWorkspace.module.css';

export default function VacationEditor({ team, holidays, data, initialPerson, initialStart, onClose, onSave, onDelete }) {
  const [personId, setPersonId] = useState(data.personId || initialPerson || team.people[0]?.id || '');
  const [start, setStart] = useState(data.start || initialStart || '');
  const [end, setEnd] = useState(data.end || initialStart || '');
  const [status, setStatus] = useState(data.status || 'confirmed');
  const [error, setError] = useState('');
  useEffect(() => {
    const onKey = event => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const preview = simulateVacation(team, { id: data.id, personId, start, end, status }, holidays);
  function save(event) {
    event.preventDefault();
    try {
      onSave({ id: data.id, personId, start, end, status });
      onClose();
    } catch (err) { setError(err.message); }
  }
  return <div className={styles.modalBackdrop} onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="vacationDialogTitle">
      <div className={styles.panelHeading}><div><h3 id="vacationDialogTitle">{data.id ? 'Editar vacaciones' : 'Registrar vacaciones'}</h3><p>Evaluá cómo impacta el período sobre la cobertura antes de guardarlo.</p></div><button type="button" onClick={onClose} aria-label="Cerrar editor de vacaciones">✕</button></div>
      <form onSubmit={save}>
        <div className={styles.formFields}><label>Persona<select aria-label="Persona de vacaciones" value={personId} required onChange={e => setPersonId(e.target.value)}>{team.people.length === 0 && <option value="">Sin integrantes</option>}{team.people.map(p => <option value={p.id} key={p.id}>{p.name}</option>)}</select></label><label>Estado<select aria-label="Estado del período" value={status} onChange={e => setStatus(e.target.value)}><option value="confirmed">Confirmado</option><option value="tentative">Tentativo</option></select></label></div>
        <div className={styles.formFields}><label>Inicio<input type="date" aria-label="Inicio de vacaciones de equipo" required value={start} onChange={e => { setStart(e.target.value); if (end && e.target.value > end) setEnd(e.target.value); }} /></label><label>Fin<input type="date" aria-label="Fin de vacaciones de equipo" required min={start || undefined} value={end} onChange={e => setEnd(e.target.value)} /></label></div>
        {preview && <div className={`${styles.preview} ${preview.conflicts ? styles.previewAlert : styles.previewOk}`} role="status"><strong>{preview.conflicts ? `⚠ ${preview.conflicts} día${preview.conflicts === 1 ? '' : 's'} con cobertura insuficiente` : '✓ No genera conflictos de cobertura'}</strong><p>{preview.workingDays} días laborables · pico de {preview.maxAbsent} personas ausentes.{preview.newlyCritical ? ` Genera ${preview.newlyCritical} días críticos nuevos.` : ''}</p>{preview.affectedResponsibilities.length > 0 && <p>Responsabilidades afectadas: {preview.affectedResponsibilities.join(', ')}</p>}{preview.truncated && <p>La simulación está limitada a diez años de fechas.</p>}</div>}
        {!preview && <div className={styles.preview}>Seleccioná inicio y fin para previsualizar el impacto.</div>}
        {status === 'tentative' && <p className={styles.note}>Los períodos tentativos se muestran rayados en el calendario y no generan alertas hasta confirmarse. La simulación los evalúa como si se confirmaran.</p>}
        {error && <p className={styles.formError} role="alert">{error}</p>}
        <div className={styles.modalActions}><button className={styles.primaryButton} type="submit" disabled={!team.people.length}>Guardar período</button><button type="button" onClick={onClose}>Cancelar</button>{data.id && <button type="button" className={styles.textDanger} onClick={() => { if (window.confirm(`¿Eliminar el período ${formatDate(data.start)} a ${formatDate(data.end)}?`)) { onDelete(data.id); onClose(); } }}>Eliminar período</button>}</div>
      </form>
    </div>
  </div>;
}
