"""
Auth Service — HouseFound
Endpoints: registro, login, y perfiles de adoptante/refugio (extensión 1-1 de usuarios).
"""
from datetime import datetime

from fastapi import Depends, FastAPI, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

import correo
import models
import rate_limit
import schemas
import security
import verificacion
from database import get_db

app = FastAPI(title="HouseFound - Auth Service")

# Hash señuelo, calculado una sola vez al iniciar el servicio: se compara
# contra él cuando el email no existe, para que verificar_password() tome
# aproximadamente el mismo tiempo que cuando sí existe. Sin esto, un login
# con email inexistente respondería más rápido (nunca llega a llamar bcrypt)
# que uno con email real y contraseña incorrecta — una diferencia de tiempo
# medible que delata si un correo está registrado, aunque el mensaje de
# error sea idéntico en ambos casos.
_HASH_SENUELO = security.hashear_password("valor-fijo-solo-para-tiempo-constante")


@app.get("/")
def health_check():
    return {"status": "ok", "service": "auth-service"}


@app.post("/auth/registro", response_model=schemas.TokenOut, status_code=status.HTTP_201_CREATED)
def registrar_usuario(datos: schemas.UsuarioRegistro, db: Session = Depends(get_db)):
    if datos.rol == "refugio":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Los refugios no se registran: se habilitan desde la nómina SII e ingresan con su RUT",
        )

    existente =db.query(models.Usuario).filter(models.Usuario.email == datos.email).first()
    if existente:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ese email ya está registrado")

    nuevo_usuario = models.Usuario(
        nombre=datos.nombre,
        email=datos.email,
        password_hash=security.hashear_password(datos.password),
        rol=datos.rol,
    )
    db.add(nuevo_usuario)
    try:
        db.commit()
    except IntegrityError:
        # Red de seguridad: si dos registros llegan al mismo tiempo con el mismo
        # email, el UNIQUE de la BD lo detiene aquí en vez de romper con un 500.
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ese email ya está registrado")
    db.refresh(nuevo_usuario)

    if datos.telefono:
        perfil = models.PerfilAdoptante(
            usuario_id=nuevo_usuario.id,
            telefono=datos.telefono,
            espacio_disponible="departamento",
            tiempo_disponible_horas_dia=4,
            experiencia_previa="ninguna",
            nivel_actividad_fisica="medio",
        )
        db.add(perfil)
        db.commit()

    token = security.crear_access_token({"sub": str(nuevo_usuario.id), "rol": nuevo_usuario.rol})
    return schemas.TokenOut(access_token=token, usuario=nuevo_usuario)


@app.post("/auth/login", response_model=schemas.TokenOut)
def iniciar_sesion(datos: schemas.UsuarioLogin, db: Session = Depends(get_db)):
    restante = rate_limit.tiempo_bloqueo_restante(datos.email)
    if restante is not None:
        minutos = max(1, int(restante.total_seconds() // 60) + 1)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Demasiados intentos fallidos. Intenta de nuevo en {minutos} "
            f"minuto{'s' if minutos != 1 else ''}.",
        )

    usuario = db.query(models.Usuario).filter(models.Usuario.email == datos.email).first()

    # Tiempo constante (ver _HASH_SENUELO arriba): siempre se llama a
    # verificar_password, exista o no el usuario.
    tiene_password = usuario is not None and usuario.password_hash is not None
    hash_a_verificar = usuario.password_hash if tiene_password else _HASH_SENUELO
    password_valida = security.verificar_password(datos.password, hash_a_verificar)

    if not tiene_password or not password_valida:
        rate_limit.registrar_intento_fallido(datos.email)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Email o contraseña incorrectos"
        )

    rate_limit.limpiar_intentos(datos.email)

    # Los refugios solo entran con RUT + código (/auth/refugio/...).
    if usuario.rol == "refugio" or (datos.rol is not None and usuario.rol != datos.rol):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Esta cuenta no corresponde a este portal",
        )

    token = security.crear_access_token({"sub": str(usuario.id), "rol": usuario.rol})
    return schemas.TokenOut(access_token=token, usuario=usuario)


def _reemplazar_codigo(db: Session, usuario_id: int, codigo: str, ahora: datetime) -> None:
    # Un solo código válido a la vez: los anteriores quedan inutilizados.
    db.query(models.CodigoVerificacion).filter(
        models.CodigoVerificacion.usuario_id == usuario_id,
        models.CodigoVerificacion.usado.is_(False),
    ).update({"usado": True})
    db.add(
        models.CodigoVerificacion(
            usuario_id=usuario_id,
            codigo_hash=verificacion.hashear_codigo(codigo),
            expira_en=ahora + verificacion.VALIDEZ,
            creado_en=ahora,
        )
    )


@app.post("/auth/refugio/solicitar-codigo", response_model=schemas.CodigoEnviadoOut)
def solicitar_codigo_refugio(datos: schemas.SolicitudCodigoRefugio, db: Session = Depends(get_db)):
    organizacion = (
        db.query(models.OrganizacionValidada)
        .filter(models.OrganizacionValidada.rut == datos.rut_numero)
        .first()
    )
    if organizacion is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Este RUT no está en la nómina de organizaciones habilitadas",
        )

    refugio = db.query(models.Refugio).filter(models.Refugio.organizacion_id == organizacion.id).first()
    codigo_fijo = verificacion.CODIGO_PRUEBA if organizacion.es_prueba else None

    if refugio is not None and codigo_fijo is not None:
        _reemplazar_codigo(db, refugio.usuario_id, codigo_fijo, datetime.utcnow())
        db.commit()
        return schemas.CodigoEnviadoOut(
            correo_enmascarado=correo.enmascarar(organizacion.correo) if organizacion.correo else "cuenta de prueba",
            expira_en_segundos=int(verificacion.VALIDEZ.total_seconds()),
            reenviar_en_segundos=0,
        )

    if refugio is None or not organizacion.correo:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Tu organización aún no tiene un correo registrado en HouseFound. "
            "Contacta al equipo para habilitar el acceso.",
        )

    ahora = datetime.utcnow()
    ultimo = (
        db.query(models.CodigoVerificacion)
        .filter(models.CodigoVerificacion.usuario_id == refugio.usuario_id)
        .order_by(models.CodigoVerificacion.creado_en.desc())
        .first()
    )
    if ultimo is not None:
        espera = verificacion.segundos_para_reenviar(ultimo.creado_en, ahora)
        if espera > 0:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Espera {espera} segundos antes de pedir otro código.",
            )
    recientes = (
        db.query(models.CodigoVerificacion)
        .filter(
            models.CodigoVerificacion.usuario_id == refugio.usuario_id,
            models.CodigoVerificacion.creado_en > ahora - verificacion.VENTANA_SOLICITUDES,
        )
        .count()
    )
    if recientes >= verificacion.MAX_SOLICITUDES_POR_VENTANA:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Pediste demasiados códigos. Intenta de nuevo en una hora.",
        )

    codigo = verificacion.generar_codigo()
    _reemplazar_codigo(db, refugio.usuario_id, codigo, ahora)

    try:
        correo.enviar_codigo(
            organizacion.correo,
            codigo,
            refugio.nombre_refugio,
            int(verificacion.VALIDEZ.total_seconds() // 60),
        )
    except correo.ErrorEnvioCorreo:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No pudimos enviar el código. Intenta de nuevo en unos minutos.",
        )
    db.commit()

    return schemas.CodigoEnviadoOut(
        correo_enmascarado=correo.enmascarar(organizacion.correo),
        expira_en_segundos=int(verificacion.VALIDEZ.total_seconds()),
        reenviar_en_segundos=int(verificacion.ESPERA_REENVIO.total_seconds()),
    )


@app.post("/auth/refugio/verificar-codigo", response_model=schemas.TokenOut)
def verificar_codigo_refugio(datos: schemas.VerificacionCodigoRefugio, db: Session = Depends(get_db)):
    invalido = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="El código venció o no es válido. Solicita uno nuevo.",
    )

    refugio = (
        db.query(models.Refugio)
        .join(models.OrganizacionValidada, models.OrganizacionValidada.id == models.Refugio.organizacion_id)
        .filter(models.OrganizacionValidada.rut == datos.rut_numero)
        .first()
    )
    if refugio is None:
        raise invalido

    registro = (
        db.query(models.CodigoVerificacion)
        .filter(
            models.CodigoVerificacion.usuario_id == refugio.usuario_id,
            models.CodigoVerificacion.usado.is_(False),
        )
        .order_by(models.CodigoVerificacion.creado_en.desc())
        .with_for_update()
        .first()
    )
    if registro is None or registro.expira_en <= datetime.utcnow():
        raise invalido

    if not verificacion.codigo_coincide(datos.codigo, registro.codigo_hash):
        registro.intentos += 1
        restantes = verificacion.MAX_INTENTOS - registro.intentos
        if restantes <= 0:
            registro.usado = True
        db.commit()
        if restantes <= 0:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Demasiados intentos fallidos. Solicita un código nuevo.",
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Código incorrecto. Te quedan {restantes} intento{'s' if restantes != 1 else ''}.",
        )

    registro.usado = True
    usuario = refugio.usuario
    usuario.estado = "activo"
    db.commit()

    token = security.crear_access_token({"sub": str(usuario.id), "rol": usuario.rol})
    return schemas.TokenOut(access_token=token, usuario=usuario)


@app.post("/auth/perfil-adoptante", response_model=schemas.PerfilAdoptanteOut)
def guardar_perfil_adoptante(
    datos: schemas.PerfilAdoptanteIn,
    db: Session = Depends(get_db),
    usuario_actual: models.Usuario = Depends(security.requerir_rol("adoptante")),
):
    perfil = (
        db.query(models.PerfilAdoptante)
        .filter(models.PerfilAdoptante.usuario_id == usuario_actual.id)
        .first()
    )

    if perfil:
        for campo, valor in datos.model_dump().items():
            setattr(perfil, campo, valor)
    else:
        perfil = models.PerfilAdoptante(usuario_id=usuario_actual.id, **datos.model_dump())
        db.add(perfil)

    db.commit()
    db.refresh(perfil)
    return perfil


@app.get("/auth/perfil-adoptante", response_model=schemas.PerfilAdoptanteOut)
def obtener_perfil_adoptante(
    db: Session = Depends(get_db),
    usuario_actual: models.Usuario = Depends(security.requerir_rol("adoptante")),
):
    perfil = (
        db.query(models.PerfilAdoptante)
        .filter(models.PerfilAdoptante.usuario_id == usuario_actual.id)
        .first()
    )
    if not perfil:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Aún no has completado tu perfil")
    return perfil


@app.post("/auth/perfil-refugio", response_model=schemas.PerfilRefugioOut)
def guardar_perfil_refugio(
    datos: schemas.PerfilRefugioIn,
    db: Session = Depends(get_db),
    usuario_actual: models.Usuario = Depends(security.requerir_rol("refugio")),
):
    refugio = db.query(models.Refugio).filter(models.Refugio.usuario_id == usuario_actual.id).first()
    if not refugio:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Refugio no encontrado")

    for campo, valor in datos.model_dump().items():
        setattr(refugio, campo, valor)

    db.commit()
    db.refresh(refugio)
    return refugio


@app.get("/auth/perfil-refugio", response_model=schemas.PerfilRefugioOut)
def obtener_perfil_refugio(
    db: Session = Depends(get_db),
    usuario_actual: models.Usuario = Depends(security.requerir_rol("refugio")),
):
    # Este endpoint es consultado por Mascotas Service (vía HTTP, no acceso
    # directo a la tabla) para resolver el refugio_id real del usuario dueño
    # del token, sin que Mascotas Service acceda jamás a la tabla refugios.
    refugio = db.query(models.Refugio).filter(models.Refugio.usuario_id == usuario_actual.id).first()
    if not refugio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Aún no has completado tu perfil de refugio"
        )
    return refugio