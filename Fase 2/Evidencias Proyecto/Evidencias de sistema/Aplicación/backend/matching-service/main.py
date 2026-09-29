"""
Matching Service — HouseFound
Calcula el score de compatibilidad entre el adoptante autenticado y las
mascotas disponibles, usando reglas ponderadas (ver scoring.py).
"""
from typing import List

from fastapi import Depends, FastAPI, HTTPException, status
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session, selectinload
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

    # selectinload: trae las fotos de TODAS las mascotas en una sola consulta
    # aparte, en vez de una consulta de fotos por cada mascota (N+1).
    mascotas_disponibles = (
        db.query(models.Mascota)
        .options(selectinload(models.Mascota.fotos))
        .filter(models.Mascota.estado == "disponible")
        .all()
    )

    if not mascotas_disponibles:
        return []

    scores = {mascota.id: calcular_score(perfil, mascota) for mascota in mascotas_disponibles}

    # Un solo UPSERT con todos los pares adoptante-mascota, en vez de uno por
    # mascota: evita N round-trips a la BD. RETURNING trae fecha_calculo real
    # (fijada por el server) sin necesidad de una relectura aparte después.
    stmt = pg_insert(models.Match).values(
        [
            {"adoptante_id": perfil.id, "mascota_id": mascota_id, "score_compatibilidad": score}
            for mascota_id, score in scores.items()
        ]
    )
    stmt = stmt.on_conflict_do_update(
        index_elements=["adoptante_id", "mascota_id"],
        set_={
            "score_compatibilidad": stmt.excluded.score_compatibilidad,
            "fecha_calculo": func.now(),
        },
    ).returning(models.Match.mascota_id, models.Match.fecha_calculo)

    fecha_por_mascota = dict(db.execute(stmt).all())

    # Armamos la respuesta ANTES del commit: por defecto, SQLAlchemy expira
    # todos los objetos ya cargados en la sesión después de un commit
    # (expire_on_commit=True), así que cualquier atributo tocado después
    # —incluida mascota.fotos, ya cargada arriba con selectinload— dispara
    # una consulta nueva para refrescarlo. Es el mismo N+1 que evitamos
    # arriba, reapareciendo en silencio si se arma la respuesta después.
    resultados = []
    for mascota in mascotas_disponibles:
        foto_principal = next((f.url for f in mascota.fotos if f.es_principal), None)
        if not foto_principal and mascota.fotos:
            foto_principal = mascota.fotos[0].url

        resultados.append(
            schemas.RecomendacionOut(
                mascota_id=mascota.id,
                nombre=mascota.nombre,
                especie=mascota.especie,
                raza=mascota.raza,
                edad=mascota.edad,
                url_foto=foto_principal,
                estado=mascota.estado,
                score_compatibilidad=scores[mascota.id],
                fecha_calculo=fecha_por_mascota[mascota.id],
                nivel_energia=mascota.nivel_energia,
                nivel_socializacion=mascota.nivel_socializacion,
                compatible_ninos=mascota.compatible_ninos,
                compatible_otras_mascotas=mascota.compatible_otras_mascotas,
            )
        )

    db.commit()

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

    mascota = (
        db.query(models.Mascota)
        .options(selectinload(models.Mascota.fotos))
        .filter(models.Mascota.id == mascota_id)
        .first()
    )
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
        .returning(models.Match.fecha_calculo)
    )
    fecha_calculo = db.execute(stmt).scalar_one()

    # Se arma la respuesta ANTES del commit — después de commit(), SQLAlchemy
    # expira los objetos cargados (expire_on_commit=True) y tocar mascota.fotos
    # dispararía una consulta nueva para refrescarlo.
    foto_principal = next((f.url for f in mascota.fotos if f.es_principal), None)
    if not foto_principal and mascota.fotos:
        foto_principal = mascota.fotos[0].url

    respuesta = schemas.RecomendacionOut(
        mascota_id=mascota.id,
        nombre=mascota.nombre,
        especie=mascota.especie,
        raza=mascota.raza,
        edad=mascota.edad,
        url_foto=foto_principal,
        estado=mascota.estado,
        score_compatibilidad=score,
        fecha_calculo=fecha_calculo,
        nivel_energia=mascota.nivel_energia,
        nivel_socializacion=mascota.nivel_socializacion,
        compatible_ninos=mascota.compatible_ninos,
        compatible_otras_mascotas=mascota.compatible_otras_mascotas,
    )

    db.commit()
    return respuesta