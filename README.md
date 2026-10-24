# MH3 Progress Analyzer

App local de escritorio para consultar progreso de Monster Hunter Tri leyendo una partida en modo de solo lectura.

## Instalar y abrir

Ejecuta `MH3 Progress Analyzer Setup 0.6.0.exe`. El instalador crea o restaura el acceso del Escritorio y del menú Inicio y luego abre la app. También puedes abrirla desde esos accesos cuando quieras. Pulsa **Buscar saves en carpeta** y selecciona la carpeta `saves` del juego, la instalación de OceanTriRecomp o directamente `saves/nand/title/00010000/524d4850/data/nocopy`. La búsqueda es asíncrona y limitada para evitar congelar la app; si encuentra varias carpetas, pregunta cuál cargar. Si llega al límite, selecciona directamente `nocopy`. También puedes abrir los archivos individualmente con **Archivo → Abrir archivos de partida…** (`Ctrl+O`).

La app valida tamaño, marcador `FILE1`–`FILE6`, estado activo y checksum de cada archivo antes de leer los saves. Omite archivos válidos pero inactivos. La nueva sección **Inspector de save** muestra qué archivos y espacios de cazador se reconocieron y los valores que se están interpretando. No modifica ni sube los saves; los analiza en el equipo local.

## Qué muestra

- RC y puntos, llaves y urgentes de Loc Lac.
- Misiones completadas y progreso de la aldea de Moga.
- Catálogo de misiones de Moga y Loc Lac con filtros por búsqueda, rango, mapa, objetivo y estado registrable; objetivos de monstruo, materiales del baúl, sets de armadura y rutas de forja para las seis clases cuerpo a cuerpo.
- Guía de 35 monstruos con zonas de daño y tolerancias a estados; las misiones completadas se muestran separadas de los conteos de cacerías.
- Buscador de materiales con todos los resultados presentes en las tablas incluidas, y con sus fuentes conocidas: tallados, partes rompibles, captura, brillos y recompensas secundarias. Puedes abrir cada recompensa de misión para consultar sus fuentes, y ver en qué recetas de forja y mejora de armas se usa cada objeto; las faltas de la lista enlazan directamente a esta guía.
- Guía de recolección de Bosque de Moga, Isla Desierta, Llanos Arenosos, Bosque Inundado, Volcán y Tundra. Busca por objeto, mapa, área, rango o tipo de punto; muestra la lista completa disponible de cada nodo y enlaza a las tablas de origen.
- Iconos opcionales para las especies y referencias visuales de los sets de armadura. Se descargan de Monster Hunter Wiki (Fandom) solo cuando hay conexión; la app conserva marcadores visuales si no cargan y no redistribuye esos archivos de imagen.

El catálogo permite buscar misiones por nombre, monstruo u objeto y filtrar por zona, rango, mapa, objetivo, rol en la progresión y compatibilidad de la bandera de completado. Muestra todos los resultados de las tablas secundarias incluidas y detalla objetivos secundarios, pago y HRP cuando están disponibles. “Sin completar” no significa que el juego ya la haya desbloqueado. El catálogo de eventos/arena es parcial, y las recompensas secundarias no son garantías de obtención.

El planificador de armadura permite copiar/importar un código compacto del set y las joyas, validado contra el catálogo. Ese código no contiene datos de la partida. El simulador aplica **Torso Up** a los puntos del pecho y sus joyas. La fuente incluida no tiene costos de forja de armadura fiables, así que estos no se estiman.

El plan de forja compara recetas de crear/mejorar con los materiales que aparecen en el baúl. Puedes sumar rutas de varias armas a una lista local, ajustar copias y ver los faltantes combinados; el inventario se descuenta una sola vez por material y se actualiza al cambiar de cazador. La lista no guarda datos de la partida. Como el save no identifica las armas equipadas, eliges manualmente qué arma ya tienes.

La sección **Historial** compara el save actual con puntos de control locales (RC, HRP, zenny, banderas de misión y baúl), muestra todos los objetos cuya cantidad cambió y nunca guarda los archivos de partida. **Armar set** permite guardar hasta 20 configuraciones de armadura con nombre en este equipo y compartirlas mediante un código.

Las tablas de recolección provienen de una guía comunitaria japonesa de Monster Hunter 3 (Wii); abarcan 171 puntos en seis mapas, pero informan área y tipo de nodo, no coordenadas dentro del área ni porcentajes. Los datos de monstruos y misiones usan `mh3-data` 2.0.2, reconstruido parcialmente desde una web archivada; la lista de eventos/arena es parcial. El save no guarda un total fiable de cacerías por monstruo. Las solicitudes de aldeanos y el estado actual de Cha-Cha deben comprobarse manualmente. Los campos conocidos, sus offsets y los límites del análisis están documentados en [`docs/save-format.md`](docs/save-format.md); las mejoras pendientes están en [`docs/improvement-roadmap.md`](docs/improvement-roadmap.md).

## Generar el instalador

Con Node.js 22.12 o posterior, ejecuta `npm install`, `npm run build:data` y luego `npm run dist`. El instalador aparece en `dist/`. El bundle offline se genera desde `src/data-catalog.json` y `src/gathering-catalog.json`; para reconstruir este último desde la referencia comunitaria, ejecuta `python tools/import-gathering-data.py` manualmente antes de `npm run build:data`.

La base de nombres, estadísticas y recetas conserva la atribución de [`mh3-data`](https://github.com/maliciousbanjo/mh3-data); consulta `THIRD-PARTY-LICENSES.txt`. `npm run sync:data` refresca la instantánea del catálogo desde esa fuente; `npm run build:data` sigue generando el bundle local sin conexión.
