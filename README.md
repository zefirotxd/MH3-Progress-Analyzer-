# MH3 Progress Analyzer

App local de escritorio para consultar progreso de Monster Hunter Tri leyendo una partida en modo de solo lectura.

## Instalar y abrir

Ejecuta `MH3 Progress Analyzer Setup 0.3.0-preview.1.exe`. El instalador crea o restaura el acceso del Escritorio y del menú Inicio y luego abre la app. También puedes abrirla desde esos accesos cuando quieras. Pulsa **Buscar saves en carpeta** y selecciona la carpeta `saves` del juego, la instalación de OceanTriRecomp o directamente `saves/nand/title/00010000/524d4850/data/nocopy`. La app busca `data00` a `data05` en esa ruta; si encuentra más de una carpeta, pregunta cuál cargar. También puedes abrir los archivos individualmente con **Archivo → Abrir archivos de partida…** (`Ctrl+O`).

La app valida tamaño, marcador `FILE1`–`FILE6`, estado activo y checksum de cada archivo antes de leer los saves. Omite archivos válidos pero inactivos. La nueva sección **Inspector de save** muestra qué archivos y espacios de cazador se reconocieron y los valores que se están interpretando. No modifica ni sube los saves; los analiza en el equipo local.

## Qué muestra

- RC y puntos, llaves y urgentes de Loc Lac.
- Misiones completadas y progreso de la aldea de Moga.
- Objetivos de monstruo presentes en misiones completadas, materiales del baúl, sets de armadura y rutas de forja de las seis clases de armas cuerpo a cuerpo.

El plan de forja compara recetas de crear/mejorar con los materiales que aparecen en el baúl. Como el save no identifica las armas equipadas, eliges manualmente qué arma ya tienes. El simulador de armadura permite colocar joyas en los espacios de cada pieza y aplica **Torso Up** a los puntos del pecho y sus joyas.

El save no guarda un total fiable de cazas por monstruo. Las solicitudes de aldeanos y el estado actual de Cha-Cha deben comprobarse manualmente. Los campos conocidos, sus offsets y los límites del análisis están documentados en [`docs/save-format.md`](docs/save-format.md); las mejoras pendientes están en [`docs/improvement-roadmap.md`](docs/improvement-roadmap.md).

## Generar el instalador

Con Node.js 22.12 o posterior, ejecuta `npm install`, `npm run build:data` y luego `npm run dist`. El instalador aparece en `dist/`. La base de datos empaquetada se regenera desde `src/data-catalog.json` sin depender de una descarga durante el build.

La base de nombres, estadísticas y recetas conserva la atribución de [`mh3-data`](https://github.com/maliciousbanjo/mh3-data); consulta `THIRD-PARTY-LICENSES.txt`. `npm run sync:data` refresca la instantánea del catálogo desde esa fuente; `npm run build:data` sigue generando el bundle local sin conexión.
