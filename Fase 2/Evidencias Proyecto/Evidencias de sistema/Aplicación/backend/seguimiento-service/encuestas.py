"""
Cuándo se puede responder cada encuesta de seguimiento (30 y 90 días).
Sin BD: main.py le pasa los datos ya leídos, y test_chat.py lo prueba directo.
"""
from datetime import datetime, timedelta
from typing import Dict, List, Optional

import schemas

HITOS = (30, 90)


def calcular(
    resultados: Dict[int, Optional[str]],
    fecha_adopcion: Optional[datetime],
    mascota_estado: str,
    ahora: datetime,
    sin_espera: bool = False,
) -> List[schemas.EncuestaEstado]:
    """resultados: {dias: resultado} de las encuestas ya respondidas.

    Una encuesta se abre cuando el refugio confirmó la adopción y pasaron sus
    días desde fecha_adopcion. Tras una devolución no se abren más: la
    adopción terminó. Las adopciones confirmadas antes de la migración 007 no
    tienen fecha; se reconocen por el estado de la mascota y sus encuestas
    quedan abiertas, porque no hay desde dónde contar."""
    adopcion_confirmada = fecha_adopcion is not None or mascota_estado == "adoptada"
    hubo_devolucion = "devuelta" in resultados.values()

    encuestas = []
    for dias in HITOS:
        if dias in resultados:
            encuestas.append(schemas.EncuestaEstado(dias=dias, estado="respondida", resultado=resultados[dias]))
            continue
        desde = fecha_adopcion + timedelta(days=dias) if fecha_adopcion else None
        plazo_cumplido = sin_espera or desde is None or desde <= ahora
        disponible = adopcion_confirmada and not hubo_devolucion and plazo_cumplido
        encuestas.append(
            schemas.EncuestaEstado(
                dias=dias, estado="disponible" if disponible else "pendiente", disponible_desde=desde
            )
        )
    return encuestas


def resumen(dias: int, resultado: str, motivo_devolucion: Optional[str]) -> str:
    """Texto del aviso que deja en el chat una encuesta respondida."""
    inicio = f"Encuesta de {dias} días: "
    if resultado == "exitosa":
        return inicio + "la adopción va bien."
    if resultado == "en_proceso":
        return inicio + "todavía estamos en adaptación."
    return (inicio + f"la mascota fue devuelta. Motivo: {(motivo_devolucion or '').strip()}")[:2000]
