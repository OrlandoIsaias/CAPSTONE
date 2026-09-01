import os

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from pydantic import BaseModel

SECRET_KEY = os.getenv("JWT_SECRET", "cambia-esta-clave-en-produccion")
ALGORITHM = "HS256"

security_scheme = HTTPBearer()


class UsuarioToken(BaseModel):
    id: int
    rol: str


def obtener_usuario_actual(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
) -> UsuarioToken:
    credenciales_invalidas = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudo validar las credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        usuario_id = payload.get("sub")
        rol = payload.get("rol")
        if usuario_id is None or rol is None:
            raise credenciales_invalidas
    except JWTError:
        raise credenciales_invalidas

    return UsuarioToken(id=int(usuario_id), rol=rol)


def requerir_rol(rol_esperado: str):
    def verificador(usuario: UsuarioToken = Depends(obtener_usuario_actual)) -> UsuarioToken:
        if usuario.rol != rol_esperado:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Esta acción requiere rol '{rol_esperado}'",
            )
        return usuario

    return verificador