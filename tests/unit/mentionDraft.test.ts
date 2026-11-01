import { describe, it, expect } from "vitest";
import {
  readMentionDraft,
  editMentionDraft,
  writeMentionDraft,
} from "../../src/models/mentionDraft";

describe("edición visible de menciones con identidad estable", () => {
  it("oculta IDs y conserva identidades distintas aunque sus nombres coincidan", () => {
    const body = "Revisar @[Ana](user:1) y @[Ana](user:2).";
    const draft = readMentionDraft(body);
    expect(draft.text).toBe("Revisar @Ana y @Ana.");
    expect(writeMentionDraft(draft)).toBe(body);
  });
  it("mueve las selecciones al insertar texto sin cambiar los destinatarios", () => {
    const draft = readMentionDraft("Hola @[Anderson Castillo](user:1).");
    const edited = editMentionDraft(draft, "**Nota** " + draft.text);
    expect(writeMentionDraft(edited)).toBe("**Nota** Hola @[Anderson Castillo](user:1).");
  });
  it("no conserva una selección si la escritura extiende el nombre o lo convierte en email", () => {
    const draft = readMentionDraft("@[Ana](user:1)");
    expect(writeMentionDraft(editMentionDraft(draft, "@AnaX"))).toBe("@AnaX");
    expect(writeMentionDraft(editMentionDraft(draft, "correo@Ana"))).toBe("correo@Ana");
  });
  it("retira la identidad si se modifica el nombre, sin etiquetar a la persona anterior", () => {
    const draft = readMentionDraft("@[Ana](user:1) y @[Luis](user:2)");
    const edited = editMentionDraft(draft, "@Otra y @Luis");
    expect(writeMentionDraft(edited)).toBe("@Otra y @[Luis](user:2)");
  });
});
