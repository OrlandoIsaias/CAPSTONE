/* Validación y utilidades para celulares chilenos (+56 9 XXXX XXXX). Se usa
   en los formularios de perfil (adoptante y refugio) y para armar los links
   de WhatsApp que coordinan la entrega de una mascota. El mismo criterio de
   validación existe también en el backend (auth-service/schemas.py) —
   deben mantenerse en sincronía. */

const REGEX_TELEFONO_CL = /^(?:\+?56)?\s*9\s*\d{4}\s*\d{4}$/;

function soloDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

export function validarTelefonoCL(valor: string): boolean {
  return REGEX_TELEFONO_CL.test(valor.trim());
}

/** Formato canónico para mostrar y guardar: "+56 9 1234 5678". */
export function normalizarTelefonoCL(valor: string): string {
  const nueve = soloDigitos(valor).slice(-9); // últimos 9 dígitos: 9XXXXXXXX
  return `+56 ${nueve.slice(0, 1)} ${nueve.slice(1, 5)} ${nueve.slice(5)}`;
}

/** wa.me espera solo dígitos, con código de país y sin "+". */
function telefonoParaWhatsApp(valor: string): string {
  const nueve = soloDigitos(valor).slice(-9);
  return `56${nueve}`;
}

export function linkWhatsApp(telefono: string, mensaje: string): string {
  return `https://wa.me/${telefonoParaWhatsApp(telefono)}?text=${encodeURIComponent(mensaje)}`;
}
