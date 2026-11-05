# Entrega de enlaces de cuenta

La instancia puede delegar la entrega de activaciones y recuperaciones a un webhook HTTPS administrado por el operador. Aplica primero la migración 021 con `pnpm db:migrate` y configura en el backend las tres variables de `backend/.env.example`.

| Variable                     | Valor                                       |
| ---------------------------- | ------------------------------------------- |
| `ACCOUNT_LINK_APP_URL`       | URL pública HTTPS donde se abre qaTestGE    |
| `ACCOUNT_LINK_WEBHOOK_URL`   | URL HTTPS del servicio que envía el correo  |
| `ACCOUNT_LINK_WEBHOOK_TOKEN` | Secreto que el webhook verifica como Bearer |

qaTestGE envía un POST JSON con `email`, `purpose` (`activation` o `recovery`), `url` y `expiresAt` (ISO 8601 UTC). El servicio devuelve 2xx cuando acepta la entrega. Debe enviar la URL completa al destinatario indicado, mantener el fragmento y excluir el contenido de registros y herramientas de rastreo de enlaces. La API espera hasta ocho segundos y rechaza redirecciones.

Si falla la entrega de la activación, Admin puede repetir el alta con la misma clave y los mismos datos. La cuenta pendiente se conserva. La persona también puede solicitar un enlace desde la pantalla de acceso. Las solicitudes públicas válidas devuelven el mismo mensaje para cualquier correo y el servidor limita el reenvío a una vez por minuto por cuenta.

Valida una entrega con una cuenta de QA antes de habilitar el webhook en un entorno compartido. Verifica que la activación permite entrar al proyecto correcto y que, después de una recuperación, la sesión anterior queda revocada.
