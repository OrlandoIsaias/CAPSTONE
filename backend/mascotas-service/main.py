"""
Mascotas Service — HouseFound
Endpoints públicos de listado/detalle, y endpoints restringidos a refugios
para publicar, editar y gestionar fotos y estado de sus propias mascotas.
"""
from typing import List, Optional

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session, joinedload

import clients
import models
import schemas
import security
from database import get_db

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


@app.post("/mascotas/{mascota_id}/fotos", response_model=schemas.FotoMascotaOut, status_code=status.HTTP_201_CREATED)
def agregar_foto(
    mascota_id: int,
    datos: schemas.FotoMascotaIn,
    credentials: HTTPAuthorizationCredentials = Depends(security.security_scheme),
    usuario_actual: security.UsuarioToken = Depends(security.requerir_rol("refugio")),
    db: Session = Depends(get_db),
):
    mascota = db.query(models.Mascota).filter(models.Mascota.id == mascota_id).first()
    if not mascota:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mascota no encontrada")

    refugio_id = clients.obtener_refugio_id(credentials.credentials)
    _verificar_dueno(mascota, refugio_id)

    if datos.es_principal:
        # En vez de dejar que el índice único parcial de la BD rechace con
        # error, resolvemos la intención real del usuario: la foto nueva
        # pasa a ser la principal y la anterior deja de serlo, en la misma
        # transacción (evita el IntegrityError de uq_foto_principal_por_mascota).
        db.query(models.FotoMascota).filter(
            models.FotoMascota.mascota_id == mascota_id,
            models.FotoMascota.es_principal.is_(True),
        ).update({"es_principal": False})

    nueva_foto = models.FotoMascota(mascota_id=mascota_id, **datos.model_dump())
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