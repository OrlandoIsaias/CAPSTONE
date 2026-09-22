"""
Mascotas Service — HouseFound
Endpoints públicos de listado/detalle, y endpoints restringidos a refugios
para publicar, editar y gestionar fotos y estado de sus propias mascotas.
"""
from typing import List, Optional

import os

import cloudinary
import cloudinary.uploader
from fastapi import Depends,UploadFile, File, Form, FastAPI, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session, joinedload

import clients
import models
import schemas
import security
from database import get_db

cloudinary.config(
    cloud_name=os.getenv("Root"),
    api_key=os.getenv("393913915589355"),
    api_secret=os.getenv("GciSZ8o1RwZmAnCQvK2dZi_-Sok")
)
app = FastAPI(title="HouseFound - Mascotas Service")


@app.get("/")
def health_check():
    return {"status": "ok", "service": "mascotas-service"}


def _verificar_dueno(mascota: models.Mascota, refugio_id: int):
    if mascota.refugio_id != refugio_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Esta mascota pertenece a otro refugio",
        )


# ---------- Endpoints públicos (cualquier adoptante navegando, sin token) ----------

@app.get("/mascotas", response_model=List[schemas.MascotaOut])
def listar_mascotas(
    estado: Optional[schemas.EstadoMascota] = None,
    db: Session = Depends(get_db),
):
    query = db.query(models.Mascota).options(joinedload(models.Mascota.fotos))
    if estado:
        query = query.filter(models.Mascota.estado == estado)
    else:
        # Por defecto solo se listan las disponibles; en_proceso/adoptada
        # se piden explícitamente con ?estado=... (ej. para el dashboard del refugio)
        query = query.filter(models.Mascota.estado == "disponible")
    return query.order_by(models.Mascota.fecha_publicacion.desc()).all()


@app.get("/mascotas/mias", response_model=List[schemas.MascotaOut])
def listar_mis_mascotas(
    credentials: HTTPAuthorizationCredentials = Depends(security.security_scheme),
    usuario_actual: security.UsuarioToken = Depends(security.requerir_rol("refugio")),
    db: Session = Depends(get_db),
):
    """A diferencia de GET /mascotas (público, solo 'disponible', de todos
    los refugios), este endpoint devuelve TODAS las mascotas del refugio
    autenticado, sin importar su estado — es lo que necesita su dashboard.

    IMPORTANTE: esta ruta está declarada ANTES de /mascotas/{mascota_id} a
    propósito. FastAPI compara rutas en el orden en que se declaran; si
    /mascotas/{mascota_id} fuera primero, una petición a /mascotas/mias
    intentaría interpretar "mias" como un mascota_id numérico y fallaría
    con 422 antes de llegar aquí."""
    refugio_id = clients.obtener_refugio_id(credentials.credentials)
    return (
        db.query(models.Mascota)
        .options(joinedload(models.Mascota.fotos))
        .filter(models.Mascota.refugio_id == refugio_id)
        .order_by(models.Mascota.fecha_publicacion.desc())
        .all()
    )


@app.get("/mascotas/{mascota_id}", response_model=schemas.MascotaOut)
def obtener_mascota(mascota_id: int, db: Session = Depends(get_db)):
    mascota = (
        db.query(models.Mascota)
        .options(joinedload(models.Mascota.fotos))
        .filter(models.Mascota.id == mascota_id)
        .first()
    )
    if not mascota:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mascota no encontrada")
    return mascota


# ---------- Endpoints restringidos a refugios ----------

@app.post("/mascotas", response_model=schemas.MascotaOut, status_code=status.HTTP_201_CREATED)
def crear_mascota(
    datos: schemas.MascotaIn,
    credentials: HTTPAuthorizationCredentials = Depends(security.security_scheme),
    usuario_actual: security.UsuarioToken = Depends(security.requerir_rol("refugio")),
    db: Session = Depends(get_db),
):
    refugio_id = clients.obtener_refugio_id(credentials.credentials)

    nueva_mascota = models.Mascota(refugio_id=refugio_id, **datos.model_dump())
    db.add(nueva_mascota)
    db.commit()
    db.refresh(nueva_mascota)
    return nueva_mascota


@app.put("/mascotas/{mascota_id}", response_model=schemas.MascotaOut)
def actualizar_mascota(
    mascota_id: int,
    datos: schemas.MascotaIn,
    credentials: HTTPAuthorizationCredentials = Depends(security.security_scheme),
    usuario_actual: security.UsuarioToken = Depends(security.requerir_rol("refugio")),
    db: Session = Depends(get_db),
):
    mascota = db.query(models.Mascota).filter(models.Mascota.id == mascota_id).first()
    if not mascota:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mascota no encontrada")

    refugio_id = clients.obtener_refugio_id(credentials.credentials)
    _verificar_dueno(mascota, refugio_id)

    for campo, valor in datos.model_dump().items():
        setattr(mascota, campo, valor)

    db.commit()
    db.refresh(mascota)
    return mascota


@app.patch("/mascotas/{mascota_id}/estado", response_model=schemas.MascotaOut)
def cambiar_estado_mascota(
    mascota_id: int,
    datos: schemas.MascotaEstadoIn,
    credentials: HTTPAuthorizationCredentials = Depends(security.security_scheme),
    usuario_actual: security.UsuarioToken = Depends(security.requerir_rol("refugio")),
    db: Session = Depends(get_db),
):
    # Baja lógica, no DELETE físico — coherente con el ON DELETE RESTRICT
    # que protege el historial de matches/postulaciones de esta mascota.
    mascota = db.query(models.Mascota).filter(models.Mascota.id == mascota_id).first()
    if not mascota:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mascota no encontrada")

    refugio_id = clients.obtener_refugio_id(credentials.credentials)
    _verificar_dueno(mascota, refugio_id)

    mascota.estado = datos.estado
    db.commit()
    db.refresh(mascota)
    return mascota


import cloudinary.uploader
from fastapi import File, Form, UploadFile  # Asegúrate de importar File, Form y UploadFile

@app.post("/mascotas/{mascota_id}/fotos", response_model=schemas.FotoMascotaOut, status_code=status.HTTP_201_CREATED)
async def agregar_foto(
    mascota_id: int,
    foto: UploadFile = File(...),              # <-- Cambia JSON por la imagen binaria
    es_principal: bool = Form(False),          # <-- Cambia JSON por campos Form
    orden: int = Form(1),
    credentials: HTTPAuthorizationCredentials = Depends(security.security_scheme),
    usuario_actual: security.UsuarioToken = Depends(security.requerir_rol("refugio")),
    db: Session = Depends(get_db),
):
    # 1. Validar existencia de la mascota (Tu lógica original)
    mascota = db.query(models.Mascota).filter(models.Mascota.id == mascota_id).first()
    if not mascota:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mascota no encontrada")

    # 2. Validar propiedad del refugio (Tu lógica original)
    refugio_id = clients.obtener_refugio_id(credentials.credentials)
    _verificar_dueno(mascota, refugio_id)

    # 3. Validar tipo de archivo
    if not foto.content_type.startswith("image/"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El archivo enviado debe ser una imagen.")

    # 4. SUBIR A CLOUDINARY
    try:
        resultado = cloudinary.uploader.upload(foto.file, folder="hogarmatch/mascotas")
        url_cloudinary = resultado.get("secure_url")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Error al subir imagen a Cloudinary: {str(e)}"
        )

    # 5. Gestionar foto principal (Tu lógica original intacta)
    if es_principal:
        db.query(models.FotoMascota).filter(
            models.FotoMascota.mascota_id == mascota_id,
            models.FotoMascota.es_principal.is_(True),
        ).update({"es_principal": False})

    # 6. Guardar registro en Neon DB usando la URL devuelta por Cloudinary
    nueva_foto = models.FotoMascota(
        mascota_id=mascota_id,
        url=url_cloudinary,
        es_principal=es_principal,
        orden=orden
    )
    db.add(nueva_foto)
    db.commit()
    db.refresh(nueva_foto)
    
    return nueva_foto


@app.delete("/mascotas/{mascota_id}/fotos/{foto_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_foto(
    mascota_id: int,
    foto_id: int,
    credentials: HTTPAuthorizationCredentials = Depends(security.security_scheme),
    usuario_actual: security.UsuarioToken = Depends(security.requerir_rol("refugio")),
    db: Session = Depends(get_db),
):
    mascota = db.query(models.Mascota).filter(models.Mascota.id == mascota_id).first()
    if not mascota:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mascota no encontrada")

    refugio_id = clients.obtener_refugio_id(credentials.credentials)
    _verificar_dueno(mascota, refugio_id)

    foto = (
        db.query(models.FotoMascota)
        .filter(models.FotoMascota.id == foto_id, models.FotoMascota.mascota_id == mascota_id)
        .first()
    )
    if not foto:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Foto no encontrada")

    db.delete(foto)
    db.commit()