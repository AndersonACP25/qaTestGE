# Seguridad y privacidad

## Capacidades actuales

El backend usa PostgreSQL y autenticación local con usuarios y sesiones persistidas. Registro crea un workspace/proyecto propio. La API exige membresía en la organización del proyecto tanto para lectura como para creación; las claves foráneas verifican además integridad de las relaciones. Los archivos de evidencia se autorizan por proyecto y tienen un límite de 2 MiB. Gemini se habilita de forma opcional.

Las organizaciones previamente importadas no se asignan al primer usuario registrado. El acceso se concede mediante invitaciones de equipo de un solo uso y roles por proyecto. El propietario conserva Admin; los Admin gestionan accesos del proyecto según los permisos vigentes. Solo lectura permite consultar recursos autorizados.

## Credenciales y sesiones

- Contraseñas de 12–128 caracteres, derivadas con scrypt N=131072, r=8, p=1 y sal aleatoria de 16 bytes. Nunca se almacenan contraseñas reversibles ni se devuelven hashes.
- Tokens aleatorios de 32 bytes; solo su hash SHA-256 se conserva en qa.auth_sessions. Se verifican expiración y usuario activo en cada solicitud.
- Cookie qa_session: HttpOnly, SameSite=Lax, Path=/api, Secure con NODE_ENV=production y expiración absoluta de siete días. Login rota la sesión previa del navegador; logout la elimina de PostgreSQL y borra la cookie.
- CSRF independiente obtenido en login/registro/me y obligatorio para escrituras autenticadas. Los POST usan JSON y validan Origin cuando se declara. CORS no sustituye la autenticación ni la autorización.
- Registro/login: límite básico de 20 intentos por IP/15 minutos y dos derivaciones simultáneas por proceso. No se confían cabeceras de proxy. En un despliegue con varias instancias se necesitará un límite compartido y una política de proxy explícita.
- La aplicación no guarda cookies de sesión, contraseñas o tokens CSRF en localStorage. El tema visual sí puede recordarse allí. Las plantillas de bugs son contenido de texto privado, validado y asociado al usuario; no se interpreta como HTML.

DATABASE_URL solo se carga en el servidor desde backend/.env; ese archivo está ignorado por Git. backend/.env.example usa valores ficticios. No usar prefijos VITE_ para secretos. JWT_SECRET no se utiliza: no hay JWTs. Las consultas usan parámetros; las operaciones compuestas usan transacciones y los errores no incluyen credenciales, SQL ni parámetros.

## Operación y límites

Configurar HTTPS para producción y FRONTEND_ORIGIN/CORS_ORIGIN; API_ORIGIN permite indicar el origen directo del backend para SwaggerUI. No usar la configuración local como despliegue público sin revisar secretos, TLS, límites compartidos, respaldos, auditoría y retención. Las sesiones expiradas no autorizan acceso, pero su limpieza periódica aún debe programarse. La desactivación de cuenta exige contraseña y frase exacta, anonimiza nombre/correo/hash, revoca sesiones y elimina plantillas y la credencial personal de Gemini, mientras conserva las relaciones QA y las membresías. La activación y recuperación usan enlaces de un solo uso con entrega opcional. Guarda el secreto del webhook únicamente en el servidor y excluye las URLs de los registros. Los cambios de contraseña desde un enlace revocan todas las sesiones de la cuenta.

Gemini recibe únicamente el contenido aprobado en el diálogo de consentimiento. Los diseñadores mantienen la preparación local. Las claves personales se cifran con AES-256-GCM en PostgreSQL y se descifran en el servidor con la clave maestra. El respaldo del servidor puede configurarse con variables de entorno o en `backend/.env.ai.local`, ignorado por Git. Los resultados de IA se revisan antes de guardarlos o compartirlos. Evidencias y credenciales quedan fuera de los datos de generación. [Guía de Gemini](docs/AI_INTEGRATION.md).

## Reportar un problema

No existe aún un canal privado dedicado ni un plazo de respuesta comprometido. Contactar al propietario por un canal privado acordado antes de compartir detalles explotables. No publicar secretos, contraseñas, cookies, datos personales o evidencias sensibles en issues o commits.

Referencias de implementación: [scrypt de Node.js](https://nodejs.org/docs/latest-v24.x/api/crypto.html#cryptoscryptpassword-salt-keylen-options-callback), [almacenamiento de contraseñas de OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html) y [sesiones de OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html).
