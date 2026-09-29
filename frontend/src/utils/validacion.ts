/* Reglas de validación reutilizadas por varios formularios (registro,
   perfiles, publicar mascota). Centralizarlas evita que cada pantalla
   invente su propio criterio de "esto es un nombre válido". */

/** Solo letras (incluye tildes y ñ) y espacios, mínimo 2 caracteres —
    para campos de nombre donde no tiene sentido aceptar números o símbolos. */
export const REGEX_SOLO_LETRAS = /^[A-Za-zÀ-ÖØ-öø-ÿñÑ\s]{2,}$/;

/** Formato de correo razonable para validar en el cliente antes de golpear
    al servidor. No pretende ser RFC 5322 completo — eso lo valida
    EmailStr en el backend; esto solo evita el viaje de red cuando falta
    la arroba o el dominio de forma obvia. */
export const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
