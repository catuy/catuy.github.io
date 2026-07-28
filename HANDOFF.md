# HANDOFF — catuy.github.io (2026-07-24, ver ESTADO ACTUAL 2026-07-28)

## ESTADO ACTUAL (2026-07-28): se eliminó el chat agéntico y los tags

Después de iterar bastante sobre un chat con tag-graph + LLM (todo lo
documentado más abajo, desde "Navegación circular por tags" hasta
"Experimento de UX"), Diego decidió pivotar a algo mucho más simple. **Todo
lo que sigue en este HANDOFF hasta "Próximos pasos" describe el sistema
VIEJO, que ya no está en el código** — se deja como referencia histórica
(por si se quiere retomar algo de ahí), no como documentación del estado
actual. Leer esta sección primero.

`_includes/info-chat.html` pasó de ~665 líneas a ~194. Hoy `/info/` es:

1. **Un texto introductorio**, nada más: el about extendido (`about_extended`
   en `_data/chat/ui.yml`) para visitante frío, o el saludo contextual de
   `_data/chat/nodes/referrer.yml` si viene con `?from=<slug>` (yauguru,
   bardanca, texticulos, alter — vía `sessionStorage.chatFrom`, seteado por
   `_includes/footer.html`). Se tipea con el mismo ritmo tipo streaming que
   ya se había afinado (`typeOut()`, 3-6 caracteres cada 8-15ms).
2. **Click en cualquier lado de la página → apila una ventana de proyecto**
   arrastrable (`startProjectGallery()`), con la MISMA mecánica que
   `assets/script.js` (el detalle de proyecto, hoy oculto del build): cada
   click en un área vacía suma una `.gallery-window` nueva (imagen +
   header, jQuery UI `.draggable()`, z-index creciente) — **las anteriores
   quedan en pantalla, no se reemplazan** (se había probado una versión de
   "ventana única que se reemplaza" y se volvió atrás). Tocar una ventana
   existente la trae al frente; si no fue un drag real, también apila una
   nueva encima (jQuery UI suprime el click nativo que sigue a un drag, así
   que no hace falta distinguir "click" de "drag" a mano). Cada ventana
   viene con un comentario sobre ese proyecto, que reemplaza el texto
   narrador de arriba (mismo mecanismo que el intro: `showText()` hace
   `clearLog()` + tipear). Al agotar `GALLERY_IMAGES` (4 tiles placeholder:
   Brecha, ANII, Monitor Cannabis, ISP), un click más no hace nada.

**Se eliminó de verdad (no "dormido")**: todo el motor de ranking del grafo
(`score`/`pickSibling`/`pickBridge`/`pickExit`/`nextChips`/`moreChips`/
`POOL_HUBS`), los chips de entrada (`entryChips`/`closeEntryLoop`/
`select()`/`renderChips()`), y toda la integración de texto libre → Worker
(`fetch`, streaming SSE, `matchNodeId`, `chat-patterns.js` del lado
cliente). El CSS correspondiente (`.chat-tag`, `.chat-form`, `.chat-input`,
`.chat-typing`, `.chat-mail`, `.chat-image`, `.chat-turn.you`) también se
borró. `_data/chat/ui.yml` quedó sólo con `about_extended`.

**Lo que NO se tocó**: `worker/worker.js` y `assets/chat-patterns.js` siguen
en el repo y deployados — esta página simplemente dejó de llamarlos. Los
YAML de `_data/chat/nodes/{work,art,me,project,portfolio,loop}.yml` NO se
borraron (el bio largo de `me.yml`, las respuestas de `project.yml`, etc.
son contenido bueno, posiblemente reaprovechable) — quedaron sin uso, es una
decisión pendiente si se limpian o se reciclan. El cursor ambiente
(`.cursor-dot`, rojo en info / blanco en home, `_includes/footer.html`) no
cambió. El link de mail del footer, que antes se ocultaba a propósito en
`/info/` (el chat se encargaba del contacto), **se reactivó ahí** — es el
único lugar que da el mail ahora en esa página.

Es una primera pasada ("hagamos esto ahora y luego refinamos"): falta
definir el pool real de proyectos y pulir copy/detalles.

### Breadcrumb (mismo día): se probó con URL/texto por proyecto, se volvió a fijo

Se probó un breadcrumb "Home / Info / Brecha" que cambiaba al revelar un
proyecto (`history.pushState` a `/info/#slug` + el texto narrador
reemplazado por un comentario del proyecto). Diego decidió que por ahora la
galería sea **puramente visual** — se sacó todo eso el mismo día:

- El nav contextual de arriba-izquierda (`_includes/header.html`, antes un
  único link "/" en `/info/`) quedó como un breadcrumb **fijo**, sólo en
  esa página (`{% if page.layout == 'info' %}`): siempre **Home / Info**,
  nunca un tercer segmento. Separador `/` puesto por CSS
  (`header ul li + li::before { content: "/"; }`), no como texto en el
  HTML — en el resto del sitio el nav sigue con 1 solo `<li>`, esa regla
  nunca aplica ahí.
- `reveal()` en `startProjectGallery()` (`_includes/info-chat.html`) ya NO
  llama `showText(t(img.comment))` ni cambia la URL — el about extendido
  queda fijo en pantalla todo el tiempo, las ventanas de proyecto sólo se
  apilan visualmente encima.
- `GALLERY_IMAGES` conserva `slug`/`label`/`comment` sin usar por ahora
  (dormido, no borrado) — "más adelante vemos si le agregamos
  descripciones", palabras de Diego.
- Verificado con harness: `history.pushState` nunca se llama, el
  breadcrumb nunca gana un 3er `<li>`, y el texto de `#chat-log` se
  mantiene igual al about extendido durante toda la interacción con la
  galería.

### Retoques de diseño al breadcrumb (mismo día)

- "Info" (segmento actual) pasó de `<a>` a `<span aria-current="page">`: no
  tiene sentido que sea clickeable si ya estás ahí. "Home" pasó a ser
  `..` (notación de "directorio padre", más en línea con el tono
  minimalista/de sistemas del sitio) — queda **`.. / Info`**. Sigue siendo
  un `<a href="/">` real, sólo cambió el texto visible.

### Ventanas de proyecto cerrables + cola (mismo día, después)

Cada `.gallery-window` ahora tiene un botón `×` (`.gallery-window-close`,
arriba a la derecha del header) que la cierra. Cerrar NO descarta la
imagen: `startProjectGallery()` pasó de un cursor lineal (`idx` sobre
`GALLERY_IMAGES`) a una **cola** (`queue`, copia de `GALLERY_IMAGES`) —
cada reveal saca la primera (`queue.shift()`), y cerrar una ventana la
devuelve al FINAL (`queue.push()`). Con todo mostrado y nada cerrado la
cola queda vacía (un click más no hace nada, igual que antes); en cuanto
se cierra algo, un click siguiente la vuelve a mostrar — en orden FIFO si
se cierra más de una.

- El botón `×` es un `<button>` real: `isInteractive()` ya lo excluye del
  click-to-reveal (misma lista `a, button, input` de siempre, sin tocar
  nada ahí), y `$(win).draggable({ cancel: '.gallery-window-close' })` le
  pide explícitamente a jQuery UI que NO empiece un drag desde ese botón
  (antes se confiaba en el default de la librería para `<button>`; ahora
  es explícito y no depende de ese default).
- Verificado con harness: cerrar baja el conteo de ventanas, un click
  siguiente lo repone con la MISMA imagen, cerrar dos y volver a clickear
  las repone en el mismo orden en que se cerraron (cola, no pila), y un
  click real que hace bubbling desde el botón `×` hasta `document` no
  dispara además un reveal nuevo (confirma que `isInteractive` frena la
  propagación funcional antes de que importe el bubbling).

### Ampliar/achicar estilo lightbox (mismo día, después)

Cada `.gallery-window` ahora tiene un segundo botón en el header, del otro
lado del `×` (`.gallery-window-expand`, `left: 0` — el `×` está en
`right: 0`): un ícono SVG inline de corchetes en diagonal (mismo glyph que
usan reproductores/visores nativos para pantalla completa), que al
clickear centra y agranda esa ventana con transición, bloqueando y
difuminando todo lo demás.

- `expand()`/`collapse()` en `startProjectGallery()`
  (`_includes/info-chat.html`): el tamaño objetivo se calcula UNA vez,
  analíticamente (`scale = min(1, 0.9*innerWidth/naturalWidth,
  0.9*innerHeight/naturalHeight)` — nunca agranda más allá del tamaño
  natural de la imagen, respeta el más restrictivo entre 90vw/90vh
  preservando proporción), y se asigna de una sola vez para que la
  `transition` CSS (`left`/`top` en `.gallery-window`, `width`/`height` en
  su `img`) la anime sola, sin tocar el layout a mitad de camino.
- **Estado de origen guardado en el propio elemento** (`win._restoreState`:
  `left`/`top`/ancho/alto del `<img>` tal como estaban, no recalculados) —
  al achicar vuelve exactamente ahí, incluso si la ventana se había
  arrastrado antes de expandir.
- **Bloqueo + blur**: un `.gallery-backdrop` (`position:fixed; inset:0;
  backdrop-filter: blur(8px)`, con tinte de fondo como fallback) se inserta
  al expandir, con z-index entre las ventanas normales (`Z_BACKDROP=9000`)
  y la expandida (`Z_EXPANDED=9001`) — cubre todo el viewport, así que
  bloquea clicks sobre cualquier otra cosa sin tocar nada más del layout.
  Clickear el backdrop también achica (patrón estándar de modal/lightbox);
  su handler llama `stopPropagation()` — **sin eso, el click burbujea a
  `document` y dispara un `reveal()` de más** (se verificó con harness que
  simula bubbling real: el handler del target corre primero, y si llama
  `stopPropagation()`, el listener de `document` nunca se ejecuta).
- Tecla `Escape` también achica (listener agregado al expandir, sacado al
  achicar). Mientras está expandida se deshabilita el drag
  (`$(win).draggable('disable')`/`'enable'` al volver) y el `mousedown` de
  "traer al frente" no compite con `Z_EXPANDED`.
- **Cerrar (`×`) una ventana expandida** también saca el backdrop y el
  listener de `Escape` antes de `remove()` — si no, queda una capa de blur
  fantasma sin ninguna ventana que la controle.
- Verificado con harness (con `naturalWidth`/`naturalHeight`/
  `offsetHeight` simulados, ya que Node no decodifica imágenes): la
  matemática del tamaño/centrado da los valores esperados, expandir crea
  exactamente 1 backdrop y deshabilita el drag, clickear el backdrop
  restaura posición/tamaño/drag exactos y NO agrega una ventana de más
  (bubbling con `stopPropagation` probado explícitamente), y cerrar
  expandida no deja backdrops huérfanos.
- El harness viejo de breadcrumb (`breadcrumb-harness.js` en el
  scratchpad de la sesión) quedó obsoleto — testea `setBreadcrumb`/
  `history.pushState`, que se sacaron en la ronda anterior (ver "se probó
  con URL/texto por proyecto, se volvió a fijo" arriba). No es un bug,
  es un test de una funcionalidad que ya no existe a propósito.

### Tres retoques al lightbox (mismo día, después): sin delay, sin animación al aparecer, hover en anillo

**Bug real que introdujo la ronda anterior**: `.gallery-window` tenía
`transition: left .35s ease, top .35s ease` puesto directo en el CSS, sin
condicionarlo a `.expanded`. Eso afectaba TODO cambio de `left`/`top`, no
sólo el de expand/collapse: arrastrar una ventana (jQuery UI pisa
`left`/`top` en cada `mousemove`) quedaba con un delay animado en vez de
seguir al mouse 1:1, y el reposicionamiento de `pic.onload` al aparecer
(centrarla en el punto de click una vez se conoce el tamaño real de la
imagen) también se animaba, viéndose como que la ventana "se desliza" al
aparecer en vez de aparecer directo.

**Arreglo**: se sacó la `transition` del CSS de `.gallery-window`/
`.gallery-window img` por completo. Ahora vive **inline**, puesta y sacada
por JS sólo mientras dura expand()/collapse() (`animateOn()`/
`animateOffLater()`, `TRANSITION_MS = 350` en `_includes/info-chat.html`):
`animateOn()` setea `win.style.transition`/`pic.style.transition` justo
antes de cambiar los valores, y un `setTimeout(…, 350)` los limpia
(`= ''`) después. Cualquier otro cambio de `left`/`top`/tamaño (crear,
arrastrar) no tiene transition puesta en ese momento, así que es
instantáneo — sólo expand/collapse se animan.

**Hover de los 3 botones** (`×`, ampliar, achicar): antes rellenaba todo el
botón con `background: var(--color-primary)` e invertía el color del
ícono. Ahora el ícono NUNCA cambia de color — el hover es un anillo
circular (`::after`, 20px, `border: 2px solid transparent` → `border-color:
var(--color-primary)` en `:hover`, mismo ancho que el `stroke-width="2"` de
los SVG) que aparece alrededor sin tocar el color del glyph.

Verificado con harness: `win.style.transition` es `undefined` justo
después de crear la ventana (sin animación al aparecer), tiene el valor
puesto durante `expand()`, y vuelve a estar vacío después de que se cumple
el `setTimeout` simulado (350ms) — confirma que la ventana **para de** ir
animada apenas termina expand/collapse, así que un drag inmediatamente
después vuelve a ser instantáneo.

### Hover simplificado a opacidad + hint de "click" en el cursor (mismo día, después)

- El anillo circular del hover de los 3 botones (`::after`, recién agregado)
  se sacó por pedido de Diego: ahora `:hover` sólo baja la `opacity` a `.5`,
  sin ningún borde/fondo — el ícono se mantiene igual, sólo se atenúa.
- **Hint de onboarding**: el cursor ambiente de `/info/` (`.cursor-dot`,
  `_includes/footer.html`) arranca mostrando el texto **"click"** (mismo
  seguimiento del mouse con lag, sin la forma circular — `.cursor-dot.hint`
  en `_sass/styles.scss` le saca `border-radius`/`background` y le pone el
  texto) hasta que el visitante hace su primer click en cualquier lado; ahí
  vuelve a ser el círculo de siempre y **no vuelve a aparecer en esa
  sesión** (`sessionStorage.infoClicked`, mismo criterio "una vez por
  sesión" que ya usan `chatFrom`/`scriptPath`). En la home nunca se muestra
  (gateado por `document.body.classList.contains('layout-info')`, la misma
  clase que ya pone `_layouts/default.html`).
  - `.cursor-dot` pasó de centrarse con `margin: -7px` (asumía 14x14 fijo)
    a `transform: translate(-50%, -50%)`, que centra igual de bien el
    círculo que el texto de ancho variable del hint — sin este cambio el
    "click" quedaría descentrado.
  - Vive enteramente en `footer.html`, sin tocar `info-chat.html`: es un
    listener de `click` en `document` totalmente independiente del
    `reveal()` de la galería (ambos escuchan el mismo evento sin
    interferirse). Tuvo que ser así — `footer.html` se incluye DESPUÉS de
    `info-chat.html` en la página, así que el elemento `.cursor-dot` (creado
    por `footer.html`) todavía no existe en el momento en que corre el
    script de `info-chat.html`; coordinar ambos desde ahí no era viable.
- Verificado con harness (`DOMContentLoaded` simulado, `sessionStorage`
  stub): visitante frío en `/info/` arranca con `.hint` puesta y el texto
  "click"; tras un click cualquiera, se saca la clase, el texto queda
  vacío y `sessionStorage.infoClicked` pasa a `"1"`; una "recarga" con
  `infoClicked` ya seteado arranca directo sin el hint; en la home nunca
  se activa.

## Estado (histórico, pre-2026-07-28 — ver ESTADO ACTUAL arriba)

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

- 5 hubs: `work`, `art`, `me`, `project`, `portfolio` (+ `referrer` y `loop`,
  que nunca entran al ranking genérico). `portfolio` es un placeholder de un
  solo nodo (ver "Entrada a /info/" abajo). ~25 nodos, todos bilingües es/en.
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

## Entrada a `/info/`: about extendido + 3 caminos (2026-07-27)

Se simplificó la entrada al chat. Antes: saludo corto tipeado + hasta 4 chips
(`work`/`art`/`me`/`project`, o `referrer`+3 si venías de un sitio conocido).
Ahora:

- **Visitante frío** (sin referrer): en vez del saludo corto, se muestra de
  una (sin efecto de tipeo) el **about extendido** — el mismo texto que hoy
  está publicado en producción en `main:info.markdown` (bio estática
  pre-chat) — vía la nueva clave `about_extended` en `_data/chat/ui.yml`
  (es/en, párrafos separados por `\n\n`, NO es un array: acá un array
  significaría "elegir variante al azar", como en `say`). Estilo:
  `.chat-about` en `_sass/styles.scss`.
- **Visitante referido**: sin cambios en el saludo (sigue tipeando el `intro`
  contextual del nodo `referrer.*`, ej. "venís de Yaugurú…").
- En **ambos casos**, debajo va la misma fila fija de 4 chips
  (`entryChips()` en `_includes/info-chat.html`): `me` ("Tengo curiosidad por
  vos"), `portfolio` ("Quiero ver tus proyectos"), `project` ("Tengo un
  proyecto en mente") y `project.contact` ("Quiero tu contacto", agregado
  como camino directo de entrada además de ser el exit-chip habitual del
  resto del grafo). Ya no se ofrecen `work`/`art` como caminos de entrada de
  primer nivel — se llega a ellos por siblings/bridges normales una vez
  adentro de la conversación.
- Al final de la intro (about extendido o saludo de referrer) se agrega una
  pregunta de contexto (`UI.entry_prompt` en `ui.yml`, "¿Y vos, a qué venís?")
  que enmarca esos 4 chips — se concatena con `\n\n` a la intro, no es un
  turno aparte. Los labels de esos 4 nodos están escritos como RESPUESTA a
  esa pregunta (primera persona: "Tengo...", "Quiero..."), no como pedido:
  si se agregan más caminos de entrada más adelante, mantener ese mismo
  criterio para que seguido de la pregunta lea natural.
- El nodo `me` (root) es la segunda excepción a "máximo 2 frases": su `say`
  es ahora el recorrido profesional completo (publicidad → dirección de arte
  → estudio de sintetizadores/interfaces físicas → ActionScript/HTML/CSS →
  ANII 10 años → docencia FADU → trabajo internacional actual), mismo
  criterio que `about_extended`: es un camino de entrada, se trata como tal.
  Este texto cubre el "capítulo de instrumentos musicales" que "Enriquecer
  perfil.md" (abajo) tenía pendiente — falta llevarlo también a `perfil.md`
  para que el LLM libre lo sepa, no sólo el grafo de chips.
- `typeOut()` corre ahora ~4-6x más rápido (trozos de 3-6 caracteres cada
  8-15ms, antes 1-2 cada 15-30ms) — ritmo de streaming tipo ChatGPT/Claude,
  necesario para que estas respuestas largas no se hagan eternas.
- **El campo de texto libre (y el worker/LLM detrás) ya no está siempre
  disponible**: `wantsInput(node)` en `_includes/info-chat.html` decide si se
  muestra (`#chat-form { display: none }` si no) — sólo cuando el nodo es del
  hub `project` y NO es `project.contact` (ver abajo). En el resto de la
  navegación (about, `me`, `portfolio`, `work`, `art`, y el propio contacto)
  la conversación es sólo por chips, sin poder tipear. Si el visitante
  escribe texto libre y la respuesta no matchea un nodo que quiera input, se
  oculta de nuevo.
- **Loop de los caminos de entrada**: cualquiera de los 4
  (`ENTRY_NODE_IDS` en `_includes/info-chat.html`) puede cerrar su propio
  loop: después de su `say`, tipea una pregunta de contexto compartida
  (`UI.entry_loop_prompt`, "¿Algo más te interesa?") y reofrece
  `otherEntryChips(id)` = los otros 3 caminos de entrada que faltan (el
  elegido no se repite), filtrados por visitado igual que el resto del
  grafo. Por ahora sólo `me` y `project.contact` están en `ENTRY_LOOP_IDS`
  (los dos pedidos hasta ahora) — agregar `'portfolio'`/`'project'` ahí es
  la única línea que falta tocar si se pide lo mismo para esos dos. El
  input se mantiene oculto en toda esta secuencia (`wantsInput` excluye a
  `project.contact` a propósito: una vez dado el mail no hay nada más que
  tipear ahí; `me`/`portfolio` nunca lo mostraron).
- Nuevo hub **`portfolio`** (`_data/chat/nodes/portfolio.yml`): por ahora un
  único nodo placeholder ("estoy armando la selección…"). Pendiente: cuando
  Diego defina el pool real de 3-4 proyectos, agregarlos ahí reusando el
  texto ya verificado de `SPECIFIC_PROJECTS` en `assets/chat-patterns.js`
  (Brecha, ANII, ClassWallet, UNESCO, BID, Monitor Cannabis) en vez de
  redactar contenido nuevo.
- El chat libre (input de texto contra el worker) no se tocó: sigue
  disponible en todo momento, tal cual.
- **Inconsistencia conocida y aceptada por ahora**: el about extendido
  menciona clientes/premios que NO están en `perfil.md` ni en los guardrails
  (Bayer, M-Audio, Avid, Gillette, Davidoff, Playboy, DHL, Versace, Western
  Union, Inavi, Universidad Católica, Bienal de Madrid, 4ª Bienal de
  Tipografía). Si preguntan por alguno de esos en el chat libre, el guardrail
  va a responder "eso no lo tengo por acá" justo debajo de un párrafo que
  dice lo contrario. Se decidió no resolverlo en esta pasada — ver
  "Enriquecer perfil.md" abajo.
- Verificado con un harness ad-hoc (no en el repo): extrae el `<script>` del
  motor ya renderizado, stubea DOM/sessionStorage/setTimeout y corre 1000
  clicks aleatorios por escenario (frío/referido) confirmando que la fila de
  chips nunca queda vacía. Mismo enfoque que describe "Cómo verificar el
  grafo" más abajo.

## Modo "ver proyectos": cursor + ventanas arrastrables (2026-07-28)

Al elegir "Quiero ver tus proyectos" (`portfolio`), además de la respuesta de
siempre se activa `startProjectGallery()` en `_includes/info-chat.html` —
**misma mecánica que `assets/script.js`** (el detalle de proyecto, hoy oculto
del build, ver `_layouts/post.html`): cada click en un área vacía de la
página revela la siguiente imagen como una "ventanita" arrastrable
(`.gallery-window`, jQuery UI `.draggable()` — ya cargado site-wide vía
`head.html`, no hizo falta agregar nada), centrada en el punto de click, con
z-index creciente. Lo nuevo respecto a la mecánica vieja: el cursor nativo se
reemplaza por un círculo que sigue al mouse con "clic"/"click" adentro
(`.gallery-cursor`, mismo mousemove+offset que `.filtered` en
`footer.html`), y los clicks sobre controles del chat (chips, input, otras
ventanas) se ignoran (`isInteractive()`) para no competir con la conversación
que sigue corriendo en paralelo debajo. Al agotarse las imágenes, se
restaura el cursor normal y se quitan los listeners.

- **Placeholder de imágenes**: `GALLERY_IMAGES` en `info-chat.html` reusa 4
  tiles ya verificados (`brecha.gif`, `anii.jpg`, `monitor.gif`, `isp.jpg` en
  `/assets/blogimages/tiles/`) sólo para probar el mecanismo — reemplazar
  ahí cuando Diego defina el pool real de 3-4 proyectos (mismo pendiente que
  ya tenía `portfolio.yml`).
- No toca el flujo de chips/loop de `portfolio` (sigue con `after()` normal,
  no está en `ENTRY_LOOP_IDS`) — la galería corre independiente de eso.
- **Ajustes 2026-07-28**: una sola ventana en pantalla (cada click
  reemplaza la imagen en vez de apilar), draggable de punta a punta (sin
  `handle`), sin contador. Un click SIN arrastrar sobre la ventana también
  avanza la imagen (ya no se excluye `.gallery-window` de `isInteractive` —
  jQuery UI suprime el `click` nativo que sigue a un drag real, así que no
  hace falta distinguirlos a mano). Al agotarse las 4 imágenes, el siguiente
  click cierra la ventana y termina el modo (antes quedaba la última imagen
  para siempre).
- **Comentario por imagen + cierre con opciones generales (2026-07-28)**:
  cada entrada de `GALLERY_IMAGES` ahora tiene `comment: {es, en}` (texto
  verificado reusado de `SPECIFIC_PROJECTS`/el `_post` real de ISP) — al
  revelar/avanzar una imagen, se tipea como un turno más del chat
  (`addTurn`+`typeOut`+`pushHistory`, igual que cualquier respuesta). Al
  agotarse el pool, en vez de sólo cerrar la ventana, se llama
  `closeEntryLoop('portfolio')` (mismo helper compartido que usan `me` y
  `project.contact`): tipea "¿Algo más te interesa?" y reofrece los otros 3
  caminos de entrada. Mientras dura la galería la fila de chips queda vacía
  a propósito (`renderChips([])` al seleccionar `portfolio`, en vez del
  `after()` normal) — la interacción es con las imágenes, no con chips,
  hasta que se agotan.
  **Bug encontrado y corregido en el camino**: "Empecemos de nuevo" (loop
  `restart`) vacía `state.visited`, permitiendo volver a elegir "Quiero ver
  tus proyectos" — pero el guard `galleryStarted` (para no duplicar el
  listener si se clickea el chip dos veces rápido antes de que la fila se
  actualice) seguía en `true` de la primera vez, así que la segunda vez
  `startProjectGallery()` no hacía nada: la fila quedaba vacía para
  siempre, sin nada que disparara `closeEntryLoop`. Se arregló reseteando
  `galleryStarted = false` en la rama `restart` de `select()`. Lo detectó el
  harness de random-walk (barrió a `emptyRows=1` con pocos steps en vez de
  200) — moraleja: cualquier cambio de estado global (`galleryStarted`,
  `visited`, etc.) hay que revisarlo también contra el ciclo de restart, no
  sólo contra el flujo lineal normal.
- **El círculo del cursor ya NO lo maneja `startProjectGallery`**: se volvió
  ambiente, siempre presente (no gated por el chat) en `_includes/footer.html`
  — mini punto de 14px, sigue al mouse con lag vía `requestAnimationFrame` +
  lerp (`cur += (target - cur) * 0.15` por frame, no 1:1), sólo se crea si
  `page.layout` es `home` o `info` (`{% if %}` en el propio footer). Color
  por página vía clase en `<body>` (`class="layout-{{ page.layout }}"`,
  agregada en `_layouts/default.html`): **blanco en la home**, y en `/info/`
  **`var(--color-primary)`** — el mismo primario que ya eligió la sesión al
  azar (cabeza random, `assets/heads/*.js` vía `footer.html`); como es una
  custom property real seteada en `:root`, el punto la sigue solo, sin
  coordinación de timing con el head script. **No** oculta el cursor
  nativo — conviven los dos. `startProjectGallery()` en `info-chat.html`
  quedó sólo con el click-to-reveal de proyectos, sin crear ni destruir
  ningún cursor.
- Verificado con un harness ad-hoc (stub de `document` con
  addEventListener/removeEventListener reales + `classList` + `closest` +
  un `$` mínimo para `.draggable()` + un `requestAnimationFrame` manual para
  poder avanzar "frames" a mano y confirmar el lag del cursor): activa el
  modo, el cursor converge al target con lag, revela/avanza por click
  (incluso clickeando la ventana misma), ignora clicks sobre `.chat-tag`, y
  al 5to click (ya sin imágenes) cierra la ventana y el modo — todo sin
  afectar el random-walk de 1000 clicks del resto del grafo. Lo único NO
  verificable fuera de un navegador real: que jQuery UI efectivamente
  suprima el click posterior a un drag de verdad (es comportamiento interno
  de `ui.mouse.js`, no algo que este código controle).

## Experimento de UX: chat que se refresca en vez de acumular (2026-07-28)

A pedido de Diego, se prueba un cambio de comportamiento: en vez de un
historial que crece turno tras turno, el chat se **refresca en cada input
del visitante** — sólo queda visible el intercambio actual (tu pregunta +
la respuesta), no todo lo anterior.

- `clearLog()` en `_includes/info-chat.html`: borra todos los `.chat-turn`/
  `.chat-typing` de `#chat-log`, pero nunca `form`/`tagsRow`/`srEl` (son
  parte fija del layout — la fila de tags, el input, el live-region — no
  del historial).
- Se llama al principio de: `select()` (clickear un chip), el submit de
  texto libre, y `reveal()` en `startProjectGallery` (cada click de la
  galería, incluido el que la cierra). Alcance confirmado con Diego: el
  refresh aplica tanto a chips como a texto libre, y también a cada click
  de la galería de proyectos (no se acumulan los comentarios de imágenes
  anteriores — sólo se ve el proyecto actual).
- Dentro de un mismo `select()`, lo que se agrega DESPUÉS de la primera
  llamada a `clearLog()` (la respuesta del nodo + el prompt de
  `closeEntryLoop`, si aplica) se sigue apilando sobre esa misma pantalla
  limpia — es un solo intercambio con 2-3 turnos (vos / Diego / pregunta de
  seguimiento), no una regresión al comportamiento viejo.
- Verificado con harness: turnCount se mantiene en 3 (no crece) a través de
  múltiples selecciones sucesivas, y `form`/`tagsRow`/`srEl` sobreviven cada
  `clearLog()` (probado anidándolos de verdad dentro de un `chat-log` stub,
  igual que en el HTML real). Random-walk de 1000 clicks y el harness de
  galería siguen pasando sin cambios de comportamiento funcional.

**Segunda vuelta, mismo día**: dado que ya no hay historial visible, Diego
pidió que los chips SIEMPRE muestren las mismas 4 opciones principales del
primer prompt (no la navegación en profundidad por siblings/bridges, que
dependía de poder ver el hilo anterior para tener sentido).

- `after()` en `select()` ahora llama `closeEntryLoop(node.id)` para
  CUALQUIER nodo (antes sólo para los que estaban en `ENTRY_LOOP_IDS`, que
  se eliminó por quedar redundante) — cada respuesta, sin excepción, tipea
  el prompt de contexto y reofrece las opciones principales que faltan.
  `chipsForFreeText()` hace lo mismo: matchee o no un nodo específico vía
  `matchNodeId`, siempre devuelve `entryChips()` en vez de `nextChips(node)`/
  `moreChips()`.
- El motor de ranking (`score`/`best`/`candidates`/`pickSibling`/
  `pickBridge`/`pickOtherHub`/`pickExit`/`nextChips`/`moreChips`,
  `POOL_HUBS`/`poolable`) queda **dormido, no borrado** — nadie lo llama
  hoy, pero se deja documentado y entero por si este experimento se
  revierte. `HUB_AUDIENCE` sigue activo (además de alimentar ese motor
  dormido, define `state.audience` que se manda como analytics en
  `tag_select`).
- Esto vuelve irrelevantes (inalcanzables por chip) a los nodos de
  profundidad de `work`/`art`/`me`/`project` (`work.how`, `art.gen`,
  `me.teach`, `project.kind`, etc.) — siguen existiendo en los YAML (y
  siguen sirviendo de referencia para `matchNodeId`/guardrails), pero ya no
  se ofrecen como chips.
- Confirmado con harness: after entryChips() (4 chips) → clickear cada una
  de `me`/`project`/`project.contact` en secuencia → en cada paso, TODOS los
  chips resultantes son un subconjunto de las 4 opciones principales, nunca
  un nodo de profundidad. `chips_offered` de la galería (`portfolio`) al
  agotarse también da sólo opciones principales. Random-walk de 1000 clicks
  sigue sin filas vacías.

## Pool real de proyectos + soporte de video (2026-07-29)

Diego trajo 22 archivos a `/assets/blogimages/tiles/` (12 `.mp4`, resto
`.webp/.png/.jpg`) y `GALLERY_IMAGES` en `_includes/info-chat.html` pasó de
los 4 placeholders (Brecha, ANII, Monitor Cannabis, ISP) a esos 22 —
**ANII e ISP se sacaron** (pidió Diego, no tenían reemplazo nuevo); Brecha
y Monitor Cannabis SÍ tienen reemplazo (`brecha-1.mp4`, `monitor-3.mp4`) y
conservan el `comment` ya verificado de antes. El resto (`atlas`, `bus`,
`cafe`, `criolla`, `escobar`, `goos`, `hostburo`, `jacobin`, `leac`, `melu`,
`pop`, `prisma`, `reboot`, `sbdg`, `seri`, `shibuya`) no tiene `comment`
todavía (es dato muerto hoy, no se usa en pantalla) y su `alt` es un mejor
esfuerzo capitalizado a partir del nombre de archivo — **revisar mayúsculas
si alguno es sigla** (ej. `sbdg`, `leac`). `criolla` (2 archivos) y `seri`
(3 archivos) se muestran como ventanas separadas, una por archivo — no hay
agrupación por proyecto en la cola.

**El código de `reveal()` sólo creaba `<img>`** — se agregó una rama para
`.mp4`: `isVideo(src)` detecta la extensión, y si es video se crea un
`<video autoplay loop muted playsInline>` en vez de `<img>` (mismo
comportamiento "en loop, sin sonido" que ya tenían los `.gif`). El
`recenter` (centrar la ventana en el punto de click una vez se conoce el
tamaño real) usa `'loadeddata'` para video en vez de `onload` de `<img>`.
`expand()`/`collapse()` (el lightbox) usaban `pic.naturalWidth/Height`
directo — se generalizó a `mediaSize(pic)`, que devuelve
`videoWidth/videoHeight` para `<video>` y `naturalWidth/naturalHeight` para
`<img>`. CSS: `.gallery-window img` y `.gallery-window.expanded img` pasaron
a incluir también `video` en el selector (mismos caps de tamaño).

Verificado con un harness ad-hoc (Node, sin navegador — mismo patrón de
siempre): extrae el `<script>` real de `/info/` (cuidado, la página tiene
varios `<script>` — hay que filtrar por contenido, no tomar "el último"; el
de `footer.html` también menciona `startProjectGallery` en un comentario),
stubea DOM/`$`/`sessionStorage`, dispara 22 clicks y confirma que las 22
ventanas se crean en el orden de `GALLERY_IMAGES`, que cada `.mp4` resulta
en un `<video>` (13 video / 9 img, cuenta real de la mezcla).

**Ajuste el mismo día**: Diego no quería los 13 `.mp4` reproduciendo todos
a la vez apenas se revelan. Se sacó el `autoplay`: ahora un `.mp4` arranca
quieto, mostrando sólo su portada estática (`poster`, atributo nativo de
`<video>`) y con `preload="none"` (no descarga el archivo hasta que hace
falta) — sólo reproduce (`pic.play()`) al ampliar (`expand()`) y se pausa
(`pic.pause()`) al achicar (`collapse()`), mismo botón/flujo que ya existía
para el lightbox. Como con `preload="none"` el navegador no conoce
`videoWidth`/`videoHeight` hasta reproducir, el tamaño natural para
centrar la ventana al revelar y para el cálculo de `expand()` sale de la
portada (un `new Image()` interno mide `naturalWidth`/`naturalHeight` del
poster, no del video — misma proporción, se guarda en `pic._naturalSize`,
lee `mediaSize()`). Diego pasó los 13 posters en el momento
(`{nombre-del-video}-poster.jpg` en `assets/blogimages/tiles/`, mismo
basename que el `.mp4` — convención que se adivinó y coincidió), ya
conectados en `GALLERY_IMAGES` vía el nuevo campo `poster`.

Sin poster (no debería pasar ya que los 13 están completos, pero por si se
agrega un `.mp4` nuevo sin portada): la ventana se revela sin centrar en el
punto de click (`coverProbe.src` nunca se asigna, `recenter()` no se
llama) y sin imagen visible hasta ampliar — degradado, no roto, pero hay
que acordarse de pasar el poster con cada `.mp4` nuevo de acá en más.

Verificado con un segundo harness (mismo patrón, agregando `play()`/
`pause()`/`Image()` al stub): los 3 primeros `.mp4` revelados arrancan con
`preload=none`, `autoplay=false`, sin reproducir; clickear "Ampliar" en uno
dispara `play()` (`playCount` pasa a 1); clickear "Achicar" dispara
`pause()` (`pauseCount` pasa a 1). No verificable fuera de un navegador
real: que el navegador efectivamente respete `preload="none"` sin
descargar nada hasta el `play()` (es comportamiento del motor de video, no
algo que este código controle), y que la portada se vea nítida como
`poster` nativo del `<video>` (no hay forma de renderizar/decodificar el
JPG en este harness Node).

**Dos ajustes más, mismo día**: Diego probó y pidió dos cosas.

1. Al achicar, el video quedaba congelado en el último frame reproducido
   en vez de volver a la portada. `collapse()` ahora llama `pic.load()`
   además de `pic.pause()` para los `<video>` — `load()` reinicia el
   elemento a su estado sin datos (mismo efecto que tenía antes de
   reproducirse por primera vez: `preload="none"` vuelve a aplicar, así
   que la próxima vez que se amplíe descarga desde cero otra vez).
2. Clickear en cualquier lado mientras una ventana está ampliada seguía
   apilando ventanas nuevas debajo del backdrop — el backdrop bloquea
   clicks sobre el resto de la pantalla (con `stopPropagation`), pero NO
   los clicks sobre la propia ventana ampliada (imagen/header), que no
   tienen motivo propio para frenar el bubbling y terminaban activando
   `reveal()` en `document`. Se agregó `activeExpanded` (variable en el
   closure de `startProjectGallery`): `expand()` la setea, `collapse()` la
   limpia, y `reveal()` corta al principio si hay algo ampliado. Cerrar
   (`×`) una ventana que está ampliada también tiene que limpiarla —si no,
   la galería queda bloqueada para siempre después de ese cierre (no hay
   otro `collapse()` que la reponga).
   - **Ojo, esto NO era necesario para los botones `×`/Ampliar/Achicar en
     sí** (a pedido de Diego: "lo mismo debería suceder al cerrar o
     ampliar o achicar, al clickear esos botones no deberían cargarse
     imágenes") — eso YA estaba cubierto de antes por `isInteractive()`
     (`target.closest('a, button, input')`), porque los 3 son `<button>`
     reales. Se armó un harness aparte que simula bubbling de verdad (un
     solo evento, mismo `ev.target`, corren primero los listeners del
     botón y después los de `document` — los harnesses anteriores de esta
     sesión llamaban `.dispatch('click')` directo sobre el botón, sin
     pasar por ese camino) para confirmarlo explícitamente: clickear
     `×`/Ampliar/Achicar, tanto en chico como ampliada, nunca crea una
     ventana de más. Cero cambios de código hicieron falta ahí — sólo la
     verificación.
   - Verificado también que `pic.load()` se llama exactamente 1 vez por
     `collapse()`, y que cerrar una ampliada (en vez de achicarla) deja
     `reveal()` funcionando de nuevo en el click siguiente.

**Curación del pool, mismo día**: Diego sacó 8 de los 22 proyectos —
`cafe`, `escobar`, `jacobin`, `leac`, `melu`, `prisma` (completos), `seri3`
(sólo esa imagen; `seri1`/`seri2` quedan) y `criolla-2` (sólo esa imagen;
`criolla-1.mp4` queda). `GALLERY_IMAGES` en `_includes/info-chat.html`
queda en **14 entradas**. Los archivos (`.mp4`/`.webp`/`.jpg` y los
`-poster.jpg` correspondientes) NO se borraron del repo — mismo criterio
que los placeholders viejos (`anii.jpg`/`isp.jpg`/etc., ver más arriba):
quedan sin uso en `assets/blogimages/tiles/` por si se reincorporan.

## Descripciones de proyecto en el lightbox (2026-07-29)

Diego pidió mostrar texto por proyecto, pero acotado: **sólo con la
ventana ampliada**, no en la vista chica apilada (la galería sigue siendo
"puramente visual" en su estado normal — ver la decisión del mismo nombre
más arriba, que sigue vigente para el estado chico). Pidió reusar las
descripciones ya escritas para estos mismos proyectos en otro repo suyo,
`/Users/diego/www/cataldo-pages` (portfolio Jekyll separado), en vez de
redactar de cero.

Ese repo tiene copy de los 12 proyectos (front-matter `description` de
`_posts/*.md`, o `_data/slideshow.yml` cuando no hay post) pero **todo en
inglés, en 3ª persona** (tono de portfolio profesional). El `comment` que
ya existía en este sitio para 2 proyectos (Brecha, Monitor Cannabis, de
antes de este pivote) está en **1ª persona, bilingüe es/en** — mismo
registro que el resto del sitio (`about_extended`, la bio de `me.yml`).
Decisiones de Diego: adaptar los 10 comments que faltaban a esa voz ya
establecida (no traducir literal), y para HostBüro usar la versión de
`slideshow.yml` ("empresa de hosting") — el post de cataldo-pages tenía
una descripción calcada por error del proyecto vecino, Monitor Cannabis
("plataforma de política de cannabis").

De paso, cataldo-pages dio los nombres reales de los proyectos que hasta
ahora tenían `alt`/`label`/`slug` adivinados por nombre de archivo — se
corrigieron: `bus` → **Búsqueda**, `criolla` → **Criolla Films**, `goos` →
**UNESCO GOOS**, `hostburo` → **HostBüro**, `sbdg` → **SBDG**, `seri` →
**Serigraphic Work**, `shibuya` → **Neo Shibuya TV** (`atlas`, `pop`,
`reboot`, `monitor-cannabis`, `brecha` ya estaban bien). Con esto se cierra
el pendiente de "confirmar alt/label" que estaba en Próximos Pasos.

**Implementación** (`_includes/info-chat.html`): las 14 entradas de
`GALLERY_IMAGES` tienen `comment` ahora (antes sólo 2). En `reveal()`, si
`img.comment` existe, se crea un `<div class="gallery-window-caption">`
con `t(img.comment)` (mismo helper de idioma que ya usa el narrador de
arriba) y se apila como tercer hijo de la ventana, después de la
imagen/video. El texto se fija una sola vez al crear la ventana —
`expand()`/`collapse()` no se tocaron: la visibilidad del caption es puro
CSS, atado a la misma clase `.expanded` que esas dos funciones ya
togglean (`.gallery-window-caption { display: none }` /
`.gallery-window.expanded .gallery-window-caption { display: block }` en
`_sass/styles.scss`). Sin `width` propio — hereda el ancho resuelto de la
ventana igual que ya hace `.gallery-window-header`, que tampoco lo
declara.

**Simplificación consciente**: el cálculo de centrado de `expand()`
(`targetTop`) sigue basándose sólo en alto de imagen + header, sin sumar
el alto del caption — con un caption corto (1 oración) el corrimiento es
mínimo (~20-40px hacia abajo del centro real), mismo trade-off que usan la
mayoría de lightboxes con caption (la imagen se centra, el caption cuelga
debajo). No se tocó esa fórmula para no encadenar un problema de timing
nuevo (medir la altura de un elemento recién hecho visible antes de que la
imagen tenga su tamaño final).

Verificado con un harness ad-hoc (Node): las 14 ventanas generan caption
con el texto de `t(img.comment)`, confirmado en es y en. **Bug del
harness, no del sitio**, encontrado y corregido en el camino: Node 23+
trae su propio global `navigator` de sólo lectura (compat con APIs web,
`navigator.language` fijo en `"en-US"`) que pisaba en silencio el stub
(`global.navigator = {...}` no hacía nada, asignación a un accessor sin
setter) — las dos corridas (es/en) daban el mismo texto en inglés hasta
que se cambió a `Object.defineProperty(global, 'navigator', {value:...,
configurable:true})`. No afecta el sitio real (corre en navegadores de
verdad, con `navigator.language` normal) — sólo a este harness en
particular, ninguno de los anteriores en esta sesión necesitaba
`navigator` con un valor específico.

**Ajuste el mismo día**: Diego probó y pidió dos retoques al lightbox.

1. **Ventanas ampliadas un poco más chicas**: el cap de `expand()` pasó de
   90% del viewport a un nuevo `EXPAND_CAP = 0.75` (75%), mismo uso en los
   dos ejes (ancho/alto) — una sola constante en vez de los dos `0.9`
   sueltos que había antes.
2. **El caption pasa a colgar AFUERA de la ventana**: antes era un tercer
   hijo en flujo normal, con borde superior y fondo heredado de
   `.gallery-window`. Ahora `.gallery-window.expanded .gallery-window-caption`
   usa `position: absolute; top: 100%` — sale del flujo, se ve debajo del
   borde inferior de la ventana, sin su fondo/borde (el fondo de
   `.gallery-window` sólo pinta su propia caja, que ya no incluye al
   caption). `.gallery-window` ya era `position: fixed`, así que sirve como
   containing block sin agregar `position: relative` aparte.
   - **Efecto colateral bueno, no buscado**: la "simplificación consciente"
     de la ronda anterior (el centrado de `expand()` no contaba la altura
     del caption) deja de ser una simplificación — ahora es simplemente
     correcto, porque al estar fuera del flujo el caption YA NO aporta
     altura a la ventana bajo ningún escenario. `targetTop` (imagen +
     header) es exacto de nuevo.
   - Bajar el cap a 75% de paso deja más margen abajo para que el caption
     (que ahora puede extenderse por debajo del borde de la ventana) no
     quede pegado al piso del viewport.

## Próximos pasos (post-2026-07-29, sobre el sistema NUEVO)

1. **Decidir qué hacer con `_data/chat/nodes/{work,art,me,project,portfolio,loop}.yml`**
   (contenido del chat viejo, hoy sin uso: bio larga en `me.yml`, respuestas
   de `project.yml`, etc.) — reciclar en el nuevo sistema o borrar.
2. **Decidir qué hacer con `worker/worker.js` y `assets/chat-patterns.js`**:
   ya no los llama nadie desde el cliente. ¿Se dejan deployados/en el repo
   por si se retoma el chat, o se dan de baja?
3. Pulir copy/detalles del texto introductorio y de los comentarios por
   proyecto (esta pasada fue explícitamente "la cáscara, después
   refinamos").
4. Cuando esté: mergear `feature/info-gallery` (ex `feature/synth-chat`,
   renombrada el 2026-07-29 tras sacar el chat agéntico) → `main` (worker
   excluido del
   build si sigue existiendo, `perfil.md` ya servido igual — sigue siendo
   útil independientemente del chat, es el `/perfil.md` público).

## Cómo verificar (sistema nuevo)

- Dev local: `bundle exec jekyll serve --port 4000` → http://localhost:4000/info/
- Harness ad-hoc (no en el repo): extrae los `<script>` de la página
  renderizada (JSON del grafo + el engine de `info-chat.html`), stubbea
  `document`/`sessionStorage`/`setTimeout`/un `$` mínimo para `.draggable()`,
  y simula clicks vía `document._dispatch('click', {clientX,clientY,target})`
  — confirmar que cada click apila una `.gallery-window` nueva (no reemplaza
  la anterior), que el texto narrador cambia al comentario del proyecto
  revelado, que clicks sobre `<a>`/`<button>`/`<input>` no apilan nada, y que
  clickear de más (pasado el largo de `GALLERY_IMAGES`) no rompe nada.
- Probar también `/?from=yauguru` (o bardanca/texticulos/alter) y después
  `/info/`: debe verse el saludo contextual del referrer en vez del about
  extendido, con la galería funcionando igual.
- Confirmar que el link de mail aparece en el footer de `/info/` (antes se
  ocultaba ahí a propósito).

## Limitación conocida (histórica, del sistema viejo)

El modelo 3B alucinaba en preguntas abiertas ("contame de tus proyectos") —
por eso existían los guardrails determinísticos en `assets/chat-patterns.js`
y `worker/worker.js`. Ya no aplica directamente: el sistema nuevo no llama al
worker/LLM desde `/info/`, así que este riesgo no está expuesto ahí por
ahora. Queda como nota si se retoma el chat en el futuro.
