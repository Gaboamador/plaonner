import { useMemo, useState } from 'react';
import { buildCalendarDates, daysInclusive, formatDate, formatLongDate, fromLocalDate, monthDate } from '../../utils/dateUtils.js';
import { COLORS } from '../../utils/plannerUtils.js';
import SelectionBar from '../SelectionBar/SelectionBar.jsx';
import styles from './Calendar.module.css';

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function instruction(segment, index, field, mode) {
  if (mode === 'holiday') return 'Modo Feriados: hacé clic en cualquier fecha para marcarla o desmarcarla.';
  if (field === 'end') return segment.start
    ? `Tramo ${index + 1}: elegí el FIN desde el ${formatDate(segment.start)}. Pasá el mouse para previsualizar los días. Si elegís una fecha anterior, se reinicia el inicio.`
    : `Tramo ${index + 1}: el campo FIN está activo. Podés elegir una fecha, pero todavía faltará completar el inicio.`;
  if (segment.start && segment.end) return `Tramo ${index + 1} completo: ${formatDate(segment.start)} → ${formatDate(segment.end)} · ${daysInclusive(segment.start, segment.end)} días. El próximo clic en el calendario inicia una nueva selección para este tramo.`;
  if (segment.end) return `Tramo ${index + 1}: elegí el INICIO (el fin ya es ${formatDate(segment.end)}).`;
  return `Tramo ${index + 1}: elegí el INICIO. Después vas a poder elegir el fin y ver el rango resaltado.`;
}

export default function Calendar({ plan, mode, activeSegment, activeField, onPickDate, onToggleHoliday, holidayName, onChooseField, onNavigateMonth }) {
  const [hoverISO, setHoverISO] = useState(null);
  const active = plan.segments[activeSegment];
  const color = COLORS[activeSegment % COLORS.length];
  const dates = useMemo(() => buildCalendarDates(plan.viewMonth), [plan.viewMonth]);
  const currentMonth = monthDate(plan.viewMonth);
  const title = new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' }).format(currentMonth);
  const today = fromLocalDate(new Date());
  const previewing = mode === 'vacation' && activeField === 'end' && active.start && hoverISO;
  const previewValid = previewing && hoverISO >= active.start;
  let previewMessage = '';
  if (previewing) previewMessage = previewValid
    ? `Vista previa: ${daysInclusive(active.start, hoverISO)} día${daysInclusive(active.start, hoverISO) === 1 ? '' : 's'} corrido${daysInclusive(active.start, hoverISO) === 1 ? '' : 's'} · ${formatDate(active.start)} → ${formatDate(hoverISO)}`
    : `${formatDate(hoverISO)} es anterior al inicio: si hacés clic, empezás un nuevo rango desde ese día.`;

  return (
    <main className={`card ${styles['calendar-card']}`}>
      <SelectionBar segment={active} activeSegment={activeSegment} activeField={activeField} mode={mode} onChooseField={(index, field) => { setHoverISO(null); onChooseField(index, field); }}/>
      <div className={styles['calendar-toolbar']}>
        <div className={styles['month-title']} id="monthTitle">{title.charAt(0).toUpperCase() + title.slice(1)}</div>
        <div className={styles['toolbar-actions']}>
          <button type="button" id="prevMonth" aria-label="Mes anterior" onClick={() => { setHoverISO(null); onNavigateMonth(-1); }}>←</button>
          <button type="button" id="nextMonth" aria-label="Mes siguiente" onClick={() => { setHoverISO(null); onNavigateMonth(1); }}>→</button>
        </div>
      </div>
      <div className={styles.calendar} id="calendar" aria-label="Calendario de vacaciones" onMouseLeave={() => setHoverISO(null)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setHoverISO(null); }}>
        {WEEKDAYS.map(day => <div className={styles.dow} key={day}>{day}</div>)}
        {dates.map(iso => {
          const other = iso.slice(0, 7) !== plan.viewMonth;
          const holiday = Object.hasOwn(plan.holidays, iso);
          const ranges = plan.segments.map((seg, index) => ({ seg, index })).filter(({ seg }) => seg.start && seg.end && iso >= seg.start && iso <= seg.end);
          const start = plan.segments.some(seg => seg.start === iso);
          const end = plan.segments.some(seg => seg.end === iso);
          const activeStart = active.start === iso;
          const activeEnd = active.end === iso;
          const pendingStart = activeStart && !active.end;
          const isPreview = previewValid && iso >= active.start && iso <= hoverISO;
          const isPreviewEdge = isPreview && (iso === active.start || iso === hoverISO);
          const invalidPreview = previewing && !previewValid && iso === hoverISO;
          const role = activeStart && activeEnd ? 'INICIO · FIN' : activeStart ? 'INICIO' : activeEnd ? 'FIN' : '';
          const classes = [styles.day, other && styles.other, iso === today && styles.today, holiday && styles.holiday,
            start && styles['is-start'], end && styles['is-end'], activeStart && styles['is-current-start'], activeEnd && styles['is-current-end'],
            pendingStart && styles['is-pending-start'], isPreview && styles.preview, isPreviewEdge && styles['preview-edge'], invalidPreview && styles['preview-invalid']].filter(Boolean).join(' ');
          return (
            <button type="button" key={iso} className={classes} data-iso={iso} style={{ '--day-color': color }} aria-label={formatLongDate(iso)}
              onClick={() => { setHoverISO(null); if (mode === 'holiday') onToggleHoliday(iso, holidayName); else onPickDate(iso); }}
              onMouseEnter={() => setHoverISO(iso)} onFocus={() => setHoverISO(iso)}>
              {ranges.map(({ index }) => <div key={`layer-${index}`} className={styles['range-layer']} style={{ background: COLORS[index % COLORS.length] }} />)}
              <div className={styles['day-num']}>{Number(iso.slice(-2))}</div>
              {holiday && <div className={styles['holiday-badge']} title={plan.holidays[iso] || 'Feriado'}>FER</div>}
              {ranges.map(({ index }) => <div key={`tag-${index}`} className={styles['range-tag']} style={{ background: COLORS[index % COLORS.length], bottom: `${7 + index * 6}px` }} />)}
              {role && <div className={styles['day-role']}>{role}</div>}
            </button>
          );
        })}
      </div>
      <div className={styles.hint} id="hint" aria-live="polite">{instruction(active, activeSegment, activeField, mode)}</div>
      <div className={styles['preview-hint']} id="previewHint" aria-live="off">{previewMessage}</div>
      <div className={styles.legend} id="legend">
        {plan.segments.map((_, index) => <div className={styles['legend-item']} key={index}><span className="dot" style={{ background: COLORS[index % COLORS.length] }}/> Tramo {index + 1}</div>)}
      </div>
    </main>
  );
}
