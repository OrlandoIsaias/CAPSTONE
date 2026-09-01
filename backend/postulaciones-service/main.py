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


def _a_postulacion_out(p: models.Postulacion, mascota: models.Mascota) -> schemas.PostulacionOut:
    return schemas.PostulacionOut(
        id=p.id,
        adoptante_id=p.adoptante_id,
        mascota_id=p.mascota_id,
        mascota_nombre=mascota.nombre,
        mascota_especie=mascota.especie,
        estado=p.estado,
        fecha_postulacion=p.fecha_postulacion,
    )


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

    return _a_postulacion_out(nueva, mascota)


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

    resultado = []
    for p in postulaciones:
        mascota = db.query(models.Mascota).filter(models.Mascota.id == p.mascota_id).first()
        resultado.append(_a_postulacion_out(p, mascota))
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

    resultado = []
    for p in postulaciones:
        mascota = db.query(models.Mascota).filter(models.Mascota.id == p.mascota_id).first()
        resultado.append(_a_postulacion_out(p, mascota))
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

    return _a_postulacion_out(postulacion, mascota)