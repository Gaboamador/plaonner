import { useState } from 'react';
import { formatDate } from '../../utils/dateUtils.js';
import styles from './TeamWorkspace.module.css';

function ResponsibilityForm({ data, onSave, onCancel }) {
  const [name, setName] = useState(data?.name || '');
  const [minCoverage, setMinCoverage] = useState(data?.minCoverage || 1);
  const [error, setError] = useState('');
  function submit(event) { event.preventDefault(); try { onSave({ id: data?.id, name, minCoverage }); onCancel(); } catch (err) { setError(err.message); } }
  return <form onSubmit={submit} className={styles.editForm}>
    <div className={styles.formFields}><label>Nombre de responsabilidad<input autoFocus value={name} maxLength={90} onChange={e => setName(e.target.value)} required placeholder="Ej.: Atención al público" /></label><label>Mínimo de personas disponibles<input type="number" min="1" max="100" value={minCoverage} onChange={e => setMinCoverage(e.target.value)} required /></label></div>
    {error && <p role="alert" className={styles.formError}>{error}</p>}
    <div className={styles.formActions}><button type="submit" className={styles.primaryButton}>Guardar responsabilidad</button><button type="button" onClick={onCancel}>Cancelar</button></div>
  </form>;
}

function PersonForm({ data, responsibilities, onSave, onCancel }) {
  const [name, setName] = useState(data?.name || '');
  const [selected, setSelected] = useState(data?.responsibilityIds || []);
  const [error, setError] = useState('');
  function submit(event) { event.preventDefault(); try { onSave({ id: data?.id, name, responsibilityIds: selected }); onCancel(); } catch (err) { setError(err.message); } }
  return <form className={styles.editForm} onSubmit={submit}>
    <label>Nombre de la persona<input autoFocus value={name} onChange={e => setName(e.target.value)} maxLength={90} required placeholder="Ej.: Juan Pérez" /></label>
    <fieldset className={styles.memberships}><legend>Responsabilidades que puede cubrir</legend>{responsibilities.length === 0 && <span className={styles.dim}>Todavía no se cargaron responsabilidades.</span>}{responsibilities.map(r => <label key={r.id} className={styles.checkLabel}><input type="checkbox" checked={selected.includes(r.id)} onChange={e => setSelected(current => e.target.checked ? [...current, r.id] : current.filter(x => x !== r.id))} />{r.name}</label>)}</fieldset>
    {error && <p role="alert" className={styles.formError}>{error}</p>}
    <div className={styles.formActions}><button type="submit" className={styles.primaryButton}>Guardar persona</button><button type="button" onClick={onCancel}>Cancelar</button></div>
  </form>;
}

export default function TeamManager({ team, actions, editingPerson, setEditingPerson, editingResponsibility, setEditingResponsibility, openVacation }) {
  const [addPerson, setAddPerson] = useState(false);
  const [addResponsibility, setAddResponsibility] = useState(false);
  const personOpen = addPerson || editingPerson;
  const respOpen = addResponsibility || editingResponsibility;
  const closePerson = () => { setEditingPerson(null); setAddPerson(false); };
  const closeResponsibility = () => { setEditingResponsibility(null); setAddResponsibility(false); };
  return <div className={styles.managerGrid}>
    <section className={styles.panel}>
      <div className={styles.panelHeading}><div><h3>Responsabilidades</h3><p>Definí qué tareas deben quedar cubiertas y cuántas personas se requieren.</p></div><button type="button" onClick={() => { setEditingResponsibility(null); setAddResponsibility(true); }}>+ Nueva</button></div>
      {respOpen && <ResponsibilityForm key={editingResponsibility?.id || 'new'} data={editingResponsibility} onSave={actions.saveResponsibility} onCancel={closeResponsibility}/>}
      <div className={styles.entryList}>{team.responsibilities.length === 0 && <p className={styles.dim}>Agregá una responsabilidad y asignale personas. El mínimo inicial es 1.</p>}{team.responsibilities.map(r => {
        const people = team.people.filter(p => p.responsibilityIds.includes(r.id));
        return <div key={r.id} className={styles.listEntry}><div><strong>{r.name}</strong><small>Mínimo: {r.minCoverage} · Asignadas: {people.length}</small><p>{people.map(p => p.name).join(', ') || 'Sin integrantes asignados'}</p></div><div className={styles.entryActions}><button type="button" onClick={() => { setAddResponsibility(false); setEditingResponsibility(r); }}>Editar</button><button className={styles.textDanger} type="button" onClick={() => { if (window.confirm(`¿Eliminar la responsabilidad «${r.name}»? Se quitará de las personas, pero sus vacaciones se conservarán.`)) actions.deleteResponsibility(r.id); }}>Eliminar</button></div></div>;
      })}</div>
    </section>
    <section className={styles.panel}>
      <div className={styles.panelHeading}><div><h3>Personas</h3><p>Agregá tantos integrantes como necesites y asignales una o varias responsabilidades.</p></div><button type="button" onClick={() => { setEditingPerson(null); setAddPerson(true); }}>+ Nueva</button></div>
      {personOpen && <PersonForm key={editingPerson?.id || 'new'} data={editingPerson} responsibilities={team.responsibilities} onSave={actions.savePerson} onCancel={closePerson}/>}
      <div className={styles.entryList}>{team.people.length === 0 && <p className={styles.dim}>El equipo todavía está vacío.</p>}{team.people.map(p => {
        const count = team.vacations.filter(v => v.personId === p.id).length;
        return <div key={p.id} className={styles.listEntry}><div><strong>{p.name}</strong><small>{p.responsibilityIds.map(id => team.responsibilities.find(r => r.id === id)?.name).filter(Boolean).join(' · ') || 'Sin responsabilidades asignadas'}</small><p>{count} período{count === 1 ? '' : 's'} cargado{count === 1 ? '' : 's'}</p></div><div className={styles.entryActions}><button type="button" onClick={() => openVacation(null, p.id)}>+ Vacaciones</button><button type="button" onClick={() => { setAddPerson(false); setEditingPerson(p); }}>Editar</button><button className={styles.textDanger} type="button" onClick={() => { if (window.confirm(`¿Eliminar a «${p.name}» y sus ${count} períodos? Esta acción no se puede deshacer.`)) actions.deletePerson(p.id); }}>Eliminar</button></div></div>;
      })}</div>
    </section>
    <section className={`${styles.panel} ${styles.managerFull}`}><div className={styles.panelHeading}><div><h3>Períodos registrados</h3><p>Podés corregir las fechas o pasar un período de tentativo a confirmado.</p></div><button type="button" onClick={() => openVacation()}>+ Nuevo período</button></div>
      {team.vacations.length === 0 ? <p className={styles.dim}>No hay vacaciones cargadas.</p> : <div className={styles.vacationList}>{[...team.vacations].sort((a, b) => a.start.localeCompare(b.start)).map(v => <div key={v.id} className={styles.vacationRow}><div><strong>{team.people.find(p => p.id === v.personId)?.name || 'Persona eliminada'}</strong><small>{formatDate(v.start)} — {formatDate(v.end)}</small></div><span className={`${styles.smallPill} ${v.status === 'tentative' ? styles.tentativePill : ''}`}>{v.status === 'tentative' ? 'Tentativo' : 'Confirmado'}</span><button type="button" onClick={() => openVacation(v)}>Editar</button></div>)}</div>}
    </section>
  </div>;
}
