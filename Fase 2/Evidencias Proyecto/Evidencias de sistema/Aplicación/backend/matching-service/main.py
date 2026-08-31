"""
Matching Service — HouseFound
Calcula el score de compatibilidad entre el adoptante autenticado y las
mascotas disponibles, usando reglas ponderadas (ver scoring.py).
"""
from typing import List

from fastapi import Depends, FastAPI, HTTPException, status
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session
from sqlalchemy.sql import func

import models
import schemas
import security
from database import get_db
from scoring import calcular_score

app = FastAPI(title="HouseFound - Matching Service")


@app.get("/")
def health_check():
    return {"status": "ok", "service": "matching-service"}


def _obtener_perfil_del_usuario(usuario_id: int, db: Session) -> models.PerfilAdoptante:
    perfil = (
        db.query(models.PerfilAdoptante)
        .filter(models.PerfilAdoptante.usuario_id == usuario_id)
        .first()
    )
    if not perfil:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Debes completar tu perfil de adoptante antes de ver recomendaciones",
        )
    return perfil


@app.get("/matching/recomendaciones", response_model=List[schemas.RecomendacionOut])
def obtener_recomendaciones(
    db: Session = Depends(get_db),
    usuario_actual: security.UsuarioToken = Depends(security.requerir_rol("adoptante")),
):
    perfil = _obtener_perfil_del_usuario(usuario_actual.id, db)

    mascotas_disponibles = (
        db.query(models.Mascota).filter(models.Mascota.estado == "disponible").all()
    )

    resultados = []
    for mascota in mascotas_disponibles:
        score = calcular_score(perfil, mascota)

        # UPSERT: si ya existía un match para este par, se actualiza el score
        # y la fecha (gracias a uq_match_adoptante_mascota); si no, se crea.
        stmt = (
            pg_insert(models.Match)
            .values(adoptante_id=perfil.id, mascota_id=mascota.id, score_compatibilidad=score)
            .on_conflict_do_update(
                index_elements=["adoptante_id", "mascota_id"],
                set_={"score_compatibilidad": score, "fecha_calculo": func.now()},
            )
        )
        db.execute(stmt)

        resultados.append(
            schemas.RecomendacionOut(
                mascota_id=mascota.id,
                nombre=mascota.nombre,
                especie=mascota.especie,
                raza=mascota.raza,
                estado=mascota.estado,
                score_compatibilidad=score,
                fecha_calculo=mascota.fecha_publicacion,  # se corrige abajo tras el commit
            )
        )

    db.commit()

    # Volvemos a leer los matches recién guardados para tener fecha_calculo real
    matches_guardados = {
        m.mascota_id: m
        for m in db.query(models.Match).filter(models.Match.adoptante_id == perfil.id).all()
    }
    for r in resultados:
        match_guardado = matches_guardados.get(r.mascota_id)
        if match_guardado:
            r.fecha_calculo = match_guardado.fecha_calculo

    resultados.sort(key=lambda r: r.score_compatibilidad, reverse=True)
    return resultados


@app.get("/matching/mascota/{mascota_id}", response_model=schemas.RecomendacionOut)
def obtener_score_individual(
    mascota_id: int,
    db: Session = Depends(get_db),
    usuario_actual: security.UsuarioToken = Depends(security.requerir_rol("adoptante")),
):
    """Score bajo demanda para la ficha de una mascota específica (no
    requiere haber llamado antes a /matching/recomendaciones)."""
    perfil = _obtener_perfil_del_usuario(usuario_actual.id, db)

    mascota = db.query(models.Mascota).filter(models.Mascota.id == mascota_id).first()
    if not mascota:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mascota no encontrada")

    score = calcular_score(perfil, mascota)

    stmt = (
        pg_insert(models.Match)
        .values(adoptante_id=perfil.id, mascota_id=mascota.id, score_compatibilidad=score)
        .on_conflict_do_update(
            index_elements=["adoptante_id", "mascota_id"],
            set_={"score_compatibilidad": score, "fecha_calculo": func.now()},
        )
    )
    db.execute(stmt)
    db.commit()

    match_guardado = (
        db.query(models.Match)
        .filter(models.Match.adoptante_id == perfil.id, models.Match.mascota_id == mascota.id)
        .first()
    )

    return schemas.RecomendacionOut(
        mascota_id=mascota.id,
        nombre=mascota.nombre,
        especie=mascota.especie,
        raza=mascota.raza,
        estado=mascota.estado,
        score_compatibilidad=score,
        fecha_calculo=match_guardado.fecha_calculo,
    )