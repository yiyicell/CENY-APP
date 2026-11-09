# database.py
from supabase import create_client, Client
import os
from dotenv import load_dotenv

if os.path.exists(".env.local"):
    load_dotenv(".env.local")
else:
    load_dotenv(".env")

url: str = os.getenv("SUPABASE_URL", "")
key: str = os.getenv("SUPABASE_KEY", "")

def get_client() -> Client:
    """Crea un cliente NUEVO cada vez que se llama, para que cada
    petición tenga su propio cliente, sin compartir estado entre usuarios."""
    return create_client(url, key)