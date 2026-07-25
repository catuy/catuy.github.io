// Patrones y respuestas fijas compartidos entre el Worker (server-side, donde
// se aplican como guardrails antes del modelo) y el chat de /info/ (client-side,
// donde se usan para volver a enganchar al visitante con el grafo de tags
// después de una pregunta escrita a mano).
//
// Una sola fuente de verdad: si el worker contesta con el texto fijo de Brecha,
// el grafo tiene que ofrecer los tags vecinos de Brecha. Antes esto vivía sólo
// en worker/worker.js y el cliente no sabía nada.
//
// El campo `node` de SPECIFIC_PROJECTS es para el cliente; el worker lo ignora.

export const CANNED_REFUSAL =
  "Uf, eso no lo tengo por acá. Escribime directo y lo vemos: hello@persn.net";

export const CANNED_REFUSAL_EN =
  "I don't have that here. Email me directly: hello@persn.net";

// Pedidos de contenido generado (poema/canción/chiste, código, traducción):
// el modelo, aun con reglas y ejemplos explícitos, a veces igual los cumple
// (probado empíricamente). Para estas categorías puntuales el regex es lo
// bastante específico como para no generar falsos positivos con preguntas
// legítimas sobre el trabajo de Diego.
export const OFF_TOPIC_PATTERNS = [
  /\bpo(e|é)ma\b|\bcanci[oó]n\b|\bchiste\b|\brima\b|\bpoem\b|\bsong\b|\bjoke\b/i,
  /\bsnippet\b|\bc[oó]digo (para|de)\b|\bfunci[oó]n en (python|js|javascript|css|html)\b|\bcode (for|to)\b/i,
  /\btraduc(i|í)me\b|\btranslate\b.*\b(to|al?)\b/i,
  /\breceta\b|\brecipe\b/i,
];

export function isOffTopicGenerationRequest(text) {
  return typeof text === "string" && OFF_TOPIC_PATTERNS.some((re) => re.test(text));
}

// El modelo inventa proyectos/clientes/instituciones que no existen cuando
// le preguntan por su trabajo (probado empíricamente: llegó a inventar
// que trabajó para el "Ministerio de Educación y Cultura" y la "Secretaría
// Nacional de Turismo", organismos reales, cosa que nunca pasó). Para esta
// pregunta puntual no alcanza con reglas de prompt: se responde con un
// texto fijo, redactado a mano, nunca generado por el modelo.
export const PROJECT_QUESTION_PATTERNS = [
  /\bproyecto/i,
  /\bclientes?\b/i,
  /\btrabajaste\b/i,
  /\bpara qui[eé]n\b/i,
  /\bcon qui[eé]n (trabaj|colabor)/i,
  /\bproject|clients?\b|who.*work(ed)? (for|with)/i,
];

export function isProjectQuestion(text) {
  return typeof text === "string" && PROJECT_QUESTION_PATTERNS.some((re) => re.test(text));
}

export const PROJECTS_CANNED_ES =
  "Trabajé en ClassWallet (fintech de educación, EE.UU.), UNESCO-IOC/GOOS y el BID como " +
  "UX Lead para Uruguay; antes fui consultor senior de UX de la ANII casi diez años. " +
  "También hice diseño para marcas como Coca-Cola, Unilever, Adidas, Prada, Chanel, " +
  "Philips y Wix, y organismos públicos uruguayos como MEC, LATU, Intendencia de " +
  "Montevideo, MIEM y Uruguay XXI. Si querés que profundice en alguno, escribime a " +
  "hello@persn.net.";

export const PROJECTS_CANNED_EN =
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
export const SPECIFIC_PROJECTS = [
  {
    match: /\bbrecha\b/i,
    node: "work.media",
    es: "Sí, rediseñé la plataforma del Semanario Brecha: mobile-first, para ese medio " +
      "independiente uruguayo. Si querés más detalle, escribime a hello@persn.net.",
    en: "Yes, I redesigned Semanario Brecha's platform: mobile-first, for that independent " +
      "Uruguayan outlet. For more detail, email me at hello@persn.net.",
  },
  {
    match: /\banii\b/i,
    node: "work.state",
    es: "Fui consultor senior de UX de la ANII casi diez años (2014-2023): armé el primer " +
      "sistema de diseño de un organismo del Estado uruguayo y varias de sus plataformas.",
    en: "I was ANII's senior UX consultant for almost ten years (2014-2023): I built the " +
      "first design system for a Uruguayan state agency, plus several of its platforms.",
  },
  {
    match: /\bclasswallet\b/i,
    node: "work.now",
    es: "En ClassWallet soy Lead Product Designer desde 2023: es una fintech de educación " +
      "en EE.UU., y trabajo en su sistema de diseño y en flujos complejos para miles de usuarios.",
    en: "At ClassWallet I'm Lead Product Designer since 2023: it's an education fintech in " +
      "the US, and I work on its design system and complex flows for thousands of users.",
  },
  {
    match: /\bunesco\b|\bioc\b|\bgoos\b|ocean observing/i,
    node: "work.now",
    es: "Con UNESCO-IOC/GOOS trabajo desde 2025 en el sistema de diseño y la plataforma en " +
      "React del Ocean Observing Report Card, con visualización de datos del océano.",
    en: "With UNESCO-IOC/GOOS I've worked since 2025 on the design system and React " +
      "platform for the Ocean Observing Report Card, visualizing ocean data.",
  },
  {
    match: /\bbid\b|inter-?american development bank|\biadb\b/i,
    node: "work.now",
    es: "En el BID soy UX Lead para Uruguay desde 2022.",
    en: "At the IDB I've been UX Lead for Uruguay since 2022.",
  },
  {
    match: /monitor cannabis|\bcannabis\b/i,
    node: "work.state",
    es: "Hice la identidad y la plataforma de Monitor Cannabis, el monitoreo de la " +
      "regulación del cannabis en Uruguay.",
    en: "I built the identity and platform for Monitor Cannabis, tracking Uruguay's " +
      "cannabis regulation.",
  },
  {
    match: /yaugur[uú]/i,
    node: "referrer.yauguru",
    es: "Sí, el sitio de Yaugurú lo diseñé y desarrollé yo. Si querés que profundice, " +
      "escribime a hello@persn.net.",
    en: "Yes, I designed and built the Yaugurú site myself. If you want me to go deeper, " +
      "email me at hello@persn.net.",
  },
  {
    match: /bardanca/i,
    node: "referrer.bardanca",
    es: "Sí, el sitio de Héctor Bardanca lo diseñé y desarrollé yo. Si querés que " +
      "profundice, escribime a hello@persn.net.",
    en: "Yes, I designed and built Héctor Bardanca's site myself. If you want me to go " +
      "deeper, email me at hello@persn.net.",
  },
  {
    match: /text[ií]culos|\bmaca\b/i,
    node: "referrer.texticulos",
    es: "Sí, textículos (el sitio de Maca) lo diseñé y desarrollé yo. Si querés que " +
      "profundice, escribime a hello@persn.net.",
    en: "Yes, I designed and built textículos (Maca's site) myself. If you want me to go " +
      "deeper, email me at hello@persn.net.",
  },
  {
    match: /alter\s*ediciones|alterediciones/i,
    node: "referrer.alter",
    es: "Sí, el sitio de Alter Ediciones lo diseñé y desarrollé yo. Si querés que " +
      "profundice, escribime a hello@persn.net.",
    en: "Yes, I designed and built the Alter Ediciones site myself. If you want me to go " +
      "deeper, email me at hello@persn.net.",
  },
];

export function matchSpecificProject(text) {
  if (typeof text !== "string") return null;
  return SPECIFIC_PROJECTS.find((p) => p.match.test(text)) || null;
}

// Pedidos de trabajo/presupuesto: la regla 5 dice que hay que decir que sí
// y pasar el contacto, pero el modelo a veces los trata como "dato que no
// tengo" (regla 6) y los rechaza — un lead real tratado como pregunta
// inválida. Se resuelve directo, antes de que la regla 6 lo intercepte.
export const BUSINESS_INQUIRY_PATTERNS = [
  /\bpresupuesto\b|\bpresupersto\b|\bcotizaci[oó]n\b|\bprecio\b|\bcu[aá]nto (cobr|sale)/i,
  /\bcontratar(te)?\b|\bhire (you|me)\b|\bquote\b|\bpricing\b/i,
  // pedir ayuda / arrancar algo (leads)
  /\bayud(arme|arte|ame|áme|arnos)\b/i,
  /\b(puedes|pod[eé]s|podrias|podr[ií]as)\s+ayud/i,
  /\b(me\s+)?d(a|á)s?\s+una\s+mano\b/i,
  /\bhow can you help\b|\bcan you help\b|\bhelp me\b/i,
  // querer/hacer/necesitar un proyecto o sitio
  /\bquiero\b.{0,25}\b(proyecto|sitio|web|p[aá]gina|app|tienda|hacer|crear|dise[ñn])/i,
  /\bhacer\b.{0,15}\b(un|una|mi)\b.{0,10}\b(proyecto|sitio|web|p[aá]gina|app|tienda)\b/i,
  /\bnecesito\b/i,
  /\bempezar un proyecto\b|\bstart a project\b/i,
  /\bi\s*(want|'?d like|would like)\s+to\b.{0,25}\b(project|site|website|work|build|design)\b/i,
  // trabajar juntos / servicios
  /\btrabajar\b.{0,15}\b(con|juntos|contigo|vos)\b|\bwork (with you|together)\b/i,
  /\bservicios?\b|\bservices?\b/i,
];

export function isBusinessInquiry(text) {
  return typeof text === "string" && BUSINESS_INQUIRY_PATTERNS.some((re) => re.test(text));
}

export const BUSINESS_CANNED_ES =
  "Sí, hago justo eso. Escribime a hello@persn.net contándome un poco del proyecto y lo vemos.";
export const BUSINESS_CANNED_EN =
  "Yes, that's exactly what I do. Email me at hello@persn.net with a bit about the " +
  "project and we'll take it from there.";

// "¿Tenés experiencia en X?" para un X cualquiera: el modelo tiende a decir
// que sí y confabular detalles (probado con "ecommerce"). Solo se deja
// pasar al modelo si X matchea algo real de la bio; si no, rechazo directo
// en vez de dejar que decida si "suena plausible".
export const EXPERIENCE_QUESTION_PATTERN =
  /experiencia (en|con)|\btiene?s\s+experiencia\b|conoc[eé]s|sab[eé]s (de|sobre)|trabaja(s|ste)? con|experience (in|with)|\bhave\s+experience\b/i;

export const KNOWN_SKILL_PATTERNS = [
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

export function isUnknownSkillQuestion(text) {
  if (typeof text !== "string" || !EXPERIENCE_QUESTION_PATTERN.test(text)) return false;
  return !KNOWN_SKILL_PATTERNS.some((re) => re.test(text));
}

// El idioma de las respuestas fijas debe seguir el idioma REAL del mensaje
// (no el del navegador): un visitante con navegador en inglés puede escribir
// en español, y las respuestas fijas tienen que acompañarlo, igual que el modelo.
export function detectLang(text, fallback) {
  if (typeof text !== "string") return fallback;
  const t = text.toLowerCase();
  let es = 0, en = 0;
  if (/[áéíóúñ¿¡]/.test(t)) es += 2;
  es += (t.match(/\b(qu[eé]|c[oó]mo|puedes|pod[eé]s|hac(er|[eé]s)|proyecto|ayud\w*|quiero|necesito|m[aá]s|hola|gracias|sitio|p[aá]gina|trabaj\w*|dise[ñn]\w*|para|sobre|vos|tu|tus|con)\b/g) || []).length;
  en += (t.match(/\b(the|you|your|can|help|want|make|project|more|hi|thanks|need|site|page|work|design|with|for|about|how|what)\b/g) || []).length;
  if (es > en) return "es";
  if (en > es) return "en";
  return fallback;
}

// Mapeo de texto libre → nodo del grafo, para que el chat vuelva a ofrecer
// tags después de una pregunta escrita a mano (el worker no usa esto).
// El orden replica el de los guardrails del worker: lo más específico primero.
export function matchNodeId(text) {
  if (typeof text !== "string" || !text.trim()) return null;
  const project = matchSpecificProject(text);
  if (project) return project.node;
  if (isBusinessInquiry(text)) return "project";
  if (/serigraf|grabado|screen ?print|\bprint(making)?\b/i.test(text)) return "art.print";
  if (/generativ|\bp5\b|\bcreative cod/i.test(text)) return "art.gen";
  if (/\b1976\b|desaparecid|dictadura|venecia|venice|bienal|biennial/i.test(text)) return "art.1976";
  if (/\bobra\b|\bart(e|ista|ist|work)?\b|expusiste|expos|muestra/i.test(text)) return "art";
  if (/\bclase|docenc|ense[ñn]|fadu|udelar|estudiante|teach|taught|univer/i.test(text)) return "me.teach";
  if (/sistema(s)? de dise[nñ]o|design system/i.test(text)) return "work.ds";
  if (/figma|react|next\.?js|tailwind|wordpress|storybook|stack|herramienta|tecnolog/i.test(text)) return "work.how";
  if (/open source|soberan[ií]a|vendor lock|prop[oó]sito|valores/i.test(text)) return "me.values";
  if (isProjectQuestion(text)) return "work";
  return null;
}
