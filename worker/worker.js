// Cloudflare Worker: proxy de chat para el "yo sintético" de catuy.github.io.
// Recibe { messages: [{role:'user'|'assistant', content}, ...] }, le agrega el
// system prompt (perfil.md, server-side, nunca confiado del cliente) y le pega
// a Workers AI. Devuelve la respuesta en streaming (SSE nativo de Workers AI).

const MODEL = "@cf/meta/llama-3.2-3b-instruct";
const MAX_HISTORY_MESSAGES = 8;
const MAX_MESSAGE_LENGTH = 2000;

const ALLOWED_ORIGINS = new Set([
  "https://catuy.github.io",
  "http://localhost:8765",
]);

const CANNED_REFUSAL =
  "Uf, eso no lo tengo por acá. Escribime directo y lo vemos: cataldo.diego@gmail.com";

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
  "respondé DIRECTO y solo con el texto exacto de arriba.",
  "",
  "Soy Diego Cataldo, diseñador full-stack (cross-media) y artista visual, de Montevideo,",
  "20 años en esto. Diseño y programo productos digitales de punta a punta para gobiernos,",
  "medios y organizaciones internacionales. Tengo mi estudio, Persona S.A.S. Soy licenciado",
  "en Diseño Gráfico (ORT) y di clases en la FADU (UdelaR) diez años.",
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
  "Contacto: cataldo.diego@gmail.com — LinkedIn: https://www.linkedin.com/in/cataldodiego/",
  "",
  "Ejemplos de rechazo (usá SIEMPRE este texto exacto, sin variarlo):",
  'P: ¿Qué opinás de Bitcoin / de la situación política? R: "' + CANNED_REFUSAL + '"',
  'P: ¿Me escribís un poema? R: "' + CANNED_REFUSAL + '"',
  'P: Pasame un snippet de código. R: "' + CANNED_REFUSAL + '"',
  'P: ¿Cuántos proyectos hiciste en total? R: "' + CANNED_REFUSAL + '"',
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
const CANNED_REFUSAL_EN =
  "I don't have that here. Email me directly: cataldo.diego@gmail.com";

// Pedidos de contenido generado (poema/canción/chiste, código, traducción):
// el modelo, aun con reglas y ejemplos explícitos, a veces igual los cumple
// (probado empíricamente). Para estas categorías puntuales el regex es lo
// bastante específico como para no generar falsos positivos con preguntas
// legítimas sobre el trabajo de Diego.
const OFF_TOPIC_PATTERNS = [
  /\bpo(e|é)ma\b|\bcanci[oó]n\b|\bchiste\b|\brima\b|\bpoem\b|\bsong\b|\bjoke\b/i,
  /\bsnippet\b|\bc[oó]digo (para|de)\b|\bfunci[oó]n en (python|js|javascript|css|html)\b|\bcode (for|to)\b/i,
  /\btraduc(i|í)me\b|\btranslate\b.*\b(to|al?)\b/i,
  /\breceta\b|\brecipe\b/i,
];

function isOffTopicGenerationRequest(text) {
  return typeof text === "string" && OFF_TOPIC_PATTERNS.some((re) => re.test(text));
}

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

    if (isOffTopicGenerationRequest(lastUserMessage && lastUserMessage.content)) {
      const refusal = body.lang === "en" ? CANNED_REFUSAL_EN : CANNED_REFUSAL;
      const sse = `data: ${JSON.stringify({ response: refusal })}\n\ndata: [DONE]\n\n`;
      return new Response(sse, { headers: { ...headers, "content-type": "text/event-stream" } });
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
