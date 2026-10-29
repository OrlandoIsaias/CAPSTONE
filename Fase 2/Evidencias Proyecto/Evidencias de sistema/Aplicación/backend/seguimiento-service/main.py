"""
Seguimiento Service — HouseFound
Encuestas de seguimiento post-adopción a 30 y 90 días. Una devolución
detectada aquí retroalimenta el estado real de la mascota, volviéndola a
poner disponible (el objetivo central del proyecto). El paso a "adoptada"
NO ocurre aquí: por RN02, esa transición requiere confirmación explícita
del refugio (ver POST /postulaciones/{id}/confirmar-adopcion en
Postulaciones Service). Este servicio solo registra el resultado como dato
histórico cuando la adopción fue exitosa.

También es dueño del chat de seguimiento (/seguimientos/chats/...): cada
postulación aprobada abre una conversación entre el adoptante y el refugio
con texto, fotos, audios y videos (los archivos van a Cloudinary, ver
medios.py). Las encuestas respondidas quedan como un mensaje del chat.
"""
import os
from datetime import datetime
from typing import List, Optional

from fastapi import Depends, FastAPI, HTTPException, status
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

import encuestas
import medios
import models
import schemas
import security
from database import get_db

app = FastAPI(title="HouseFound - Seguimiento Service")

# Solo para pruebas: las encuestas se pueden responder apenas se confirma la
# adopción, sin esperar los 30 y 90 días. Nunca activarlo en producción.
SEGUIMIENTO_SIN_ESPERA = os.getenv("SEGUIMIENTO_SIN_ESPERA", "false").lower() == "true"
LIMITE_MENSAJES = 200


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

    encuesta = next(e for e in _estado_encuestas(postulacion, mascota, db) if e.dias == datos.dias_transcurridos)
    if encuesta.estado != "disponible":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"La encuesta de {datos.dias_transcurridos} días aún no está disponible",
        )

    nuevo = models.SeguimientoPostAdopcion(
        postulacion_id=postulacion.id,
        dias_transcurridos=datos.dias_transcurridos,
        resultado=datos.resultado,
        motivo_devolucion=datos.motivo_devolucion,
        fecha_respuesta=datetime.utcnow(),
    )
    db.add(nuevo)

    # El refugio ve la respuesta en el chat, en el mismo hilo de fotos y videos.
    db.add(
        models.MensajeSeguimiento(
            postulacion_id=postulacion.id,
            autor_usuario_id=usuario_actual.id,
            autor_rol="adoptante",
            tipo="encuesta",
            texto=encuestas.resumen(datos.dias_transcurridos, datos.resultado, datos.motivo_devolucion),
        )
    )

    # Efecto en cascada sobre la mascota: el corazón del proyecto. Una
    # devolución reabre la ficha automáticamente. Un resultado "exitosa" NO
    # cambia el estado aquí — la mascota ya debería estar "adoptada" desde
    # que el refugio la confirmó explícitamente (RN02); este resultado solo
    # queda registrado como dato histórico de seguimiento.
    if datos.resultado == "devuelta":
        mascota.estado = "disponible"

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


# ---------- Encuestas de 30 y 90 días ----------

def _estado_encuestas(
    postulacion: models.Postulacion, mascota: models.Mascota, db: Session
) -> List[schemas.EncuestaEstado]:
    """Reglas en encuestas.calcular."""
    resultados = {
        s.dias_transcurridos: s.resultado
        for s in db.query(models.SeguimientoPostAdopcion)
        .filter(models.SeguimientoPostAdopcion.postulacion_id == postulacion.id)
        .all()
    }
    return encuestas.calcular(
        resultados, postulacion.fecha_adopcion, mascota.estado, datetime.utcnow(), SEGUIMIENTO_SIN_ESPERA
    )


# ---------- Chat de seguimiento ----------
# Rutas fijas (/chats, /chats/no-leidos) antes de /chats/{postulacion_id}.

def _abrir_chat(
    postulacion_id: int, usuario: security.UsuarioToken, db: Session
) -> tuple[models.Postulacion, models.Mascota]:
    """Solo entran el adoptante de la postulación y el refugio dueño de la
    mascota, y solo si la postulación está aprobada."""
    postulacion = db.query(models.Postulacion).filter(models.Postulacion.id == postulacion_id).first()
    if not postulacion:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat no encontrado")
    mascota = db.query(models.Mascota).filter(models.Mascota.id == postulacion.mascota_id).first()
    if not mascota:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mascota no encontrada")

    if usuario.rol == "adoptante":
        es_parte = postulacion.adoptante_id == _perfil_adoptante_de(usuario.id, db).id
    elif usuario.rol == "refugio":
        es_parte = mascota.refugio_id == _refugio_de(usuario.id, db).id
    else:
        es_parte = False
    if not es_parte:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Este chat no te pertenece")

    if postulacion.estado != "aprobada":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El chat de seguimiento se abre cuando la postulación es aprobada",
        )
    return postulacion, mascota


def _postulaciones_con_chat(usuario: security.UsuarioToken, db: Session):
    query = db.query(models.Postulacion).filter(models.Postulacion.estado == "aprobada")
    if usuario.rol == "adoptante":
        perfil = _perfil_adoptante_de(usuario.id, db)
        return query.filter(models.Postulacion.adoptante_id == perfil.id)
    refugio = _refugio_de(usuario.id, db)
    return query.filter(models.Postulacion.mascota_id.in_(_mascotas_ids_del_refugio(refugio.id, db)))


def _no_leidos(usuario: security.UsuarioToken, db: Session):
    """Mensajes que escribió la otra parte y este usuario aún no abre."""
    return db.query(models.MensajeSeguimiento).filter(
        models.MensajeSeguimiento.autor_rol != usuario.rol,
        models.MensajeSeguimiento.leido_en.is_(None),
    )


def _foto_principal(mascota_id: int, db: Session) -> Optional[str]:
    foto = (
        db.query(models.FotoMascota)
        .filter(models.FotoMascota.mascota_id == mascota_id)
        .order_by(
            models.FotoMascota.es_principal.desc(),
            models.FotoMascota.orden.asc().nulls_last(),
            models.FotoMascota.id,
        )
        .first()
    )
    return foto.url if foto else None


def _nombre_contraparte(
    postulacion: models.Postulacion, mascota: models.Mascota, usuario: security.UsuarioToken, db: Session
) -> str:
    if usuario.rol == "adoptante":
        refugio = db.query(models.Refugio).filter(models.Refugio.id == mascota.refugio_id).first()
        return (refugio.nombre_refugio if refugio else None) or "Refugio"
    adoptante = (
        db.query(models.Usuario)
        .join(models.PerfilAdoptante, models.PerfilAdoptante.usuario_id == models.Usuario.id)
        .filter(models.PerfilAdoptante.id == postulacion.adoptante_id)
        .first()
    )
    return adoptante.nombre if adoptante else "Adoptante"


def _a_mensaje_out(m: models.MensajeSeguimiento, usuario: security.UsuarioToken) -> schemas.MensajeOut:
    return schemas.MensajeOut(
        id=m.id,
        postulacion_id=m.postulacion_id,
        autor_rol=m.autor_rol,
        es_mio=m.autor_rol == usuario.rol,
        tipo=m.tipo,
        texto=m.texto,
        media_url=medios.url_de(m.tipo, m.media_public_id),
        media_miniatura_url=medios.miniatura_de(m.tipo, m.media_public_id),
        duracion_seg=float(m.duracion_seg) if m.duracion_seg is not None else None,
        creado_en=m.creado_en,
        leido_en=m.leido_en,
    )


def _datos_chat(
    postulacion: models.Postulacion, mascota: models.Mascota, usuario: security.UsuarioToken, db: Session
) -> dict:
    ultimo = (
        db.query(models.MensajeSeguimiento)
        .filter(models.MensajeSeguimiento.postulacion_id == postulacion.id)
        .order_by(models.MensajeSeguimiento.id.desc())
        .first()
    )
    no_leidos = (
        _no_leidos(usuario, db).filter(models.MensajeSeguimiento.postulacion_id == postulacion.id).count()
    )
    estados_encuesta = _estado_encuestas(postulacion, mascota, db)
    return {
        "postulacion_id": postulacion.id,
        "mascota_id": mascota.id,
        "mascota_nombre": mascota.nombre,
        "mascota_foto": _foto_principal(mascota.id, db),
        "mascota_estado": mascota.estado,
        "contraparte_nombre": _nombre_contraparte(postulacion, mascota, usuario, db),
        "fecha_adopcion": postulacion.fecha_adopcion,
        "ultimo_mensaje": (
            schemas.UltimoMensaje(
                tipo=ultimo.tipo,
                texto=ultimo.texto,
                es_mio=ultimo.autor_rol == usuario.rol,
                creado_en=ultimo.creado_en,
            )
            if ultimo
            else None
        ),
        "no_leidos": no_leidos,
        "encuesta_disponible": usuario.rol == "adoptante"
        and any(e.estado == "disponible" for e in estados_encuesta),
        "encuestas": estados_encuesta,
    }


@app.get("/seguimientos/chats", response_model=List[schemas.ChatResumen])
def listar_chats(
    db: Session = Depends(get_db),
    usuario_actual: security.UsuarioToken = Depends(security.obtener_usuario_actual),
):
    chats = []
    for postulacion in _postulaciones_con_chat(usuario_actual, db).all():
        mascota = db.query(models.Mascota).filter(models.Mascota.id == postulacion.mascota_id).first()
        if mascota:
            chats.append(schemas.ChatResumen(**_datos_chat(postulacion, mascota, usuario_actual, db)))

    # Primero los chats con actividad más reciente.
    chats.sort(
        key=lambda c: c.ultimo_mensaje.creado_en if c.ultimo_mensaje else (c.fecha_adopcion or datetime.min),
        reverse=True,
    )
    return chats


@app.get("/seguimientos/chats/no-leidos", response_model=schemas.NoLeidosOut)
def total_no_leidos(
    db: Session = Depends(get_db),
    usuario_actual: security.UsuarioToken = Depends(security.obtener_usuario_actual),
):
    """Contador del globo en la barra de navegación (se consulta seguido)."""
    postulaciones_ids = (
        _postulaciones_con_chat(usuario_actual, db).with_entities(models.Postulacion.id).scalar_subquery()
    )
    total = (
        _no_leidos(usuario_actual, db)
        .filter(models.MensajeSeguimiento.postulacion_id.in_(postulaciones_ids))
        .count()
    )
    return schemas.NoLeidosOut(total=total)


@app.get("/seguimientos/chats/{postulacion_id}", response_model=schemas.ChatDetalle)
def detalle_chat(
    postulacion_id: int,
    db: Session = Depends(get_db),
    usuario_actual: security.UsuarioToken = Depends(security.obtener_usuario_actual),
):
    postulacion, mascota = _abrir_chat(postulacion_id, usuario_actual, db)
    return schemas.ChatDetalle(mi_rol=usuario_actual.rol, **_datos_chat(postulacion, mascota, usuario_actual, db))


@app.get("/seguimientos/chats/{postulacion_id}/mensajes", response_model=List[schemas.MensajeOut])
def listar_mensajes(
    postulacion_id: int,
    despues_de: Optional[int] = None,
    db: Session = Depends(get_db),
    usuario_actual: security.UsuarioToken = Depends(security.obtener_usuario_actual),
):
    """Sin despues_de: los últimos mensajes. Con despues_de=<id>: solo los
    nuevos, para la consulta periódica del chat abierto."""
    _abrir_chat(postulacion_id, usuario_actual, db)
    query = db.query(models.MensajeSeguimiento).filter(models.MensajeSeguimiento.postulacion_id == postulacion_id)
    if despues_de is not None:
        mensajes = (
            query.filter(models.MensajeSeguimiento.id > despues_de)
            .order_by(models.MensajeSeguimiento.id)
            .limit(LIMITE_MENSAJES)
            .all()
        )
    else:
        mensajes = list(reversed(query.order_by(models.MensajeSeguimiento.id.desc()).limit(LIMITE_MENSAJES).all()))
    return [_a_mensaje_out(m, usuario_actual) for m in mensajes]


@app.post(
    "/seguimientos/chats/{postulacion_id}/mensajes",
    response_model=schemas.MensajeOut,
    status_code=status.HTTP_201_CREATED,
)
def enviar_mensaje(
    postulacion_id: int,
    datos: schemas.MensajeCrear,
    db: Session = Depends(get_db),
    usuario_actual: security.UsuarioToken = Depends(security.obtener_usuario_actual),
):
    _abrir_chat(postulacion_id, usuario_actual, db)

    if datos.tipo != "texto":
        if not medios.configurado():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="El envío de archivos no está configurado en el servidor",
            )
        # La firma solo permite subir a la carpeta de este chat: un public_id
        # de otra carpeta no lo subió este chat.
        if not medios.pertenece_al_chat(datos.media_public_id, postulacion_id):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El archivo no pertenece a este chat")

    mensaje = models.MensajeSeguimiento(
        postulacion_id=postulacion_id,
        autor_usuario_id=usuario_actual.id,
        autor_rol=usuario_actual.rol,
        tipo=datos.tipo,
        texto=datos.texto,
        media_public_id=datos.media_public_id if datos.tipo != "texto" else None,
        duracion_seg=datos.duracion_seg if datos.tipo in ("audio", "video") else None,
    )
    db.add(mensaje)
    db.commit()
    db.refresh(mensaje)
    return _a_mensaje_out(mensaje, usuario_actual)


@app.post("/seguimientos/chats/{postulacion_id}/firma-subida", response_model=schemas.FirmaSubidaOut)
def firma_subida(
    postulacion_id: int,
    db: Session = Depends(get_db),
    usuario_actual: security.UsuarioToken = Depends(security.obtener_usuario_actual),
):
    """Firma para que el navegador suba una foto, audio o video directo a
    Cloudinary, dentro de la carpeta de este chat."""
    _abrir_chat(postulacion_id, usuario_actual, db)
    if not medios.configurado():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="El envío de archivos no está configurado en el servidor",
        )
    return schemas.FirmaSubidaOut(**medios.firmar_subida(postulacion_id))


@app.patch("/seguimientos/chats/{postulacion_id}/leidos", response_model=schemas.NoLeidosOut)
def marcar_leidos(
    postulacion_id: int,
    db: Session = Depends(get_db),
    usuario_actual: security.UsuarioToken = Depends(security.obtener_usuario_actual),
):
    """Marca como leídos los mensajes de la otra parte. Responde cuántos
    quedan sin leer en todos los chats, para actualizar el globo de la barra."""
    _abrir_chat(postulacion_id, usuario_actual, db)
    _no_leidos(usuario_actual, db).filter(models.MensajeSeguimiento.postulacion_id == postulacion_id).update(
        {models.MensajeSeguimiento.leido_en: func.now()}, synchronize_session=False
    )
    db.commit()
    return total_no_leidos(db=db, usuario_actual=usuario_actual)