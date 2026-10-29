// Guard counted UI copy, including adjectives and irregular plurals. Extend this
// vocabulary when a new counted noun enters the product; this is not a translator.
const countedWord =
  /^\s+(?:resueltos?|pendientes?|resultados?|registros?|casos?|car[aá]cter(?:es)?|pasos?|ejemplos?|miembros?|integrantes?|proyectos?|equipos?|ejecuci[oó]n(?:es)?|archivos?|borradores?|tags?|bugs?)\b/;

export default {
  meta: {
    type: "problem",
    schema: [],
    messages: {
      agreement: "Usa formatCount/pluralize con singular y plural para textos con contador.",
    },
  },
  create(context) {
    return {
      TemplateLiteral(node) {
        for (const part of node.quasis.slice(1)) {
          if (countedWord.test(part.value.cooked ?? part.value.raw))
            context.report({ node: part, messageId: "agreement" });
        }
      },
      JSXElement(node) {
        for (let index = 1; index < node.children.length; index++) {
          const child = node.children[index];
          const previous = node.children[index - 1];
          if (
            child.type === "JSXText" &&
            previous.type === "JSXExpressionContainer" &&
            countedWord.test(child.value)
          )
            context.report({ node: child, messageId: "agreement" });
        }
      },
    };
  },
};
