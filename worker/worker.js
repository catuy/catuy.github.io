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
  "Uf, eso no lo tengo por acá. Escribime directo y lo vemos: hello@persn.net";

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
  "Soy Diego Cataldo, diseñador full-stack (cross-media) y artista visual, de Montevideo,",
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
const CANNED_REFUSAL_EN =
  "I don't have that here. Email me directly: hello@persn.net";

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

// El modelo inventa proyectos/clientes/instituciones que no existen cuando
// le preguntan por su trabajo (probado empíricamente: llegó a inventar
// que trabajó para el "Ministerio de Educación y Cultura" y la "Secretaría
// Nacional de Turismo", organismos reales, cosa que nunca pasó). Para esta
// pregunta puntual no alcanza con reglas de prompt: se responde con un
// texto fijo, redactado a mano, nunca generado por el modelo.
const PROJECT_QUESTION_PATTERNS = [
  /\bproyecto/i,
  /\bclientes?\b/i,
  /\btrabajaste\b/i,
  /\bpara qui[eé]n\b/i,
  /\bcon qui[eé]n (trabaj|colabor)/i,
  /\bproject|clients?\b|who.*work(ed)? (for|with)/i,
];

function isProjectQuestion(text) {
  return typeof text === "string" && PROJECT_QUESTION_PATTERNS.some((re) => re.test(text));
}

const PROJECTS_CANNED_ES =
  "Trabajé en ClassWallet (fintech de educación, EE.UU.), UNESCO-IOC/GOOS y el BID como " +
  "UX Lead para Uruguay; antes fui consultor senior de UX de la ANII casi diez años. " +
  "También hice diseño para marcas como Coca-Cola, Unilever, Adidas, Prada, Chanel, " +
  "Philips y Wix, y organismos públicos uruguayos como MEC, LATU, Intendencia de " +
  "Montevideo, MIEM y Uruguay XXI. Si querés que profundice en alguno, escribime a " +
  "hello@persn.net.";

const PROJECTS_CANNED_EN =
  "I've worked on ClassWallet (education fintech, US), UNESCO-IOC/GOOS and IDB as UX " +
  "Lead for Uruguay; before that I was ANII's senior UX consultant for almost ten years. " +
  "I've also designed for brands like Coca-Cola, Unilever, Adidas, Prada, Chanel, " +
  "Philips and Wix, and Uruguayan public agencies like MEC, LATU, the Montevideo City " +
  "Government, MIEM and Uruguay XXI. If you want details on any of these, email me at " +
  "hello@persn.net.";

// Preguntas sobre UN proyecto real puntual: contestar con el detalle
// verificado de ESE proyecto, no con la lista genérica de arriba (probado:
// preguntar específicamente por Brecha devolvía la lista completa sin
// contestar nada) y sin dejar que el modelo invente detalles del proyecto.
const SPECIFIC_PROJECTS = [
  {
    match: /\bbrecha\b/i,
    es: "Sí, rediseñé la plataforma del Semanario Brecha: mobile-first, para ese medio " +
      "independiente uruguayo. Si querés más detalle, escribime a hello@persn.net.",
    en: "Yes, I redesigned Semanario Brecha's platform: mobile-first, for that independent " +
      "Uruguayan outlet. For more detail, email me at hello@persn.net.",
  },
  {
    match: /\banii\b/i,
    es: "Fui consultor senior de UX de la ANII casi diez años (2014-2023): armé el primer " +
      "sistema de diseño de un organismo del Estado uruguayo y varias de sus plataformas.",
    en: "I was ANII's senior UX consultant for almost ten years (2014-2023): I built the " +
      "first design system for a Uruguayan state agency, plus several of its platforms.",
  },
  {
    match: /\bclasswallet\b/i,
    es: "En ClassWallet soy Lead Product Designer desde 2023: es una fintech de educación " +
      "en EE.UU., y trabajo en su sistema de diseño y en flujos complejos para miles de usuarios.",
    en: "At ClassWallet I'm Lead Product Designer since 2023: it's an education fintech in " +
      "the US, and I work on its design system and complex flows for thousands of users.",
  },
  {
    match: /\bunesco\b|\bioc\b|\bgoos\b|ocean observing/i,
    es: "Con UNESCO-IOC/GOOS trabajo desde 2025 en el sistema de diseño y la plataforma en " +
      "React del Ocean Observing Report Card, con visualización de datos del océano.",
    en: "With UNESCO-IOC/GOOS I've worked since 2025 on the design system and React " +
      "platform for the Ocean Observing Report Card, visualizing ocean data.",
  },
  {
    match: /\bbid\b|inter-?american development bank|\biadb\b/i,
    es: "En el BID soy UX Lead para Uruguay desde 2022.",
    en: "At the IDB I've been UX Lead for Uruguay since 2022.",
  },
  {
    match: /monitor cannabis|\bcannabis\b/i,
    es: "Hice la identidad y la plataforma de Monitor Cannabis, el monitoreo de la " +
      "regulación del cannabis en Uruguay.",
    en: "I built the identity and platform for Monitor Cannabis, tracking Uruguay's " +
      "cannabis regulation.",
  },
];

function matchSpecificProject(text) {
  if (typeof text !== "string") return null;
  return SPECIFIC_PROJECTS.find((p) => p.match.test(text)) || null;
}

// Pedidos de trabajo/presupuesto: la regla 5 dice que hay que decir que sí
// y pasar el contacto, pero el modelo a veces los trata como "dato que no
// tengo" (regla 6) y los rechaza — un lead real tratado como pregunta
// inválida. Se resuelve directo, antes de que la regla 6 lo intercepte.
const BUSINESS_INQUIRY_PATTERNS = [
  /\bpresupuesto\b|\bpresupersto\b|\bcotizaci[oó]n\b|\bprecio\b|\bcu[aá]nto (cobr|sale)/i,
  /\bcontratar(te)?\b|\bhire (you|me)\b|\bquote\b|\bpricing\b/i,
  /\bempezar un proyecto\b|\bstart a project\b/i,
];

function isBusinessInquiry(text) {
  return typeof text === "string" && BUSINESS_INQUIRY_PATTERNS.some((re) => re.test(text));
}

const BUSINESS_CANNED_ES =
  "Sí, hago justo eso. Escribime a hello@persn.net contándome un poco del proyecto y lo vemos.";
const BUSINESS_CANNED_EN =
  "Yes, that's exactly what I do. Email me at hello@persn.net with a bit about the " +
  "project and we'll take it from there.";

// "¿Tenés experiencia en X?" para un X cualquiera: el modelo tiende a decir
// que sí y confabular detalles (probado con "ecommerce"). Solo se deja
// pasar al modelo si X matchea algo real de la bio; si no, rechazo directo
// en vez de dejar que decida si "suena plausible".
const EXPERIENCE_QUESTION_PATTERN =
  /experiencia (en|con)|\btiene?s\s+experiencia\b|conoc[eé]s|sab[eé]s (de|sobre)|trabaja(s|ste)? con|experience (in|with)|\bhave\s+experience\b/i;

const KNOWN_SKILL_PATTERNS = [
  /figma/i,
  /react/i,
  /next\.?js/i,
  /tailwind/i,
  /wordpress/i,
  /storybook/i,
  /\bux\b|\bui\b|dise[nñ]o (de )?(producto|interacci[oó]n)/i,
  /sistema(s)? de dise[nñ]o|design system/i,
  /accesibilidad|\bwcag\b/i,
  /serigraf/i,
  /arte generativo/i,
  /dise[nñ]o gr[aá]fico|graphic design/i,
];

function isUnknownSkillQuestion(text) {
  if (typeof text !== "string" || !EXPERIENCE_QUESTION_PATTERN.test(text)) return false;
  return !KNOWN_SKILL_PATTERNS.some((re) => re.test(text));
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
    const lastUserText = lastUserMessage && lastUserMessage.content;
    const isEnglish = body.lang === "en";

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

    if (isUnknownSkillQuestion(lastUserText)) {
      return cannedSse(isEnglish ? CANNED_REFUSAL_EN : CANNED_REFUSAL);
    }

    const specificProject = matchSpecificProject(lastUserText);
    if (specificProject) {
      return cannedSse(isEnglish ? specificProject.en : specificProject.es);
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
