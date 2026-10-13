import { formatDate } from '../../utils/dateUtils.js';
import styles from './HolidayManager.module.css';

export default function HolidayManager({ holidays, mode, setMode, onRemoveHoliday, holidayName, setHolidayName }) {
  const sorted = Object.entries(holidays).sort(([a], [b]) => a.localeCompare(b));
  return (
    <section className={styles['holiday-tools']} aria-label="Gestión de feriados">
      <div className="field" style={{ marginBottom: 10 }}><label>Modo del calendario</label></div>
      <div className={styles['mode-row']}>
        <button type="button" className={`${styles['mode-btn']} ${mode === 'vacation' ? styles.active : ''}`} aria-pressed={mode === 'vacation'} onClick={() => setMode('vacation')}>Vacaciones</button>
        <button type="button" className={`${styles['mode-btn']} ${mode === 'holiday' ? styles.active : ''}`} aria-pressed={mode === 'holiday'} onClick={() => setMode('holiday')}>Feriados</button>
      </div>
      {mode === 'holiday' && <input className={styles['holiday-name']} type="text" maxLength={60} placeholder="Nombre del feriado (opcional)" aria-label="Nombre del feriado" value={holidayName} onChange={e => setHolidayName(e.target.value)}/>} 
      <div className="mini-label" style={{ marginBottom: 7 }}>Feriados marcados: <strong id="holidayCount">{sorted.length}</strong></div>
      <div className={styles['holiday-list']} id="holidayList">
        {sorted.length === 0 ? <div className={styles['holiday-empty']}>Todavía no marcaste feriados.</div>
          : sorted.map(([iso, name]) => <div className={styles['holiday-item']} key={iso}>
            <div className={styles['holiday-item-main']}><div className={styles['holiday-item-date']}>{formatDate(iso)}</div><div className={styles['holiday-item-name']} title={name || 'Feriado'}>{name || 'Feriado'}</div></div>
            <button className={styles['holiday-remove']} type="button" title="Quitar feriado" aria-label={`Quitar feriado del ${formatDate(iso)}`} onClick={() => onRemoveHoliday(iso)}>×</button>
          </div>)}
      </div>
    </section>
  );
}
