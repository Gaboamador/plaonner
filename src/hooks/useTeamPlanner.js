import { useCallback } from 'react';
import { createId, removePerson, removeResponsibility } from '../utils/teamUtils.js';
import { isISODate } from '../utils/dateUtils.js';

function requireName(name, kind) {
  const value = String(name || '').trim().slice(0, 90);
  if (!value) throw new Error(`Ingresá un nombre para ${kind}.`);
  return value;
}

export function useTeamPlanner(teamState, setPlan) {
  const updateTeam = useCallback(fn => setPlan(p => ({ ...p, team: fn(p.team) })), [setPlan]);
  const saveResponsibility = useCallback(data => {
    const name = requireName(data.name, 'la responsabilidad');
    const minCoverage = Number(data.minCoverage);
    if (!Number.isInteger(minCoverage) || minCoverage < 1 || minCoverage > 100) throw new Error('El mínimo de cobertura debe ser un número entero entre 1 y 100.');
    if (teamState.responsibilities.some(r => r.id !== data.id && r.name.toLocaleLowerCase('es') === name.toLocaleLowerCase('es'))) throw new Error('Ya existe una responsabilidad con ese nombre.');
    const newId = data.id || createId('resp');
    updateTeam(team => {
      if (data.id) return { ...team, responsibilities: team.responsibilities.map(r => r.id === data.id ? { ...r, name, minCoverage } : r) };
      return { ...team, responsibilities: [...team.responsibilities, { id: newId, name, minCoverage }] };
    });
  }, [updateTeam, teamState.responsibilities]);
  const deleteResponsibility = useCallback(id => updateTeam(team => removeResponsibility(team, id)), [updateTeam]);

  const savePerson = useCallback(data => {
    const name = requireName(data.name, 'la persona');
    if (teamState.people.some(p => p.id !== data.id && p.name.toLocaleLowerCase('es') === name.toLocaleLowerCase('es'))) throw new Error('Ya existe una persona con ese nombre.');
    const newId = data.id || createId('person');
    updateTeam(team => {
      const valid = [...new Set((data.responsibilityIds || []).filter(id => team.responsibilities.some(r => r.id === id)))];
      if (data.id) return { ...team, people: team.people.map(p => p.id === data.id ? { ...p, name, responsibilityIds: valid } : p) };
      return { ...team, people: [...team.people, { id: newId, name, responsibilityIds: valid }] };
    });
  }, [updateTeam, teamState.people]);
  const deletePerson = useCallback(id => updateTeam(team => removePerson(team, id)), [updateTeam]);

  const saveVacation = useCallback(data => {
    if (!data.personId) throw new Error('Seleccioná una persona.');
    if (!isISODate(data.start) || !isISODate(data.end) || data.start > data.end) throw new Error('Indicá fechas válidas, con inicio anterior o igual al fin.');
    if (!teamState.people.some(p => p.id === data.personId)) throw new Error('La persona seleccionada ya no existe.');
    const newId = data.id || createId('vacation');
    updateTeam(team => {
      const entry = { id: newId, personId: data.personId, start: data.start, end: data.end,
        status: data.status === 'tentative' ? 'tentative' : 'confirmed' };
      if (data.id) return { ...team, vacations: team.vacations.map(v => v.id === data.id ? entry : v) };
      return { ...team, vacations: [...team.vacations, entry] };
    });
  }, [updateTeam, teamState.people]);
  const deleteVacation = useCallback(id => updateTeam(team => ({ ...team, vacations: team.vacations.filter(v => v.id !== id) })), [updateTeam]);
  return { savePerson, deletePerson, saveResponsibility, deleteResponsibility, saveVacation, deleteVacation };
}
