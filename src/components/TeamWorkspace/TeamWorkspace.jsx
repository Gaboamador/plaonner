import { useEffect, useMemo, useState } from 'react';
import { addMonths, formatDate, monthISO } from '../../utils/dateUtils.js';
import { findAbsences, getDayCoverage, getMonthDays, getPersonWeekDays, summarizeMonth, summarizeWeeks, TEAM_COLORS } from '../../utils/teamUtils.js';
import { useTeamPlanner } from '../../hooks/useTeamPlanner.js';
import TeamManager from './TeamManager.jsx';
import VacationEditor from './VacationEditor.jsx';
import styles from './TeamWorkspace.module.css';

const shortWeekday = iso => new Intl.DateTimeFormat('es-AR', { weekday: 'narrow', timeZone: 'UTC' }).format(new Date(`${iso}T12:00:00Z`)).toUpperCase();
const nameOfMonth = month => new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${month}-01T12:00:00Z`));
const firstAndLast = dates => dates.length ? dates.length === 1 ? formatDate(dates[0]) : `${formatDate(dates[0])} – ${formatDate(dates.at(-1))}` : '';

function Stat({ label, value, info, tone }) {
  return <div className={`${styles.stat} ${tone === 'critical' ? styles.statCritical : ''}`}><div className={styles.statLabel}>{label}</div><strong>{value}</strong><small>{info}</small></div>;
}

function TeamCalendar({ team, month, holidays, selectedDay, onSelectDay, filter, onEditVacation, onAddVacation }) {
  const days = useMemo(() => getMonthDays(month), [month]);
  const shownPeople = filter === 'all' ? team.people : team.people.filter(p => p.responsibilityIds.includes(filter));
  const coverage = useMemo(() => Object.fromEntries(days.map(iso => [iso, getDayCoverage(team, iso, holidays)])), [days, team, holidays]);
  return (
    <div className={styles.calendarScroller} role="region" aria-label="Calendario diario del equipo; desplazable horizontalmente" tabIndex={0}>
      <table className={styles.timeline}>
        <thead><tr><th className={styles.stickyCell}>Persona</th>{days.map(iso => <th key={iso} className={`${!coverage[iso].working ? styles.nonwork : ''} ${selectedDay === iso ? styles.selectedColumn : ''}`}><span>{shortWeekday(iso)}</span><strong>{Number(iso.slice(-2))}</strong>{holidays[iso] && <span className={styles.holidayMark} title={holidays[iso]}>●</span>}</th>)}</tr></thead>
        <tbody>
          {shownPeople.map(person => {
            const color = TEAM_COLORS[team.people.indexOf(person) % TEAM_COLORS.length];
            const personVacations = team.vacations.filter(v => v.personId === person.id);
            return <tr key={person.id}>
              <th scope="row" className={styles.stickyCell}><span className={styles.personLabel}><i style={{ background: color }}/>{person.name}</span></th>
              {days.map(iso => {
                const { confirmed, tentative } = findAbsences({ vacations: personVacations }, iso);
                const hasConfirmed = confirmed.has(person.id);
                const isTentative = !hasConfirmed && tentative.has(person.id);
                const vacations = personVacations.filter(v => v.start <= iso && v.end >= iso);
                return <td key={iso} className={`${!coverage[iso].working ? styles.nonwork : ''} ${selectedDay === iso ? styles.selectedColumn : ''}`}>
                  <button type="button" className={`${styles.daySquare} ${hasConfirmed ? styles.occupied : ''} ${isTentative ? styles.tentative : ''}`}
                    style={{ '--person-color': color }} onClick={() => { onSelectDay(iso); if (vacations.length === 1) onEditVacation(vacations[0]); else if (vacations.length === 0) onAddVacation(person.id, iso); }}
                    title={`${person.name}, ${formatDate(iso)}: ${hasConfirmed ? 'vacaciones confirmadas' : isTentative ? 'vacaciones tentativas' : 'disponible'}${!coverage[iso].working ? ' · no laborable' : ''}`}
                    aria-label={`${person.name}, ${formatDate(iso)}: ${hasConfirmed ? 'ausente' : isTentative ? 'tentativo' : 'disponible'}`}>{hasConfirmed && '·'}</button>
                </td>;
              })}
            </tr>;
          })}
          {shownPeople.length === 0 && <tr><td colSpan={days.length + 1} className={styles.emptyLine}>No hay personas para mostrar. Agregá integrantes o cambiá el filtro.</td></tr>}
        </tbody>
        <tfoot><tr><th className={styles.stickyCell}>Ausentes</th>{days.map(iso => { const d = coverage[iso]; return <td key={iso} className={`${styles.countCell} ${d.critical ? styles.criticalCount : ''} ${selectedDay === iso ? styles.selectedColumn : ''}`}><button type="button" aria-label={`${formatDate(iso)}: ${d.absentCount} ausentes${d.critical ? ', alerta de cobertura' : ''}`} onClick={() => onSelectDay(iso)}>{d.working ? d.absentCount : '—'}</button></td>; })}</tr></tfoot>
      </table>
    </div>
  );
}

function WeekGrid({ team, weeks, filter }) {
  const people = filter === 'all' ? team.people : team.people.filter(p => p.responsibilityIds.includes(filter));
  return <div className={styles.calendarScroller} role="region" aria-label="Resumen semanal por persona" tabIndex={0}>
    <table className={styles.weekMatrix}><thead><tr><th className={styles.weekName}>Persona</th>
      {weeks.map((w, i) => {
        const viernes = new Date(`${w.start}T12:00:00Z`);
        viernes.setUTCDate(viernes.getUTCDate() + 4);
        const fin = viernes.toISOString().slice(0, 10);
        const inicioTexto = formatDate(w.start).slice(0, 5);
        const finTexto = formatDate(fin).slice(0, 5);
        const inicioCorto = w.start.slice(0, 7) === fin.slice(0, 7)
          ? inicioTexto.slice(0, 2)
          : inicioTexto;
        const semanas = ['I', 'II', 'III', 'IV', 'V', 'VI'];
        return (
          <th key={w.start}>
            SEMANA {semanas[i]}
            <br />
            {inicioCorto} al {finTexto}
          </th>
        );
      })}
      <th>Total corridos</th></tr></thead>
      <tbody>{people.map(person => {
        const color = TEAM_COLORS[team.people.indexOf(person) % TEAM_COLORS.length];
        const counts = weeks.map(w => getPersonWeekDays(team, person.id, w.start));
        return <tr key={person.id}><th className={styles.weekName}><span className={styles.personLabel}><i style={{ background: color }} />{person.name}</span></th>{counts.map((n, i) => <td key={weeks[i].start}><span className={`${styles.weekNumber} ${n ? styles.weekOccupied : ''}`} style={n ? { '--person-color': color } : undefined}>{n || '—'}</span></td>)}<td><strong>{counts.reduce((a, b) => a + b, 0)}</strong></td></tr>;
      })}{people.length === 0 && <tr><td colSpan={weeks.length + 2} className={styles.emptyLine}>No hay personas para mostrar.</td></tr>}</tbody>
      <tfoot><tr><th className={styles.weekName}>Persona-días</th>{weeks.map(w => <td key={w.start}>{getMonthWeekPersonDays(team, w.start)}</td>)}<td>—</td></tr></tfoot>
    </table>
  </div>;
}

function getMonthWeekPersonDays(team, monday) {
  return team.people.reduce((sum, person) => sum + getPersonWeekDays(team, person.id, monday), 0);
}

function DayDetails({ day, team, onEditVacation }) {
  const out = team.people.filter(p => day.confirmed.has(p.id));
  const possible = team.people.filter(p => day.tentative.has(p.id) && !day.confirmed.has(p.id));
  return <section className={styles.details} aria-label="Detalle de fecha seleccionada">
    <div className={styles.sectionTitle}><h3>{formatDate(day.iso)}</h3><span className={styles.smallPill}>{day.working ? 'Día laborable' : 'No laborable'}</span></div>
    <p className={styles.dim}>{day.working ? `${day.presentCount} de ${team.people.length} personas disponibles` : 'No se evalúan alertas de cobertura en días no laborables.'}</p>
    <div className={styles.groupChips}>{day.responsibilities.map(r => <span key={r.id} className={`${styles.groupChip} ${r.critical ? styles.chipCritical : ''}`}>{r.name}: {r.available}/{r.minCoverage} mínimo {r.critical ? '⚠' : '✓'}</span>)}</div>
    <p className={styles.dim}><strong>Ausentes:</strong> {out.length ? out.map(p => p.name).join(', ') : 'Nadie'}{possible.length ? ` · Tentativas: ${possible.map(p => p.name).join(', ')}` : ''}</p>
    {out.length > 0 && <div className={styles.smallLinks}>{team.vacations.filter(v => v.status === 'confirmed' && v.start <= day.iso && v.end >= day.iso).map(v => <button key={v.id} type="button" onClick={() => onEditVacation(v)}>Editar {team.people.find(p => p.id === v.personId)?.name} ({formatDate(v.start)}–{formatDate(v.end)})</button>)}</div>}
  </section>;
}

export default function TeamWorkspace({ plan, setPlan, month, setMonth }) {
  const team = plan.team;
  const actions = useTeamPlanner(team, setPlan);
  const [section, setSection] = useState('calendar');
  const [calendarView, setCalendarView] = useState('daily');
  const [selectedDay, setSelectedDay] = useState(null);
  const [filter, setFilter] = useState('all');
  const [editingVacation, setEditingVacation] = useState(null); // null, {} o período existente
  const [initialPerson, setInitialPerson] = useState('');
  const [initialStart, setInitialStart] = useState('');
  const [editingPerson, setEditingPerson] = useState(null);
  const [editingResponsibility, setEditingResponsibility] = useState(null);
  useEffect(() => { if (filter !== 'all' && !team.responsibilities.some(r => r.id === filter)) setFilter('all'); }, [filter, team.responsibilities]);
  const summary = useMemo(() => summarizeMonth(team, month, plan.holidays), [team, month, plan.holidays]);
  const weeks = useMemo(() => summarizeWeeks(team, month, plan.holidays), [team, month, plan.holidays]);
  const focusedDay = selectedDay && selectedDay.startsWith(month) ? selectedDay : (summary.days.find(d => d.working)?.iso || `${month}-01`);
  const dayDetail = getDayCoverage(team, focusedDay, plan.holidays);
  const openVacation = (data = null, personId = '', start = '') => { setEditingVacation(data || {}); setInitialPerson(personId); setInitialStart(start); };
  return <div className={styles.root}>
    <div className={styles.intro}><div><h2>Organización del equipo</h2><p>Visualizá las ausencias y verificá que cada responsabilidad mantenga su cobertura mínima.</p></div><div className={styles.pageTabs} role="group" aria-label="Secciones del equipo"><button className={section === 'calendar' ? styles.tabActive : ''} onClick={() => setSection('calendar')} type="button">Calendario y resumen</button><button className={section === 'manage' ? styles.tabActive : ''} onClick={() => setSection('manage')} type="button">Personas y tareas</button></div></div>
    {section === 'manage' ? <TeamManager team={team} actions={actions} editingPerson={editingPerson} setEditingPerson={setEditingPerson} editingResponsibility={editingResponsibility} setEditingResponsibility={setEditingResponsibility} openVacation={openVacation}/> : <>
      <div className={styles.toolRow}><div className={styles.toolbarEnd}><label>Responsabilidad <select aria-label="Filtrar por responsabilidad" value={filter} onChange={e => setFilter(e.target.value)}><option value="all">Todas</option>{team.responsibilities.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label><button className={styles.primaryButton} onClick={() => openVacation()} type="button">+ Cargar vacaciones</button></div></div>
      <div className={styles.stats}>
        <Stat label="Integrantes" value={team.people.length} info={`${team.responsibilities.length} responsabilidades`}/>
        <Stat label="Pico de ausentes" value={summary.maxAbsent} info={summary.peakDays.length ? firstAndLast(summary.peakDays.slice(0, 2)) : 'Sin ausencias confirmadas'}/>
        <Stat label="Días sin cobertura" value={summary.criticalDays} info="Días laborables del mes" tone={summary.criticalDays ? 'critical' : undefined}/>
        <Stat label="Personas de vacaciones" value={summary.peopleWithVacation} info="Con períodos confirmados en el mes"/>
      </div>
      {!team.people.length && <div className={styles.notice}>Todavía no hay integrantes registrados. <button type="button" onClick={() => setSection('manage')}>Configurá las personas y responsabilidades</button> para empezar.</div>}
      {!!team.people.length && !team.responsibilities.length && <div className={styles.notice}>Todavía no hay responsabilidades. El calendario funciona, pero las alertas requieren <button type="button" onClick={() => setSection('manage')}>configurar tareas y mínimos</button>.</div>}
      <div className={styles.panel}>
        <div className={`${styles.panelHeading} ${styles.calendarHeading}`}><div className={styles.calendarHeadingText}><h3>{calendarView === 'daily' ? 'Línea de tiempo diaria' : 'Resumen por semanas y personas'}</h3><p>{calendarView === 'daily' ? 'Una fila por persona; los días coloreados indican vacaciones. Deslizá horizontalmente para recorrer el mes.' : 'Cada celda representa días corridos de vacaciones confirmadas en una semana completa (lunes a domingo).'}</p></div><div className={styles.calendarControls}><div className={styles.monthNav} aria-label="Navegación del calendario del equipo"><button type="button" onClick={() => setMonth(addMonths(month, -1))} aria-label="Mes anterior del equipo" title="Mes anterior">‹</button><h3 aria-live="polite">{nameOfMonth(month)}</h3><button type="button" onClick={() => setMonth(addMonths(month, 1))} aria-label="Mes siguiente del equipo" title="Mes siguiente">›</button></div><button type="button" className={styles.currentMonthButton} onClick={() => setMonth(monthISO(new Date()))} aria-label="Ir al mes actual del equipo">Mes actual</button><label className={styles.monthJump}><span>Ir al mes</span><input type="month" aria-label="Ir al mes del equipo" value={month} onChange={e => { if (/^\d{4}-(0[1-9]|1[0-2])$/.test(e.target.value)) setMonth(e.target.value); }}/></label><div className={styles.pageTabs} role="group" aria-label="Visualización de vacaciones"><button type="button" className={calendarView === 'daily' ? styles.tabActive : ''} onClick={() => setCalendarView('daily')}>Por día</button><button type="button" className={calendarView === 'weekly' ? styles.tabActive : ''} onClick={() => setCalendarView('weekly')}>Por semana</button></div></div></div>
        {calendarView === 'daily' ? <>
          <div className={styles.legend}><span><i className={styles.legendSolid}/> Confirmadas</span><span><i className={styles.legendStriped}/> Tentativas</span><span><i className={styles.legendAlert}/> Sin cobertura</span></div>
          <TeamCalendar team={team} month={month} holidays={plan.holidays} selectedDay={focusedDay} onSelectDay={setSelectedDay} filter={filter} onEditVacation={data => openVacation(data)} onAddVacation={(id, iso) => openVacation(null, id, iso)}/>
          <DayDetails day={dayDetail} team={team} onEditVacation={data => openVacation(data)}/>
        </> : <><WeekGrid team={team} weeks={weeks} filter={filter}/><p className={styles.note}>Los días son corridos: sábados, domingos y feriados incluidos. Las semanas se muestran completas, incluso cuando cruzan de mes. No se duplican días por períodos superpuestos.</p></>}
      </div>
      <div className={styles.lowerGrid}>
        <section className={styles.panel}><div className={styles.panelHeading}><h3>Alertas de cobertura</h3><span className={`${styles.smallPill} ${summary.criticalDays ? styles.dangerText : ''}`}>{summary.criticalDays} días</span></div>
          {summary.responsibilityAlerts.length === 0 ? <div className={styles.allClear}>✓ Ninguna responsabilidad queda por debajo de su mínimo durante los días laborables de este mes.</div> : <div className={styles.alertList}>{summary.responsibilityAlerts.map(alert => <div className={styles.alertRow} key={alert.id}><strong>{alert.name}</strong><span>{alert.count} día{alert.count === 1 ? '' : 's'} sin cobertura</span><div className={styles.alertDates}>{alert.dates.map(iso => <button key={iso} onClick={() => { setSelectedDay(iso); setCalendarView('daily'); }} type="button" title={formatDate(iso)}>{Number(iso.slice(-2))}</button>)}</div></div>)}</div>}
          <p className={styles.note}>Sólo se consideran las vacaciones confirmadas en días hábiles (lunes a viernes, sin feriados). Una persona que cubre varias tareas cuenta en cada una de ellas.</p>
        </section>
        <section className={styles.panel}><div className={styles.panelHeading}><h3>Resumen semanal</h3><span className={styles.smallPill}>Mes visible</span></div><table className={styles.weekly}><thead><tr><th>Semana</th><th>Persona-días</th><th>Pico hábil</th><th>Alertas</th></tr></thead><tbody>{weeks.map(w => <tr key={w.start}><td>{formatDate(w.start).slice(0,5)} – {formatDate(w.end).slice(0,5)}</td><td>{w.absentPersonDays}</td><td>{w.peakAbsences}</td><td className={w.criticalDays ? styles.dangerText : ''}>{w.criticalDays}</td></tr>)}</tbody></table><p className={styles.note}>Persona-días = suma de días corridos de vacaciones confirmadas en semanas completas, aunque crucen de mes. Pico y alertas se evalúan sólo en días laborables.</p></section>
      </div>
    </>}
    {editingVacation && <VacationEditor team={team} holidays={plan.holidays} data={editingVacation} initialPerson={initialPerson} initialStart={initialStart} onClose={() => setEditingVacation(null)} onSave={actions.saveVacation} onDelete={actions.deleteVacation}/>}
  </div>;
}
