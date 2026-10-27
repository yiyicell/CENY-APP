from repositories import categorias as categorias_repo

def obtener_categorias(client, jwt: str):
    return categorias_repo.listar_categorias(client, jwt)

def registrar_categoria(client, jwt: str, datos: dict):
    return categorias_repo.crear_categoria(client, jwt, datos)
