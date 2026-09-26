# Technical Challenge: Product Checkout & Payment Gateway Integration

Documento de requerimientos técnicos, arquitectura y checklist de implementación para el desarrollo de la prueba técnica.

---

## 📌 1. Resumen del Proyecto

Crear una aplicación web (SPA + Backend API) para el flujo de compra y onboarding de pago de un producto utilizando la pasarela de pagos **Wompi (Sandbox)**. 

El flujo contempla:
1. Visualización de stock de un producto específico.
2. Captura y validación de datos de tarjeta de crédito (simulada) e información de entrega.
3. Resumen y confirmación de la orden con cálculo de tarifas.
4. Procesamiento de la transacción vía API Backend + Wompi Sandbox.
5. Actualización de inventario, asignación de producto y persistencia del estado.
6. Feedback visual del resultado y retorno a la vista de producto con stock actualizado.

---

## 🔄 2. Flujo de Negocio (5 Pantallas / Estados)
[1. Product Page] ➔ [2. Credit Card & Delivery Modal] ➔ [3. Summary (Backdrop)] ➔ [4. Final Status] ➔ [5. Product Page (Updated Stock)]


1. **Pantalla de Producto:**
   - Mostrar producto con imagen optimizada, descripción, precio y unidades disponibles en stock.
   - Botón de acción: `"Pay with credit card"`.
2. **Modal de Datos de Pago y Entrega:**
   - Formulario de tarjeta de crédito con validaciones sintácticas/algorítmicas (Luhn, CVV, fecha).
   - *Plus:* Detección visual de marca (Visa / Mastercard).
   - Formulario de datos de despacho/entrega del cliente.
   - *Nota de seguridad:* Los datos de tarjeta deben ser datos de prueba.
3. **Resumen de Pago (Componente Backdrop):**
   - Desglose detallado: `Monto del producto` + `Tarifa base obligatoria` + `Tarifa de envío` = `Total`.
   - Botón para confirmar y procesar pago.
4. **Procesamiento y Estado Final:**
   1. Backend genera transacción en estado `PENDING` y devuelve identificador.
   2. Backend/Frontend invoca API Wompi para ejecutar el pago.
   3. Una vez completado o rechazado:
      - Actualizar estado de la transacción en Backend.
      - Si fue exitoso: asignar producto a despacho y decrementar stock.
   4. Mostrar pantalla con estado final de la transacción (Aprobada / Rechazada / Fallida).
5. **Retorno a Producto:**
   - Redirección con stock sincronizado en tiempo real.

---

## 🛠️ 3. Requerimientos Técnicos

### 3.1 Frontend
- **Framework permitido:** ReactJS o VueJS exclusivamente (SPA).
- **Enfoque:** Mobile-first (mínimo de referencia: iPhone SE 2020 / 375x667 o 1334x750 px). Debe adaptarse fluidamente a pantallas mayores sin salirse de los límites visuales (`UI boundaries`).
- **Manejo de Estado:** Redux o Vuex obligatorio siguiendo arquitectura Flux.
- **Resiliencia:** Persistir datos temporales del flujo en `localStorage` o estado global para tolerar recargas (`F5/Refresh`) sin perder el progreso.
- **Estilos:** Flexbox / CSS Grid. Uso libre de frameworks CSS garantizando alta calidad visual.

### 3.2 Backend
- **Lenguaje / Frameworks permitidos:** 
  - JavaScript / TypeScript (**Nest.js**) *(Recomendado)*
  - Ruby (**Grape** o **Sinatra**)
  - ⛔ *Prohibido:* Ruby on Rails o frameworks no listados.
- **Arquitectura:**
  - Lógica desacoplada de controladores/rutas: **Hexagonal Architecture (Ports & Adapters)**.
  - Aplicar **Railway Oriented Programming (ROP)** para los casos de uso.
- **Módulos / Entidades mínimas:**
  - `Stock / Products`
  - `Transactions`
  - `Customers`
  - `Deliveries`
- **Base de Datos:** PostgreSQL o DynamoDB.
  - La BD debe incluir **Seeds** con productos de prueba iniciales (no se requiere endpoint de creación de productos).
- **Documentación API:** Swagger / OpenAPI o colección pública de Postman en el `README.md`.

### 3.3 Testing & Cobertura
- **Herramienta:** Jest (Backend y Frontend).
- **Cobertura requerida:** **> 80%** en ambos repositorios/módulos.
- Incluir evidencias/reporte de cobertura en el `README.md`.

### 3.4 Despliegue en la Nube
- Despliegue en proveedor Cloud (Recomendado: **AWS** - Free Tier, Lambda, ECS, S3 + CloudFront, RDS o DynamoDB).
- Aplicación y API completamente funcionales e integradas en producción/staging público.

---

## 🔐 4. Credenciales y Entorno UAT (Wompi Sandbox)

> ⚠️ **IMPORTANTE:** 
> - Trabajar siempre en modo **Sandbox**.
> - NO modificar credenciales maestras ni activar autenticación en dos pasos (2FA).
> - Manejar llaves en variables de entorno (`.env`), nunca quemadas en código.

| Configuración | Valor |
| :--- | :--- |
| **Login Staging** | `https://login.staging.wompi.dev/` |
| **Usuario** | `smltrs00` |
| **Contraseña** | `ChallengeWompi123*` |
| **UAT URL** | `https://api.co.uat.wompi.dev/v1` |
| **UAT Sandbox URL** | `https://api-sandbox.co.uat.wompi.dev/v1` |
| **Public Key (Sandbox)** | `pub_stagtest_g2u0HQd3ZMh05hsSgTS2lUV8t3s4mOt7` |
| **Private Key (Sandbox)** | `prv_stagtest_5i0ZGIGiFcDQifYsXxvsny7Y37tKqFWg` |
| **Events Secret** | `stagtest_events_2PDUmhMywUkvb1LvxYnayFbmofT7w39N` |
| **Integrity Secret** | `stagtest_integrity_nAIBuqayW70XpUqJS4qf4STYiISd89Fp` |

---

## 📋 5. Entregables

1. Código fuente completo de Frontend y Backend.
2. Repositorio público en GitHub:
   - ⚠️ **ATENCIÓN:** El nombre del repositorio **NO DEBE** contener la palabra `"Wompi"`.
   - Historial de commits progresivos y branches por feature.
3. Archivo `README.md` completo con:
   - Arquitectura y diagrama del modelo de datos.
   - URL de la aplicación desplegada en la nube.
   - Enlace a documentación interactiva (Swagger o Postman).
   - Reporte de cobertura de pruebas unitarias (> 80%).
   - Guía de instalación y ejecución local.

---

## 📊 6. Rúbrica de Evaluación

### Criterios Principales (100 Puntos Requeridos)
- **[5 pts]** `README.md` detallado y correctamente estructurado.
- **[5 pts]** Optimización visual (renderizado rápido de imágenes, sin desbordamiento de UI/UX).
- **[20 pts]** Flujo de checkout con tarjeta de crédito 100% funcional.
- **[20 pts]** API REST funcional, validaciones coherentes y manejo seguro de datos sensibles.
- **[30 pts]** Cobertura de pruebas unitarias > 80% (Jest) en Frontend y Backend.
- **[20 pts]** Despliegue funcional en Cloud (Front + Back conectados).

### Puntos Bonificación (+40 Puntos Extra)
- **[+5 pts]** Prácticas OWASP, HTTPS forzado y headers de seguridad.
- **[+5 pts]** Compatibilidad cross-browser y respuesta móvil impecable.
- **[+10 pts]** Habilidades avanzadas de CSS (animaciones, layouts, micro-interacciones).
- **[+10 pts]** Clean Code, patrones SOLID y legibilidad de código.
- **[+10 pts]** Arquitectura Hexagonal con Puertos y Adaptadores.
- **[+10 pts]** Implementación estricta de Railway Oriented Programming (ROP).

---

## 7. Consideraciones

1. Si se detecta que el repositorio no presenta avances ni confirmaciones, o que es similar a la solución de otro candidato, la
prueba se anulará automáticamente por fraude.