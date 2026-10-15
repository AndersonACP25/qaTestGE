import app from "./app.js";

const port = Number(process.env.PORT ?? 3000);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT debe ser un puerto TCP válido entre 1 y 65535.");
}

const server = app.listen(port, () => {
  console.info(`qaTestGE API disponible en http://localhost:${port}`);
});

server.on("error", (error: NodeJS.ErrnoException) => {
  console.error("No se pudo iniciar qaTestGE API:", error);
  process.exitCode = 1;
});
