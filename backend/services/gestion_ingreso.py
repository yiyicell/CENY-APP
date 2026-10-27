from repositories import ingresos as ingresos_repo

def obtener_ingreso(client, jwt: str):
    return ingresos_repo.listar_ingreso(client, jwt)

def registrar_ingreso(client, jwt: str, datos: dict):
    return ingresos_repo.crear_ingreso(client, jwt, datos)

def obtener_total_ingresos(client, jwt: str) -> float:
    ingresos = ingresos_repo.listar_ingreso(client, jwt) or []
    return sum(float(i.get("valor", 0)) for i in ingresos)
