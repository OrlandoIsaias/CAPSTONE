# 🐾 HouseFound — Especificación del Proyecto

> **Sistema de recomendación de compatibilidad adoptante–mascota**
> Proyecto CAPSTONE — Ingeniería en Informática, Duoc UC

---

## 1. Visión General

HouseFound es una plataforma web que conecta a refugios de animales con potenciales adoptantes, ofreciendo un espacio digital centralizado para la publicación, búsqueda y gestión de mascotas en adopción. 

A diferencia de las galerías o listados tradicionales, la plataforma incorpora un **motor de compatibilidad** que analiza el perfil de estilo de vida del adoptante (espacio en el hogar, tiempo disponible, experiencia previa, presencia de niños u otras mascotas) frente a las necesidades y temperamento de cada animal. Con esto, el sistema prioriza y presenta a cada usuario las opciones con mayor afinidad mutua, promoviendo una adopción más consciente e informada.

### 1.1 Propuesta de Valor

- **Para los Refugios:** Un panel de gestión centralizado para publicar su catálogo de mascotas, administrar postulaciones y mantener el control sobre los estados de adopción.
- **Para los Adoptantes:** Una experiencia personalizada donde pueden explorar mascotas disponibles y visualizar un score de compatibilidad calculado según su realidad cotidiana.
- **Trazabilidad del Proceso:** Flujo claro desde la postulación inicial hasta el registro post-adopción mediante encuestas de seguimiento a 30 y 90 días.

### 1.2 Objetivos del Sistema

* **Objetivo General:** Desarrollar una plataforma web integral basada en microservicios que facilite la publicación, búsqueda y postulación de mascotas en adopción, incorporando un algoritmo de recomendación por compatibilidad entre el perfil del adoptante y las características del animal.
* **Objetivos Específicos:**
  * Proporcionar a los refugios herramientas digitales para la gestión eficiente de publicaciones y postulaciones.
  * Capturar el perfil de estilo de vida de los adoptantes para calcular un porcentaje de afinidad realista frente a cada mascota.
  * Digitalizar el proceso de postulación y ofrecer mecanismos de seguimiento histórico post-adopción.
  * Garantizar una arquitectura moderna, segura, desacoplada y escalable basada en microservicios y API Gateway.

### 1.3 Usuarios del Sistema

| Rol | Función Principal | Necesidad en la Plataforma |
| --- | --- | --- |
| **Adoptante** | Explorar el catálogo, recibir recomendaciones personalizadas y postular a adopciones. | Encontrar de forma transparente y guiada mascotas afines a su estilo de vida. |
| **Refugio** | Publicar mascotas, evaluar solicitudes y gestionar el ciclo de vida de la adopción. | Contar con un canal centralizado para visibilizar sus animales y evaluar postulantes. |

---

## 2. Requisitos Funcionales

### RF-01 · Registro y autenticación con roles
- Registro con nombre, email, contraseña y rol (`adoptante` / `refugio`).
- Login devuelve JWT (HS256, 24h de expiración).
- Validación de email con formato `EmailStr` de Pydantic.
- Rate limiting: bloqueo por email tras 5 intentos fallidos (ventana de 15 min).
- Protección de timing-attack con hash señuelo en login.

### RF-02 · Perfiles de usuario
- **Adoptante**: cuestionario de estilo de vida (espacio disponible, tiempo/día, experiencia previa, niños, otras mascotas, nivel de actividad, teléfono, foto de perfil).
- **Refugio**: nombre del refugio, dirección, teléfono de contacto.
- Validación de teléfono chileno (`+56 9 XXXX XXXX`).
- Separación In/Out en schemas: la validación de formato solo aplica al guardar, nunca al leer (prevención de errores con datos legacy).

### RF-03 · Publicación y gestión de mascotas
- CRUD completo restringido a refugios (crear, editar, cambiar estado).
- Campos de perfil animal: nombre, especie, raza, edad, nivel de energía, socialización, compatibilidad con niños/otras mascotas, experiencia requerida, espacio mínimo, cuidados especiales.
- Estados posibles: `disponible` → `en_proceso` → `adoptada` (o vuelta a `disponible` por devolución).
- Gestión de fotos con subida a Cloudinary (carpeta `hogarmatch/mascotas`).
- Foto principal controlable; eliminación individual.

### RF-04 · Motor de matching (compatibilidad)
- Score entre 0.0 y 1.0 calculado por **reglas ponderadas** (6 criterios).
- Resultado persistido en tabla `matches` con UPSERT (recálculo idempotente).
- Endpoint de recomendaciones (lista completa ordenada) y score individual por mascota.

### RF-05 · Postulaciones
- Un adoptante crea una postulación a una mascota `disponible`.
- Control de duplicados: máximo una postulación `pendiente` por par adoptante-mascota.
- El refugio aprueba o rechaza (solo el dueño de la mascota, validación por `refugio_id`).
- **Al aprobar**: la mascota pasa a `en_proceso` y todas las demás postulaciones pendientes se rechazan automáticamente (con `SELECT ... FOR UPDATE` para evitar race conditions).
- **Confirmar adopción**: acción explícita del refugio que cambia la mascota a `adoptada` (RN02).

### RF-06 · Seguimiento post-adopción
- Encuestas a 30 y 90 días con resultado: `exitosa`, `en_proceso`, `devuelta`.
- Si `devuelta`: la mascota vuelve automáticamente a `disponible` (motivo registrado).
- Si `exitosa`: solo queda como dato histórico (el estado `adoptada` ya fue puesto por el refugio).
- Dashboard de métricas para el refugio: total seguimientos, exitosas, devueltas, en proceso, tasa de devolución.

---

## 3. Requisitos No Funcionales

| ID     | Requisito                                                                              |
| ------ | -------------------------------------------------------------------------------------- |
| RNF-01 | Tiempo de respuesta < 500ms para endpoints de lectura bajo carga normal.               |
| RNF-02 | Pool de conexiones con `pool_recycle=270` (evita overhead de `pre_ping` con BD remota). |
| RNF-03 | Imágenes almacenadas en Cloudinary (sin filesystem local).                              |
| RNF-04 | JWT compartido: el mismo `JWT_SECRET` en los 6 servicios backend.                      |
| RNF-05 | CORS configurado únicamente en el API Gateway (single point).                           |
| RNF-06 | Cada microservicio expone health check en `GET /`.                                     |

---

## 4. Arquitectura

### 4.1 Patrón: Microservicios con API Gateway

```
┌─────────────────────────────────────┐
│      Frontend (React + Vite)        │
│      http://localhost:5173          │
└──────────────┬──────────────────────┘
               │  HTTPS / REST (JSON)
               ▼
┌─────────────────────────────────────┐
│   API Gateway (FastAPI) :8080       │
│   • Enrutamiento por 1er segmento   │
│   • Validación rápida de JWT        │
│   • CORS (único punto)             │
│   • Health check agregado           │
└──┬────┬────┬────┬────┬──────────────┘
   │    │    │    │    │
   ▼    ▼    ▼    ▼    ▼
 Auth  Masc Match Post Segu
:8000 :8001 :8002 :8003 :8004
   │    │    │    │    │
   └────┴────┴────┴────┘
              ▼
    PostgreSQL (Neon, remota)
```

### 4.2 Decisiones arquitectónicas clave

| Decisión | Justificación |
| --- | --- |
| **BD compartida** (no una por servicio) | El motor de matching necesita cruzar datos de `perfiles_adoptante` y `mascotas` sin procesos de integración adicionales. Cada servicio define sus propios modelos ORM solo con las columnas que necesita. |
| **Gateway NO valida roles** | La autorización por rol se implementa exclusivamente en cada microservicio con `security.requerir_rol()`. Duplicarla en el gateway crearía riesgo de inconsistencia. |
| **Mascotas Service no toca tabla `refugios`** | Consulta a Auth Service por HTTP (`clients.py`) para resolver `refugio_id`. Único servicio que usa comunicación inter-servicio. |
| **Matching/Postulaciones/Seguimiento leen tablas directamente** | Lectura directa justificada por BD compartida; cada servicio es "dueño" solo de su tabla de escritura. |

### 4.3 Tabla de enrutamiento del Gateway

| Prefijo de ruta | Servicio destino          |
| --------------- | ------------------------- |
| `/auth/*`       | auth-service (:8000)      |
| `/mascotas/*`   | mascotas-service (:8001)  |
| `/matching/*`   | matching-service (:8002)  |
| `/postulaciones/*` | postulaciones-service (:8003) |
| `/seguimientos/*`  | seguimiento-service (:8004) |

---

## 5. Modelo de Datos

### 5.1 Diagrama Entidad-Relación

```mermaid
erDiagram
    usuarios ||--o| refugios : "1:1"
    usuarios ||--o| perfiles_adoptante : "1:1"
    refugios ||--o{ mascotas : "tiene"
    mascotas ||--o{ fotos_mascota : "tiene"
    perfiles_adoptante ||--o{ matches : "calcula"
    mascotas ||--o{ matches : "evaluada en"
    perfiles_adoptante ||--o{ postulaciones : "crea"
    mascotas ||--o{ postulaciones : "recibe"
    postulaciones ||--o{ seguimientos_post_adopcion : "seguimiento"

    usuarios {
        int id PK
        string nombre
        string email UK
        string password_hash
        string rol
        datetime fecha_registro
    }

    refugios {
        int id PK
        int usuario_id FK_UK
        string nombre_refugio
        string direccion
        string telefono_contacto
    }

    perfiles_adoptante {
        int id PK
        int usuario_id FK_UK
        string espacio_disponible
        string restriccion_vivienda
        string horas_sola
        string tiempo_actividad
        string experiencia_previa
        string ambiente_hogar
        string ninos_hogar
        bool tiene_perros
        bool tiene_gatos
        string alergias
        string acepta_cuidados
        string especie_preferida
        string[] tamanos_preferidos
        string[] etapas_preferidas
        string sexo_preferido
        string telefono
        string foto_perfil
    }

    mascotas {
        int id PK
        int refugio_id FK
        string nombre
        string especie
        string raza
        int edad
        string sexo
        string tamano
        string espacio_minimo_requerido
        string tolerancia_soledad
        string nivel_energia
        string nivel_experiencia_requerida
        string temperamento
        string convivencia_ninos
        bool convive_perros
        bool convive_gatos
        string nivel_cuidados
        text cuidados_especiales
        bool esterilizado
        bool vacunas_al_dia
        bool desparasitado
        bool microchip
        text notas_salud
        string estado
        datetime fecha_publicacion
    }

    fotos_mascota {
        int id PK
        int mascota_id FK
        string url
        bool es_principal
        int orden
    }

    matches {
        int id PK
        int adoptante_id FK
        int mascota_id FK
        numeric score_compatibilidad
        jsonb desglose
        datetime fecha_calculo
    }

    postulaciones {
        int id PK
        int adoptante_id FK
        int mascota_id FK
        string estado
        datetime fecha_postulacion
    }

    seguimientos_post_adopcion {
        int id PK
        int postulacion_id FK
        int dias_transcurridos
        string resultado
        text motivo_devolucion
        datetime fecha_respuesta
    }
```

### 5.2 Enumeraciones (valores válidos)

| Campo | Valores |
| --- | --- |
| `usuarios.rol` | `adoptante`, `refugio` |
| `perfiles_adoptante.espacio_disponible` | `departamento`, `casa_patio`, `casa_grande` |
| `perfiles_adoptante.restriccion_vivienda` | `ninguna`, `solo_pequenas`, `solo_gatos`, `no_se` |
| `perfiles_adoptante.horas_sola` | `menos_2h`, `2_4h`, `4_8h`, `mas_8h` |
| `perfiles_adoptante.tiempo_actividad` | `menos_30m`, `30_60m`, `mas_60m` |
| `perfiles_adoptante.experiencia_previa` | `ninguna`, `basica`, `alta` |
| `perfiles_adoptante.ambiente_hogar` | `tranquilo`, `moderado`, `movido` |
| `perfiles_adoptante.ninos_hogar` | `no`, `mayores` (6+), `pequenos` (menores de 6) |
| `perfiles_adoptante.alergias` | `ninguna`, `perros`, `gatos`, `ambos` |
| `perfiles_adoptante.acepta_cuidados` | `no`, `leves`, `complejos` |
| `perfiles_adoptante.especie_preferida` | `Perro`, `Gato`, `NULL` (me da igual) |
| `perfiles_adoptante.tamanos_preferidos` | lista de `pequeno`, `mediano`, `grande`; `NULL` = me da igual |
| `perfiles_adoptante.etapas_preferidas` | lista de `cachorro`, `joven`, `adulto`, `senior`; `NULL` = me da igual |
| `perfiles_adoptante.sexo_preferido` | `macho`, `hembra`, `NULL` (me da igual) |
| `mascotas.estado` | `disponible`, `en_proceso`, `adoptada` |
| `mascotas.sexo` | `macho`, `hembra` |
| `mascotas.tamano` | `pequeno` (hasta 10 kg), `mediano` (10–25 kg), `grande` (más de 25 kg); solo perros |
| `mascotas.espacio_minimo_requerido` | `departamento`, `casa_patio`, `casa_grande` |
| `mascotas.tolerancia_soledad` | `menos_2h`, `2_4h`, `4_8h`, `mas_8h` |
| `mascotas.nivel_energia` | `bajo`, `medio`, `alto` (actividad diaria que necesita) |
| `mascotas.nivel_experiencia_requerida` | `bajo`, `medio`, `alto` |
| `mascotas.temperamento` | `sociable`, `reservado`, `timido` |
| `mascotas.convivencia_ninos` | `todos`, `mayores`, `no`, `NULL` (no evaluado) |
| `mascotas.convive_perros` / `convive_gatos` | `true`, `false`, `NULL` (no evaluado) |
| `mascotas.nivel_cuidados` | `ninguno`, `leves`, `complejos` |
| `postulaciones.estado` | `pendiente`, `aprobada`, `rechazada` |
| `seguimientos.resultado` | `exitosa`, `en_proceso`, `devuelta` |
| `seguimientos.dias_transcurridos` | `30`, `90` |

---

## 6. Motor de Matching (v2, 3 capas)

Implementado en `backend/matching-service/scoring.py` (pruebas en `test_scoring.py`). Cada pregunta del adoptante tiene su espejo en la ficha de la mascota.

### 6.1 Capa 1 — Exclusión (¿es seguro?)

Una mascota excluida no aparece en Recomendaciones; en Explorar (`?explorar=true`) y en su ficha se muestra como "No compatible" con el motivo. La exclusión no cambia el %.

| Adoptante | Mascota | Se excluye si |
| --- | --- | --- |
| `restriccion_vivienda` | `especie`, `tamano` | `solo_gatos` y es perro; `solo_pequenas` y es perro mediano o grande |
| `alergias` | `especie` | hay alergia a esa especie (o a ambas) |
| `ninos_hogar` | `convivencia_ninos` | `pequenos` y la mascota es `mayores` o `no`; `mayores` y la mascota es `no` |
| `tiene_perros` / `tiene_gatos` | `convive_perros` / `convive_gatos` | vive esa especie en el hogar y la mascota no convive con ella |
| `acepta_cuidados` | `nivel_cuidados` | la mascota necesita más cuidados de los que el adoptante acepta |

"No evaluado" (`NULL`) nunca excluye: genera una alerta. `restriccion_vivienda = no_se` también genera una alerta ("confirma con tu arrendador").

### 6.2 Capa 2 — Compatibilidad (% de afinidad)

Todos los criterios comparan un **recurso del hogar** con una **necesidad de la mascota** ("cumple o supera"): `1.0` si la cubre, `0.5` si le falta un nivel, `0.0` si le faltan dos o más. Tener de más nunca resta.

| Criterio | Adoptante | Mascota | Peso |
| --- | --- | --- | --- |
| Soledad | `horas_sola` | `tolerancia_soledad` | 30% |
| Actividad | `tiempo_actividad` | `nivel_energia` | 25% |
| Experiencia | `experiencia_previa` | `nivel_experiencia_requerida` | 20% |
| Ambiente | `ambiente_hogar` | `temperamento` (tímida necesita hogar tranquilo) | 15% |
| Espacio | `espacio_disponible` | `espacio_minimo_requerido` | 10% |

**Tope:** si un criterio queda en `0.0`, el total no supera `0.5`.

**Por qué estos pesos:** siguen el orden de las causas más citadas de devolución tras la adopción. Los problemas de conducta (separación, exceso de energía, manejo difícil) pesan más que el espacio, que casi no aparece como motivo por sí solo (Powell et al. 2021, *Scientific Reports*; Mundschau y Suchak 2023, *Animals*). La incompatibilidad con otras mascotas, que es la primera o segunda causa de devolución, se trata como exclusión y no como peso. Los pesos son un punto de partida para recalibrar con los resultados de `seguimiento-service`.

### 6.3 Capa 3 — Preferencias

- `especie_preferida` filtra Recomendaciones.
- `tamanos_preferidos` (solo perros), `etapas_preferidas` y `sexo_preferido` solo ordenan: primero las mascotas que cumplen más preferencias y, a igualdad, las de mayor %.
- Etapa de vida según `edad`: cachorro (< 1 año), joven (1–2), adulto (3–7), senior (8+).

### 6.4 Detalle del score

Cada match guarda en `matches.desglose` el puntaje por criterio, las exclusiones, las alertas, las preferencias no cumplidas y si se aplicó el tope. La API de matching lo devuelve al adoptante y `GET /postulaciones/{id}` se lo muestra al refugio.

---

## 7. API Endpoints

### Auth Service (`:8000`)

| Método | Ruta | Rol | Descripción |
| --- | --- | --- | --- |
| `GET` | `/` | público | Health check |
| `POST` | `/auth/registro` | público | Registro (devuelve JWT + usuario) |
| `POST` | `/auth/login` | público | Login (devuelve JWT + usuario) |
| `POST` | `/auth/perfil-adoptante` | adoptante | Guardar/actualizar perfil estilo de vida |
| `GET` | `/auth/perfil-adoptante` | adoptante | Obtener perfil propio |
| `POST` | `/auth/perfil-refugio` | refugio | Guardar/actualizar perfil refugio |
| `GET` | `/auth/perfil-refugio` | refugio | Obtener perfil propio |

### Mascotas Service (`:8001`)

| Método | Ruta | Rol | Descripción |
| --- | --- | --- | --- |
| `GET` | `/` | público | Health check |
| `GET` | `/mascotas` | público | Listar mascotas (filtro por estado, default: `disponible`) |
| `GET` | `/mascotas/mias` | refugio | Listar mascotas del refugio autenticado |
| `GET` | `/mascotas/{id}` | público | Detalle de mascota |
| `POST` | `/mascotas` | refugio | Publicar mascota nueva |
| `PUT` | `/mascotas/{id}` | refugio | Actualizar mascota (solo dueño) |
| `PATCH` | `/mascotas/{id}/estado` | refugio | Cambiar estado (solo dueño) |
| `POST` | `/mascotas/{id}/fotos` | refugio | Subir foto (Cloudinary) |
| `DELETE` | `/mascotas/{id}/fotos/{foto_id}` | refugio | Eliminar foto |

### Matching Service (`:8002`)

| Método | Ruta | Rol | Descripción |
| --- | --- | --- | --- |
| `GET` | `/` | público | Health check |
| `GET` | `/matching/recomendaciones` | adoptante | Mascotas compatibles de la especie preferida, ordenadas por preferencias y %. Con `?explorar=true`: todas, con las no compatibles marcadas |
| `GET` | `/matching/mascota/{id}` | adoptante | Compatibilidad de una mascota, con detalle, motivos de exclusión y alertas |

### Postulaciones Service (`:8003`)

| Método | Ruta | Rol | Descripción |
| --- | --- | --- | --- |
| `GET` | `/` | público | Health check |
| `POST` | `/postulaciones` | adoptante | Crear postulación |
| `GET` | `/postulaciones/mias` | adoptante | Mis postulaciones (filtro por estado) |
| `GET` | `/postulaciones/recibidas` | refugio | Postulaciones recibidas (filtro por estado) |
| `GET` | `/postulaciones/{id}` | refugio | Detalle con perfil del adoptante |
| `PATCH` | `/postulaciones/{id}/estado` | refugio | Aprobar/rechazar |
| `PATCH` | `/postulaciones/{id}/confirmar-adopcion` | refugio | Confirmar adopción definitiva |

### Seguimiento Service (`:8004`)

| Método | Ruta | Rol | Descripción |
| --- | --- | --- | --- |
| `GET` | `/` | público | Health check |
| `POST` | `/seguimientos` | adoptante | Crear encuesta de seguimiento |
| `GET` | `/seguimientos/mios` | adoptante | Mis seguimientos |
| `GET` | `/seguimientos/recibidos` | refugio | Seguimientos de mis mascotas (filtro por resultado) |
| `GET` | `/seguimientos/metricas` | refugio | Dashboard de métricas |

---

## 8. Stack Tecnológico

### Backend

| Componente | Tecnología | Versión |
| --- | --- | --- |
| Framework API | FastAPI | 0.141.x |
| Runtime | Python | 3.12 |
| ORM | SQLAlchemy | 2.0.x |
| Validación de datos | Pydantic | 2.13.x |
| Base de datos | PostgreSQL (Neon) | remota |
| Autenticación | JWT (python-jose) + bcrypt (passlib) | HS256 |
| Almacenamiento de imágenes | Cloudinary | cloud |
| HTTP Client (gateway) | httpx | async |
| Servidor ASGI | uvicorn | 0.52.x |

### Frontend

| Componente | Tecnología | Versión |
| --- | --- | --- |
| Framework UI | React | 19.x |
| Lenguaje | TypeScript | 6.x |
| Bundler | Vite | 8.x |
| CSS Framework | Tailwind CSS | 4.x |
| HTTP Client | Axios | 1.20.x |
| Routing | React Router DOM | 7.x |
| Iconos | Lucide React | 1.x |

### Infraestructura

| Componente | Tecnología |
| --- | --- |
| Contenedores | Docker + Docker Compose |
| Base imagen backend | `python:3.12-slim` |
| Base imagen frontend | `node:22-slim` |
| Control de versiones | Git + GitHub |

---

## 9. Estructura del Proyecto

```
CAPSTONE/
├── Fase 1/                          # Evidencias de definición
├── Fase 2/
│   └── Evidencias Proyecto/
│       └── Evidencias de sistema/
│           ├── Aplicación/
│           │   ├── docker-compose.yml        # Orquestación completa
│           │   ├── SPEC.md                   # ← Este documento
│           │   │
│           │   ├── backend/
│           │   │   ├── api-gateway/          # Enrutamiento + JWT + CORS
│           │   │   │   ├── main.py
│           │   │   │   ├── Dockerfile
│           │   │   │   ├── requirements.txt
│           │   │   │   ├── .env / .env.example
│           │   │   │   └── ...
│           │   │   │
│           │   │   ├── auth-service/         # Registro, login, perfiles
│           │   │   │   ├── main.py           # Endpoints
│           │   │   │   ├── models.py          # ORM: usuarios, refugios, perfiles_adoptante
│           │   │   │   ├── schemas.py         # Pydantic: validación y serialización
│           │   │   │   ├── security.py        # JWT + bcrypt + requerir_rol()
│           │   │   │   ├── rate_limit.py      # Bloqueo por intentos fallidos
│           │   │   │   ├── database.py        # Engine + SessionLocal
│           │   │   │   ├── Dockerfile
│           │   │   │   ├── requirements.txt
│           │   │   │   └── .env / .env.example
│           │   │   │
│           │   │   ├── mascotas-service/      # CRUD mascotas + fotos
│           │   │   │   ├── main.py
│           │   │   │   ├── models.py          # ORM: mascotas, fotos_mascota
│           │   │   │   ├── schemas.py
│           │   │   │   ├── security.py        # Validación JWT local
│           │   │   │   ├── clients.py         # HTTP → Auth Service (refugio_id)
│           │   │   │   ├── database.py
│           │   │   │   ├── Dockerfile
│           │   │   │   └── .env / .env.example
│           │   │   │
│           │   │   ├── matching-service/      # Motor de compatibilidad
│           │   │   │   ├── main.py
│           │   │   │   ├── scoring.py         # Algoritmo de reglas ponderadas
│           │   │   │   ├── models.py          # ORM: perfiles, mascotas, matches
│           │   │   │   ├── schemas.py
│           │   │   │   ├── security.py
│           │   │   │   ├── database.py
│           │   │   │   ├── Dockerfile
│           │   │   │   └── .env / .env.example
│           │   │   │
│           │   │   ├── postulaciones-service/ # Solicitudes de adopción
│           │   │   │   ├── main.py            # CRUD + aprobar/rechazar + confirmar
│           │   │   │   ├── models.py          # ORM: postulaciones + lectura cruzada
│           │   │   │   ├── schemas.py
│           │   │   │   ├── security.py
│           │   │   │   ├── database.py
│           │   │   │   ├── Dockerfile
│           │   │   │   └── .env / .env.example
│           │   │   │
│           │   │   └── seguimiento-service/   # Encuestas post-adopción
│           │   │       ├── main.py            # Encuestas + métricas
│           │   │       ├── models.py          # ORM: seguimientos_post_adopcion
│           │   │       ├── schemas.py
│           │   │       ├── security.py
│           │   │       ├── database.py
│           │   │       ├── Dockerfile
│           │   │       └── .env / .env.example
│           │   │
│           │   └── frontend/
│           │       ├── src/
│           │       │   ├── api/               # Capa de llamadas HTTP
│           │       │   │   ├── client.ts      # Instancia Axios + interceptor JWT
│           │       │   │   ├── auth.ts
│           │       │   │   ├── mascotas.ts
│           │       │   │   ├── matching.ts
│           │       │   │   └── postulaciones.ts
│           │       │   │
│           │       │   ├── context/           # Estado global
│           │       │   │   ├── AuthContext.tsx
│           │       │   │   ├── ConfirmContext.ts
│           │       │   │   └── ToastContext.ts
│           │       │   │
│           │       │   ├── components/        # Componentes reutilizables
│           │       │   │   ├── login/             # Formularios de login adoptante y refugio
│           │       │   │   ├── BarraAdoptante.tsx
│           │       │   │   ├── BarraRefugio.tsx
│           │       │   │   ├── TarjetaMascota.tsx
│           │       │   │   ├── InsigniaScore.tsx
│           │       │   │   ├── DesgloseCompatibilidad.tsx # Explica el % de afinidad
│           │       │   │   ├── Preguntas.tsx      # Piezas de los cuestionarios por pasos
│           │       │   │   ├── AjustarFoto.tsx
│           │       │   │   ├── RutaProtegida.tsx
│           │       │   │   ├── Spinner.tsx
│           │       │   │   ├── Skeleton.tsx
│           │       │   │   ├── SplashScreen.tsx
│           │       │   │   ├── Toast.tsx
│           │       │   │   ├── ConfirmDialog.tsx
│           │       │   │   ├── Badges.tsx
│           │       │   │   └── BotonVolver.tsx
│           │       │   │
│           │       │   ├── pages/             # Pantallas
│           │       │   │   ├── Login.tsx          # Login con pestañas Adoptante / Refugio (RUT + código)
│           │       │   │   ├── Registro.tsx       # Registro de adoptantes
│           │       │   │   ├── Recomendaciones.tsx
│           │       │   │   ├── ExplorarMascotas.tsx
│           │       │   │   ├── FichaMascota.tsx
│           │       │   │   ├── PerfilAdoptante.tsx
│           │       │   │   ├── EditarPerfilAdoptante.tsx
│           │       │   │   ├── PerfilRefugio.tsx
│           │       │   │   ├── EditarPerfilRefugio.tsx
│           │       │   │   ├── MisSolicitudes.tsx
│           │       │   │   ├── Guardados.tsx
│           │       │   │   ├── InicioRefugio.tsx
│           │       │   │   ├── MisMascotas.tsx
│           │       │   │   ├── MascotaRefugio.tsx
│           │       │   │   ├── PublicarMascota.tsx
│           │       │   │   ├── Solicitudes.tsx
│           │       │   │   └── DetalleSolicitud.tsx
│           │       │   │
│           │       │   ├── hooks/             # Hooks propios (ajuste de fotos)
│           │       │   ├── types/             # Tipos TypeScript
│           │       │   ├── utils/             # Utilidades y opciones de los cuestionarios
│           │       │   ├── App.tsx            # Router principal
│           │       │   ├── main.tsx           # Entry point
│           │       │   └── index.css          # Estilos base
│           │       │
│           │       ├── index.html
│           │       ├── package.json
│           │       ├── vite.config.ts
│           │       ├── tsconfig.json
│           │       ├── Dockerfile
│           │       └── .env / .env.example
│           │
│           └── Base de datos/
│
├── Fase 3/                          # Evidencias finales
├── .gitignore
└── README.md
```

---

## 10. Variables de Entorno

### Backend — Microservicios (auth, mascotas, matching, postulaciones, seguimiento)

```env
DATABASE_URL=postgresql://usuario:password@host/nombre_bd?sslmode=require
JWT_SECRET=clave-secreta-compartida
```

> ⚠️ **`JWT_SECRET` debe ser exactamente el mismo valor en los 6 servicios backend** (5 microservicios + gateway).

### Backend — Mascotas Service (adicional)

```env
AUTH_SERVICE_URL=http://localhost:8000
# + Variables de Cloudinary (CLOUDINARY_CLOUD_NAME, API_KEY, API_SECRET)
```

### Backend — API Gateway

```env
AUTH_SERVICE_URL=http://localhost:8000
MASCOTAS_SERVICE_URL=http://localhost:8001
MATCHING_SERVICE_URL=http://localhost:8002
POSTULACIONES_SERVICE_URL=http://localhost:8003
SEGUIMIENTO_SERVICE_URL=http://localhost:8004
JWT_SECRET=clave-secreta-compartida
FRONTEND_URL=http://localhost:5173
```

### Frontend

```env
VITE_API_URL=http://localhost:8080
```

---

## 11. Guía de Ejecución

### Prerrequisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado y corriendo.
- Archivos `.env` configurados en cada servicio (basarse en los `.env.example`).

### Levantar todo con Docker Compose (recomendado)

```bash
# 1. Clonar el repositorio
git clone https://github.com/OrlandoIsaias/CAPSTONE.git

# 2. Navegar a la carpeta de la aplicación
cd "CAPSTONE/Fase 2/Evidencias Proyecto/Evidencias de sistema/Aplicación"

# 3. Levantar todo (build + run)
docker-compose up --build

# 4. Para detener
docker-compose down
```

### Levantar sin Docker (desarrollo manual)

**Backend (repetir por cada microservicio):**

```bash
cd backend/auth-service
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

**Frontend:**

```bash
cd frontend
npm install
npm run dev
```

### Verificación rápida

Una vez levantado, visitar `http://localhost:8080` para ver el health check agregado:

```json
{
  "status": "ok",
  "service": "api-gateway",
  "microservicios": {
    "auth-service": "ok",
    "mascotas-service": "ok",
    "matching-service": "ok",
    "postulaciones-service": "ok",
    "seguimiento-service": "ok"
  }
}
```

### URLs de acceso

| Servicio | URL | Swagger UI |
| --- | --- | --- |
| Frontend | http://localhost:5173 | — |
| API Gateway | http://localhost:8080 | http://localhost:8080/docs |
| Auth Service | http://localhost:8000 | http://localhost:8000/docs |
| Mascotas Service | http://localhost:8001 | http://localhost:8001/docs |
| Matching Service | http://localhost:8002 | http://localhost:8002/docs |
| Postulaciones Service | http://localhost:8003 | http://localhost:8003/docs |
| Seguimiento Service | http://localhost:8004 | http://localhost:8004/docs |

---

## 12. Flujo de Negocio Principal

```mermaid
sequenceDiagram
    participant A as Adoptante
    participant GW as API Gateway
    participant Auth as Auth Service
    participant Masc as Mascotas Service
    participant Match as Matching Service
    participant Post as Postulaciones Service
    participant Seg as Seguimiento Service

    Note over A, Auth: 1. Registro y Login
    A->>GW: POST /auth/registro
    GW->>Auth: proxy
    Auth-->>A: JWT + usuario

    Note over A, Auth: 2. Completar perfil
    A->>GW: POST /auth/perfil-adoptante
    GW->>Auth: proxy (con JWT)
    Auth-->>A: perfil guardado

    Note over A, Match: 3. Ver recomendaciones
    A->>GW: GET /matching/recomendaciones
    GW->>Match: proxy (con JWT)
    Match->>Match: evaluar() para cada mascota (exclusión, compatibilidad, preferencias)
    Match-->>A: lista ordenada por score

    Note over A, Post: 4. Postular a mascota
    A->>GW: POST /postulaciones (mascota_id)
    GW->>Post: proxy (con JWT)
    Post-->>A: postulacion creada (pendiente)

    Note over Post: 5. Refugio evalua
    Post->>Post: PATCH estado aprobada
    Post->>Post: mascota en_proceso y rechazar otras

    Note over Post: 6. Refugio confirma adopcion
    Post->>Post: PATCH confirmar-adopcion
    Post->>Post: mascota adoptada

    Note over A, Seg: 7. Seguimiento (30/90 dias)
    A->>GW: POST /seguimientos
    GW->>Seg: proxy (con JWT)
    Seg->>Seg: Si devuelta mascota vuelve a disponible
    Seg-->>A: seguimiento registrado
```

---

## 13. Reglas de Negocio

| ID | Regla | Implementación |
| --- | --- | --- |
| **RN01** | Un adoptante no puede tener más de una postulación pendiente a la misma mascota. | Check en código + constraint UNIQUE parcial en BD. |
| **RN02** | La mascota solo pasa a `adoptada` con confirmación explícita del refugio (nunca automáticamente). | Endpoint separado `confirmar-adopcion`. |
| **RN03** | Al aprobar una postulación, las demás pendientes a la misma mascota se rechazan automáticamente. | `SELECT ... FOR UPDATE` + update masivo en `evaluar_postulacion`. |
| **RN04** | El score se muestra al refugio junto al perfil del postulante al evaluar. | Join con tabla `matches` en `detalle_postulacion`. |
| **RN05** | Una devolución detectada en seguimiento reabre la ficha de la mascota automáticamente. | `mascota.estado = "disponible"` en `crear_seguimiento`. |
| **RN06** | El teléfono solo se comparte entre adoptante y refugio cuando la postulación es aprobada. | Incluido en `PostulacionOut` solo con estado `aprobada`. |

---

> Documento generado a partir del código fuente del proyecto. Última actualización: septiembre 2026.
