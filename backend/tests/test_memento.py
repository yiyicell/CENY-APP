import unittest
from datetime import date, timedelta
from unittest.mock import MagicMock, patch
import sys
import os

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from patterns.memento import (
    EstadoMeta,
    MetaAhorroMemento,
    MetaAhorro,
    HistorialMetaCaretaker,
)
from services.gestion_metas import (
    registrar_aporte,
    deshacer_ultimo_estado,
    restaurar_estado_por_indice,
    cambiar_estado_meta,
)


class TestPatronMementoUML(unittest.TestCase):

    def test_flujo_completo_memento_abonar_y_deshacer(self):
        caretaker = HistorialMetaCaretaker()
        meta = MetaAhorro(
            idMeta="meta-1",
            nombreMeta="Viaje a Cartagena",
            montoObjetivo=100000.0,
            montoActual=0.0,
            fechaLimite=date.today() + timedelta(days=60),
            estado=EstadoMeta.EN_PROGRESO,
            caretaker=caretaker,
        )

        # Estado 0 -> guardar snapshot antes de abonar $40.000
        caretaker.agregarMemento(meta.guardarEstado(nota="Inicial"))
        meta.abonarMeta(40000.0)
        self.assertEqual(meta.getMontoActual(), 40000.0)
        self.assertEqual(meta.getEstado(), EstadoMeta.EN_PROGRESO)

        # Estado 1 -> guardar snapshot antes de abonar $60.000 (completa meta)
        caretaker.agregarMemento(meta.guardarEstado(nota="Segundo abono"))
        meta.abonarMeta(60000.0)
        self.assertEqual(meta.getMontoActual(), 100000.0)
        self.assertEqual(meta.getEstado(), EstadoMeta.COMPLETADA)

        # Deshacer último abono -> vuelve a $40.000 EN_PROGRESO
        memento_prev = caretaker.deshacer()
        meta.restaurarEstado(memento_prev)
        self.assertEqual(meta.getMontoActual(), 40000.0)
        self.assertEqual(meta.getEstado(), EstadoMeta.EN_PROGRESO)

        # Obtener memento por índice 0 -> vuelve a $0
        memento_inicial = caretaker.obtenerMemento(0)
        meta.restaurarEstado(memento_inicial)
        self.assertEqual(meta.getMontoActual(), 0.0)
        self.assertEqual(meta.getEstado(), EstadoMeta.EN_PROGRESO)

    def test_meta_cancelada_no_permite_abonos_y_se_puede_deshacer(self):
        caretaker = HistorialMetaCaretaker()
        meta = MetaAhorro(
            idMeta="meta-2",
            nombreMeta="Laptop",
            montoObjetivo=2000000.0,
            montoActual=500000.0,
            estado=EstadoMeta.EN_PROGRESO,
            caretaker=caretaker,
        )

        caretaker.agregarMemento(meta.guardarEstado())
        meta.cancelarMeta()
        self.assertEqual(meta.getEstado(), EstadoMeta.CANCELADA)

        with self.assertRaises(ValueError):
            meta.abonarMeta(50000.0)

        meta.restaurarEstado(caretaker.deshacer())
        self.assertEqual(meta.getEstado(), EstadoMeta.EN_PROGRESO)
        self.assertEqual(meta.getMontoActual(), 500000.0)

    def test_caretaker_vacio_lanza_error(self):
        caretaker = HistorialMetaCaretaker()
        with self.assertRaises(ValueError):
            caretaker.deshacer()
        with self.assertRaises(IndexError):
            caretaker.obtenerMemento(0)


class TestServicioGestionMetasMemento(unittest.TestCase):

    @patch("repositories.metas.obtener_aportes_revertidos_local", return_value=[])
    @patch("repositories.metas.actualizar_meta")
    @patch("repositories.metas.crear_aporte")
    @patch("repositories.metas.crear_memento")
    @patch("repositories.metas.listar_mementos")
    @patch("repositories.metas.listar_aportes")
    @patch("repositories.metas.obtener_meta_por_id")
    def test_registrar_aporte_crea_memento_y_actualiza_estado(
        self,
        mock_get_meta,
        mock_list_aportes,
        mock_list_mementos,
        mock_crear_memento,
        mock_crear_aporte,
        mock_actualizar_meta,
        mock_revertidos,
    ):
        meta_id = "11111111-1111-1111-1111-111111111111"
        mock_get_meta.return_value = {
            "id": meta_id,
            "usuario_id": "u1",
            "nombre": "Fondo",
            "valor_objetivo": 100000.0,
            "frecuencia_ahorro": "mensual",
            "fecha_objetivo": (date.today() + timedelta(days=30)).isoformat(),
            "estado": "por_cumplir",
        }
        mock_list_aportes.return_value = [
            {"id": "ap1", "meta_id": meta_id, "valor": 60000.0, "fecha_aporte": date.today().isoformat()}
        ]
        mock_list_mementos.return_value = [
            {"id": "m0", "meta_id": meta_id, "monto_actual": 0.0, "estado": "EN_PROGRESO", "aportes_ids": []}
        ]
        mock_crear_aporte.return_value = {
            "id": "ap2",
            "meta_id": meta_id,
            "valor": 40000.0,
            "fecha_aporte": date.today().isoformat(),
        }

        res = registrar_aporte(MagicMock(), "jwt", meta_id, {"valor": 40000.0, "fecha_aporte": date.today()})
        self.assertEqual(res["id"], "ap2")
        # Verifica que se haya guardado el memento previo con $60.000
        mock_crear_memento.assert_called_once()
        memento_payload = mock_crear_memento.call_args[0][3]
        self.assertEqual(memento_payload["monto_actual"], 60000.0)
        self.assertEqual(memento_payload["estado"], "EN_PROGRESO")
        # Verifica que la meta pasó a cumplido al llegar a $100.000
        mock_actualizar_meta.assert_called_once_with(
            unittest.mock.ANY, "jwt", meta_id, {"estado": "cumplido"}
        )

    @patch("repositories.metas.obtener_aportes_revertidos_local", return_value=[])
    @patch("repositories.metas.eliminar_memento")
    @patch("repositories.metas.actualizar_meta")
    @patch("repositories.metas.eliminar_aporte", return_value=True)
    @patch("repositories.metas.listar_mementos")
    @patch("repositories.metas.listar_aportes")
    @patch("repositories.metas.obtener_meta_por_id")
    def test_deshacer_ultimo_estado_revierte_aporte_y_estado(
        self,
        mock_get_meta,
        mock_list_aportes,
        mock_list_mementos,
        mock_del_aporte,
        mock_upd_meta,
        mock_del_memento,
        mock_revertidos,
    ):
        meta_id = "11111111-1111-1111-1111-111111111111"
        meta_obj = {
            "id": meta_id,
            "usuario_id": "u1",
            "nombre": "Fondo",
            "valor_objetivo": 100000.0,
            "frecuencia_ahorro": "mensual",
            "fecha_objetivo": (date.today() + timedelta(days=30)).isoformat(),
            "estado": "cumplido",
        }
        mock_get_meta.return_value = meta_obj
        aportes_antes = [
            {"id": "ap1", "meta_id": meta_id, "valor": 60000.0, "fecha_aporte": date.today().isoformat()},
            {"id": "ap2", "meta_id": meta_id, "valor": 40000.0, "fecha_aporte": date.today().isoformat()},
        ]
        aportes_despues = [
            {"id": "ap1", "meta_id": meta_id, "valor": 60000.0, "fecha_aporte": date.today().isoformat()},
        ]
        mock_list_aportes.side_effect = [aportes_antes, aportes_despues]
        mock_list_mementos.side_effect = [
            [
                {"id": "m0", "meta_id": meta_id, "monto_actual": 0.0, "estado": "EN_PROGRESO", "aportes_ids": []},
                {"id": "m1", "meta_id": meta_id, "monto_actual": 60000.0, "estado": "EN_PROGRESO", "aportes_ids": ["ap1"]},
            ],
            [
                {"id": "m0", "meta_id": meta_id, "monto_actual": 0.0, "estado": "EN_PROGRESO", "aportes_ids": []},
            ],
        ]

        res = deshacer_ultimo_estado(MagicMock(), "jwt", meta_id)
        mock_del_aporte.assert_called_once_with(unittest.mock.ANY, "jwt", "ap2")
        mock_upd_meta.assert_called_once_with(unittest.mock.ANY, "jwt", meta_id, {"estado": "por_cumplir"})
        mock_del_memento.assert_called_once_with(unittest.mock.ANY, "jwt", meta_id, "m1")
        self.assertEqual(res["aportes_revertidos"], 1)
        self.assertEqual(res["memento_restaurado"]["monto_actual"], 60000.0)
        self.assertEqual(res["meta"]["total_ahorrado"], 60000.0)


if __name__ == "__main__":
    unittest.main()
