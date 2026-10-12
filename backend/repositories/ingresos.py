from supabase import Client

def listar_ingreso(client: Client, jwt: str):
    client.postgrest.auth(jwt)
    respuesta = client.table("ingresos").select("*").execute()
    return respuesta.data