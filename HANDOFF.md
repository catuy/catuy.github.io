# HANDOFF — catuy.github.io (2026-07-24)

## Estado

- **`main`** = sitio Jekyll público, **LIVE en https://catuy.github.io**
  (build + deploy vía GitHub Actions, Jekyll 4.2.2). **Sin el chat LLM.**
- **`feature/synth-chat`** (esta rama) = sitio Jekyll **+ el agente de chat**
  (`worker/`, `perfil.md`, `info.html`), para integrar el LLM en `/info/`.

## Arquitectura

**Sitio (Jekyll 4.2.2)** — restaurado del proyecto original: `_layouts`,
`_includes`, `_posts` (proyectos, ocultos por ahora), `_sass`, IBM Plex
autohospedada (`assets/fonts`), cabeza 3D (`assets/heads`).
- Deploy: `.github/workflows/jekyll.yml` → Pages (`build_type=workflow`).
  **Push a `main` = deploy.** (El build legacy de Pages NO sirve: usa
  Jekyll 3.9 y el Gemfile fija 4.2.2.)
- Dev local: `bundle exec jekyll serve --port 4000` (Ruby 3.1.6, bundler ok).

**Chat agent (solo en esta rama)**
- Cloudflare Worker `diego-synth-chat` → `worker/worker.js`, live en
  `https://diego-synth-chat.cataldo-diego.workers.dev` (cuenta CF "Diego
  Cataldo", `account_id` en `worker/wrangler.toml`).
  Deploy: `cd worker && npx wrangler deploy`. **Esperar ~8s tras deploy**
  (propagación de edge) antes de confiar en las pruebas.
- Modelo: `@cf/meta/llama-3.2-3b-instruct` (Workers AI, free tier ~10k
  neurons/día ≈ 700-1000 mensajes). `temperature 0.2, max_tokens 150,
  repetition_penalty 1.1, top_p 0.9`.
- System prompt: `fetch` de `https://catuy.github.io/perfil.md` (server-side),
  con `FALLBACK_PROFILE` embebido si falla. **OJO: `perfil.md` NO está en
  `main`**, así que en prod el worker corre sobre el FALLBACK.
- Guardrails determinísticos (regex, ANTES del modelo, por eso son 100%
  confiables): rechazo de contenido generado (poemas/código/traducción);
  respuesta fija de proyectos/clientes; respuestas por proyecto puntual
  (Brecha, ANII, ClassWallet, UNESCO, BID, Monitor Cannabis + yauguru,
  bardanca, texticulos, alter); detección de leads ("quiero hacer un
  proyecto"/"ayudarme" → "sí, escribime a hello@persn.net"); skill
  desconocido → rechazo; regla anti-confirmación de afirmaciones capciosas.
- Idioma: es/en. Las respuestas fijas siguen el idioma **del mensaje**
  (`detectLang`), no del navegador. El intro sigue `navigator.language`.
- Referrer: los sitios de Diego linkean a `https://catuy.github.io/?from=<slug>`
  (slugs: `yauguru`, `bardanca`, `texticulos`, `alter`) → intro contextual.
- `info.html` (standalone, esta rama) = UI del chat como **diálogo
  tipográfico** (sin burbujas). Es la versión pre-Jekyll; hay que portarla
  a un `_include`.

## Decisiones / gotchas

- Título = `c-t-l-d` (sin apellido). En prosa se presenta como **"Diego"**.
- Contacto único: **hello@persn.net**. Sin LinkedIn, sin "Persona S.A.S.",
  sin apellido en el contenido.
- Home: 4 items fijos en las esquinas — nav contextual (arriba-izq, muestra
  la *otra* página), reloj Montevideo (arriba-der), mail (abajo-izq, oculto
  en `/info/`), **Shuffle** (abajo-der). Todos a `var(--margin)` (30px desk /
  `1vh` mobile). La alineación necesitó `.container > header.item:nth-child(1)`
  para ganarle en especificidad a la regla del grid.
- Color/cabeza: elegido 1 vez, **sticky toda la sesión** (`sessionStorage
  'scriptPath'`); **solo Shuffle lo cambia** (`removeItem` + `reload`). Se
  removió el handler `#nav-home` que re-randomizaba (era un bug con el nav
  contextual: en la home el primer ítem es "Info").
- Archivo (`/archivo/` + `_posts` + categorías) **oculto**: excluido del build
  en `_config.yml`. Reactivar = sacar del `exclude` + volver "Archivo" al nav.

## Próximos pasos — integrar el LLM en `/info/`

1. Portar el chat de `info.html` a `_includes/info-chat.html` y meterlo en
   `info.markdown` (o un layout), heredando tipografía + color + header/footer.
   Formato diálogo tipográfico (sin burbujas).
2. Referrer: guardar `?from` en `sessionStorage` en la home (como el color) y
   que el chat de info lo lea (ya no via `?c=`; el color va por sessionStorage).
3. Worker CORS (`ALLOWED_ORIGINS`): agregar `http://localhost:4000` y
   `http://127.0.0.1:4000` para probar el chat integrado en el Jekyll local;
   redeploy.
4. Agregar `perfil.md` a `main` para que el worker lo fetchee en prod (hoy usa
   el FALLBACK embebido).
5. **Enriquecer `perfil.md`** con el bio real (`info.markdown`) + los `_posts`
   (roles/equipos exactos, ej. Brecha lista "Diego Cataldo, Carolina Ocampo,
   Lucía Stagnaro") para cortar las respuestas pobres/alucinaciones. Entrevista
   pendiente: capítulo de instrumentos musicales, postura sobre arte/tech/
   soberanía digital.
6. Decidir estructura de `/info/`: solo-chat vs intro rsms + chat (pendiente de Diego).
7. Cuando esté: mergear `feature/synth-chat` → `main` (worker excluido del
   build, `perfil.md` servido).

## Limitación conocida

El modelo 3B alucina en preguntas abiertas ("contame de tus proyectos") — por
eso los guardrails determinísticos. Riesgo residual aceptado; lo más sensible
(proyectos/clientes/leads/contacto) está cubierto con respuestas fijas.
