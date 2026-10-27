from repositories import ingresos as ingresos_repo
from datetime import date
from decimal import Decimal

def obtener_ingreso(client, jwt: str):
    return ingresos_repo.listar_ingreso(client, jwt)

def registrar_ingreso(client, jwt: str, datos: dict):
    datos_insert = dict(datos)
    if "fecha_ingreso" in datos_insert and isinstance(datos_insert["fecha_ingreso"], date):
        datos_insert["fecha_ingreso"] = datos_insert["fecha_ingreso"].isoformat()
    elif "fecha_ingreso" in datos_insert:
        datos_insert["fecha_ingreso"] = str(datos_insert["fecha_ingreso"])
    if "valor" in datos_insert:
        datos_insert["valor"] = float(datos_insert["valor"])

    nuevo_ingreso = ingresos_repo.crear_ingreso(client, jwt, datos_insert)
    if not nuevo_ingreso:
        raise ValueError("Error al registrar el ingreso en la base de datos")
    return nuevo_ingreso

def obtener_total_ingresos(client, jwt: str) -> float:
    ingresos = ingresos_repo.listar_ingreso(client, jwt) or []
    return sum(float(i.get("valor", 0)) for i in ingresos)
