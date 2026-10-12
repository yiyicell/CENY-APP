from repositories import gastos as gastos_repo

def obtener_gastos(client, jwt: str):
    return gastos_repo.listar_gastos(client, jwt)