from repositories import gastos as gastos_repo
from services import sugerir_gasto
from datetime import date
from decimal import Decimal

def obtener_gastos(client, jwt: str):
    return gastos_repo.listar_gastos(client, jwt)

def registrar_gasto(client, jwt: str, datos: dict):
    datos_insert = dict(datos)
    if "fecha_gasto" in datos_insert and isinstance(datos_insert["fecha_gasto"], date):
        datos_insert["fecha_gasto"] = datos_insert["fecha_gasto"].isoformat()
    if "valor" in datos_insert:
        datos_insert["valor"] = float(datos_insert["valor"])
    if "categoria_id" in datos_insert:
        datos_insert["categoria_id"] = str(datos_insert["categoria_id"])
    if "frecuencia" in datos_insert:
        frec = datos_insert["frecuencia"]
        if frec is not None:
            datos_insert["frecuencia"] = frec.value if hasattr(frec, "value") else str(frec)
        else:
            datos_insert.pop("frecuencia", None)

    nuevo_gasto = gastos_repo.crear_gasto(client, jwt, datos_insert)
    if not nuevo_gasto:
        raise ValueError("No se pudo registrar el gasto en base de datos")

    eval_resultado = sugerir_gasto.evaluar_gasto(client, jwt, nuevo_gasto)

    return {
        "mensaje": "Gasto registrado correctamente",
        "gasto": nuevo_gasto,
        "sugerencia": eval_resultado.get("sugerencia"),
        "alerta": eval_resultado.get("alerta")
    }
