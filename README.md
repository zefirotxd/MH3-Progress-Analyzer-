# MH3 Progress Analyzer

App local de escritorio para consultar progreso de Monster Hunter Tri leyendo una partida en modo de solo lectura.

## Instalar y abrir

Ejecuta `MH3 Progress Analyzer Setup 0.4.0-preview.1.exe`. El instalador crea o restaura el acceso del Escritorio y del menú Inicio y luego abre la app. También puedes abrirla desde esos accesos cuando quieras. Pulsa **Buscar saves en carpeta** y selecciona la carpeta `saves` del juego, la instalación de OceanTriRecomp o directamente `saves/nand/title/00010000/524d4850/data/nocopy`. La búsqueda es asíncrona y limitada para evitar congelar la app; si encuentra varias carpetas, pregunta cuál cargar. Si llega al límite, selecciona directamente `nocopy`. También puedes abrir los archivos individualmente con **Archivo → Abrir archivos de partida…** (`Ctrl+O`).

La app valida tamaño, marcador `FILE1`–`FILE6`, estado activo y checksum de cada archivo antes de leer los saves. Omite archivos válidos pero inactivos. La nueva sección **Inspector de save** muestra qué archivos y espacios de cazador se reconocieron y los valores que se están interpretando. No modifica ni sube los saves; los analiza en el equipo local.

## Qué muestra

- RC y puntos, llaves y urgentes de Loc Lac.
- Misiones completadas y progreso de la aldea de Moga.
- Catálogo de misiones de Moga y Loc Lac con filtros por búsqueda, rango, mapa, objetivo y estado registrable; objetivos de monstruo, materiales del baúl, sets de armadura y rutas de forja para las seis clases cuerpo a cuerpo.
- Guía de 35 monstruos con zonas de daño y tolerancias a estados; las misiones completadas se muestran separadas de los conteos de cacerías.
- Buscador de fuentes de materiales: tallados, partes rompibles, captura, brillos, recompensas secundarias y misiones con el monstruo como objetivo. Las faltas de la lista de forja enlazan directamente a esta guía.

El catálogo permite buscar misiones por nombre, monstruo u objeto y filtrar por zona, rango, mapa, objetivo, rol en la progresión y compatibilidad de la bandera de completado. “Sin completar” no significa que el juego ya la haya desbloqueado. El catálogo de eventos/arena es parcial, y las recompensas secundarias no son garantías de obtención.

El planificador de armadura permite copiar/importar un código compacto del set y las joyas, validado contra el catálogo. Ese código no contiene datos de la partida. El simulador aplica **Torso Up** a los puntos del pecho y sus joyas. La fuente incluida no tiene costos de forja de armadura fiables, así que estos no se estiman.

El plan de forja compara recetas de crear/mejorar con los materiales que aparecen en el baúl. Puedes sumar rutas de varias armas a una lista local, ajustar copias y ver los faltantes combinados; el inventario se descuenta una sola vez por material y se actualiza al cambiar de cazador. La lista no guarda datos de la partida. Como el save no identifica las armas equipadas, eliges manualmente qué arma ya tienes.

La sección **Historial** compara el save actual con puntos de control locales (RC, HRP, zenny, banderas de misión y baúl) sin guardar los archivos de partida. **Armar set** permite guardar hasta 20 configuraciones de armadura con nombre en este equipo y compartirlas mediante un código.

La guía usa `mh3-data` 2.0.2, un catálogo comunitario reconstruido parcialmente desde una web archivada. No incluye rutas completas de recolección en mapas ni una lista completa de eventos/arena; la app muestra estas limitaciones en las vistas correspondientes. El save no guarda un total fiable de cacerías por monstruo. Las solicitudes de aldeanos y el estado actual de Cha-Cha deben comprobarse manualmente. Los campos conocidos, sus offsets y los límites del análisis están documentados en [`docs/save-format.md`](docs/save-format.md); las mejoras pendientes están en [`docs/improvement-roadmap.md`](docs/improvement-roadmap.md).

## Generar el instalador

Con Node.js 22.12 o posterior, ejecuta `npm install`, `npm run build:data` y luego `npm run dist`. El instalador aparece en `dist/`. La base de datos empaquetada se regenera desde `src/data-catalog.json` sin depender de una descarga durante el build.

La base de nombres, estadísticas y recetas conserva la atribución de [`mh3-data`](https://github.com/maliciousbanjo/mh3-data); consulta `THIRD-PARTY-LICENSES.txt`. `npm run sync:data` refresca la instantánea del catálogo desde esa fuente; `npm run build:data` sigue generando el bundle local sin conexión.
