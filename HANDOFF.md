# HANDOFF — catuy.github.io (2026-07-24)

## Estado

- **`main`** = sitio Jekyll público, **LIVE en https://catuy.github.io**
  (build + deploy vía GitHub Actions, Jekyll 4.2.2). **Sin el chat LLM**, pero
  **sí sirve `perfil.md`** (el worker lo fetchea de ahí como system prompt).
- **`feature/synth-chat`** (esta rama) = sitio Jekyll **+ el agente de chat**
  (`worker/`, `perfil.md`, `_includes/info-chat.html`, `_data/chat/`), con el
  LLM ya integrado en `/info/` y la navegación circular por tags.

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
  con `FALLBACK_PROFILE` embebido si falla. Desde 2026-07-24 `perfil.md` está
  en `main`, así que en prod corre sobre el perfil real (cache 300s).
- Guardrails determinísticos (regex, ANTES del modelo, por eso son 100%
  confiables): viven en **`assets/chat-patterns.js`**, importado por el worker
  (wrangler lo bundlea) **y por el cliente** — una sola fuente de verdad.
  Rechazo de contenido generado (poemas/código/traducción); respuesta fija de
  proyectos/clientes; respuestas por proyecto puntual (Brecha, ANII,
  ClassWallet, UNESCO, BID, Monitor Cannabis + yauguru, bardanca, texticulos,
  alter); detección de leads; skill desconocido → rechazo; regla
  anti-confirmación de afirmaciones capciosas.
  **Orden importa**: los proyectos puntuales matchean ANTES del guard de skill
  desconocido — si no, "¿trabajaste con Brecha?" caía en el rechazo genérico.
- Idioma: es/en. Las respuestas fijas siguen el idioma **del mensaje**
  (`detectLang`), no del navegador. El intro sigue `navigator.language`.
- Referrer: los sitios de Diego linkean a `https://catuy.github.io/?from=<slug>`
  (slugs: `yauguru`, `bardanca`, `texticulos`, `alter`) → `sessionStorage
  .chatFrom` (lo guarda `_includes/footer.html`) → intro contextual + un nodo
  propio en el grafo.
- UI: `_layouts/info.html` + `_includes/info-chat.html`, **diálogo tipográfico**
  (sin burbujas). El `info.html` standalone pre-Jekyll ya no existe.

## Navegación circular por tags (`_data/chat/`)

El contenido de los tags NO está en el JS: vive en `_data/chat/ui.yml` +
`_data/chat/nodes/*.yml` (un archivo por hub) y se serializa a un
`<script type="application/json" id="chat-graph">`. **Para escribir textos
nuevos se editan los YAML, no `info-chat.html`.**

- 4 hubs: `work`, `art`, `me`, `project` (+ `referrer` y `loop`, que nunca
  entran al ranking genérico). ~24 nodos, todos bilingües es/en.
- Cada nodo: `label` (en voz del VISITANTE), `say` (1ª persona, máx 2 frases;
  si es lista, se elige variante al azar), `bridges` (saltos a otro hub),
  `audience`, `weight`, `image`, `cta`.
- El motor arma cada fila con **3 ranuras**: profundizar (hermano del hub) /
  cruzar (bridge) / salir (contacto si `turns>=3`, o "¿qué más?" cada 3 turnos).
  Filtra lo visitado y rankea por `audience` inferida. **Nunca devuelve una
  fila vacía**: si todo está visitado cae a contacto + "empecemos de nuevo".
- `visited` va en memoria, NO en `sessionStorage`: si persistiera, recargar
  `/info/` dejaría el grafo agotado frente a un log vacío.
- Texto libre: al terminar la respuesta del worker, `matchNodeId()` mapea el
  mensaje a un nodo y se ofrecen sus vecinos. Antes los chips desaparecían
  para siempre al escribir.
- Analytics (GA ya configurado): `tag_select {tag_id, depth, audience}`,
  `lead_reveal`, `mailto_click`, `free_text`.

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

## Hecho (2026-07-24)

1. ~~Portar el chat a `_includes/info-chat.html`~~ → hecho, con
   `_layouts/info.html`. `info.html` standalone eliminado.
2. ~~Referrer por `sessionStorage`~~ → hecho (`_includes/footer.html`).
3. ~~Worker CORS con `localhost:4000`~~ → hecho.
4. ~~`perfil.md` en `main`~~ → hecho, live en https://catuy.github.io/perfil.md.
5. Navegación circular por tags → hecha (ver sección arriba).

## Próximos pasos

1. **Enriquecer `perfil.md`** con los `_posts` (roles/equipos exactos, ej.
   Brecha lista "Diego Cataldo, Carolina Ocampo, Lucía Stagnaro") para cortar
   las respuestas pobres/alucinaciones. Entrevista pendiente: capítulo de
   instrumentos musicales, postura sobre arte/tech/soberanía digital.
   **Cuando se toque `perfil.md` hay que pushearlo a `main`**, que es de donde
   lo lee el worker.
2. **Ampliar el grafo** con nodos por proyecto (ANII, Brecha, UNESCO,
   ClassWallet, BID, Monitor Cannabis ya tienen texto verificado en
   `assets/chat-patterns.js`) y más imágenes de `/assets/blogimages/tiles/`.
3. **Podar con datos**: mirar los eventos `tag_select` en GA y sacar las ramas
   que nadie toca; profundizar las que sí.
4. Decidir estructura de `/info/`: solo-chat vs intro rsms + chat (pendiente de
   Diego).
5. Cuando esté: mergear `feature/synth-chat` → `main` (worker excluido del
   build, `perfil.md` ya servido).

## Cómo verificar el grafo

- Dev local: `bundle exec jekyll serve --port 4000` → http://localhost:4000/info/
- Hay un harness que corre el motor real contra un DOM stubbeado y hace miles
  de recorridos aleatorios verificando que la fila de chips nunca quede vacía.
  Si se toca el motor, conviene rehacerlo: extrae el `<script>` de
  `info-chat.html`, stubbea `document`/`sessionStorage`/`setTimeout` y clickea
  chips al azar.

## Limitación conocida

El modelo 3B alucina en preguntas abiertas ("contame de tus proyectos") — por
eso los guardrails determinísticos. Riesgo residual aceptado; lo más sensible
(proyectos/clientes/leads/contacto) está cubierto con respuestas fijas.
