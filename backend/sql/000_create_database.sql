-- Ejecutar conectado a postgres, con autocommit y privilegio CREATEDB.
-- Ejecutar una sola vez; si qa_test_ge ya existe, omitir este archivo.
-- CREATE DATABASE no puede ejecutarse dentro de una transacción.
CREATE DATABASE qa_test_ge WITH ENCODING = 'UTF8' TEMPLATE = template0;
