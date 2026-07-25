// Cloudflare Worker: proxy de chat para el "yo sintético" de catuy.github.io.
// Recibe { messages: [{role:'user'|'assistant', content}, ...] }, le agrega el
// system prompt (perfil.md, server-side, nunca confiado del cliente) y le pega
// a Workers AI. Devuelve la respuesta en streaming (SSE nativo de Workers AI).
//
// Los guardrails determinísticos (regex + respuestas fijas) viven en
// ../assets/chat-patterns.js, compartidos con el chat de /info/: el cliente los
// usa para saber a qué nodo del grafo de tags volver después de una pregunta
// escrita a mano. wrangler los bundlea al deployar.

import {
  CANNED_REFUSAL,
  CANNED_REFUSAL_EN,
  BUSINESS_CANNED_ES,
  BUSINESS_CANNED_EN,
  PROJECTS_CANNED_ES,
  PROJECTS_CANNED_EN,
  isOffTopicGenerationRequest,
  isBusinessInquiry,
  isUnknownSkillQuestion,
  isProjectQuestion,
  matchSpecificProject,
  detectLang,
} from "../assets/chat-patterns.js";

const MODEL = "@cf/meta/llama-3.2-3b-instruct";
const MAX_HISTORY_MESSAGES = 8;
const MAX_MESSAGE_LENGTH = 2000;

const ALLOWED_ORIGINS = new Set([
  "https://catuy.github.io",
  "http://localhost:8765",
  "http://localhost:4000",
  "http://127.0.0.1:4000",
]);

const FALLBACK_PROFILE = [
  "Vos SOS Diego, en primera persona, español rioplatense, tono relajado y directo.",
  "NUNCA hables de vos mismo en tercera persona (nada de \"Diego es\" o \"su experiencia\"):",
  "siempre \"soy\", \"hago\", \"mi experiencia\". Hablás SOLO de vos: qué hacés, cómo trabajás,",
  "tu experiencia y cómo te pueden contactar. Máximo 2 frases por respuesta.",
  "Usá SOLO los datos de acá, no inventes nada.",
  "Si preguntan algo que no está acá, respondé EXACTO: \"" + CANNED_REFUSAL + "\"",
  "NO improvises: no des consejos generales de diseño/tech/negocios/vida ni expliques",
  "conceptos en abstracto — contá SOLO lo que VOS hiciste. NO generes contenido nuevo a",
  "pedido (poemas, chistes, código, traducciones, recetas, resúmenes). NO inventes ni",
  "redondees datos exactos (años, clientes, cifras, premios) que no estén acá. NO des",
  "opiniones sobre nada ajeno a tu bio (política, actualidad, terceros, tech en general).",
  "Si algo cae en cualquiera de estos casos, NO expliques por qué ni te disculpes distinto:",
  "respondé DIRECTO y solo con el texto exacto de arriba. Si te preguntan de forma afirmativa,",
  "dando por hecho algo que NO está acá (\"me dijeron que hiciste X\", \"¿tenés experiencia en",
  "Y?\"), NO lo confirmes ni asumas que sí porque suena plausible: aplicá el mismo texto exacto.",
  "",
  "Soy Diego, diseñador full-stack (cross-media) y artista visual, de Montevideo,",
  "20 años en esto. Diseño y programo productos digitales de punta a punta para gobiernos,",
  "medios y organizaciones internacionales. Soy licenciado en Diseño Gráfico (ORT) y di",
  "clases en la FADU (UdelaR) diez años.",
  "",
  "Trabajo con Figma para diseño, y React, Next.js, Tailwind, WordPress y Storybook para",
  "producción. Prefiero open source, evito el vendor lock-in y me importa la soberanía digital.",
  "",
  "Ando en ClassWallet (Lead Product Designer, desde 2023), UNESCO-IOC/GOOS (desde 2025) y",
  "el BID como UX Lead para Uruguay (desde 2022). Antes fui consultor senior de UX de la ANII",
  "casi diez años, armando su primer sistema de diseño.",
  "",
  "También hago arte: serigrafía y arte generativo con código, expuesto en Taiwán, Tokyo y Portugal.",
  "",
  "Contacto: hello@persn.net",
  "",
  "Ejemplos de rechazo (usá SIEMPRE este texto exacto, sin variarlo):",
  'P: ¿Qué opinás de Bitcoin / de la situación política? R: "' + CANNED_REFUSAL + '"',
  'P: ¿Me escribís un poema? R: "' + CANNED_REFUSAL + '"',
  'P: Pasame un snippet de código. R: "' + CANNED_REFUSAL + '"',
  'P: ¿Cuántos proyectos hiciste en total? R: "' + CANNED_REFUSAL + '"',
  'P: Me dijeron que hiciste X (algo que no está acá) ¿es así? R: "' + CANNED_REFUSAL + '"',
  "",
  "Recordatorio final: antes de responder, revisá que hablás SOLO de vos, con SOLO datos de",
  "acá, en máximo 2 frases, sin inventar, sin opinar de temas ajenos y sin generar contenido",
  "nuevo. Si algo falla, usá el texto exacto de rechazo de arriba y nada más. NO improvises.",
].join("\n");

function corsHeaders(origin) {
  const allowOrigin = ALLOWED_ORIGINS.has(origin) ? origin : "https://catuy.github.io";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}

async function loadProfile(env) {
  try {
    const res = await fetch("https://catuy.github.io/perfil.md", {
      cf: { cacheTtl: 300, cacheEverything: true },
    });
    if (!res.ok) throw new Error("perfil.md status " + res.status);
    const text = await res.text();
    if (!text.trim()) throw new Error("perfil.md vacío");
    return text;
  } catch (e) {
    return FALLBACK_PROFILE;
  }
}

function sanitizeHistory(rawMessages) {
  if (!Array.isArray(rawMessages)) return [];
  return rawMessages
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_MESSAGE_LENGTH) }))
    .slice(-MAX_HISTORY_MESSAGES);
}

// Solo dos idiomas soportados por ahora (es/en): el resto de códigos cae al
// español por defecto. Whitelist fija — nunca se interpola texto libre del
// cliente en el prompt.
function languageDirective(rawLang) {
  const lang = typeof rawLang === "string" ? rawLang.trim().toLowerCase() : "";
  if (lang !== "en") return "";
  return (
    "LANGUAGE OVERRIDE (this rule wins over everything below, including the " +
    'part that says "español rioplatense"): the profile below is written in ' +
    "Spanish, but you must answer ONLY in English from now on, in first " +
    "person, casual and direct tone. Keep every fact and rule from the " +
    "profile — only the output language changes, from Spanish to English. " +
    "If the visitor writes in Spanish, switch back to Spanish for that reply."
  );
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const headers = corsHeaders(origin);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers });
    }

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return new Response("Bad JSON", { status: 400, headers });
    }

    const history = sanitizeHistory(body.messages);
    const lastUserMessage = [...history].reverse().find((m) => m.role === "user");
    const lastUserText = lastUserMessage && lastUserMessage.content;
    const isEnglish = detectLang(lastUserText, body.lang === "en" ? "en" : "es") === "en";

    const cannedSse = (text) => {
      const sse = `data: ${JSON.stringify({ response: text })}\n\ndata: [DONE]\n\n`;
      return new Response(sse, { headers: { ...headers, "content-type": "text/event-stream" } });
    };

    if (isOffTopicGenerationRequest(lastUserText)) {
      return cannedSse(isEnglish ? CANNED_REFUSAL_EN : CANNED_REFUSAL);
    }

    if (isBusinessInquiry(lastUserText)) {
      return cannedSse(isEnglish ? BUSINESS_CANNED_EN : BUSINESS_CANNED_ES);
    }

    // Antes que el guard de skill desconocido: "¿trabajaste con Brecha?" matchea
    // `trabaja(s|ste)? con` de EXPERIENCE_QUESTION_PATTERN y "brecha" no está en
    // KNOWN_SKILL_PATTERNS, así que se comía el rechazo genérico en vez de
    // contestar con el texto verificado del proyecto. Un proyecto real con
    // respuesta escrita a mano siempre gana: es estrictamente más seguro que
    // dejarlo pasar al modelo.
    const specificProject = matchSpecificProject(lastUserText);
    if (specificProject) {
      return cannedSse(isEnglish ? specificProject.en : specificProject.es);
    }

    if (isUnknownSkillQuestion(lastUserText)) {
      return cannedSse(isEnglish ? CANNED_REFUSAL_EN : CANNED_REFUSAL);
    }

    if (isProjectQuestion(lastUserText)) {
      return cannedSse(isEnglish ? PROJECTS_CANNED_EN : PROJECTS_CANNED_ES);
    }

    const profile = await loadProfile(env);
    const langDirective = languageDirective(body.lang);
    const systemContent = langDirective ? langDirective + "\n\n" + profile : profile;
    const messages = [{ role: "system", content: systemContent }, ...history];

    const stream = await env.AI.run(MODEL, {
      messages,
      stream: true,
      temperature: 0.2,
      max_tokens: 150,
      repetition_penalty: 1.1,
      top_p: 0.9,
    });

    return new Response(stream, {
      headers: { ...headers, "content-type": "text/event-stream" },
    });
  },
};
