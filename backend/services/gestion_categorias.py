from repositories import categorias as categorias_repo

def obtener_categorias(client, jwt: str):
    return categorias_repo.listar_categorias(client, jwt)