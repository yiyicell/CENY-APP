from fastapi import FastAPI
from routers.categorias import router as router_categorias
from routers.gastos import router as router_gastos
from routers.ingresos import router as router_ingreso

app = FastAPI(title="App Gastos Personales API")

app.include_router(router_categorias)
app.include_router(router_gastos)
app.include_router(router_ingreso)

@app.get("/")
def root():
    return {"mensaje": "API de gastos personales operando correctamente"}