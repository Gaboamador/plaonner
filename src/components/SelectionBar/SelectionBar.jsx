import { COLORS } from '../../utils/plannerUtils.js';
import styles from './SelectionBar.module.css';

export default function SelectionBar({ segment, activeSegment, activeField, mode, onChooseField }) {
  const color = COLORS[activeSegment % COLORS.length];
  const holidayMode = mode === 'holiday';
  const title = holidayMode ? 'Marcando feriados' : `Tramo ${activeSegment + 1} · Próximo clic: ${activeField === 'start' ? 'INICIO' : 'FIN'}`;
  const caption = holidayMode ? 'Un clic marca o desmarca la fecha'
    : activeField === 'start' && segment.start && segment.end ? 'Elegí un nuevo inicio para reemplazar este tramo'
    : activeField === 'start' ? 'Primer paso: elegí desde qué día' : 'Segundo paso: elegí hasta qué día';
  return (
    <div className={`${styles['selection-bar']} ${holidayMode ? styles['is-holiday'] : ''}`} style={{ '--selection-color': color }} id="selectionBar">
      <div>
        <div className={styles['selection-context']}><span className="dot" style={{ background: color }} aria-hidden="true"/><span id="selectionTitle">{title}</span></div>
        <div className={styles['selection-caption']}>{caption}</div>
      </div>
      {!holidayMode && <div className={styles['selection-steps']} role="group" aria-label="Fecha que selecciona el calendario">
        <button type="button" aria-pressed={activeField === 'start'} onClick={() => onChooseField(activeSegment, 'start')}
          className={`${styles['select-step']} ${activeField === 'start' ? styles.active : ''} ${segment.start ? styles.done : ''}`}>1 · Inicio</button>
        <span className={styles['step-arrow']} aria-hidden="true">→</span>
        <button type="button" aria-pressed={activeField === 'end'} onClick={() => onChooseField(activeSegment, 'end')}
          className={`${styles['select-step']} ${activeField === 'end' ? styles.active : ''} ${segment.end ? styles.done : ''}`}>2 · Fin</button>
      </div>}
    </div>
  );
}
