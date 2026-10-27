from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from routers.auth import router as router_auth
from routers.categorias import router as router_categorias
from routers.gastos import router as router_gastos
from routers.ingresos import router as router_ingreso
from routers.metas import router as router_metas

app = FastAPI(
    title="Ceny App - API de Gastos Personales",
    description="API REST modular construida con FastAPI y Supabase para el control de finanzas personales.",
    version="1.0.0"
)

# Configuración de CORS para permitir peticiones desde React Native / Expo
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Manejo global de excepciones conforme a la Sección 8.2 del Documento de Arquitectura
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": True,
            "mensaje": str(exc.detail),
            "codigo": exc.status_code
        }
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    detalles = exc.errors()
    mensaje = "Error de validación en los datos enviados"
    if detalles:
        primer_error = detalles[0]
        campo = " -> ".join(str(loc) for loc in primer_error.get("loc", []))
        mensaje = f"Error en campo '{campo}': {primer_error.get('msg')}"
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": True,
            "mensaje": mensaje,
            "codigo": 422
        }
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": True,
            "mensaje": f"Error interno en el servidor: {str(exc)}",
            "codigo": 500
        }
    )

# Inclusión de routers modulares
app.include_router(router_auth)
app.include_router(router_categorias)
app.include_router(router_gastos)
app.include_router(router_ingreso)
app.include_router(router_metas)

@app.get("/")
def root():
    return {"mensaje": "API de gastos personales operando correctamente"}
