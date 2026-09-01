"""
API Gateway — HouseFound

Único punto de entrada que va a conocer el frontend. Responsabilidades:

1. Enrutamiento: reenvía cada petición al microservicio correcto, según
   el primer segmento de la ruta (/auth/... -> auth-service, etc.).

2. Validación RÁPIDA de JWT (no de rol): si la petición trae un
   Authorization: Bearer <token>, el gateway verifica que la firma y la
   expiración sean válidas ANTES de reenviar — así una petición con un
   token corrupto o vencido nunca gasta una llamada de red al
   microservicio de destino, y falla rápido con 401.

   DECISIÓN DE DISEÑO IMPORTANTE: el gateway NO decide si el rol del
   token (adoptante/refugio) tiene permiso para ese endpoint específico.
   Esa lógica se queda exclusivamente en cada microservicio (ya
   implementada y probada con security.requerir_rol). Duplicarla aquí
   sería un antipatrón: si mañana cambia una regla de rol en
   postulaciones-service, bastaría con olvidar actualizar esta copia
   para introducir una inconsistencia de seguridad real.

3. CORS: única capa donde se configura qué orígenes (el frontend en
   desarrollo o producción) pueden llamar a la API desde el navegador.

4. Health check agregado: consulta la salud de los 5 microservicios
   de una sola vez, útil para monitoreo y para diagnosticar rápido
   cuál servicio está caído.
"""
import os

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from jose import JWTError, jwt

load_dotenv()

AUTH_SERVICE_URL = os.getenv("AUTH_SERVICE_URL", "http://localhost:8000")
MASCOTAS_SERVICE_URL = os.getenv("MASCOTAS_SERVICE_URL", "http://localhost:8001")
MATCHING_SERVICE_URL = os.getenv("MATCHING_SERVICE_URL", "http://localhost:8002")
POSTULACIONES_SERVICE_URL = os.getenv("POSTULACIONES_SERVICE_URL", "http://localhost:8003")
SEGUIMIENTO_SERVICE_URL = os.getenv("SEGUIMIENTO_SERVICE_URL", "http://localhost:8004")

JWT_SECRET = os.getenv("JWT_SECRET", "cambia-esta-clave-en-produccion")
ALGORITHM = "HS256"

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

# Tabla de enrutamiento: primer segmento de la ruta -> servicio destino.
# "mascotas" cubre tanto /mascotas como /mascotas/{id}/fotos, etc.
RUTAS = {
    "auth": AUTH_SERVICE_URL,
    "mascotas": MASCOTAS_SERVICE_URL,
    "matching": MATCHING_SERVICE_URL,
    "postulaciones": POSTULACIONES_SERVICE_URL,
    "seguimientos": SEGUIMIENTO_SERVICE_URL,
}

SERVICIOS_PARA_HEALTH_CHECK = {
    "auth-service": AUTH_SERVICE_URL,
    "mascotas-service": MASCOTAS_SERVICE_URL,
    "matching-service": MATCHING_SERVICE_URL,
    "postulaciones-service": POSTULACIONES_SERVICE_URL,
    "seguimiento-service": SEGUIMIENTO_SERVICE_URL,
}

app = FastAPI(title="HouseFound - API Gateway")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def health_check():
    """Consulta la salud de los 5 microservicios de una sola vez."""
    resultados = {}
    async with httpx.AsyncClient(timeout=3.0) as client:
        for nombre, url in SERVICIOS_PARA_HEALTH_CHECK.items():
            try:
                respuesta = await client.get(url + "/")
                resultados[nombre] = "ok" if respuesta.status_code == 200 else "responde con error"
            except httpx.RequestError:
                resultados[nombre] = "no disponible"

    todos_ok = all(v == "ok" for v in resultados.values())
    return {
        "status": "ok" if todos_ok else "degradado",
        "service": "api-gateway",
        "microservicios": resultados,
    }


def _validar_token_si_existe(authorization: str | None) -> Response | None:
    """Si viene un Bearer token, verifica que sea válido (firma + expiración)
    antes de reenviar. Si NO viene token, no bloquea nada aquí — el
    microservicio de destino decide si esa ruta es pública o protegida."""
    if not authorization or not authorization.lower().startswith("bearer "):
        return None

    token = authorization.split(" ", 1)[1]
    try:
        jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
    except JWTError:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"detail": "Token inválido o expirado"},
        )
    return None


async def _reenviar(servicio: str, resto_de_ruta: str, request: Request):
    destino_base = RUTAS.get(servicio)
    if destino_base is None:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"detail": f"No existe ningún microservicio para '/{servicio}'"},
        )

    error_token = _validar_token_si_existe(request.headers.get("authorization"))
    if error_token:
        return error_token

    sufijo = f"/{resto_de_ruta}" if resto_de_ruta else ""
    url_destino = f"{destino_base}/{servicio}{sufijo}"
    cuerpo = await request.body()

    encabezados_reenviados = {
        clave: valor for clave, valor in request.headers.items() if clave.lower() != "host"
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            respuesta = await client.request(
                method=request.method,
                url=url_destino,
                params=request.query_params,
                headers=encabezados_reenviados,
                content=cuerpo,
            )
    except httpx.RequestError:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"detail": f"El servicio '{servicio}' no está disponible en este momento"},
        )

    return Response(
        content=respuesta.content,
        status_code=respuesta.status_code,
        headers={"content-type": respuesta.headers.get("content-type", "application/json")},
    )


@app.api_route("/{servicio}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def enrutar_raiz(servicio: str, request: Request):
    """Cubre rutas como GET /mascotas (sin nada más después)."""
    return await _reenviar(servicio, "", request)


@app.api_route(
    "/{servicio}/{resto_de_ruta:path}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
)
async def enrutar(servicio: str, resto_de_ruta: str, request: Request):
    """Cubre rutas como GET /mascotas/1, POST /mascotas/1/fotos, etc."""
    return await _reenviar(servicio, resto_de_ruta, request)