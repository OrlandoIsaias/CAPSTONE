"""
Auth Service — HouseFound
Endpoints: registro, login, y perfiles de adoptante/refugio (extensión 1-1 de usuarios).
"""
from fastapi import Depends, FastAPI, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

import models
import schemas
import security
from database import get_db

app = FastAPI(title="HouseFound - Auth Service")


@app.get("/")
def health_check():
    return {"status": "ok", "service": "auth-service"}


@app.post("/auth/registro", response_model=schemas.TokenOut, status_code=status.HTTP_201_CREATED)
def registrar_usuario(datos: schemas.UsuarioRegistro, db: Session = Depends(get_db)):
    existente = db.query(models.Usuario).filter(models.Usuario.email == datos.email).first()
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

    token = security.crear_access_token({"sub": str(nuevo_usuario.id), "rol": nuevo_usuario.rol})
    return schemas.TokenOut(access_token=token, usuario=nuevo_usuario)


@app.post("/auth/login", response_model=schemas.TokenOut)
def iniciar_sesion(datos: schemas.UsuarioLogin, db: Session = Depends(get_db)):
    usuario = db.query(models.Usuario).filter(models.Usuario.email == datos.email).first()
    credenciales_invalidas = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED, detail="Email o contraseña incorrectos"
    )
    if not usuario or not security.verificar_password(datos.password, usuario.password_hash):
        raise credenciales_invalidas

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

    if refugio:
        for campo, valor in datos.model_dump().items():
            setattr(refugio, campo, valor)
    else:
        refugio = models.Refugio(usuario_id=usuario_actual.id, **datos.model_dump())
        db.add(refugio)

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