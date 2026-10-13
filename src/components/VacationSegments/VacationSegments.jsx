import { useState } from 'react';
import { daysInclusive } from '../../utils/dateUtils.js';
import { COLORS } from '../../utils/plannerUtils.js';
import styles from './VacationSegments.module.css';

function DateField({ index, side, value, active, onFocus, onChange }) {
  const [invalid, setInvalid] = useState(false);
  const label = side === 'start' ? 'INICIO' : 'FIN';
  return (
    <div className={`${styles['date-field']} ${active ? styles['is-target'] : ''}`} onClick={onFocus}>
      <div className="mini-label">{label}</div>
      <input
        type="date"
        aria-label={`${label === 'INICIO' ? 'Inicio' : 'Fin'} del tramo ${index + 1}`}
        value={value || ''}
        onFocus={onFocus}
        aria-invalid={invalid}
        title={invalid ? 'El fin no puede ser anterior al inicio' : undefined}
        onChange={event => {
          const accepted = onChange(event.target.value || null);
          setInvalid(!accepted);
          if (!accepted) window.alert('La fecha de fin no puede ser anterior a la fecha de inicio.');
        }}
      />
    </div>
  );
}

export default function VacationSegments({ segments, activeSegment, activeField, mode, onChooseSegment, onChooseField, onEdit }) {
  return (
    <div className={styles.segments} id="segments">
      {segments.map((segment, index) => {
        const color = COLORS[index % COLORS.length];
        const active = index === activeSegment && mode === 'vacation';
        const days = daysInclusive(segment.start, segment.end);
        return (
          <div key={index} className={`${styles['segment-card']} ${active ? styles['is-active'] : ''}`} style={{ '--segment-color': color }}>
            <button type="button" className={`${styles['segment-head']} ${active ? styles.active : ''}`} onClick={() => onChooseSegment(index)} aria-label={`Seleccionar tramo ${index + 1}`}>
              <span className={styles['segment-title']}><span className="dot" style={{ background: color }}/><span>Tramo {index + 1}</span></span>
              <span className={styles['segment-days']}>{days ? `${days} día${days === 1 ? '' : 's'}` : 'sin completar'}</span>
            </button>
            <div className={styles['segment-body']}>
              <DateField index={index} side="start" value={segment.start} active={active && activeField === 'start'} onFocus={() => onChooseField(index, 'start')} onChange={iso => onEdit(index, 'start', iso)}/>
              <DateField index={index} side="end" value={segment.end} active={active && activeField === 'end'} onFocus={() => onChooseField(index, 'end')} onChange={iso => onEdit(index, 'end', iso)}/>
            </div>
          </div>
        );
      })}
    </div>
  );
}
