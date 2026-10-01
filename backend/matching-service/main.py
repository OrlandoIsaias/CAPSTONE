"""
Matching Service — HouseFound
Calcula la compatibilidad entre el adoptante autenticado y las mascotas
disponibles, usando reglas en 3 capas: exclusión, compatibilidad y
preferencias (ver scoring.py).
"""
from datetime import datetime
from typing import List

from fastapi import Depends, FastAPI, HTTPException, status
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session, selectinload
from sqlalchemy.sql import func

import models
import schemas
import security
from database import get_db
from scoring import Evaluacion, cuestionario_completo, evaluar

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
    # Un perfil creado en el registro tiene solo el teléfono: sin respuestas
    # reales no hay nada que comparar, así que se trata igual que si no existiera.
    if not perfil or not cuestionario_completo(perfil):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Debes completar tu perfil de adoptante antes de ver recomendaciones",
        )
    return perfil


def _foto_principal(mascota: models.Mascota):
    foto = next((f.url for f in mascota.fotos if f.es_principal), None)
    if not foto and mascota.fotos:
        foto = mascota.fotos[0].url
    return foto


def _a_recomendacion(
    mascota: models.Mascota, evaluacion: Evaluacion, fecha_calculo: datetime
) -> schemas.RecomendacionOut:
    return schemas.RecomendacionOut(
        mascota_id=mascota.id,
        nombre=mascota.nombre,
        especie=mascota.especie,
        raza=mascota.raza,
        edad=mascota.edad,
        etapa=evaluacion.etapa,
        sexo=mascota.sexo,
        tamano=mascota.tamano,
        url_foto=_foto_principal(mascota),
        estado=mascota.estado,
        score_compatibilidad=evaluacion.score,
        fecha_calculo=fecha_calculo,
        nivel_energia=mascota.nivel_energia,
        tolerancia_soledad=mascota.tolerancia_soledad,
        temperamento=mascota.temperamento,
        convivencia_ninos=mascota.convivencia_ninos,
        convive_perros=mascota.convive_perros,
        convive_gatos=mascota.convive_gatos,
        nivel_cuidados=mascota.nivel_cuidados,
        coincide_preferencia=evaluacion.coincide_especie,
        discrepancias_preferencias=evaluacion.discrepancias,
        excluida=evaluacion.excluida,
        motivos_exclusion=[vars(m) for m in evaluacion.exclusiones],
        alertas=[vars(m) for m in evaluacion.alertas],
        desglose=[vars(c) for c in evaluacion.desglose],
        tope_aplicado=evaluacion.tope_aplicado,
    )


def _guardar_matches(perfil: models.PerfilAdoptante, evaluaciones: dict, db: Session) -> dict:
    """Un solo UPSERT con todos los pares adoptante-mascota, en vez de uno por
    mascota: evita N round-trips a la BD. RETURNING trae fecha_calculo real
    (fijada por el server) sin necesidad de una relectura aparte."""
    stmt = pg_insert(models.Match).values(
        [
            {
                "adoptante_id": perfil.id,
                "mascota_id": mascota_id,
                "score_compatibilidad": evaluacion.score,
                "desglose": evaluacion.a_json(),
            }
            for mascota_id, evaluacion in evaluaciones.items()
        ]
    )
    stmt = stmt.on_conflict_do_update(
        index_elements=["adoptante_id", "mascota_id"],
        set_={
            "score_compatibilidad": stmt.excluded.score_compatibilidad,
            "desglose": stmt.excluded.desglose,
            "fecha_calculo": func.now(),
        },
    ).returning(models.Match.mascota_id, models.Match.fecha_calculo)
    return dict(db.execute(stmt).all())


@app.get("/matching/recomendaciones", response_model=List[schemas.RecomendacionOut])
def obtener_recomendaciones(
    explorar: bool = False,
    db: Session = Depends(get_db),
    usuario_actual: security.UsuarioToken = Depends(security.requerir_rol("adoptante")),
):
    """Recomendaciones (por defecto): solo mascotas de la especie preferida y
    sin exclusiones de seguridad, primero las que cumplen las preferencias de
    tamaño, etapa y sexo, y dentro de cada grupo por % de afinidad.

    explorar=true (pantalla Explorar): todas las disponibles, con las de otra
    especie marcadas (coincide_preferencia) y las no compatibles al final
    (excluida, con sus motivos)."""
    perfil = _obtener_perfil_del_usuario(usuario_actual.id, db)

    # selectinload: trae las fotos de TODAS las mascotas en una sola consulta
    # aparte, en vez de una consulta de fotos por cada mascota (N+1).
    consulta = (
        db.query(models.Mascota)
        .options(selectinload(models.Mascota.fotos))
        .filter(models.Mascota.estado == "disponible")
    )
    if perfil.especie_preferida and not explorar:
        consulta = consulta.filter(models.Mascota.especie == perfil.especie_preferida)
    mascotas_disponibles = consulta.all()

    if not mascotas_disponibles:
        return []

    evaluaciones = {mascota.id: evaluar(perfil, mascota) for mascota in mascotas_disponibles}
    fecha_por_mascota = _guardar_matches(perfil, evaluaciones, db)

    # Armamos la respuesta ANTES del commit: por defecto, SQLAlchemy expira
    # todos los objetos ya cargados en la sesión después de un commit
    # (expire_on_commit=True), así que cualquier atributo tocado después
    # —incluida mascota.fotos, ya cargada arriba con selectinload— dispara
    # una consulta nueva para refrescarlo. Es el mismo N+1 que evitamos
    # arriba, reapareciendo en silencio si se arma la respuesta después.
    resultados = [
        _a_recomendacion(mascota, evaluaciones[mascota.id], fecha_por_mascota[mascota.id])
        for mascota in mascotas_disponibles
        if explorar or not evaluaciones[mascota.id].excluida
    ]

    db.commit()

    resultados.sort(
        key=lambda r: (r.excluida, len(r.discrepancias_preferencias), -r.score_compatibilidad)
    )
    return resultados


@app.get("/matching/mascota/{mascota_id}", response_model=schemas.RecomendacionOut)
def obtener_score_individual(
    mascota_id: int,
    db: Session = Depends(get_db),
    usuario_actual: security.UsuarioToken = Depends(security.requerir_rol("adoptante")),
):
    """Compatibilidad bajo demanda para la ficha de una mascota específica,
    con sus motivos de exclusión y alertas (no requiere haber llamado antes
    a /matching/recomendaciones)."""
    perfil = _obtener_perfil_del_usuario(usuario_actual.id, db)

    mascota = (
        db.query(models.Mascota)
        .options(selectinload(models.Mascota.fotos))
        .filter(models.Mascota.id == mascota_id)
        .first()
    )
    if not mascota:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mascota no encontrada")

    evaluacion = evaluar(perfil, mascota)
    fecha_calculo = _guardar_matches(perfil, {mascota.id: evaluacion}, db)[mascota.id]

    # Se arma la respuesta ANTES del commit (mismo motivo que arriba).
    respuesta = _a_recomendacion(mascota, evaluacion, fecha_calculo)
    db.commit()
    return respuesta
