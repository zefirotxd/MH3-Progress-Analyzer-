# MH3 Progress Analyzer

App local de escritorio para consultar progreso de Monster Hunter Tri leyendo una partida en modo de solo lectura.

## Instalar y abrir

Ejecuta `MH3 Progress Analyzer Setup 0.3.0-preview.5.exe`. El instalador crea o restaura el acceso del Escritorio y del menú Inicio y luego abre la app. También puedes abrirla desde esos accesos cuando quieras. Pulsa **Buscar saves en carpeta** y selecciona la carpeta `saves` del juego, la instalación de OceanTriRecomp o directamente `saves/nand/title/00010000/524d4850/data/nocopy`. La búsqueda es asíncrona y limitada para evitar congelar la app; si encuentra varias carpetas, pregunta cuál cargar. Si llega al límite, selecciona directamente `nocopy`. También puedes abrir los archivos individualmente con **Archivo → Abrir archivos de partida…** (`Ctrl+O`).

La app valida tamaño, marcador `FILE1`–`FILE6`, estado activo y checksum de cada archivo antes de leer los saves. Omite archivos válidos pero inactivos. La nueva sección **Inspector de save** muestra qué archivos y espacios de cazador se reconocieron y los valores que se están interpretando. No modifica ni sube los saves; los analiza en el equipo local.

## Qué muestra

- RC y puntos, llaves y urgentes de Loc Lac.
- Misiones completadas y progreso de la aldea de Moga.
- Catálogo de misiones de Moga y Loc Lac con filtros por búsqueda, rango, objetivo y estado registrable; objetivos de monstruo, materiales del baúl, sets de armadura y rutas de forja para las seis clases cuerpo a cuerpo.

El catálogo permite buscar misiones por nombre, monstruo u objeto y filtrar por zona, rango, objetivo, rol en la progresión y compatibilidad de la bandera de completado. “Sin completar” no significa que el juego ya la haya desbloqueado; el catálogo tampoco incluye tablas completas de recompensas.

El planificador de armadura permite copiar/importar un código compacto del set y las joyas, validado contra el catálogo. Ese código no contiene datos de la partida. El simulador aplica **Torso Up** a los puntos del pecho y sus joyas. La fuente incluida no tiene costos de forja de armadura fiables, así que estos no se estiman.

El plan de forja compara recetas de crear/mejorar con los materiales que aparecen en el baúl. Puedes sumar rutas de varias armas a una lista local, ajustar copias y ver los faltantes combinados; el inventario se descuenta una sola vez por material y se actualiza al cambiar de cazador. La lista no guarda datos de la partida. Como el save no identifica las armas equipadas, eliges manualmente qué arma ya tienes.

El save no guarda un total fiable de cazas por monstruo. Las solicitudes de aldeanos y el estado actual de Cha-Cha deben comprobarse manualmente. Los campos conocidos, sus offsets y los límites del análisis están documentados en [`docs/save-format.md`](docs/save-format.md); las mejoras pendientes están en [`docs/improvement-roadmap.md`](docs/improvement-roadmap.md).

## Generar el instalador

Con Node.js 22.12 o posterior, ejecuta `npm install`, `npm run build:data` y luego `npm run dist`. El instalador aparece en `dist/`. La base de datos empaquetada se regenera desde `src/data-catalog.json` sin depender de una descarga durante el build.

La base de nombres, estadísticas y recetas conserva la atribución de [`mh3-data`](https://github.com/maliciousbanjo/mh3-data); consulta `THIRD-PARTY-LICENSES.txt`. `npm run sync:data` refresca la instantánea del catálogo desde esa fuente; `npm run build:data` sigue generando el bundle local sin conexión.
