import unittest
from datetime import date, timedelta
from decimal import Decimal
import sys
import os

# Asegurar path de backend
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from services.gestion_metas import calcular_metricas_meta
from services.sugerir_gasto import evaluar_gasto
from fastapi.testclient import TestClient
from main import app

class TestGestionMetas(unittest.TestCase):

    def test_calculo_cuota_mensual(self):
        # Meta a 60 días (~2 meses) de $200.000 con $50.000 ahorrados
        fecha_obj = date.today() + timedelta(days=60)
        meta = {
            "id": "11111111-1111-1111-1111-111111111111",
            "valor_objetivo": 200000.0,
            "frecuencia_ahorro": "mensual",
            "fecha_objetivo": fecha_obj.isoformat(),
            "estado": "por_cumplir"
        }
        aportes = [
            {"meta_id": meta["id"], "valor": 50000.0}
        ]
        res = calcular_metricas_meta(meta, aportes)
        self.assertEqual(res["total_ahorrado"], 50000.0)
        self.assertEqual(res["progreso_porcentaje"], 25.0)
        self.assertEqual(res["periodos_restantes"], 2)
        # Monto pendiente 150.000 en 2 meses = 75.000 / mes
        self.assertEqual(res["cuota_sugerida"], 75000.0)

    def test_calculo_cuota_quincenal(self):
        # Meta a 30 días (~2 quincenas) de $100.000 sin aportes
        fecha_obj = date.today() + timedelta(days=30)
        meta = {
            "id": "22222222-2222-2222-2222-222222222222",
            "valor_objetivo": 100000.0,
            "frecuencia_ahorro": "quincenal",
            "fecha_objetivo": fecha_obj.isoformat(),
            "estado": "por_cumplir"
        }
        res = calcular_metricas_meta(meta, [])
        self.assertEqual(res["total_ahorrado"], 0.0)
        self.assertEqual(res["progreso_porcentaje"], 0.0)
        self.assertEqual(res["periodos_restantes"], 2)
        # 100.000 / 2 = 50.000 / quincena
        self.assertEqual(res["cuota_sugerida"], 50000.0)

class TestEndpointsFastAPI(unittest.TestCase):

    def setUp(self):
        self.client = TestClient(app)

    def test_root_endpoint(self):
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"mensaje": "API de gastos personales operando correctamente"})

    def test_error_formato_estandar_404(self):
        response = self.client.get("/ruta-inexistente")
        self.assertEqual(response.status_code, 404)
        data = response.json()
        self.assertTrue(data.get("error"))
        self.assertEqual(data.get("codigo"), 404)
        self.assertIn("mensaje", data)

    def test_validacion_token_faltante(self):
        # Intentar acceder a /gastos sin header Authorization
        response = self.client.get("/gastos")
        self.assertEqual(response.status_code, 422)
        data = response.json()
        self.assertTrue(data.get("error"))
        self.assertEqual(data.get("codigo"), 422)

if __name__ == "__main__":
    unittest.main()
