"""
Agrega una foto principal a cada mascota de ejemplo (seed) que aún no tiene,
buscada en Pixabay según su especie, raza y etapa de vida.

Uso (desde Aplicación/, con el venv de auth-service activo):
    python seed/fotos_mascotas.py --revisar              # asigna fotos y arma la hoja de revisión
    python seed/fotos_mascotas.py --cargar [--limite N]  # sube lo revisado a Cloudinary y la BD
    python seed/fotos_mascotas.py --borrar --confirmar   # quita todas las fotos seed

- --revisar no escribe nada: deja salida/fotos.csv (asignación y autor de cada
  foto), salida/sin_foto.csv (las que no tienen una foto de su raza y edad) y
  salida/revision_fotos.html para mirarlas antes de cargar. Para cambiar una
  foto, agrega su id de Pixabay a fotos.excluidas en seed_config.yaml y vuelve
  a revisar.
- Raza y edad se validan por las etiquetas de cada foto (reglas en
  seed_config.yaml, sección fotos): sin una foto que cumpla, la mascota queda
  sin foto en vez de recibir la de otra raza o edad.
- --cargar sube exactamente lo revisado, dentro de las 24 h siguientes: los
  links de Pixabay vencen. Re-ejecutable: omite mascotas que ya tienen foto,
  así que tras un error basta con volver a ejecutarlo.
- Solo una foto por mascota: con fotos de stock, varias serían animales distintos.
- Las fotos van a Cloudinary (Pixabay no permite enlazarlas desde la app) con
  la etiqueta "seed", recortadas en cuadrado de 480 px como las que suben los
  refugios, y --borrar las quita por esa etiqueta.
"""
import argparse
import csv
import html
import json
import math
import os
import re
import sys
import time
import urllib.parse
import urllib.request
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta
from urllib.error import HTTPError

import cloudinary
import cloudinary.api
import cloudinary.uploader
import yaml
from dotenv import load_dotenv
from sqlalchemy import text

from comun import RAIZ, motor

SALIDA = RAIZ / "salida"
MANIFIESTO = SALIDA / "fotos.csv"
SIN_FOTO = SALIDA / "sin_foto.csv"
HOJA_REVISION = SALIDA / "revision_fotos.html"
CACHE_PIXABAY = SALIDA / "pixabay_cache.json"

API_PIXABAY = "https://pixabay.com/api/"
POR_PAGINA = 200
PAGINAS_MAXIMAS = 3  # Pixabay entrega como máximo 500 resultados por búsqueda
# Los links de imagen de Pixabay duran 24 h desde la consulta: --cargar los
# acepta hasta 23 h, y la caché se reutiliza solo 12 h para que, tras revisar,
# siempre queden al menos 11 h para cargar.
VIGENCIA = timedelta(hours=23)
VIGENCIA_CACHE = timedelta(hours=12)
PAUSA_ENTRE_CONSULTAS = 0.7  # segundos: el límite es 100 consultas por minuto
# Ids de un mismo autor así de cercanos suelen ser la misma sesión de fotos, es
# decir, el mismo animal: se usa una sola por sesión para no repetirlo en dos mascotas.
CERCANIA_SESION = 300
CARPETA_CLOUDINARY = "hogarmatch/seed"
ETIQUETA = "seed"
COLUMNAS = ["clave_seed", "mascota_id", "nombre", "especie", "raza", "etapa", "edad_aproximada",
            "busqueda", "etiquetas", "pixabay_id", "pixabay_url", "autor", "autor_url", "miniatura", "imagen",
            "consultada"]
COLUMNAS_SIN_FOTO = ["clave_seed", "mascota_id", "nombre", "especie", "raza", "etapa", "refugio"]


def config_fotos() -> tuple[dict, dict]:
    config = yaml.safe_load((RAIZ / "seed_config.yaml").read_text(encoding="utf-8"))
    mestizos = {"Perro": config["perros"]["raza_mestizo"], "Gato": config["gatos"]["raza_mestizo"]}
    return {**config["fotos"], "mestizos": mestizos}, config["edad"]


def etapa_de(edad: int, rangos: dict) -> str:
    # La última etapa cuya edad mínima ya cumplió (las mayores a 14 quedan en senior).
    etapas = sorted(((v[1], k) for k, v in rangos.items() if k != "fuente"))
    return [k for minimo, k in etapas if edad >= minimo][-1]


def mascotas_sin_foto(conexion, rangos: dict) -> list[dict]:
    filas = conexion.execute(text("""
        SELECT m.id, m.clave_seed, m.nombre, m.especie, m.raza, m.edad, r.nombre_refugio AS refugio
        FROM mascotas m JOIN refugios r ON r.id = m.refugio_id
        WHERE m.origen = 'seed' AND NOT EXISTS (SELECT 1 FROM fotos_mascota f WHERE f.mascota_id = m.id)
        ORDER BY m.clave_seed
    """)).mappings()
    return [{**f, "etapa": etapa_de(f["edad"], rangos)} for f in filas]


# ---------- Pixabay ----------

class Pixabay:
    """Búsquedas con caché en disco (VIGENCIA_CACHE): repetir --revisar no
    gasta cuota ni cambia la asignación. Pasado ese plazo se vuelve a
    consultar, porque los links de las imágenes están por vencer."""

    def __init__(self):
        load_dotenv(RAIZ / ".env")
        self.clave = os.getenv("PIXABAY_API_KEY", "").strip()
        if not self.clave:
            raise SystemExit("Falta PIXABAY_API_KEY en seed/.env (aparece en pixabay.com/api/docs con la sesión iniciada).")
        cache = json.loads(CACHE_PIXABAY.read_text(encoding="utf-8")) if CACHE_PIXABAY.exists() else {}
        limite = datetime.now() - VIGENCIA_CACHE
        self.cache = {k: v for k, v in cache.items() if datetime.fromisoformat(v["fecha"]) > limite}
        self.consultas = 0

    def pagina(self, busqueda: str, numero: int) -> dict:
        clave = f"{busqueda}|{numero}"
        if clave not in self.cache:
            parametros = {"key": self.clave, "q": busqueda, "image_type": "photo", "category": "animals",
                          "safesearch": "true", "per_page": POR_PAGINA, "page": numero}
            pedido = urllib.request.Request(API_PIXABAY + "?" + urllib.parse.urlencode(parametros),
                                            headers={"User-Agent": "HouseFound-seed"})
            if self.consultas:
                time.sleep(PAUSA_ENTRE_CONSULTAS)
            try:
                with urllib.request.urlopen(pedido, timeout=30) as respuesta:
                    datos = json.load(respuesta)
            except HTTPError as e:
                if e.code in (400, 401, 403) and "key" in e.read().decode(errors="ignore").lower():
                    raise SystemExit("Pixabay rechazó la clave: revisa PIXABAY_API_KEY en seed/.env.") from None
                if e.code == 429:
                    raise SystemExit("Se superó el límite de Pixabay (100 consultas por minuto): espera un "
                                     "minuto y vuelve a ejecutar (lo ya consultado queda guardado).") from None
                raise
            self.cache[clave] = {"fecha": datetime.now().isoformat(), "total": datos["totalHits"], "hits": datos["hits"]}
            self.consultas += 1
        return self.cache[clave]

    def resultados(self, busqueda: str) -> list[dict]:
        # Cada foto lleva la hora de su consulta: de ahí corre el plazo de sus links.
        primera = self.pagina(busqueda, 1)
        paginas = min(PAGINAS_MAXIMAS, math.ceil(primera["total"] / POR_PAGINA))
        return [
            {**foto, "consultada": pagina["fecha"]}
            for pagina in [primera] + [self.pagina(busqueda, n) for n in range(2, paginas + 1)]
            for foto in pagina["hits"]
        ]

    def guardar_cache(self):
        SALIDA.mkdir(exist_ok=True)
        CACHE_PIXABAY.write_text(json.dumps(self.cache), encoding="utf-8")


def _menciona(etiquetas: str, palabras: list[str]) -> bool:
    return any(re.search(rf"\b{re.escape(p)}\b", etiquetas, re.IGNORECASE) for p in palabras)


def _cumple(etiquetas: str, regla: dict, exige_senior: bool) -> bool:
    # Pixabay ordena las etiquetas por relevancia: raza (de las razas puras) y
    # cachorro deben estar entre las primeras; lo que descarta (otra raza,
    # cachorro en un adulto) cuenta en cualquier posición. En un mestizo la
    # etiqueta vale en cualquier posición: no tiene una raza que destacar.
    primeras = ", ".join(etiquetas.split(", ")[: regla["relevancia"]])
    return (
        _menciona(etiquetas, regla["especie"])
        and (not regla["raza"] or _menciona(etiquetas if regla["mestizo"] else primeras, regla["raza"]))
        and not _menciona(etiquetas, regla["otras_razas"])
        # Cachorro con foto de cachorro; las demás etapas, nunca.
        and (_menciona(primeras, regla["cachorro"]) if regla["es_cachorro"]
             else not _menciona(etiquetas, regla["cachorro"]))
        and not _menciona(etiquetas, regla["impropias_de_la_edad"])
        and (not exige_senior or _menciona(etiquetas, regla["senior"]))
    )


def asignar(mascotas: list[dict], fotos: dict, pixabay: Pixabay) -> tuple[list[dict], list[dict]]:
    """Recorre las mascotas en orden de clave_seed y le da a cada una la
    primera foto aún no usada que cumple las reglas de raza y edad de
    seed_config.yaml (fotos). Si ninguna cumple, la mascota queda sin foto:
    nunca se usa una foto de otra raza o de un cachorro para un adulto."""
    excluidas = set(fotos["excluidas"] or [])
    usadas: set[int] = set()
    usadas_por_autor: dict[int, list[int]] = defaultdict(list)
    autor_por_id: dict[int, int] = {}
    por_busqueda: dict[str, list] = {}
    asignadas, sin_foto = [], []

    def disponible(foto: dict) -> bool:
        def misma_sesion(otra: int) -> bool:
            return abs(foto["id"] - otra) < CERCANIA_SESION

        # Una foto excluida descarta también las de su sesión: es el mismo animal.
        return (
            foto["id"] not in usadas
            and foto["id"] not in excluidas
            and not any(misma_sesion(otra) for otra in usadas_por_autor[foto["user_id"]])
            and not any(autor_por_id.get(e) == foto["user_id"] and misma_sesion(e) for e in excluidas)
        )

    def resultados(busqueda: str, especie: str) -> list[dict]:
        # Sin personas ni otra especie; raza y edad se validan por mascota.
        if busqueda not in por_busqueda:
            encontradas = pixabay.resultados(busqueda)
            autor_por_id.update((foto["id"], foto["user_id"]) for foto in encontradas)
            por_busqueda[busqueda] = [
                foto
                for foto in encontradas
                if not _menciona(foto["tags"], fotos["descartar_si_menciona"])
                and not _menciona(foto["tags"], fotos["descartar_otra_especie"][especie])
            ]
        return por_busqueda[busqueda]

    for m in mascotas:
        especie, etapa = m["especie"], m["etapa"]
        reglas = fotos["razas"][especie]
        if m["raza"] not in reglas:
            raise SystemExit(f"Falta la regla de {especie} / {m['raza']} en fotos.razas de seed_config.yaml.")
        terminos, etiquetas_raza = reglas[m["raza"]]
        terminos = [terminos] if isinstance(terminos, str) else terminos
        regla = {
            "especie": fotos["etiquetas_especie"][especie],
            "relevancia": fotos["relevancia"],
            "mestizo": m["raza"] == fotos["mestizos"][especie],
            "raza": etiquetas_raza,
            "otras_razas": [e for raza, (_, etiquetas) in reglas.items() if raza != m["raza"] for e in etiquetas]
                           + fotos["otras_razas_conocidas"][especie],
            "cachorro": fotos["etiquetas_cachorro"][especie],
            "es_cachorro": etapa == "cachorro",
            "senior": fotos["etiquetas_senior"],
            # Un animal joven no lleva etiquetas de mayor, ni uno adulto de joven.
            "impropias_de_la_edad": fotos["etiquetas_senior"] if etapa in ("cachorro", "joven")
                                    else fotos["etiquetas_joven"],
        }
        sustantivos = fotos["sustantivos"][especie]
        busquedas = list(dict.fromkeys(
            f"{termino} {sustantivos[clave]}" for termino in terminos for clave in (etapa, "adulto")
        ))

        # Un senior prefiere una foto de animal mayor; si no hay, una de adulto.
        pasadas = [True, False] if etapa == "senior" else [False]
        elegida = next(
            ((foto, busqueda, exige_senior)
             for exige_senior in pasadas
             for busqueda in busquedas
             for foto in resultados(busqueda, especie)
             if disponible(foto) and _cumple(foto["tags"], regla, exige_senior)),
            None,
        )
        if not elegida:
            sin_foto.append({**m, "mascota_id": m["id"]})
            continue
        foto, busqueda, exige_senior = elegida
        usadas.add(foto["id"])
        usadas_por_autor[foto["user_id"]].append(foto["id"])
        asignadas.append({
            "clave_seed": m["clave_seed"], "mascota_id": m["id"], "nombre": m["nombre"],
            "especie": especie, "raza": m["raza"], "etapa": etapa,
            "edad_aproximada": "sí" if etapa == "senior" and not exige_senior else "",
            "busqueda": busqueda, "etiquetas": foto["tags"],
            "pixabay_id": foto["id"], "pixabay_url": foto["pageURL"],
            "autor": foto["user"], "autor_url": f"https://pixabay.com/users/{foto['user']}-{foto['user_id']}/",
            # 640 px para la hoja de revisión; 1280 px para la subida (Cloudinary hace el recorte final).
            "miniatura": foto["webformatURL"], "imagen": foto["largeImageURL"], "consultada": foto["consultada"],
        })
    return asignadas, sin_foto


def escribir_csv(ruta, columnas: list[str], filas: list[dict]):
    with ruta.open("w", encoding="utf-8", newline="") as archivo:
        escritor = csv.DictWriter(archivo, fieldnames=columnas, extrasaction="ignore")
        escritor.writeheader()
        escritor.writerows(filas)


def escribir_hoja(asignadas: list[dict], sin_foto: list[dict]):
    por_raza = defaultdict(list)
    for a in asignadas:
        por_raza[(a["especie"], a["raza"])].append(a)
    secciones = []
    for (especie, raza), grupo in sorted(por_raza.items()):
        tarjetas = "".join(
            f'<figure><img loading="lazy" src="{html.escape(a["miniatura"])}" alt="">'
            f'<figcaption><b>{html.escape(a["nombre"])}</b> · {a["etapa"]}'
            f'{" <mark>foto de adulto</mark>" if a["edad_aproximada"] else ""}<br>'
            f'<a href="{html.escape(a["pixabay_url"])}">id {a["pixabay_id"]}</a>'
            f'<small>{html.escape(a["etiquetas"])}</small></figcaption></figure>'
            for a in grupo
        )
        secciones.append(f"<h2>{especie} · {html.escape(raza)} ({len(grupo)})</h2><div>{tarjetas}</div>")
    filas_sin_foto = "".join(
        f"<tr><td>{m['especie']}</td><td>{html.escape(m['raza'])}</td><td>{m['etapa']}</td>"
        f"<td>{html.escape(m['nombre'])}</td><td>{html.escape(m['refugio'])}</td></tr>"
        for m in sin_foto
    )
    HOJA_REVISION.write_text(
        "<!doctype html><meta charset=utf-8><title>Revisión de fotos seed</title><style>"
        "body{font-family:system-ui;margin:24px;background:#f8fafc;color:#0f172a}"
        "div{display:flex;flex-wrap:wrap;gap:12px}figure{margin:0;width:170px}"
        "img{width:170px;height:170px;object-fit:cover;border-radius:12px;background:#e2e8f0}"
        "figcaption{font-size:12px;margin-top:4px}small{display:block;color:#64748b;font-size:10px;margin-top:2px}"
        "mark{background:#fef3c7;border-radius:4px;padding:0 3px}h2{margin:28px 0 10px;font-size:18px}"
        "table{border-collapse:collapse;font-size:13px}td{border-bottom:1px solid #e2e8f0;padding:4px 10px}</style>"
        f"<h1>Fotos asignadas ({len(asignadas)}) · sin foto ({len(sin_foto)})</h1>"
        "<p>Para cambiar una foto: agrega su id a <code>fotos.excluidas</code> en seed_config.yaml "
        "y vuelve a ejecutar --revisar. <mark>foto de adulto</mark> = senior sin foto de animal mayor.</p>"
        + "".join(secciones)
        + (f"<h2>Sin foto ({len(sin_foto)})</h2><table>{filas_sin_foto}</table>" if sin_foto else ""),
        encoding="utf-8",
    )


def revisar(args):
    fotos, rangos = config_fotos()
    with motor().connect() as conexion:
        mascotas = mascotas_sin_foto(conexion, rangos)
    if not mascotas:
        print("Todas las mascotas seed ya tienen foto: no hay nada que revisar.")
        return
    pixabay = Pixabay()
    try:
        asignadas, sin_foto = asignar(mascotas, fotos, pixabay)
    finally:
        pixabay.guardar_cache()

    escribir_csv(MANIFIESTO, COLUMNAS, asignadas)
    escribir_csv(SIN_FOTO, COLUMNAS_SIN_FOTO, sin_foto)
    escribir_hoja(asignadas, sin_foto)

    aproximadas = sum(1 for a in asignadas if a["edad_aproximada"])
    print(f"Mascotas sin foto en la BD: {len(mascotas)} | con foto asignada: {len(asignadas)} "
          f"| quedan sin foto: {len(sin_foto)} | consultas nuevas a Pixabay: {pixabay.consultas}")
    if aproximadas:
        print(f"  Senior con foto de adulto (no había de animal mayor): {aproximadas}")
    if sin_foto:
        print(f"  Sin foto (detalle en {SIN_FOTO.relative_to(RAIZ.parent)}):")
        for (especie, raza, etapa), n in sorted(Counter((m["especie"], m["raza"], m["etapa"]) for m in sin_foto).items()):
            print(f"    {n:4}  {especie} · {raza} · {etapa}")
    print(f"Revisa {HOJA_REVISION.relative_to(RAIZ.parent)} y ejecuta --cargar dentro de las próximas 23 h.")


# ---------- Cloudinary ----------

def configurar_cloudinary():
    load_dotenv(RAIZ.parent / "backend" / "mascotas-service" / ".env")
    datos = {c: os.getenv(f"CLOUDINARY_{c.upper()}") for c in ("cloud_name", "api_key", "api_secret")}
    if not all(datos.values()):
        raise SystemExit("Faltan las credenciales de Cloudinary (se leen de backend/mascotas-service/.env).")
    cloudinary.config(**datos, secure=True)


def subir(fila: dict) -> str:
    # Cloudinary descarga la imagen desde Pixabay: no pasa por este equipo.
    resultado = cloudinary.uploader.upload(
        fila["imagen"],
        folder=CARPETA_CLOUDINARY,
        public_id=fila["clave_seed"],
        overwrite=True,
        tags=[ETIQUETA],
        transformation=[{"width": 480, "height": 480, "crop": "fill", "gravity": "auto", "quality": "auto"}],
    )
    return resultado["secure_url"]


def cargar(args):
    if not MANIFIESTO.exists():
        raise SystemExit("Primero ejecuta --revisar y revisa las fotos asignadas.")
    with MANIFIESTO.open(encoding="utf-8", newline="") as archivo:
        revisadas = list(csv.DictReader(archivo))
    if revisadas and datetime.now() - min(datetime.fromisoformat(f["consultada"]) for f in revisadas) > VIGENCIA:
        raise SystemExit("Los links de Pixabay de esta revisión ya vencieron: vuelve a ejecutar --revisar.")
    configurar_cloudinary()

    _, rangos = config_fotos()
    with motor().connect() as conexion:
        pendientes = {m["id"] for m in mascotas_sin_foto(conexion, rangos)}
    filas = [f for f in revisadas if int(f["mascota_id"]) in pendientes]
    ya_tienen = len(revisadas) - len(filas)
    if args.limite is not None:
        filas = filas[: args.limite]
    print(f"En la revisión: {len(revisadas)} | ya tienen foto: {ya_tienen} | a subir: {len(filas)}")

    subidas, errores = [], []
    with ThreadPoolExecutor(max_workers=6) as grupo:
        futuros = {grupo.submit(subir, f): f for f in filas}
        for n, futuro in enumerate(as_completed(futuros), start=1):
            fila = futuros[futuro]
            try:
                subidas.append({"mascota_id": int(fila["mascota_id"]), "url": futuro.result()})
            except Exception as e:  # noqa: BLE001 — se informa y se sigue con las demás
                errores.append(f"{fila['clave_seed']}: {e}")
            if n % 50 == 0:
                print(f"  {n}/{len(filas)} subidas…")

    if subidas:
        with motor().begin() as conexion:
            conexion.execute(text("""
                INSERT INTO fotos_mascota (mascota_id, url, es_principal, orden)
                SELECT :mascota_id, :url, true, 0
                WHERE NOT EXISTS (SELECT 1 FROM fotos_mascota WHERE mascota_id = :mascota_id)
            """), subidas)
    print(f"Fotos cargadas: {len(subidas)} | con error: {len(errores)}")
    for e in errores[:10]:
        print(f"  ✗ {e}")
    if errores:
        print("Vuelve a ejecutar --cargar para reintentar las que fallaron.")


def borrar(args):
    if not args.confirmar:
        raise SystemExit("Para quitar todas las fotos seed agrega --confirmar.")
    configurar_cloudinary()
    borradas_nube = 0
    while True:  # Cloudinary borra en tandas de hasta 1000
        respuesta = cloudinary.api.delete_resources_by_tag(ETIQUETA)
        borradas_nube += sum(1 for estado in respuesta["deleted"].values() if estado == "deleted")
        if not respuesta.get("partial"):
            break
    # Solo las fotos que subió este script (por su carpeta), nunca las de un refugio.
    with motor().begin() as conexion:
        filas = conexion.execute(text("""
            DELETE FROM fotos_mascota
            WHERE url LIKE :carpeta AND mascota_id IN (SELECT id FROM mascotas WHERE origen = 'seed')
        """), {"carpeta": f"%/{CARPETA_CLOUDINARY}/%"}).rowcount
    print(f"Borradas: {borradas_nube} imágenes en Cloudinary y {filas} registros de fotos en la BD.")


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    modo = parser.add_mutually_exclusive_group(required=True)
    modo.add_argument("--revisar", action="store_true", help="Asigna fotos y genera la hoja de revisión (no escribe nada)")
    modo.add_argument("--cargar", action="store_true", help="Sube a Cloudinary y registra en la BD lo revisado")
    modo.add_argument("--borrar", action="store_true", help="Quita todas las fotos seed de Cloudinary y la BD")
    parser.add_argument("--limite", type=int, help="Con --cargar: sube solo las primeras N")
    parser.add_argument("--confirmar", action="store_true", help="Requerido junto con --borrar")
    args = parser.parse_args()

    if args.revisar:
        revisar(args)
    elif args.cargar:
        cargar(args)
    else:
        borrar(args)


if __name__ == "__main__":
    sys.exit(main())
