import { useState } from 'react';
import { useVacationPlanner } from './hooks/useVacationPlanner.js';
import VacationSummary from './components/VacationSummary/VacationSummary.jsx';
import VacationSegments from './components/VacationSegments/VacationSegments.jsx';
import HolidayManager from './components/HolidayManager/HolidayManager.jsx';
import StorageControls from './components/StorageControls/StorageControls.jsx';
import Calendar from './components/Calendar/Calendar.jsx';
import styles from './styles/App.module.css';

export default function App() {
  const planner = useVacationPlanner();
  const [holidayName, setHolidayName] = useState('');
  const { plan, mode, activeField, activeSegment } = planner;
  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div><h1>Plaonner</h1><div className={styles.subtitle}>Seleccioná los tramos directamente sobre el calendario. Los días se cuentan de forma corrida e inclusiva.</div></div>
        <button id="todayBtn" type="button" onClick={planner.goToday}>Ir a hoy</button>
      </header>
      <div className={styles.grid}>
        <aside className={`card ${styles.sidebar}`}>
          <div className="field"><label htmlFor="availableDays">Días disponibles</label><input type="number" id="availableDays" min="0" step="1" value={plan.availableDays} onChange={e => planner.changeAvailableDays(e.target.value)}/></div>
          <div className="field"><label htmlFor="breaks">Cantidad de quiebres</label><input type="number" id="breaks" min="0" max="10" step="1" value={plan.breaks} onChange={e => planner.changeBreaks(e.target.value)}/></div>
          <VacationSummary plan={plan}/>
          <VacationSegments segments={plan.segments} activeSegment={activeSegment} activeField={activeField} mode={mode} onChooseSegment={planner.chooseSegment} onChooseField={planner.chooseField} onEdit={planner.editSegmentDate}/>
          <HolidayManager holidays={plan.holidays} mode={mode} setMode={planner.setMode} holidayName={holidayName} setHolidayName={setHolidayName} onRemoveHoliday={planner.removeHoliday}/>
          <div className="footer-note">Elegí el tramo y después la fecha de inicio y fin. También podés tocar directamente el campo que quieras modificar. Los feriados se mantienen visibles sobre el calendario.</div>
          <StorageControls plan={plan} status={planner.storageState} error={planner.storageError} onReset={() => { const ok = planner.reset(); if (ok) setHolidayName(''); return ok; }} onImport={planner.importPlan}/>
        </aside>
        <Calendar key={`${plan.viewMonth}:${mode}:${activeSegment}:${activeField}`} plan={plan} mode={mode} activeSegment={activeSegment} activeField={activeField} holidayName={holidayName} onPickDate={planner.pickDate} onToggleHoliday={planner.toggleHoliday} onChooseField={planner.chooseField} onNavigateMonth={planner.navigateMonth}/>
      </div>
    </div>
  );
}
