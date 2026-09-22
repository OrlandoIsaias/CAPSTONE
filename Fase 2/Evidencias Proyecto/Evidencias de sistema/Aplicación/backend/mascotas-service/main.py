"""
Mascotas Service — HouseFound
Endpoints públicos de listado/detalle, y endpoints restringidos a refugios
para publicar, editar y gestionar fotos y estado de sus propias mascotas.
"""

import os
from typing import List, Optional

import clients
import cloudinary
import cloudinary.uploader
import models
import schemas
import security
from database import get_db
from fastapi import (
    Depends,
    FastAPI,
    File,
    Form,
    HTTPException,
    UploadFile,
    status,
)
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session, joinedload

# Configuración de Cloudinary (Corregida)
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME", "wuyzze6t"),
    api_key=os.getenv("CLOUDINARY_API_KEY", "393913915589355"),
    api_secret=os.getenv(
        "CLOUDINARY_API_SECRET", "GciSZ8o1RwZmAnCQvK2dZi_-Sok"
    ),
    secure=True,
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


# ---------- Endpoints públicos ----------


@app.get("/mascotas", response_model=List[schemas.MascotaOut])
def listar_mascotas(
    estado: Optional[schemas.EstadoMascota] = None,
    db: Session = Depends(get_db),
):
  query = db.query(models.Mascota).options(joinedload(models.Mascota.fotos))
  if estado:
    query = query.filter(models.Mascota.estado == estado)
  else:
    query = query.filter(models.Mascota.estado == "disponible")
  return query.order_by(models.Mascota.fecha_publicacion.desc()).all()


@app.get("/mascotas/mias", response_model=List[schemas.MascotaOut])
def listar_mis_mascotas(
    credentials: HTTPAuthorizationCredentials = Depends(
        security.security_scheme
    ),
    usuario_actual: security.UsuarioToken = Depends(
        security.requerir_rol("refugio")
    ),
    db: Session = Depends(get_db),
):
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
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND, detail="Mascota no encontrada"
    )
  return mascota


# ---------- Endpoints restringidos a refugios ----------


@app.post(
    "/mascotas",
    response_model=schemas.MascotaOut,
    status_code=status.HTTP_201_CREATED,
)
def crear_mascota(
    datos: schemas.MascotaIn,
    credentials: HTTPAuthorizationCredentials = Depends(
        security.security_scheme
    ),
    usuario_actual: security.UsuarioToken = Depends(
        security.requerir_rol("refugio")
    ),
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
    credentials: HTTPAuthorizationCredentials = Depends(
        security.security_scheme
    ),
    usuario_actual: security.UsuarioToken = Depends(
        security.requerir_rol("refugio")
    ),
    db: Session = Depends(get_db),
):
  mascota = (
      db.query(models.Mascota).filter(models.Mascota.id == mascota_id).first()
  )
  if not mascota:
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND, detail="Mascota no encontrada"
    )

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
    credentials: HTTPAuthorizationCredentials = Depends(
        security.security_scheme
    ),
    usuario_actual: security.UsuarioToken = Depends(
        security.requerir_rol("refugio")
    ),
    db: Session = Depends(get_db),
):
  mascota = (
      db.query(models.Mascota).filter(models.Mascota.id == mascota_id).first()
  )
  if not mascota:
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND, detail="Mascota no encontrada"
    )

  refugio_id = clients.obtener_refugio_id(credentials.credentials)
  _verificar_dueno(mascota, refugio_id)

  mascota.estado = datos.estado
  db.commit()
  db.refresh(mascota)
  return mascota


@app.post(
    "/mascotas/{mascota_id}/fotos",
    response_model=schemas.FotoMascotaOut,
    status_code=status.HTTP_201_CREATED,
)
async def agregar_foto(
    mascota_id: int,
    foto: UploadFile = File(...),
    es_principal: bool = Form(False),
    orden: int = Form(1),
    credentials: HTTPAuthorizationCredentials = Depends(
        security.security_scheme
    ),
    usuario_actual: security.UsuarioToken = Depends(
        security.requerir_rol("refugio")
    ),
    db: Session = Depends(get_db),
):
  # 1. Validar existencia de la mascota
  mascota = (
      db.query(models.Mascota).filter(models.Mascota.id == mascota_id).first()
  )
  if not mascota:
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND, detail="Mascota no encontrada"
    )

  # 2. Validar propiedad del refugio
  refugio_id = clients.obtener_refugio_id(credentials.credentials)
  _verificar_dueno(mascota, refugio_id)

  # 3. Validar tipo de archivo
  if not foto.content_type.startswith("image/"):
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="El archivo enviado debe ser una imagen.",
    )

  # 4. SUBIR A CLOUDINARY
  try:
    resultado = cloudinary.uploader.upload(
        foto.file, folder="hogarmatch/mascotas"
    )
    url_cloudinary = resultado.get("secure_url")
  except Exception as e:
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail=f"Error al subir imagen a Cloudinary: {str(e)}",
    )

  # 5. Gestionar foto principal
  if es_principal:
    db.query(models.FotoMascota).filter(
        models.FotoMascota.mascota_id == mascota_id,
        models.FotoMascota.es_principal.is_(True),
    ).update({"es_principal": False})

  # 6. Guardar registro en BD
  nueva_foto = models.FotoMascota(
      mascota_id=mascota_id,
      url=url_cloudinary,
      es_principal=es_principal,
      orden=orden,
  )
  db.add(nueva_foto)
  db.commit()
  db.refresh(nueva_foto)

  return nueva_foto


@app.delete(
    "/mascotas/{mascota_id}/fotos/{foto_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def eliminar_foto(
    mascota_id: int,
    foto_id: int,
    credentials: HTTPAuthorizationCredentials = Depends(
        security.security_scheme
    ),
    usuario_actual: security.UsuarioToken = Depends(
        security.requerir_rol("refugio")
    ),
    db: Session = Depends(get_db),
):
  mascota = (
      db.query(models.Mascota).filter(models.Mascota.id == mascota_id).first()
  )
  if not mascota:
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND, detail="Mascota no encontrada"
    )

  refugio_id = clients.obtener_refugio_id(credentials.credentials)
  _verificar_dueno(mascota, refugio_id)

  foto = (
      db.query(models.FotoMascota)
      .filter(
          models.FotoMascota.id == foto_id,
          models.FotoMascota.mascota_id == mascota_id,
      )
      .first()
  )
  if not foto:
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND, detail="Foto no encontrada"
    )

  db.delete(foto)
  db.commit()