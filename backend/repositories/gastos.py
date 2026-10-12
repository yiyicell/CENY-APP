from supabase import Client

def listar_gastos(client: Client, jwt: str):
    client.postgrest.auth(jwt)
    respuesta = client.table("gastos").select("*").execute()
    return respuesta.data
