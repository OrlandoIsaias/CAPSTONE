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
