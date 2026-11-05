import { expect, it, vi } from "vitest";
import { geminiBugProposalProvider } from "../../servicios/ia/gemini.mjs";

const env = { AI_BUG_PROPOSALS_ENABLED: "true", GEMINI_API_KEY: "fake-test-key" };
const input = { description: "Guardar no responde" };
const priorities = ["Media"];

it("usa la clave en el encabezado y extrae el JSON de la respuesta estructurada", async () => {
  const proposal = {
    title: "Guardar no responde",
    description: input.description,
    priority: "Media",
  };
  const fetchRequest = vi.fn<typeof fetch>().mockResolvedValue(
    Response.json({
      candidates: [
        {
          finishReason: "STOP",
          content: {
            parts: [
              { thought: true, text: "razonamiento interno" },
              { text: JSON.stringify(proposal) },
            ],
          },
        },
      ],
    }),
  );
  const provider = geminiBugProposalProvider(env, priorities, fetchRequest);
  expect(await provider?.propose(input)).toEqual({ ok: true, proposal });
  const [url, options] = fetchRequest.mock.calls[0]!;
  expect(url).toBe(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent",
  );
  expect(options?.headers).toMatchObject({ "x-goog-api-key": env.GEMINI_API_KEY });
  expect(options?.body).not.toContain(env.GEMINI_API_KEY);
  expect(JSON.parse(String(options?.body))).toMatchObject({
    generationConfig: {
      responseFormat: {
        text: {
          mimeType: "APPLICATION_JSON",
          schema: { required: ["title", "description", "priority"] },
        },
      },
    },
  });
});

it("rechaza respuestas incompletas y oculta el cuerpo de error del proveedor", async () => {
  const fetchRequest = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(
      Response.json({ error: { message: env.GEMINI_API_KEY } }, { status: 403 }),
    )
    .mockResolvedValueOnce(Response.json({ candidates: [{ finishReason: "MAX_TOKENS" }] }));
  const provider = geminiBugProposalProvider(env, priorities, fetchRequest);
  expect(await provider?.propose(input)).toEqual({ ok: false, reason: "unavailable" });
  expect(await provider?.propose(input)).toEqual({ ok: false, reason: "invalid" });
  expect(
    geminiBugProposalProvider(
      { ...env, AI_BUG_PROPOSALS_ENABLED: "false" },
      priorities,
      fetchRequest,
    ),
  ).toBeUndefined();
});
