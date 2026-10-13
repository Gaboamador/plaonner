import { useState } from 'react';
import { useVacationPlanner } from './hooks/useVacationPlanner.js';
import VacationSummary from './components/VacationSummary/VacationSummary.jsx';
import VacationSegments from './components/VacationSegments/VacationSegments.jsx';
import HolidayManager from './components/HolidayManager/HolidayManager.jsx';
import StorageControls from './components/StorageControls/StorageControls.jsx';
import Calendar from './components/Calendar/Calendar.jsx';
import styles from './styles/App.module.css';
import TeamWorkspace from './components/TeamWorkspace/TeamWorkspace.jsx';

export default function App() {
  const planner = useVacationPlanner();
  const [holidayName, setHolidayName] = useState('');
  const [activeArea, setActiveArea] = useState('team');
  const [teamMonth, setTeamMonth] = useState(null);
  const { plan, mode, activeField, activeSegment } = planner;
  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div><h1>Plaonner</h1><div className={styles.subtitle}>Planificá tus vacaciones y organizá la cobertura de tu equipo.</div></div>
        {activeArea === 'personal' && <button id="todayBtn" type="button" onClick={planner.goToday}>Ir a hoy</button>}
      </header>
      <nav className={`${styles.appNav} ${activeArea === 'personal' ? styles.navPersonal : styles.navTeam}`} aria-label="Secciones de Plaonner">
        <button type="button" aria-pressed={activeArea === 'team'} className={activeArea === 'team' ? styles.activeNav : ''} onClick={() => setActiveArea('team')}>Equipo</button>
        <button type="button" aria-pressed={activeArea === 'personal'} className={activeArea === 'personal' ? styles.activeNav : ''} onClick={() => setActiveArea('personal')}>Mis vacaciones</button>
      </nav>
      {activeArea === 'team' ? <TeamWorkspace plan={plan} setPlan={planner.setPlan} month={teamMonth || plan.viewMonth} setMonth={setTeamMonth} /> : <div className={styles.grid}>
        <aside className={`card ${styles.sidebar}`}>
          <div className="field"><label htmlFor="availableDays">Días disponibles</label><input type="number" id="availableDays" min="0" step="1" value={plan.availableDays} onChange={e => planner.changeAvailableDays(e.target.value)}/></div>
          <div className="field"><label htmlFor="breaks">Cantidad de quiebres</label><input type="number" id="breaks" min="0" max="10" step="1" value={plan.breaks} onChange={e => planner.changeBreaks(e.target.value)}/></div>
          <VacationSummary plan={plan}/>
          <VacationSegments segments={plan.segments} activeSegment={activeSegment} activeField={activeField} mode={mode} onChooseSegment={planner.chooseSegment} onChooseField={planner.chooseField} onEdit={planner.editSegmentDate}/>
          <HolidayManager holidays={plan.holidays} mode={mode} setMode={planner.setMode} holidayName={holidayName} setHolidayName={setHolidayName} onRemoveHoliday={planner.removeHoliday}/>
          <div className="footer-note">Elegí el tramo y después la fecha de inicio y fin. También podés tocar directamente el campo que quieras modificar. Los feriados se mantienen visibles sobre el calendario.</div>

        </aside>
        <Calendar key={`${plan.viewMonth}:${mode}:${activeSegment}:${activeField}`} plan={plan} mode={mode} activeSegment={activeSegment} activeField={activeField} holidayName={holidayName} onPickDate={planner.pickDate} onToggleHoliday={planner.toggleHoliday} onChooseField={planner.chooseField} onNavigateMonth={planner.navigateMonth}/>
      </div>}
      <footer className={styles.appFooter}><StorageControls plan={plan} status={planner.storageState} error={planner.storageError} onReset={() => { const ok = planner.reset(); if (ok) { setHolidayName(''); setActiveArea('team'); setTeamMonth(null); } return ok; }} onImport={text => { planner.importPlan(text); setTeamMonth(null); }}/></footer>
    </div>
  );
}
