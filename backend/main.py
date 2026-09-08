from fastapi import FastAPI
from routers.categorias import router as router_categorias

app = FastAPI(title="App Gastos Personales API")

app.include_router(router_categorias)

app.get("/")
def root():
    return {"mensaje": "API de gastos personales operando correctamente"}