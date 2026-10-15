---
name: ai-feature-design
description: Diseña capacidades de IA para qaTestGE con límites explícitos, privacidad, revisión humana y criterios de aceptación verificables.
metadata:
  opencode/slash: "true"
---

# Diseño de funcionalidades con IA

Usa esta skill al definir una función de IA nueva o cambiar el alcance de una existente en qaTestGE.

## Flujo

1. Aclara quién usa la función, qué tarea concreta quiere resolver y cuál es el flujo manual equivalente.
2. Revisa el estado implementado del repositorio y `architecture.md`; separa lo actual de lo planeado.
3. Define entradas, salida estructurada esperada, límites, errores visibles, costo/latencia y criterios medibles de aceptación.
4. Aplica minimización de datos: identifica los datos necesarios, los datos excluidos y qué se comunicará antes de enviar contexto a un proveedor.
5. Mantén IA opcional y con proveedor intercambiable. Nunca expongas credenciales del proveedor en el frontend.
6. Presenta la respuesta del modelo como borrador. Una persona debe revisar y confirmar antes de guardar o ejecutar cualquier acción.
7. Considera fallos, cuotas, indisponibilidad, entradas maliciosas y salidas inválidas; el flujo manual debe seguir disponible.
8. Propón pruebas para salidas válidas, entradas límite, errores del proveedor y validación de la revisión humana.

No afirmes cumplimiento, privacidad de proveedor ni precisión del modelo sin evidencia. No agregues backend ni integración real si la solicitud es solo de frontend.

## Entrega

Devuelve: problema y usuario, flujo propuesto, datos/contexto que salen del sistema, contrato de entrada/salida, aprobaciones humanas, estados de error y criterios de aceptación/pruebas.
