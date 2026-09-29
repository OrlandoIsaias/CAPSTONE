"""
Postulaciones Service — HouseFound
Gestiona las solicitudes de adopción: creación por parte del adoptante,
y evaluación (aprobar/rechazar) por parte del refugio dueño de la mascota.
"""
from typing import List, Optional

from fastapi import Depends, FastAPI, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

import models
import schemas
import security
from database import get_db

app = FastAPI(title="HouseFound - Postulaciones Service")


@app.get("/")
def health_check():
    return {"status": "ok", "service": "postulaciones-service"}


def _perfil_adoptante_de(usuario_id: int, db: Session) -> models.PerfilAdoptante:
    perfil = (
        db.query(models.PerfilAdoptante)
        .filter(models.PerfilAdoptante.usuario_id == usuario_id)
        .first()
    )
    if not perfil:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Debes completar tu perfil de adoptante antes de postular",
        )
    return perfil


def _refugio_de(usuario_id: int, db: Session) -> models.Refugio:
    refugio = db.query(models.Refugio).filter(models.Refugio.usuario_id == usuario_id).first()
    if not refugio:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Debes completar tu perfil de refugio antes de gestionar postulaciones",
        )
    return refugio


def _nombre_adoptante(adoptante_id: int, db: Session) -> Optional[str]:
    fila = (
        db.query(models.Usuario.nombre)
        .join(models.PerfilAdoptante, models.PerfilAdoptante.usuario_id == models.Usuario.id)
        .filter(models.PerfilAdoptante.id == adoptante_id)
        .first()
    )
    return fila[0] if fila else None


def _telefono_adoptante(adoptante_id: int, db: Session) -> Optional[str]:
    fila = (
        db.query(models.PerfilAdoptante.telefono)
        .filter(models.PerfilAdoptante.id == adoptante_id)
        .first()
    )
    return fila[0] if fila else None


def _contacto_refugio(refugio_id: int, db: Session) -> Optional[models.Refugio]:
    """Datos del refugio dueño de la mascota — para que el adoptante pueda
    coordinar la entrega por su cuenta una vez que su postulación es aprobada."""
    return db.query(models.Refugio).filter(models.Refugio.id == refugio_id).first()


def _score_de(adoptante_id: int, mascota_id: int, db: Session) -> Optional[float]:
    """El score vive en la tabla matches, que escribe Matching Service. Si el
    adoptante nunca abrió la ficha de esa mascota no hay match calculado y
    devolvemos None — el refugio verá "sin calcular" en vez de un 0 engañoso."""
    fila = (
        db.query(models.Match.score_compatibilidad)
        .filter(
            models.Match.adoptante_id == adoptante_id,
            models.Match.mascota_id == mascota_id,
        )
        .first()
    )
    return float(fila[0]) if fila and fila[0] is not None else None


def _a_postulacion_out(
    p: models.Postulacion, mascota: models.Mascota, db: Session
) -> schemas.PostulacionOut:
    refugio = _contacto_refugio(mascota.refugio_id, db)
    return schemas.PostulacionOut(
        id=p.id,
        adoptante_id=p.adoptante_id,
        adoptante_nombre=_nombre_adoptante(p.adoptante_id, db),
        mascota_id=p.mascota_id,
        mascota_nombre=mascota.nombre,
        mascota_especie=mascota.especie,
        mascota_estado=mascota.estado,
        estado=p.estado,
        score_compatibilidad=_score_de(p.adoptante_id, p.mascota_id, db),
        fecha_postulacion=p.fecha_postulacion,
        adoptante_telefono=_telefono_adoptante(p.adoptante_id, db),
        refugio_nombre=refugio.nombre_refugio if refugio else None,
        refugio_telefono=refugio.telefono_contacto if refugio else None,
    )


# ---------- Helpers "en lote" para las listas (mis_postulaciones,
# postulaciones_recibidas): una consulta por TIPO de dato para toda la
# lista, en vez de las ~5 consultas por fila que usa _a_postulacion_out.
# Con 10 postulaciones, eso es la diferencia entre ~6 round-trips y ~51.


def _mapa_mascotas(mascota_ids: set, db: Session) -> dict:
    if not mascota_ids:
        return {}
    filas = db.query(models.Mascota).filter(models.Mascota.id.in_(mascota_ids)).all()
    return {m.id: m for m in filas}


def _mapa_refugios(refugio_ids: set, db: Session) -> dict:
    if not refugio_ids:
        return {}
    filas = db.query(models.Refugio).filter(models.Refugio.id.in_(refugio_ids)).all()
    return {r.id: r for r in filas}


def _mapa_datos_adoptante(adoptante_ids: set, db: Session) -> dict:
    """adoptante_id -> (nombre, telefono), en una sola consulta con JOIN."""
    if not adoptante_ids:
        return {}
    filas = (
        db.query(models.PerfilAdoptante.id, models.Usuario.nombre, models.PerfilAdoptante.telefono)
        .join(models.Usuario, models.Usuario.id == models.PerfilAdoptante.usuario_id)
        .filter(models.PerfilAdoptante.id.in_(adoptante_ids))
        .all()
    )
    return {pid: (nombre, telefono) for pid, nombre, telefono in filas}


def _mapa_scores(pares: set, db: Session) -> dict:
    """{(adoptante_id, mascota_id): score}, en una sola consulta."""
    if not pares:
        return {}
    adoptante_ids = {a for a, _ in pares}
    mascota_ids = {m for _, m in pares}
    filas = (
        db.query(models.Match.adoptante_id, models.Match.mascota_id, models.Match.score_compatibilidad)
        .filter(models.Match.adoptante_id.in_(adoptante_ids), models.Match.mascota_id.in_(mascota_ids))
        .all()
    )
    return {(a, m): (float(s) if s is not None else None) for a, m, s in filas}


@app.post("/postulaciones", response_model=schemas.PostulacionOut, status_code=status.HTTP_201_CREATED)
def crear_postulacion(
    datos: schemas.PostulacionCrear,
    db: Session = Depends(get_db),
    usuario_actual: security.UsuarioToken = Depends(security.requerir_rol("adoptante")),
):
    perfil = _perfil_adoptante_de(usuario_actual.id, db)

    mascota = db.query(models.Mascota).filter(models.Mascota.id == datos.mascota_id).first()
    if not mascota:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mascota no encontrada")

    if mascota.estado != "disponible":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Esta mascota ya no está disponible para postular",
        )

    ya_existe_pendiente = (
        db.query(models.Postulacion)
        .filter(
            models.Postulacion.adoptante_id == perfil.id,
            models.Postulacion.mascota_id == mascota.id,
            models.Postulacion.estado == "pendiente",
        )
        .first()
    )
    if ya_existe_pendiente:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya tienes una postulación pendiente para esta mascota",
        )

    nueva = models.Postulacion(adoptante_id=perfil.id, mascota_id=mascota.id, estado="pendiente")
    db.add(nueva)
    try:
        db.commit()
    except IntegrityError:
        # Red de seguridad: uq_postulacion_pendiente_por_par en la BD
        # atrapa el caso de dos postulaciones simultáneas idénticas.
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya tienes una postulación pendiente para esta mascota",
        )
    db.refresh(nueva)

    return _a_postulacion_out(nueva, mascota, db)


@app.get("/postulaciones/mias", response_model=List[schemas.PostulacionOut])
def mis_postulaciones(
    estado: Optional[str] = None,
    db: Session = Depends(get_db),
    usuario_actual: security.UsuarioToken = Depends(security.requerir_rol("adoptante")),
):
    perfil = _perfil_adoptante_de(usuario_actual.id, db)

    query = db.query(models.Postulacion).filter(models.Postulacion.adoptante_id == perfil.id)
    if estado:
        query = query.filter(models.Postulacion.estado == estado)

    postulaciones = query.order_by(models.Postulacion.fecha_postulacion.desc()).all()
    if not postulaciones:
        return []

    # Todas las filas son del MISMO adoptante — nombre y teléfono son
    # iguales en todas, así que se consultan una sola vez (el teléfono ya
    # está en `perfil`, ni eso hace falta pedirlo de nuevo).
    mascotas = _mapa_mascotas({p.mascota_id for p in postulaciones}, db)
    refugios = _mapa_refugios({m.refugio_id for m in mascotas.values()}, db)
    scores = _mapa_scores({(perfil.id, p.mascota_id) for p in postulaciones}, db)
    nombre_propio = _nombre_adoptante(perfil.id, db)

    resultado = []
    for p in postulaciones:
        # Igual que en el código original: la mascota siempre existe (FK),
        # no se contempla el caso contrario.
        mascota = mascotas[p.mascota_id]
        refugio = refugios.get(mascota.refugio_id)
        resultado.append(
            schemas.PostulacionOut(
                id=p.id,
                adoptante_id=p.adoptante_id,
                adoptante_nombre=nombre_propio,
                mascota_id=p.mascota_id,
                mascota_nombre=mascota.nombre,
                mascota_especie=mascota.especie,
                mascota_estado=mascota.estado,
                estado=p.estado,
                score_compatibilidad=scores.get((perfil.id, p.mascota_id)),
                fecha_postulacion=p.fecha_postulacion,
                adoptante_telefono=perfil.telefono,
                refugio_nombre=refugio.nombre_refugio if refugio else None,
                refugio_telefono=refugio.telefono_contacto if refugio else None,
            )
        )
    return resultado


@app.get("/postulaciones/recibidas", response_model=List[schemas.PostulacionOut])
def postulaciones_recibidas(
    estado: Optional[str] = None,
    db: Session = Depends(get_db),
    usuario_actual: security.UsuarioToken = Depends(security.requerir_rol("refugio")),
):
    refugio = _refugio_de(usuario_actual.id, db)

    mascotas_del_refugio = (
        db.query(models.Mascota.id).filter(models.Mascota.refugio_id == refugio.id).subquery()
    )

    query = db.query(models.Postulacion).filter(models.Postulacion.mascota_id.in_(mascotas_del_refugio))
    if estado:
        query = query.filter(models.Postulacion.estado == estado)

    postulaciones = query.order_by(models.Postulacion.fecha_postulacion.desc()).all()
    if not postulaciones:
        return []

    # Acá sí hay múltiples adoptantes distintos (uno por postulación), así
    # que nombre/teléfono se traen en lote por IN(...). El refugio en
    # cambio es siempre el mismo (el autenticado) — sin consulta extra.
    mascotas = _mapa_mascotas({p.mascota_id for p in postulaciones}, db)
    datos_adoptante = _mapa_datos_adoptante({p.adoptante_id for p in postulaciones}, db)
    scores = _mapa_scores({(p.adoptante_id, p.mascota_id) for p in postulaciones}, db)

    resultado = []
    for p in postulaciones:
        mascota = mascotas[p.mascota_id]
        nombre, telefono = datos_adoptante.get(p.adoptante_id, (None, None))
        resultado.append(
            schemas.PostulacionOut(
                id=p.id,
                adoptante_id=p.adoptante_id,
                adoptante_nombre=nombre,
                mascota_id=p.mascota_id,
                mascota_nombre=mascota.nombre,
                mascota_especie=mascota.especie,
                mascota_estado=mascota.estado,
                estado=p.estado,
                score_compatibilidad=scores.get((p.adoptante_id, p.mascota_id)),
                fecha_postulacion=p.fecha_postulacion,
                adoptante_telefono=telefono,
                refugio_nombre=refugio.nombre_refugio,
                refugio_telefono=refugio.telefono_contacto,
            )
        )
    return resultado


@app.patch("/postulaciones/{postulacion_id}/estado", response_model=schemas.PostulacionOut)
def evaluar_postulacion(
    postulacion_id: int,
    datos: schemas.PostulacionEstadoIn,
    db: Session = Depends(get_db),
    usuario_actual: security.UsuarioToken = Depends(security.requerir_rol("refugio")),
):
    refugio = _refugio_de(usuario_actual.id, db)

    postulacion = db.query(models.Postulacion).filter(models.Postulacion.id == postulacion_id).first()
    if not postulacion:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Postulación no encontrada")

    # Bloqueamos la fila de la mascota (SELECT ... FOR UPDATE) para evitar
    # que dos aprobaciones simultáneas a la misma mascota generen una
    # condición de carrera (dos adoptantes "ganando" al mismo tiempo).
    mascota = (
        db.query(models.Mascota)
        .filter(models.Mascota.id == postulacion.mascota_id)
        .with_for_update()
        .first()
    )
    if not mascota:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mascota no encontrada")

    if mascota.refugio_id != refugio.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Esta postulación pertenece a una mascota de otro refugio",
        )

    if postulacion.estado != "pendiente":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Esta postulación ya fue evaluada (estado actual: '{postulacion.estado}')",
        )

    if datos.estado == "aprobada":
        if mascota.estado != "disponible":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Esta mascota ya no está disponible (probablemente otra postulación se aprobó primero)",
            )

        mascota.estado = "en_proceso"

        # Rechazo automático de las demás postulaciones pendientes a la misma
        # mascota: no puede haber dos adoptantes "ganando" a la vez.
        otras_pendientes = (
            db.query(models.Postulacion)
            .filter(
                models.Postulacion.mascota_id == mascota.id,
                models.Postulacion.estado == "pendiente",
                models.Postulacion.id != postulacion.id,
            )
            .all()
        )
        for otra in otras_pendientes:
            otra.estado = "rechazada"

        postulacion.estado = "aprobada"
    else:
        postulacion.estado = "rechazada"

    db.commit()
    db.refresh(postulacion)
    db.refresh(mascota)

    return _a_postulacion_out(postulacion, mascota, db)


@app.patch("/postulaciones/{postulacion_id}/confirmar-adopcion", response_model=schemas.PostulacionOut)
def confirmar_adopcion(
    postulacion_id: int,
    db: Session = Depends(get_db),
    usuario_actual: security.UsuarioToken = Depends(security.requerir_rol("refugio")),
):
    """RN02: la mascota solo pasa a 'adoptada' cuando el refugio lo confirma
    explícitamente aquí — nunca automáticamente por aprobar una postulación
    ni por la respuesta del adoptante a la encuesta de seguimiento."""
    refugio = _refugio_de(usuario_actual.id, db)

    postulacion = db.query(models.Postulacion).filter(models.Postulacion.id == postulacion_id).first()
    if not postulacion:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Postulación no encontrada")

    mascota = (
        db.query(models.Mascota)
        .filter(models.Mascota.id == postulacion.mascota_id)
        .with_for_update()
        .first()
    )
    if not mascota:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mascota no encontrada")

    if mascota.refugio_id != refugio.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Esta postulación pertenece a una mascota de otro refugio",
        )

    if postulacion.estado != "aprobada":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Solo se puede confirmar la adopción de una postulación aprobada",
        )

    if mascota.estado != "en_proceso":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"La mascota no está en proceso de adopción (estado actual: '{mascota.estado}')",
        )

    mascota.estado = "adoptada"
    db.commit()
    db.refresh(postulacion)
    db.refresh(mascota)

    return _a_postulacion_out(postulacion, mascota, db)


# IMPORTANTE: esta ruta va declarada AL FINAL, después de /postulaciones/mias
# y /postulaciones/recibidas. FastAPI resuelve por orden de declaración: si
# estuviera antes, una petición a /postulaciones/mias intentaría interpretar
# "mias" como un postulacion_id numérico y fallaría con 422.
@app.get("/postulaciones/{postulacion_id}", response_model=schemas.PostulacionDetalleOut)
def detalle_postulacion(
    postulacion_id: int,
    db: Session = Depends(get_db),
    usuario_actual: security.UsuarioToken = Depends(security.requerir_rol("refugio")),
):
    """Ficha completa que el refugio consulta antes de aprobar o rechazar
    (CU05): incluye las respuestas del cuestionario de estilo de vida del
    postulante y su score de compatibilidad."""
    refugio = _refugio_de(usuario_actual.id, db)

    postulacion = db.query(models.Postulacion).filter(models.Postulacion.id == postulacion_id).first()
    if not postulacion:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Postulación no encontrada")

    mascota = db.query(models.Mascota).filter(models.Mascota.id == postulacion.mascota_id).first()
    if not mascota:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mascota no encontrada")

    if mascota.refugio_id != refugio.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Esta postulación pertenece a una mascota de otro refugio",
        )

    perfil = (
        db.query(models.PerfilAdoptante)
        .filter(models.PerfilAdoptante.id == postulacion.adoptante_id)
        .first()
    )

    base = _a_postulacion_out(postulacion, mascota, db)
    return schemas.PostulacionDetalleOut(
        **base.model_dump(),
        espacio_disponible=perfil.espacio_disponible if perfil else None,
        tiempo_disponible_horas_dia=perfil.tiempo_disponible_horas_dia if perfil else None,
        experiencia_previa=perfil.experiencia_previa if perfil else None,
        tiene_ninos=perfil.tiene_ninos if perfil else None,
        otras_mascotas=perfil.otras_mascotas if perfil else None,
        nivel_actividad_fisica=perfil.nivel_actividad_fisica if perfil else None,
    )