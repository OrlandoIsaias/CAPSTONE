"""
Seguridad: hash de contraseñas con bcrypt y emisión/validación de JWT.
"""
import os
from datetime import datetime, timedelta

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

import models
from database import get_db

SECRET_KEY = os.getenv("JWT_SECRET", "cambia-esta-clave-en-produccion")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 1 día

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
# HTTPBearer (en vez de OAuth2PasswordBearer) hace que el botón "Authorize" de
# Swagger muestre un simple campo para pegar el token, en vez de un formulario
# de usuario/contraseña que no calza con nuestro /auth/login (que recibe JSON
# con "email", no form-data con "username").
security_scheme = HTTPBearer()


def hashear_password(password: str) -> str:
    return pwd_context.hash(password)


def verificar_password(password_plano: str, password_hash: str) -> bool:
    return pwd_context.verify(password_plano, password_hash)


def crear_access_token(data: dict) -> str:
    to_encode = data.copy()
    expira = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expira})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def obtener_usuario_actual(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme), db: Session = Depends(get_db)
) -> models.Usuario:
    token = credentials.credentials
    credenciales_invalidas = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudo validar las credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        usuario_id = payload.get("sub")
        if usuario_id is None:
            raise credenciales_invalidas
    except JWTError:
        raise credenciales_invalidas

    usuario = db.query(models.Usuario).filter(models.Usuario.id == int(usuario_id)).first()
    if usuario is None:
        raise credenciales_invalidas
    return usuario


def requerir_rol(rol_esperado: str):
    """Dependencia parametrizable: bloquea el endpoint si el token es de otro rol."""

    def verificador(usuario: models.Usuario = Depends(obtener_usuario_actual)) -> models.Usuario:
        if usuario.rol != rol_esperado:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Esta acción requiere rol '{rol_esperado}'",
            )
        return usuario

    return verificador