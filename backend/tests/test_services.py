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
from services.gestion_ingreso import registrar_ingreso
from services.sugerir_gasto import evaluar_gasto, _es_gasto_hormiga, obtener_analisis_algoritmico
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from main import app

class TestSugerirGasto(unittest.TestCase):

    def test_deteccion_gasto_hormiga_por_palabra(self):
        # Tinto o café menor a umbral
        es_h = _es_gasto_hormiga(4500.0, "Café con pan", "Alimentación", "alta")
        self.assertTrue(es_h)

    def test_deteccion_gasto_hormiga_por_monto_en_ocio(self):
        # Monto pequeño en ocio
        es_h = _es_gasto_hormiga(12000.0, "Entrada arcade", "Ocio", "baja")
        self.assertTrue(es_h)

    def test_gasto_grande_no_es_hormiga(self):
        # Arriendo no es hormiga
        es_h = _es_gasto_hormiga(600000.0, "Arriendo mes", "Vivienda", "alta")
        self.assertFalse(es_h)

    @patch("repositories.gastos.listar_gastos")
    @patch("repositories.ingresos.listar_ingreso")
    @patch("services.gestion_metas.obtener_metas")
    @patch("repositories.categorias.listar_categorias")
    def test_evaluar_gasto_alerta_hormiga(self, mock_cats, mock_metas, mock_ingresos, mock_gastos):
        mock_cats.return_value = [
            {"id": "cat1", "nombre": "Ocio", "prioridad": "baja"}
        ]
        mock_gastos.return_value = [
            {"valor": 5000, "descripcion": "Café", "categoria_id": "cat1"},
            {"valor": 8000, "descripcion": "Snack", "categoria_id": "cat1"}
        ]
        mock_ingresos.return_value = [{"valor": 1000000}]
        mock_metas.return_value = [
            {"id": "m1", "nombre": "Viaje", "cuota_sugerida": 100000, "estado": "por_cumplir"}
        ]

        nuevo_gasto = {"valor": 6000, "descripcion": "Gaseosa", "categoria_id": "cat1"}
        res = evaluar_gasto(MagicMock(), "fake-jwt", nuevo_gasto)
        self.assertTrue(res["es_gasto_hormiga"])
        self.assertIn("Aviso de Microgasto (Gasto Hormiga)", res["alerta"])

class TestGestionIngreso(unittest.TestCase):

    @patch("repositories.ingresos.crear_ingreso")
    def test_registrar_ingreso_serializacion(self, mock_crear):
        mock_crear.return_value = {
            "id": "11111111-1111-1111-1111-111111111111",
            "valor": 1500000.0,
            "fecha_ingreso": "2026-10-27",
            "descripcion": "Salario"
        }
        client_mock = MagicMock()
        datos_entrada = {
            "valor": Decimal("1500000.00"),
            "fecha_ingreso": date(2026, 10, 27),
            "descripcion": "Salario"
        }
        res = registrar_ingreso(client_mock, "fake-jwt", datos_entrada)
        mock_crear.assert_called_once()
        args, kwargs = mock_crear.call_args
        datos_guardados = args[2]
        # Verificar que fecha_ingreso sea string ISO y valor sea float
        self.assertIsInstance(datos_guardados["fecha_ingreso"], str)
        self.assertEqual(datos_guardados["fecha_ingreso"], "2026-10-27")
        self.assertIsInstance(datos_guardados["valor"], float)
        self.assertEqual(datos_guardados["valor"], 1500000.0)

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

    def test_meta_proxima_a_vencer(self):
        # Meta a 5 días con 0% ahorrado debe marcarse "por_vencer"
        fecha_obj = date.today() + timedelta(days=5)
        meta = {
            "id": "33333333-3333-3333-3333-333333333333",
            "valor_objetivo": 500000.0,
            "frecuencia_ahorro": "mensual",
            "fecha_objetivo": fecha_obj.isoformat(),
            "estado": "por_cumplir"
        }
        res = calcular_metricas_meta(meta, [])
        self.assertEqual(res["estado_seguimiento"], "por_vencer")
        self.assertIn("Plazo crítico", res["mensaje_seguimiento"])

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
