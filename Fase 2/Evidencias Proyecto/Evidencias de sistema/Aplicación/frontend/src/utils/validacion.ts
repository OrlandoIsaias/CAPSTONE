/* Reglas de validación reutilizadas por varios formularios (registro,
   perfiles, publicar mascota). Centralizarlas evita que cada pantalla
   invente su propio criterio de "esto es un nombre válido". */

/** Solo letras (incluye tildes y ñ) y espacios, mínimo 2 caracteres —
    para campos de nombre donde no tiene sentido aceptar números o símbolos. */
export const REGEX_SOLO_LETRAS = /^[A-Za-zÀ-ÖØ-öø-ÿñÑ\s]{2,}$/;
