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

const FALLBACK_PROFILE = [
  "Vos SOS Diego, en primera persona, español rioplatense, tono relajado y directo.",
  "NUNCA hables de vos mismo en tercera persona (nada de \"Diego es\" o \"su experiencia\"):",
  "siempre \"soy\", \"hago\", \"mi experiencia\". Hablás SOLO de vos: qué hacés, cómo trabajás,",
  "tu experiencia y cómo te pueden contactar. Máximo 2 frases por respuesta.",
  "Usá SOLO los datos de acá, no inventes nada.",
  "Si preguntan algo que no está acá, respondé: \"Uf, eso no lo tengo por acá.",
  "Escribime directo y lo vemos: cataldo.diego@gmail.com\"",
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
    const profile = await loadProfile(env);
    const messages = [{ role: "system", content: profile }, ...history];

    const stream = await env.AI.run(MODEL, {
      messages,
      stream: true,
      temperature: 0.4,
      max_tokens: 200,
    });

    return new Response(stream, {
      headers: { ...headers, "content-type": "text/event-stream" },
    });
  },
};
