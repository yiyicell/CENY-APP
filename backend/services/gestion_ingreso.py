from repositories import ingresos as ingresos_repo

def obtener_ingreso(client, jwt: str):
    return ingresos_repo.listar_ingreso(client, jwt)