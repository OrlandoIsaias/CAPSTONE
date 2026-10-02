# Datos de ejemplo (seed) — mascotas de los refugios de la nómina SII

Los refugios son reales (nómina SII). Las mascotas son **sintéticas**: se
generan con proporciones configurables y reglas de coherencia explícitas, para
que el motor de compatibilidad trabaje con perfiles verosímiles.

## Uso

Desde `Aplicación/`, con el venv de `backend/auth-service`:

```
pip install -r seed/requirements.txt
python seed/generar_mascotas.py
```

Lee los refugios de la BD (no escribe nada) y produce `seed/salida/mascotas.csv`
con un resumen de la distribución. Todo lo ajustable está en `seed_config.yaml`.

Luego, para cargar las mascotas en la BD (sin fotos):

```
python seed/cargar_mascotas.py --dry-run     # valida e inserta dentro de una transacción que se deshace
python seed/cargar_mascotas.py --limite 5    # prueba con pocas
python seed/cargar_mascotas.py               # carga todo; re-ejecutable sin duplicar
python seed/cargar_mascotas.py --borrar --confirmar   # elimina solo las mascotas seed
```

`--borrar` se detiene si alguna mascota seed tiene postulaciones reales o fotos
en Cloudinary, y elimina los puntajes de compatibilidad (`matches`) asociados,
que matching-service recalcula solo. Las mascotas publicadas por refugios
(`origen = 'manual'`) nunca se tocan.

## Fotos

Cada mascota seed recibe una foto principal de [Pixabay](https://pixabay.com/service/license-summary/)
(uso libre y gratuito), buscada por especie, raza y etapa de vida (ej. "dachshund
puppy", "mixed breed senior dog"). Requiere la clave gratuita de la API de Pixabay
(aparece en [pixabay.com/api/docs](https://pixabay.com/api/docs/) con la sesión
iniciada) en `seed/.env` (copia `seed/.env.example`) y las credenciales de
Cloudinary de `backend/mascotas-service/.env`.

```
python seed/fotos_mascotas.py --revisar              # asigna fotos; no escribe nada
python seed/fotos_mascotas.py --cargar --limite 5    # prueba con pocas
python seed/fotos_mascotas.py --cargar               # sube lo revisado; re-ejecutable
python seed/fotos_mascotas.py --borrar --confirmar   # quita todas las fotos seed
```

`--revisar` deja `salida/revision_fotos.html` para mirar las fotos antes de
cargarlas, `salida/fotos.csv` con la asignación y el autor de cada foto, y
`salida/sin_foto.csv` con las mascotas que quedan sin foto. Para cambiar una
foto, agrega su id a `fotos.excluidas` en `seed_config.yaml` y vuelve a revisar.

Cada foto se valida por sus etiquetas de Pixabay (reglas en `seed_config.yaml`,
sección `fotos`):

| Regla | Si ninguna foto cumple |
|---|---|
| Etiqueta de su especie ("himalayan" también es un panda rojo) | Se descarta esa foto |
| Etiqueta de su raza entre las 3 primeras (en mestizos, en cualquier posición) y ninguna de otra raza, incluidas razas fuera del catálogo (esfinge, bulldog…) | Queda **sin foto** |
| Cachorro: etiqueta de cachorro entre las 3 primeras; joven, adulto o senior: sin ella | Queda **sin foto** |
| Adulto o senior: sin etiquetas de joven ("young", "baby"); cachorro o joven: sin etiquetas de mayor | Queda **sin foto** |
| Senior: prefiere una foto con etiqueta de animal mayor | Usa una de adulto (aproximado; marcada en la hoja) |
| Sin personas, primeros planos, disfraces, varios animales ni otra especie | Se descarta esa foto |
| Una foto por sesión (mismo autor, ids cercanos): si no, el mismo animal aparecería en dos mascotas. Excluir una foto descarta también su sesión | Se descarta esa foto |

Las etiquetas de Pixabay tienen ruido (adultos etiquetados "kitten", un ovillo de
lana como "angora"), así que **la edad y la especie se confirman mirando cada foto**:
la revisión más eficaz es agrupar por especie y etapa, donde un adulto entre
cachorros salta a la vista. Lo que no corresponde va a `fotos.excluidas`. Al
excluir una foto, las mascotas del mismo grupo se reasignan entre fotos ya
revisadas; solo hay que mirar las fotos nuevas.

Los links de Pixabay vencen a las 24 h de consultados: `--cargar` los acepta hasta
23 h y `--revisar` reutiliza consultas de hasta 12 h, así que **tras revisar quedan
al menos 11 h para cargar** (si no, el script pide revisar de nuevo). Pixabay
tampoco permite enlazar sus imágenes desde la app: por eso se
suben a Cloudinary (`hogarmatch/seed`, etiqueta `seed`), recortadas en cuadrado de
480 px igual que las que suben los refugios.

Es **una sola foto por mascota**: con fotos de stock, varias serían animales
distintos.

## Propiedades

- **Determinista**: cada refugio usa su propio generador (`semilla` + RUT). Dos
  ejecuciones producen el mismo CSV, y agregar o quitar refugios no altera las
  mascotas de los demás.
- **Trazable**: cada mascota tiene una `clave_seed` estable (`seed-<rut>-<n>`) y
  en la BD queda con `origen = 'seed'` (migración 004), lo que permite recargar
  sin duplicar y eliminarlas en bloque.
- **Catálogos cerrados**: especies y razas son exactamente las del formulario de
  publicación (`frontend/src/utils/opcionesMascota.ts`).
- **Proporciones citables**: cada sección de `seed_config.yaml` tiene un campo
  `fuente`; los valores actuales son supuestos de trabajo hasta citarla.

## Reglas de coherencia

| Regla | Motivo |
|---|---|
| Cachorro (< 1 año) → energía media o alta | Etapa de vida |
| Senior (8+ años) → energía baja o media | Etapa de vida |
| Tolerancia a estar sola (`tolerancia_soledad`): cachorros poca, gatos adultos mucha | Etapa de vida y especie |
| Mascota reactiva (~15%) → no convive con niños, perros ni gatos, nunca es "sociable" y experiencia requerida +1 | Seguridad |
| Cuidados especiales → experiencia requerida media o más; cada descripción trae su nivel (`leves` o `complejos`) | Manejo del tratamiento |
| Tamaño adulto solo en perros (en gatos queda vacío) | `chk_mascota_tamano_perro` |
| Gato o perro pequeño → departamento | Tamaño |
| Perro mediano → casa con patio solo si su energía es alta | Tamaño y actividad |
| Perro grande → casa con patio; casa grande si además es adulto y de energía alta | Tamaño y actividad |
| ~10% de convivencias sin dato (NULL) | Fichas reales incompletas; el matching muestra una alerta y nunca excluye por eso |
| Ficha de salud (esterilizado, vacunas, desparasitado, microchip) con ~5% sin dato; cachorros casi nunca esterilizados | Informativa: no puntúa |
