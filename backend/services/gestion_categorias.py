from repositories import categorias as categorias_repo

def obtener_categorias(client, jwt: str):
    return categorias_repo.listar_categorias(client, jwt)

def registrar_categoria(client, jwt: str, datos: dict):
    datos_insert = dict(datos)
    if "prioridad" in datos_insert:
        prio = datos_insert["prioridad"]
        datos_insert["prioridad"] = prio.value if hasattr(prio, "value") else str(prio)
    return categorias_repo.crear_categoria(client, jwt, datos_insert)
