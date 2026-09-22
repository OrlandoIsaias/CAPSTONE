<div align="center">

# 🐾 HouseFound

**Sistema de recomendación de compatibilidad adoptante–mascota**
Proyecto CAPSTONE — Ingeniería en Informática, Duoc UC

[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](#)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](#)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](#)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](#)
[![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)](#)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](#)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](#)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](#)
[![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white)](#)

</div>

---

## 📌 Descripción

**HouseFound** es una plataforma web que busca reducir la tasa de devolución de mascotas en adopción mediante un motor de recomendación de compatibilidad: el adoptante completa un cuestionario de estilo de vida, cada mascota tiene un perfil de temperamento y necesidades estructurado, y el sistema calcula un **score de compatibilidad** para priorizar las recomendaciones, en lugar de un listado cronológico simple.

El sistema además registra el resultado real de cada adopción mediante encuestas de seguimiento a 30 y 90 días, generando datos para retroalimentar el modelo de recomendación con el tiempo.

> 💡 Proyecto en **Fase 1** del calendario CAPSTONE: definición, arquitectura y modelo de datos completados. Desarrollo de código aún no iniciado.

---

## 🧑‍🤝‍🧑 Usuarios del sistema

| Usuario | Necesidad principal |
|---|---|
| Adoptante | Encontrar una mascota compatible con su realidad. |
| Refugio | Reducir su tasa de devoluciones y gestionar publicaciones/postulantes. |

---

## 🚀 Funcionalidades planificadas (MVP)

- [ ] Registro y autenticación con roles (adoptante / refugio)
- [ ] Publicación, edición y baja de mascotas con fotos
- [ ] Cuestionario de perfil de estilo de vida del adoptante
- [ ] Motor de matching por reglas ponderadas
- [ ] Listado de recomendaciones ordenado por score + ficha de mascota
- [ ] Postulación a mascota y gestión de su estado
- [ ] Encuesta de seguimiento post-adopción (30/90 días)
- [ ] Dashboard de métricas para el refugio

*(Fuera del MVP, solo como extensión futura: mapa de refugios, evolución a Machine Learning real, PWA)*

---

## 🛠️ Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | React + TypeScript + Vite + Tailwind CSS |
| API Gateway y microservicios | Python + FastAPI |
| Validación de datos | Pydantic |
| ORM | SQLAlchemy |
| Base de datos | PostgreSQL (hosting en Neon) |
| Autenticación | JWT + bcrypt |
| Almacenamiento de imágenes | Cloudinary |
| Contenedores | Docker + Docker Compose |
| Control de versiones | Git + GitHub (repositorio público) |
| Pruebas | pytest |

---

## 🏗️ Arquitectura (microservicios)

```
Frontend (React + TypeScript + Vite)
        │  HTTPS / REST (JSON)
        ▼
API Gateway (FastAPI) — enrutamiento y validación JWT
   │   │   │   │   │
   ▼   ▼   ▼   ▼   ▼
Auth  Mascotas  Matching  Postulaciones  Seguimiento
   │   │   │   │   │
   └───┴───┴───┴───┘
            ▼
   PostgreSQL compartido (Neon)
```

Base de datos compartida (no una por servicio) porque el futuro modelo de Machine Learning necesita cruzar datos de varias tablas sin procesos de integración adicionales.

*(Diagrama detallado y documentación de diseño completa en `Fase 2/Evidencias Proyecto/Evidencias de documentación/`)*

---

## 📁 Estructura del repositorio

```text
CAPSTONE/
├── Fase 1/
│   ├── Evidencias Grupales/
│   └── Evidencias Individuales/
├── Fase 2/
│   ├── Evidencias Grupales/
│   ├── Evidencias Individuales/
│   └── Evidencias Proyecto/
│       ├── Evidencias de documentación/
│       └── Evidencias de sistema/
│           ├── Aplicación/
│           │   ├── backend/       (microservicios FastAPI)
│           │   └── frontend/      (React + TypeScript)
│           └── Base de datos/
├── Fase 3/
│   ├── Evidencias Grupales/
│   └── Evidencias Individuales/
├── .gitignore
└── README.md
```

---

## ⚙️ Instalación y ejecución

El sistema completo (5 microservicios + api-gateway + frontend) se levanta con un solo comando usando Docker Compose:

```bash
git clone https://github.com/OrlandoIsaias/CAPSTONE.git
cd "CAPSTONE/Fase 2/Evidencias Proyecto/Evidencias de sistema/Aplicación"
docker-compose up --build
```

Requisitos previos:

- Tener [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado y corriendo.
- Crear un archivo `.env` en cada carpeta de servicio (`backend/*/`  y `frontend/`) a partir del `.env.example` correspondiente, con las credenciales reales (cadena de conexión a la base de datos Neon y el `JWT_SECRET`, que debe ser **el mismo valor en los 6 servicios backend**).

Una vez levantado:

| Servicio | URL |
|---|---|
| Frontend | http://localhost:5173 |
| API Gateway (health check agregado) | http://localhost:8080 |
| Auth Service | http://localhost:8000 |
| Mascotas Service | http://localhost:8001 |
| Matching Service | http://localhost:8002 |
| Postulaciones Service | http://localhost:8003 |
| Seguimiento Service | http://localhost:8004 |

`http://localhost:8080` responde con el estado de los 5 microservicios en un solo JSON, útil para diagnosticar rápido cuál servicio no levantó.

También es posible levantar cada servicio manualmente sin Docker (activando el `venv` de cada microservicio con Python y usando `npm run dev` para el frontend), pero Docker Compose es la forma recomendada para evaluar el progreso del sistema completo con un solo comando.

---

## 🧭 Metodología de trabajo

Ágil, con tablero **Kanban** en GitHub Projects. Rama `main` estable; ramas `feature/nombre-tarea` fusionadas vía Pull Request. La contribución individual se evidencia mediante el autor de cada commit.

---

## 👥 Equipo

| Integrante | Rol principal | Responsabilidades |
|---|---|---|
| Orlando Espinoza | Backend — Auth + API Gateway | Registro, login, JWT, roles, formulario de perfil adoptante/refugio, configuración del Gateway |
| Martin Guzman | Backend — Mascotas + Postulaciones | CRUD de mascotas y refugios, integración con Cloudinary, gestión de postulaciones |
| Benjamin Ormazabal | Backend — Matching + Seguimiento | Motor de compatibilidad (reglas ponderadas y evaluación de ML), encuestas de seguimiento post-adopción |
| Patricio Carcamo | Frontend | Todas las pantallas en React + TypeScript, conexión con los microservicios del backend |

**Nota importante:** esta tabla define un rol principal por integrante para efectos de organización y foco, pero **el trabajo no es exclusivo ni aislado de una sola persona**. Todos los integrantes:

- Pueden y deben apoyar en cualquier área cuando se necesite, sin importar el rol principal asignado.
- Participan de forma transversal en tareas que no son de un solo dueño: configuración de Docker de cada servicio, pruebas (pytest), documentación de evidencias, y revisión de Pull Requests entre compañeros.
- Comparten la responsabilidad de que el proyecto avance como equipo, no como 4 proyectos individuales unidos al final.

Equipo autorizado por el docente a cursar la asignatura con 4 integrantes (excepción al máximo de 3 establecido en el Instructivo CAPSTONE).
---