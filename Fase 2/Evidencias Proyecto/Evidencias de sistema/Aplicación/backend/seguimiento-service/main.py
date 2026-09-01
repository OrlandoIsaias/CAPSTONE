"""
Seguimiento Service — HouseFound
Encuestas de seguimiento post-adopción a 30 y 90 días. El resultado
retroalimenta el estado real de la mascota: una devolución la vuelve a
poner disponible (el objetivo central del proyecto), y un resultado
exitoso la marca como adoptada definitivamente.
"""
from datetime import datetime
from typing import List, Optional

from fastapi import Depends, FastAPI, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

import models
import schemas
import security
from database import get_db

app = FastAPI(title="HouseFound - Seguimiento Service")


@app.get("/")
def health_check():
    return {"status": "ok", "service": "seguimiento-service"}


def _perfil_adoptante_de(usuario_id: int, db: Session) -> models.PerfilAdoptante:
    perfil = (
        db.query(models.PerfilAdoptante)
        .filter(models.PerfilAdoptante.usuario_id == usuario_id)
        .first()
    )
    if not perfil:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Debes completar tu perfil de adoptante primero",
        )
    return perfil


def _refugio_de(usuario_id: int, db: Session) -> models.Refugio:
    refugio = db.query(models.Refugio).filter(models.Refugio.usuario_id == usuario_id).first()
    if not refugio:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Debes completar tu perfil de refugio primero",
        )
    return refugio


def _a_seguimiento_out(s: models.SeguimientoPostAdopcion, mascota: models.Mascota) -> schemas.SeguimientoOut:
    return schemas.SeguimientoOut(
        id=s.id,
        postulacion_id=s.postulacion_id,
        mascota_id=mascota.id,
        mascota_nombre=mascota.nombre,
        dias_transcurridos=s.dias_transcurridos,
        resultado=s.resultado,
        motivo_devolucion=s.motivo_devolucion,
        fecha_respuesta=s.fecha_respuesta,
    )


@app.post("/seguimientos", response_model=schemas.SeguimientoOut, status_code=status.HTTP_201_CREATED)
def crear_seguimiento(
    datos: schemas.SeguimientoCrear,
    db: Session = Depends(get_db),
    usuario_actual: security.UsuarioToken = Depends(security.requerir_rol("adoptante")),
):
    perfil = _perfil_adoptante_de(usuario_actual.id, db)

    postulacion = (
        db.query(models.Postulacion).filter(models.Postulacion.id == datos.postulacion_id).first()
    )
    if not postulacion:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Postulación no encontrada")

    if postulacion.adoptante_id != perfil.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Esta postulación no te pertenece",
        )

    if postulacion.estado != "aprobada":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Solo se puede hacer seguimiento de una postulación aprobada",
        )

    ya_existe = (
        db.query(models.SeguimientoPostAdopcion)
        .filter(
            models.SeguimientoPostAdopcion.postulacion_id == postulacion.id,
            models.SeguimientoPostAdopcion.dias_transcurridos == datos.dias_transcurridos,
        )
        .first()
    )
    if ya_existe:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Ya existe un seguimiento de {datos.dias_transcurridos} días para esta postulación",
        )

    mascota = (
        db.query(models.Mascota)
        .filter(models.Mascota.id == postulacion.mascota_id)
        .with_for_update()
        .first()
    )
    if not mascota:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mascota no encontrada")

    nuevo = models.SeguimientoPostAdopcion(
        postulacion_id=postulacion.id,
        dias_transcurridos=datos.dias_transcurridos,
        resultado=datos.resultado,
        motivo_devolucion=datos.motivo_devolucion,
        fecha_respuesta=datetime.utcnow(),
    )
    db.add(nuevo)

    # Efecto en cascada sobre la mascota: el corazón del proyecto.
    if datos.resultado == "devuelta":
        mascota.estado = "disponible"
    elif datos.resultado == "exitosa":
        mascota.estado = "adoptada"
    # "en_proceso": sin cambios, es solo un chequeo intermedio.

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Ya existe un seguimiento de {datos.dias_transcurridos} días para esta postulación",
        )
    db.refresh(nuevo)
    db.refresh(mascota)

    return _a_seguimiento_out(nuevo, mascota)


@app.get("/seguimientos/mios", response_model=List[schemas.SeguimientoOut])
def mis_seguimientos(
    db: Session = Depends(get_db),
    usuario_actual: security.UsuarioToken = Depends(security.requerir_rol("adoptante")),
):
    perfil = _perfil_adoptante_de(usuario_actual.id, db)

    postulaciones_del_adoptante = (
        db.query(models.Postulacion.id).filter(models.Postulacion.adoptante_id == perfil.id).subquery()
    )

    seguimientos = (
        db.query(models.SeguimientoPostAdopcion)
        .filter(models.SeguimientoPostAdopcion.postulacion_id.in_(postulaciones_del_adoptante))
        .order_by(models.SeguimientoPostAdopcion.fecha_respuesta.desc())
        .all()
    )

    resultado = []
    for s in seguimientos:
        postulacion = db.query(models.Postulacion).filter(models.Postulacion.id == s.postulacion_id).first()
        mascota = db.query(models.Mascota).filter(models.Mascota.id == postulacion.mascota_id).first()
        resultado.append(_a_seguimiento_out(s, mascota))
    return resultado


def _mascotas_ids_del_refugio(refugio_id: int, db: Session):
    return db.query(models.Mascota.id).filter(models.Mascota.refugio_id == refugio_id).subquery()


@app.get("/seguimientos/recibidos", response_model=List[schemas.SeguimientoOut])
def seguimientos_recibidos(
    resultado: Optional[str] = None,
    db: Session = Depends(get_db),
    usuario_actual: security.UsuarioToken = Depends(security.requerir_rol("refugio")),
):
    refugio = _refugio_de(usuario_actual.id, db)
    mascotas_ids = _mascotas_ids_del_refugio(refugio.id, db)

    postulaciones_ids = (
        db.query(models.Postulacion.id).filter(models.Postulacion.mascota_id.in_(mascotas_ids)).subquery()
    )

    query = db.query(models.SeguimientoPostAdopcion).filter(
        models.SeguimientoPostAdopcion.postulacion_id.in_(postulaciones_ids)
    )
    if resultado:
        query = query.filter(models.SeguimientoPostAdopcion.resultado == resultado)

    seguimientos = query.order_by(models.SeguimientoPostAdopcion.fecha_respuesta.desc()).all()

    salida = []
    for s in seguimientos:
        postulacion = db.query(models.Postulacion).filter(models.Postulacion.id == s.postulacion_id).first()
        mascota = db.query(models.Mascota).filter(models.Mascota.id == postulacion.mascota_id).first()
        salida.append(_a_seguimiento_out(s, mascota))
    return salida


@app.get("/seguimientos/metricas", response_model=schemas.MetricasOut)
def metricas_refugio(
    db: Session = Depends(get_db),
    usuario_actual: security.UsuarioToken = Depends(security.requerir_rol("refugio")),
):
    refugio = _refugio_de(usuario_actual.id, db)
    mascotas_ids = _mascotas_ids_del_refugio(refugio.id, db)
    postulaciones_ids = (
        db.query(models.Postulacion.id).filter(models.Postulacion.mascota_id.in_(mascotas_ids)).subquery()
    )

    seguimientos = (
        db.query(models.SeguimientoPostAdopcion)
        .filter(models.SeguimientoPostAdopcion.postulacion_id.in_(postulaciones_ids))
        .all()
    )

    exitosas = sum(1 for s in seguimientos if s.resultado == "exitosa")
    devueltas = sum(1 for s in seguimientos if s.resultado == "devuelta")
    en_proceso = sum(1 for s in seguimientos if s.resultado == "en_proceso")

    concluyentes = exitosas + devueltas
    tasa_devolucion = round(devueltas / concluyentes, 3) if concluyentes > 0 else None

    return schemas.MetricasOut(
        total_seguimientos=len(seguimientos),
        exitosas=exitosas,
        devueltas=devueltas,
        en_proceso=en_proceso,
        tasa_devolucion=tasa_devolucion,
    )