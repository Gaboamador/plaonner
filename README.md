# Plaonner

Calculadora de vacaciones en **React + Vite**. Permite elegir tramos de vacaciones, contar días corridos inclusivos, configurar quiebres, marcar feriados y conservar la planificación en `localStorage`.

El diseño y la interacción de selección en dos clics provienen de **Calculadora vacaciones - selector mejorado.html**. No utiliza backend, usuarios, autenticación, Firebase ni ninguna conexión a una base de datos.

## Requisitos

- **Node.js 22.13 o superior** (recomendado: una versión LTS reciente de Node 22 o superior).
- npm, incluido con Node.js.
- Una cuenta de Netlify para publicar; no hace falta para trabajar localmente.

## 1. Instalar y usar en Windows PowerShell

Descomprimí el ZIP, abrí PowerShell dentro de la carpeta `plaonner` (la que contiene `package.json`) y ejecutá:

```powershell
node --version
npm install
npm run dev
```

Abrí la dirección local que muestre Vite, habitualmente `http://localhost:5173/`.

**Importante:** la carpeta `.netlify` no forma parte del ZIP porque el sitio todavía no está creado. No necesitás credenciales de Netlify para usar la app en tu PC.

## 2. Verificar antes de publicar

```powershell
npm run test:logic
npm test
npm run build
```

Los tests de `test:logic` usan únicamente Node. Los tests de `npm test` usan Vitest. Los tests de integración con navegador son opcionales; para ejecutarlos la primera vez:

```powershell
npx playwright install chromium
npm run test:e2e
```

También podés ejecutar `npm run test:all` (lógica + Vitest + Playwright). El directorio `dist/` se crea con `npm run build` y **no** se sube a Git (ver `.gitignore`).

## 3. Configurar Netlify por primera vez (SIN GitHub)

Todo se hace desde la raíz de `plaonner`, después de `npm install`.

### 3.1 Autenticar tu cuenta

```powershell
npx netlify login
```

Se abrirá el navegador para autorizar la CLI con tu cuenta Netlify.

### 3.2 Crear y vincular un sitio vacío

```powershell
npx netlify sites:create --name plaonner --account-slug gaboamador
```

La opción `--account-slug gaboamador` se basa en el identificador de tu equipo que aparece en la URL de Netlify. Si tu equipo tiene otro identificador, modificá esa opción. La disponibilidad real del subdominio se confirma **cuando Netlify acepta la creación**: que una URL muestre «Site not found» no reserva ese nombre.

Este comando crea un proyecto **sin conectar ningún repositorio Git** y vincula el directorio actual al nuevo sitio. El vínculo se guarda en `.netlify/state.json`, ignorado por Git. Si ya creaste el sitio manualmente en el panel, usá en su lugar:

```powershell
npx netlify link
```

Seleccioná **Link this directory to an existing project**, elegí el sitio `plaonner` y asegurate de que quede asociado a tu equipo. **No ejecutes `netlify init`**: ese comando configura CI / despliegue continuo, que justamente queremos evitar.

### 3.3 Publicar manualmente

```powershell
npm run deploy
```

El script hace dos pasos, en este orden:

1. `npm run build` — genera el build local en `dist/`.
2. `netlify deploy --prod --no-build --dir=dist` — sube esos archivos a producción en el sitio vinculado.

Cuando termine correctamente, entrá a <https://plaonner.netlify.app/>.

**Sólo `npm run deploy` publica en producción.** Ni `git push`, ni `npm install`, ni `npm run build`, ni `npm test` hacen deploy. No hay workflow de GitHub Actions, webhook, ni conexión Git ↔ Netlify. `npm run deploy:preview` realiza una publicación manual de prueba sin tocar producción.

Si descargás el proyecto en otra computadora, después de `npm install` repetí `npx netlify login` y `npx netlify link` (no crees otro sitio). Una vez vinculado, usá normalmente `npm run deploy`.

## 4. Persistencia y privacidad

Se almacena automáticamente en `localStorage`, bajo la clave `plaonner.planning.v1`:

- Días disponibles y quiebres.
- Fechas de inicio/fin de todos los tramos.
- Feriados personalizados.
- Mes que se estaba mostrando.

Los números calculados se recomputan al cargar. Los campos visuales de selección (Inicio/Fin activo) comienzan en su estado normal en cada visita. Se indica si los datos están guardados o si el navegador impidió guardarlos.

**Borrar datos y reiniciar** pide confirmación, elimina las claves de Plaonner del almacenamiento y restaura el estado inicial. No escribe de nuevo el estado vacío hasta que el usuario haga otra modificación.

**Exportar JSON** descarga una copia de la planificación. **Importar JSON** recupera un archivo de respaldo del mismo formato; reemplaza los datos actuales. No se manda información a ningún servidor salvo el código estático cuando se publica el proyecto.

`localStorage` es específico de cada navegador, dispositivo y origen. Las planificaciones hechas en `localhost`, `file://` o en `plaonner.netlify.app` **no se sincronizan ni se copian automáticamente**. Para trasladarlas, usá el respaldo JSON. Los feriados del HTML original se migran automáticamente **solo si se ejecuta en el mismo origen y el navegador permite acceder a la misma clave antigua**.

## 5. Estructura

```text
plaonner/
├── src/
│   ├── components/
│   │   ├── Calendar/              Calendario, rangos y previsualización
│   │   ├── SelectionBar/          Selector Inicio/Fin activo
│   │   ├── VacationSegments/      Tramos y fechas editables
│   │   ├── VacationSummary/       Días tomados y restantes
│   │   ├── HolidayManager/        Feriados personalizados
│   │   └── StorageControls/       Respaldo y restablecimiento
│   ├── hooks/
│   │   └── useVacationPlanner.js  Estado e interacción
│   ├── services/
│   │   └── storageService.js      Versión, lectura y escritura de JSON
│   ├── utils/
│   │   ├── dateUtils.js           Fechas locales, rangos inclusivos
│   │   └── plannerUtils.js        Reglas puras de negocio
│   ├── styles/                    Tema base y layout
│   ├── App.jsx
│   └── main.jsx
├── tests/
│   ├── planner.node.test.js
│   ├── planner.test.js
│   └── e2e/plaonner.spec.js
├── index.html
├── netlify.toml
├── package.json
└── vite.config.js
```

Los componentes usan CSS Modules, y los estilos generales (`body`, `button`, tokens CSS y algunos elementos compartidos) se encuentran en `src/styles/global.css`.

## 6. Git independiente de Netlify

Podés inicializar Git y configurar cualquier repositorio remoto sin afectar la publicación:

```powershell
git init
git add .
git commit -m "[NUEVO] Crear Plaonner con React, persistencia local y deploy manual"
```

Cuando quieras, vinculá un remoto y usá `git push` de forma habitual. **Netlify no recibe los pushes ni despliega automáticamente** salvo que lo conectes explícitamente más adelante.

## 7. Si falla un comando

- `npm install` / `npm run build`: comprobá `node --version` (mínimo 22.13).
- `npx netlify sites:create`: revisá que estés autenticado, que el `account-slug` sea correcto y que `plaonner` esté disponible.
- `npm run deploy`: confirmá el vínculo ejecutando `npx netlify status`; si no corresponde al sitio elegido, ejecutá `npx netlify link`.
- El sitio muestra datos distintos de los locales: el almacenamiento no se comparte entre dominios ni dispositivos; exportá/importá un respaldo JSON.
- No querés que haya deploy automático: no uses `netlify init`, ni la opción «Import from Git» del panel de Netlify; creá un proyecto vacío con CLI.

Documentación oficial: <https://docs.netlify.com/api-and-cli-guides/cli-guides/get-started-with-cli/> y <https://cli.netlify.com/commands/sites/>.
