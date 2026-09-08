import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Cargar las variables del archivo .env
load_dotenv()

url: str = os.getenv("SUPABASE_URL", "")
key: str = os.getenv("SUPABASE_KEY", "")

if not url or not key:
    raise ValueError("Las variables SUPABASE_URL y SUPABASE_KEY deben estar definidas en el archivo .env")

# Instancia global del cliente de Supabase
supabase: Client = create_client(url, key)