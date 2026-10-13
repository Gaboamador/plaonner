# Plaonner · Calculadora + organización de vacaciones del equipo

Aplicación estática **React 19 + Vite 6**, sin backend ni autenticación. Parte de la calculadora individual original y agrega un calendario de equipo con responsabilidades, cobertura mínima, simulación de ausencias y resúmenes.

## Requisitos e instalación

- Node.js **22.12.0 o superior dentro de la línea compatible con las dependencias instaladas**; se conserva el `package.json` recibido, no hay necesidad de actualizar Node para estos cambios.
- npm; opcionalmente, Netlify CLI, que ya viene como dependencia de desarrollo.

Desde PowerShell, en la carpeta que contiene `package.json`:

```powershell
npm install
npm run dev
```

Visitar la dirección de Vite (normalmente <http://localhost:5173>). Para validar:

```powershell
npm run test:logic
npm test
npm run build
npx playwright install chromium # sólo si no está instalado
npm run test:e2e
```

`npm run test:all` ejecuta los tres grupos de pruebas.

## Qué hay de nuevo

La barra de navegación abre **Equipo** por defecto, con selector animado por CSS Modules para pasar a **Mis vacaciones** (calculadora individual existente). En Equipo:

1. Abrir **Personas y tareas** y registrar una o varias responsabilidades, cada una con una cantidad mínima de integrantes disponibles (1 por defecto).
2. Agregar personas sin un límite fijo de diez. Se pueden asignar varias responsabilidades a la misma persona.
3. Registrar múltiples períodos por persona, indicando fechas inclusivas y estado **Confirmado** o **Tentativo**. Los períodos pueden editarse/eliminarse desde la gestión o el calendario diario.
4. En **Calendario y resumen**, navegar por meses con controles junto al calendario y filtrar por responsabilidad. Alternar **Por día** (línea de tiempo coloreada, personas ausentes y cobertura) y **Por semana** (días corridos por persona y semana completa, incluyendo fines de semana y feriados, como requiere la contabilidad de vacaciones).
5. Revisar los indicadores, las alertas por responsabilidad y el resumen semanal. Al cargar o editar un período se simula su efecto **antes** de guardar.

**Regla de cobertura:** para cada día laboral (lunes a viernes, salvo feriados marcados en «Mis vacaciones»), cada responsabilidad debe tener como mínimo su número configurado de integrantes **no ausentes por vacaciones confirmadas**. Una superposición es informativa; únicamente hay alerta cuando la disponibilidad cae por debajo del mínimo. Las vacaciones tentativas se muestran, pero no restan disponibilidad hasta confirmarse. Una persona con dos períodos superpuestos sólo cuenta una vez por día. Una persona asignada a varias responsabilidades cuenta como disponible en todas ellas: Plaonner evalúa cobertura por grupo, **no** simultaneidad real de asignaciones operativas.

La vista semanal y su resumen cuentan **días corridos** de vacaciones confirmadas (lunes a domingo, incluso feriados y cuando la semana cruza de mes). La cobertura y sus alertas se siguen evaluando **sólo en días laborables**. Los períodos superpuestos no duplican días de una misma persona. Por ejemplo, del 28/09/2026 al 09/10/2026 son 7 días en la primera semana y 5 en la segunda: 12 en total.

### Datos de muestra

El archivo `examples/plaonner-ejemplo-equipo.json` contiene **diez integrantes ficticios, tres responsabilidades y vacaciones de ejemplo**, incluyendo una superposición crítica. Usá **Importar JSON** para cargarlo. Antes de importarlo, exportá tus datos actuales: **importar reemplaza la planificación completa**, no combina archivos.

## Persistencia, migración y privacidad

El almacenamiento es exclusivamente local. La clave histórica se conserva: `plaonner.planning.v1`. Cambia el **formato del contenido a versión 2** (`{ version:2, plan:{ ..., team: { people, responsibilities, vacations } } }`).

- Al abrir una instalación previa con datos v1, se migran automáticamente **tramos individuales, días disponibles, feriados y mes**. Se crea un equipo vacío. No hay que limpiar el `localStorage`.
- **Importar JSON** acepta respaldos **v1 y v2**; el respaldo que se exporta ahora es **v2** e incluye datos de ambas secciones.
- **Borrar datos y reiniciar** borra ambas secciones con una confirmación.
- Los datos quedan en el navegador y en la URL/origen donde se usen. **No** se sincronizan entre computadoras: cada dispositivo importa su copia del JSON. Los cambios de una copia **no** actualizan las otras; acordar quién distribuye el respaldo actualizado.
- No existe «rol administrador» ni contraseña hardcodeada: las opciones de gestión están disponibles para quien tiene los datos en su navegador. **No se publican datos personales del equipo en el repositorio ni en el deploy**.

### Archivos de datos y cambios futuros

Las entidades del módulo Equipo usan IDs y relaciones, separadas de los componentes. El motor de cobertura (`src/utils/teamUtils.js`) no conoce `localStorage` ni React. Esto facilita la futura conexión a un backend sin reescribir las reglas de negocio. No se recomienda cargar datos sensibles si se van a distribuir copias del JSON sin controles de acceso.

## Deploy manual a Netlify (sin GitHub ni CI)

**Este ZIP no incluye `.netlify/state.json`** para no sobrescribir el enlace local que ya tenés con tu sitio existente. Si copiás sus archivos sobre tu carpeta Plaonner actual, el vínculo se conserva.

```powershell
npm run build
npm run deploy
```

`npm run deploy` ejecuta el build local y `netlify deploy --prod --no-build --dir=dist`. Para una publicación de prueba:

```powershell
npm run deploy:preview
```

En una carpeta nueva, vinculala **al sitio existente**, sin volver a crearlo:

```powershell
npx netlify login
npx netlify link
```

Seleccionar `plaonner` y luego usar `npm run deploy`. **`git push` nunca despliega**, porque no hay conexión Git–Netlify ni workflow de publicación.

## Estructura relevante

```text
src/
  App.jsx                               Navegación y shell
  components/Calendar/                 Calculadora individual (sin rediseños)
  components/TeamWorkspace/
    TeamWorkspace.jsx                  Dashboard, dos grillas, alertas
    TeamManager.jsx                    ABM personas y responsabilidades
    VacationEditor.jsx                 Editor y simulador de períodos
    TeamWorkspace.module.css           Estilos del equipo
  hooks/useVacationPlanner.js          Estado común y persistencia
  hooks/useTeamPlanner.js              Acciones de edición del equipo
  utils/teamUtils.js                   Cobertura, fechas y resúmenes puros
  services/storageService.js           Datos v1/v2, importación y exportación
  utils/dateUtils.js                   Fechas civiles ISO
  utils/plannerUtils.js                Reglas de la calculadora original
tests/
  planner.node.test.js                 Tests existentes
  team.node.test.js                    Tests de cobertura y migración
  e2e/plaonner.spec.js                 Tests originales de navegador
  e2e/team.spec.js                     Flujos nuevos en navegador
examples/plaonner-ejemplo-equipo.json  Datos ficticios para probar
```

## Notas de mantenimiento

- Se conservan los scripts, versiones de dependencias y `package-lock.json` del proyecto recibido, incluyendo la política de **deploy exclusivamente manual**.
- No ejecutar `npm audit fix --force`: puede alterar mayor versions sin validar compatibilidad con Node 22.12.
- Antes de reemplazar archivos o importar JSON, hacer respaldo si hay datos que no se quieren perder.

## Ajustes v2.1 · Calendario y navegación

- **Equipo** abre por defecto, a la izquierda de **Mis vacaciones**. La barra superior tiene un indicador deslizante implementado sólo con CSS Modules (`prefers-reduced-motion` desactiva la animación cuando está indicado).
- Los controles de mes del equipo están **junto al calendario**, tanto en la vista diaria como en la semanal.
- La grilla semanal y el resumen semanal muestran **días corridos** de vacaciones confirmadas, incluidos sábados, domingos y feriados, sin duplicar fechas por vacaciones solapadas. Cada semana incluye sus siete días completos, aunque cruce de mes.
- **Las alertas de cobertura no cambiaron de criterio**: siguen evaluándose sólo en días laborables, excluyendo feriados. La columna «Pico hábil» del resumen semanal también mantiene ese criterio.
- No cambian `package.json`, `package-lock.json`, `netlify.toml`, la persistencia ni la exportación/importación.
- Regresión incluida: **28/09/2026–09/10/2026 = 7 + 5 = 12 días corridos**.
