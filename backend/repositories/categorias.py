from supabase import Client

def listar_categorias(client: Client, jwt: str):
    client.postgrest.auth(jwt)
    respuesta = client.table("categorias").select("*").execute()
    return respuesta.data
