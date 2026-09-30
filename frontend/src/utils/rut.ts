// Espejo de backend/auth-service/rut.py (dígito verificador por módulo 11).

export function limpiarRut(texto: string): string {
  return texto.replace(/[^0-9kK]/g, "").toUpperCase();
}

export function calcularDv(numero: string): string {
  let suma = 0;
  let multiplicador = 2;
  for (let i = numero.length - 1; i >= 0; i--) {
    suma += Number(numero[i]) * multiplicador;
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
  }
  const resto = 11 - (suma % 11);
  if (resto === 11) return "0";
  if (resto === 10) return "K";
  return String(resto);
}

export function validarRut(texto: string): boolean {
  const limpio = limpiarRut(texto);
  if (!/^\d{1,8}[0-9K]$/.test(limpio)) return false;
  const numero = limpio.slice(0, -1);
  return Number(numero) > 0 && calcularDv(numero) === limpio.slice(-1);
}

// Formatea mientras se escribe: "651966442" -> "65.196.644-2".
export function formatearRut(texto: string): string {
  const limpio = limpiarRut(texto).slice(0, 9);
  if (limpio.length <= 1) return limpio;
  const numero = limpio.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${numero}-${limpio.slice(-1)}`;
}
