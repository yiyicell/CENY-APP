from supabase import create_client

url = "https://jatxsuzsirmmalrndhvf.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImphdHhzdXpzaXJtbWFscm5kaHZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4Nzk4NzYsImV4cCI6MjEwNDQ1NTg3Nn0.wrV_77d7QTLnbeP2CKizV14lFZZaIo-TLRU5de8cQAg"

client = create_client(url, key)

respuesta = client.auth.sign_in_with_password({
    "email": "admin@edu.co",
    "password": "admin12345*"
})


print("Session:", respuesta.session.access_token)
