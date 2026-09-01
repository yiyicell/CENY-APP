# Documento de Arquitectura – Ceny App (Plantilla arc42)

## 1. Introducción y Objetivos

### 1.1 Resumen del sistema
Es una aplicación móvil que ayuda al usuario a llevar el control de sus ingresos y gastos personales. A partir de esa información, sugiere un mejor uso del dinero (basado en reglas financieras conocidas como la regla 50/30/20) y muestra estadísticas que permiten entender los hábitos de gasto. El usuario puede definir metas de ahorro con fecha limite y decir manualmente a cuál invertir su dinero disponible. El objetivo no es solo registrar datos, sino ayudar al usuario a tomar mejores decisiones financieras y cumplir sus metas de forma consciente.

### 1.2 Objetivo de calidad
1. **Seguridad:** Maneja datos financieros personales, es la base de confianza del usuario.
2. **Usabilidad:** Pensada para cualquier tipo de público, no solo usuarios técnicos.
3. **Mantenibilidad:** El código será trabajado por 4 personas durante el desarrollo.

### 1.3 Stakeholders
*   **Usuarios:** Llevar control de sus ingresos/gastos de forma simple, entender si esta usando bien su dinero, y cumplir metas de ahorro con fechas concretas.
*   **Profesor:** Ver una arquitectura bien justificada, documentada y coherente con las decisiones tomadas.

## 2. Restricciones
Condiciones que no se pueden cambiar y limitan las decisiones de arquitectura.

| Tipo | Restricción | Explicación |
| :--- | :--- | :--- |
| Organizacional | Proyecto universitario, sin presupuesto | No se puede usar infraestructura ni servicios de pago. |
| Organizacional | Equipo de 4 estudiantes de Ingeniería de Software | Define capacidad de trabajo y necesidad de repartir roles/módulos. |
| Organizacional | Plazo de 2–3 meses para versión 1 | Limita alcance del MVP; obliga a priorizar funcionalidades esenciales. |
| Técnica | Debe correr en Android y iOS (versión 1) | Se requiere solución multiplataforma. |
| Técnica | El equipo no domina Kotlin ni Swift | Descarta desarrollo nativo; justifica el uso de React (multiplataforma) para frontend. |
| Normativa | Manejo de datos financieros personales | Requiere confidencialidad por usuario (autenticación) y respeto a políticas de privacidad del proveedor externo (Supabase). |

## 3. Contexto y Alcance del Sistema

### 3.1 Fuera de alcance (versión 1)
*   Conexión bancaria automática.
*   Predicción/recomendaciones basadas en IA/ML (se usan reglas fijas, ej. 50/30/20).
*   Reparto automático de dinero entre metas (la priorización es manual por parte del usuario).

## 4. Estrategia de Solución

### 4.1 Arquitectura: Monolito modular
Se optó por un monolito modular en vez de microservicios, dado el tamaño del equipo (4 personas) y el plazo (2-3 meses). Esto permite mantener orden interno mediante capas y módulos separados, sin la complejidad operativa de una arquitectura distribuida.

### 4.2 Stack tecnológico
*   **Frontend:** React - permite una sola base de código para Android e iOS, dado que el equipo no domina desarrollo nativo (Kotlin/Swift).
*   **Backend:** FastAPI (Python) - lenguaje ya dominado por el equipo, con soporte moderno para construir APIs REST.
*   **Base de datos:** PostgreSQL - motor robusto y gratuito.

### 4.3 Proveedor externo: Supabase
Se decidió delegar autenticación y base de datos administrada a Supabase, priorizando velocidad de desarrollo y seguridad, sin costos asociados.

### 4.4 Lógica de recomendaciones: reglas fijas
Se optó por reglas financieras conocidas (50/30/20) en lugar de Machine Learning, dado el plazo corto del proyecto y la falta de datos de entrenamiento disponibles.

## 5. Vista de Bloques de Construcción
*(Los diagramas de arquitectura se encuentran en la carpeta /Diagramas del repositorio)*

## 6. Vista de Runtime
1. Usuario ingresa un gasto en la App Móvil ($50.000 en "Comida").
2. App Móvil envía POST /gastos al API Backend (Capa Presentación).
3. Capa Presentación valida el formato y pasa el dato a RegistroIngresosGastos.
4. RegistroIngresosGastos guarda el gasto vía Data Access -> Base de Datos.
5. RegistroIngresosGastos notifica a SugerirGasto que hay un nuevo gasto.
6. SugerirGasto consulta a RegistroIngresosGastos (historial) y a GestionMetas (metas activas).
7. SugerirGasto aplica la regla 50/30/20 y genera una sugerencia.
8. La sugerencia se devuelve a la App Móvil como respuesta del POST.

## 7. Vista de Despliegue – Render

| Nodo | Artefacto que corre ahí | Detalle |
| :--- | :--- | :--- |
| Dispositivo del usuario (Android/iOS) | App Móvil (React) | Se instala directamente en el teléfono del usuario. |
| Servidor / hosting del backend | API Backend (FastAPI) | Debe estar desplegado en algún servicio. |
| Supabase (nube) | Base de Datos PostgreSQL + Auth | Administrado completamente por Supabase, no gestionas tú el servidor. |

## 8. Conceptos Transversales

### 8.1 Seguridad
*   Autenticación delegada a Supabase Auth (no se manejan contraseñas propias).
*   Cada usuario solo accede a sus propios datos; se valida el user_id en cada consulta desde el backend, nunca confiando en lo enviado por el cliente sin verificar.
*   Toda comunicación se realiza vía HTTPS.

### 8.2 Manejo de errores
Formato estándar de respuesta ante errores, implementado mediante un exception handler global en FastAPI:

    {
      "error": true,
      "mensaje": "Descripción del error",
      "codigo": 400
    }

### 8.3 Convenciones de código
Se sigue el estándar PEP 8 de Python:
*   snake_case para variables y funciones (ej: calcular_ahorro_mensual).
*   PascalCase para clases (ej: GestionMetas).
*   Estructura de carpetas organizada por capa: presentacion/, business/, dataAccess/.

### 8.4 Validación de datos
La validación de datos de entrada se realiza mediante esquemas Pydantic en la Capa de Presentación. FastAPI valida automáticamente cada solicitud contra el esquema correspondiente antes de que llegue a la lógica de negocio, rechazando con error 422 cualquier dato que no cumpla el formato esperado.

## 9. Decisiones de Arquitectura

*   **ADR-001: Arquitectura de monolito modular.** Contexto: equipo de 4 personas, plazo de 2-3 meses. Decisión: monolito modular con capas en vez de microservicios. Estado: Aceptada. Consecuencias: (+) menor complejidad de despliegue (-) difícil escalar por partes.
*   **ADR-002: Stack tecnológico (React + FastAPI + PostgreSQL).** Contexto: el equipo no domina Kotlin/Swift. Decisión: React, FastAPI, PostgreSQL. Estado: Aceptada. Consecuencias: (+) una sola base de código, curva baja (-) rendimiento nativo ligeramente inferior.
*   **ADR-003: Supabase como proveedor de Auth y Base de Datos.** Contexto: sin presupuesto, plazo corto. Decisión: usar Supabase completo. Estado: Aceptada. Consecuencias: (+) ahorro de tiempo, seguridad delegada (-) vendor lock-in parcial.
*   **ADR-004: Reglas fijas en vez de Machine Learning.** Contexto: plazo corto, sin datos históricos. Decisión: usar reglas financieras conocidas. Estado: Aceptada. Consecuencias: (+) predecible, simple (-) menos inteligente/personalizado.

## 10. Requisitos de Calidad

### 10.1. Seguridad
| Estímulo | Respuesta esperada |
| :--- | :--- |
| Un usuario intenta acceder a datos de otro usuario | El sistema rechaza la petición con error 403, sin exponer ningún dato. |
| Un usuario intenta autenticarse con credenciales inválidas | Supabase Auth rechaza el acceso y no se genera sesión. |

### 10.2. Usabilidad
| Estímulo | Respuesta esperada |
| :--- | :--- |
| Usuario sin experiencia técnica abre la app | Puede registrar un gasto y crear una meta sin instrucciones externas. |
| Usuario comete error de formato en campo numérico | La app muestra un mensaje de error claro, sin tecnicismos. |

### 10.3. Mantenibilidad
| Estímulo | Respuesta esperada |
| :--- | :--- |
| Agregar una nueva regla de recomendación | Puede hacerlo modificando solo SugerirGasto, sin tocar otras capas. |
| Cambiar el proveedor de autenticación futuro | El cambio se limita a ComunicacionProveedor, sin afectar el resto. |

## 11. Riesgos y Deuda Técnica

| Deuda técnica | Por qué se aceptó | Mejora futura |
| :--- | :--- | :--- |
| Deudas modeladas como gasto fijo recurrente simple | Falta de conocimiento de contabilidad en el equipo; simplicidad para el MVP | Modelar deudas con interés, plazos y amortización real |
| Ingresos registrados manualmente (sin conexión bancaria) | Conexión bancaria requiere permisos y APIs complejas fuera del alcance de 2-3 meses | Integrar Open Banking o APIs bancarias en versión futura |
| Recomendaciones basadas en reglas fijas (50/30/20) | Falta de datos históricos de entrenamiento y tiempo limitado | Explorar modelos de recomendación personalizados con Machine Learning |
