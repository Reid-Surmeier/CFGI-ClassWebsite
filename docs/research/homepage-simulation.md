# Homepage simulation — research

Research for a later `/wayfinder` on putting an Ian Cheng-style live simulation on the CFGI class homepage, with a cast made from Reid's 3D models and finished in the reidsurmeierfileserver.com room-sprite look.

- Date: 2026-11-03. Read-only research: nothing was built, rendered or generated. Spend: $0.
- Local paths are on Reid's PC. `build/site-pages` paths are read with `git -C ~/orca/projects/are.na-MAP show build/site-pages:<path>`. `otani v0.1.0` paths are read with `git -C ~/otani-clay-room show build/v0.1.0:<path>`.
- "Verified" means I read the file, ran the command or fetched the page. "Inferred" is marked.

## The five findings that matter most

1. **The fileserver site already runs the thing this needs, in about 10 KB of plain JS.** `site/room/room.js` + `site/room/a/renderer.js` draw the bathroom GIF room on a 400×300 canvas, sort sprites by foot depth and walk the horned character along BFS paths to random targets, forever (`room.js:28-99`, `renderer.js:49-60`). The live copies on reidsurmeierfileserver.com have the same SHA-256 as `build/site-pages` (checked 2026-11-03). Several agents with drives on top of that loop is a small step. A Godot build would add a ~9.6 MiB gzip engine for no new ability (section 9).
2. **None of the cast is rigged or animated.** The 7 GLB props have 10–256 triangles, no skins and no animations; `props_Bottle.glb` has no material and is a 10-triangle placeholder. The 36 Otani figures are static Trellis/Tripo meshes of 7,027–260,463 vertices with render-only clay materials (section 4). Walking frames cannot come from a rig. They have to be drawn (Muse), spun (Flora Seedance) or faked by moving one still.
3. **One Muse call costs $0.01.** That is what 356 of 358 logged objects-room runs recorded, and OpenRouter lists `meta/muse-image` at $0.0000023952 per image-output token. One still per actor for the whole usable cast (6 props + 36 figures) is **42 calls = $0.42**. Even 4-facing walk cycles for 12 movers stay under $5. Only "every actor, 8 directions, walk cycle" goes over (section 7).
4. **Hosting only matters if the runtime is Godot with threads, and Reid's builds don't use threads.** Every Reid Godot web preset sets `variant/thread_support=false` (`~/risd-godot/export_presets.cfg:15`, `prototypes/volume-slider/export_presets.cfg:13`). Without threads no COOP/COEP headers are needed, so the current GitHub Pages site (which sends neither header, checked with `curl -I`) works for every option (section 3).
5. **The homepage today is only the top bar, and the capsule navigation swaps out `main.page`.** A simulation must start from `window.initializeClassPage` (`java.js:2`) and stop on its abort signal, or sit outside `main.page`. A `<script>` inside the new page's markup never runs after a capsule swap (`transition.js:74-103`, section 2).

---

## 1. Ian Cheng's simulations

**How the sources were read.** iancheng.com is a JavaScript single-page app, so a plain fetch returns an empty page. Its text was read from the site's own bundles (`https://iancheng.com/js/app.8acda771.js` and route chunks `emissaries.155b6397.js`, `bob.3da4d52b.js`, `lab.27d08319.js`, `early-works.9543d9a4.js`, `mvs.f60160a2.js`). Its images and captions came from its own Are.na-backed proxy, `POST https://iancheng.com/api/channel {"id":"<slug>"}`. Everything quoted from iancheng.com is Cheng's own published text.

### The works

| Work | Date | What it is (his words where quoted) | Source |
|---|---|---|---|
| Early simulations: Entropy Wrangler, Thousand Islands Thousand Laws, Baby ft. Bali / Ikaria, Droning like an Ur, Something Thinking of You | 2013–2015 | "Since 2012, I've created a series of simulations that explore an agent's capacity to deal with an ever-changing environment." | https://iancheng.com, https://iancheng.com/early-works |
| Emissary in the Squat of Gods (EITSOG) | 2015 | "live simulation": "an ancient community living with the threat of a volcanic eruption" | https://iancheng.com/emissaries |
| Emissary Forks At Perfection (EFAP) | 2015–2016 | "live simulation": a Shiba Inu emissary guided by an AI, with "a 21st century human celebrity" | https://iancheng.com/emissaries |
| Emissary Sunsets the Self (ESTS) | 2017 | "live simulation": MotherAI, the AI Puddle emissary and the Oomen | https://iancheng.com/emissaries; 2017 Park Guide |
| Emissaries at MoMA PS1 | 2017 | the trilogy as "10-foot-tall projections", also streamed on Twitch "in unique versions that exist online only" | https://www.pilarcorrias.com/exhibitions/177-ian-cheng-emissaries/ |
| *Emissaries Guide To Worlding* (book) | 2018 | "Published by Serpentine Galleries + Koenig Books", ISBN 978-1-908617-50-7 | https://iancheng.com/emissaries |
| BOB (Bag of Beliefs) | 2018–2019 | "artificial lifeform"; Serpentine 6 March–22 April 2018 | https://iancheng.com/bob, https://www.serpentinegalleries.org/whats-on/ian-cheng-bob/ |
| Life After BOB: The Chalice Study | 2021–2022 | "a 50min anime movie built in the Unity game engine", "presented live in real-time" with a "WORLDWATCHING mode": a real-time film, not an open simulation | https://iancheng.com/lab |
| 3FACE | 2022 | NFT "energy creature" that "adapts to its owner by reading the owner's wallet" | https://pilarcorrias.com/news/37-ian-cheng-debuts-3face-an-innovative-nft-project |
| Thousand Lives | 2023 | "a real-time simulation based on the daily life of Thousand, a pet tortoise character" | https://www.mataderomadrid.org/en/schedule/ian-cheng-thousand-lives |
| Shrine Oberon (newest) | 2026– | "simulation, infinite duration": a permanent commission at Oberon (New Museum restaurant), where the shrinekeeper SQ "learns to recognize regular patrons" | iancheng.com proxy, channels `2026-shrine-oberon`, `shrine-oberon-screenshots` |

### How they are made, and why they are simulations rather than animations

- **Engine: Unity.** "I had to do it in the Unity game engine, which is how I made all my previous work" (Cheng, interview, https://somethingcurated.com/2023/02/22/interview-ian-cheng-on-new-ways-of-filmmaking-the-world-beyond-the-narrative/). The BOB credits list a Unity Director and Unity Developer (https://iancheng.com/bob). Shrine Oberon credits "Unity Dev Ben Vance".
- **Agents with drives, no author steering.** Serpentine describes "virtual ecosystems of infinite duration, populated with agents who are programmed with behavioural drives but left to self-evolve without authorial intent, following the unforgiving causality found in nature". Also "multiple models of artificial intelligence sutured together" (https://www.serpentinegalleries.org/whats-on/ian-cheng-bob/). BOB is "a congress of motivating 'demons'": "an eater demon forages for food, a flight demon evades perceived threats". It adds an inductive belief engine based on Richard Evans's "Learning Explanatory Rules from Noisy Data" (https://iancheng.com/bob, https://iancheng.com/minimumviablesentience). **No primary source found says "behaviour trees"**, so this doc does not claim it.
- **"A video game that plays itself."** This is Cheng's own phrase. It appears in the 2017 Emissaries Park Guide, "WHAT IS A SIMULATION?", item 1: "It is an imitation of reality's complexity. It is a model of a system. It is a rehearsal run before the big event. It is a video game that plays itself." (scan in iancheng.com channel `emissaries-overview`, block 2764118). It is restated by Serpentine ("'habitat for stories' or 'video game that plays itself'") and Pilar Corrias (MoMA PS1 page above).
- **Simulation versus animation, in his words:**
  - "A simulation is that which doesn't stop when the stories go away. Stories are responsible to our human desire for resolution, but a simulation is responsible only to its own laws and initializing conditions." (Park Guide, item 2.)
  - "Stories shape an agent, an agent shapes the world, the world shapes back. I call this narrative agent the Emissary." (Park Guide, item 6.)
  - "It is playing this game in public and not letting it end when the game gets good." (Serpentine page.)
  - "It never repeats itself … So long as you have electricity plugged in, this piece will continue to run and mutate". And: "it is impossible to animate every creature … Instead I have to develop algorithms that themselves can determine how the characters move" (secondary, with quotes: https://alumni.berkeley.edu/california-magazine/online/programming-art-ian-chengs-emissary-museum-modern-art).
- **Worlding.** The book title, plus the home-page link to http://worldto.live (no text could be extracted there).

**What that means for this homepage (inferred):** to count as a simulation rather than a loop, it needs four things. Agents choose what to do from internal drives. The world has rules, not a timeline. It never ends or repeats (seeded randomness and state that drifts). The viewer sees a different moment every visit. A walking GIF is an animation; N agents with drives picking targets is a small simulation.

### Which work the reference screenshot is: high confidence (~95 %)

The image is the **Emissaries character line-up**, `emissaries_characters_fauna.jpg`, captioned "Emissaries, character line up. 2017." (iancheng.com channel `emissaries-overview`, block 2450024). It was downloaded and compared by eye. It shows low-poly, flat-shaded characters on plain white ground: the orange Shiba on a yellow leash, a gaunt skeletal figure in the leash, bald children in headbands, plants and tall grass, a pile of bottles, fruit, cups, phone and boxes, and grey branching creatures.

It is **a cast line-up across all three works, not a frame from one simulation**. The 2017 Park Guide prints the same line-up as "Guide to the Narrative Agents and Wildlife" and labels it:
- **EITSOG:** The Shaman, Snake Boy, Father Still With Us, Young Ancient [Emissary], Echoing Owl.
- **EFAP:** Celebrity (the skeletal figure), AI, Shiba [Emissary]. "Through a golden leash, AI whispers the game to Shiba."
- **ESTS:** Oomen (the headband children), Oomen Rancher, AI Puddle [Emissary], Droned Wormleaf, Wormleaf.

All three in-simulation worlds are landscapes (volcano, crater lake, atoll). **White ground appears only in the line-up and character sheets.** So Reid's reference is the *cast sheet* look, which fits a homepage on white paper.

---

## 2. The current CFGI site

**Files** (worktree at `a731d55`, origin/main): `index.html`, `student.html`, `projects.html`, `info.html`, `java.js` (15.7 KB), `work.js` (12.5 KB), `transition.js` (5.9 KB), `styles.css` (10.9 KB), and two capsule animations, `capsule-transition-navigation.webp` (7.4 MB) and `capsule-transition-phone.webp` (6.7 MB). No build step, no dependencies.

**Homepage.** `index.html:11-20` is one `<main class="page page--info">` holding only the top bar (course code `ctc-2156-01` and links to Students, Projects, Info). Below the bar the page is white and empty: that is where the simulation goes. All three scripts load on every page (`index.html:21-23`).

**Layout.** One Figma unit is `--u: calc(100vw / 1728)` (`styles.css:5`). At `max-width: 800px` the unit becomes `100vw / 900` and the top bar wraps (`styles.css:320-341`). White paper `#fff`, black ink, Schibsted Grotesk (`styles.css:4-10`).

**Capsule transitions** (Noah Cha, `transition.js`):
- On hover/focus of a top-bar link it preloads one animated WebP: desktop 1920×1080 or phone 1080×1920, chosen by `(max-width: 800px)` (`transition.js:5-10`, `:44-52`).
- On click it fetches the next page, plays the WebP as a fixed overlay at `z-index: 9999` (`styles.css:343-349`), fades the old `main.page` out over 350 ms, then **removes `main.page` and imports the new page's `main.page` with `importNode`** (`transition.js:94-97`). It then calls `window.initializeClassPage()` (`transition.js:103`) and fades in over 700 ms.
- Back/Forward does a full reload (`transition.js:126`). Reduced motion and `file:` skip the capsule (`transition.js:46`, `:63`).

**What this means for a simulation (inferred from the code above):**
- Scripts inside imported markup do not execute, so mounting must happen in `initializeClassPage` (`java.js:2-5`), which already aborts the previous page's listeners via `window.classPageListeners` (`java.js:3-5`, `:426`). The sim's `destroy()` should hang off that signal, the same way the fileserver room exposes `destroy()` (`room.js:166-171`).
- Leaving the homepage removes the canvas mid-transition. Coming back mounts a new one. If the world should look continuous, its state (actor positions, seed, clock) has to be kept in `sessionStorage` or a module-level variable and restored.
- The capsule overlay covers everything for about a second. Pausing the sim during `html.capsule-active` costs nothing.
- Phone layout uses the same breakpoint the capsule uses (800 px), so a phone variant of the sim can key off `matchMedia('(max-width: 800px)')`, like `transition.js:5`.

**Who deploys.** The live site is noahcha0907's GitHub Pages: `gh api repos/noahcha0907/CFGI-ClassWebsite/pages` returns `build_type: legacy`, source `main` `/`, URL `https://noahcha0907.github.io/CFGI-ClassWebsite/`. Reid's repo `Reid-Surmeier/CFGI-ClassWebsite` is a fork (`parent: noahcha0907/CFGI-ClassWebsite`) and has no Pages site (API 404). Every commit on main since 2026-10-28 is by classmates (Noah Cha, clee30, juliicory, AlishaZhou, MiniRunRun). Upstream changes arrive as merged PRs on noahcha0907's repo (`git log`, a731d55 "Merge pull request #4 from noahcha0907/bugFix"). Reid's token has `push: true` on noahcha0907's repo (`gh api repos/noahcha0907/CFGI-ClassWebsite --jq .permissions`). So the route to the live site is a PR from Reid's fork to noahcha0907's `main`, or a direct push there. That is a class-etiquette decision, not a technical one.

**Response headers today** (`curl -sI https://noahcha0907.github.io/CFGI-ClassWebsite/index.html`, 2026-11-03): `server: GitHub.com`, `access-control-allow-origin: *`, `cache-control: max-age=600`. There is no `cross-origin-opener-policy` and no `cross-origin-embedder-policy`.

## 3. Hosting

The question is only "which host can send COOP/COEP if we ever need `SharedArrayBuffer`". Today nothing needs it:

- Godot needs cross-origin isolation only for **threaded** web builds. Reid's builds are non-threaded: `variant/thread_support=false` in `~/risd-godot/export_presets.cfg:15,46,57` and `prototypes/volume-slider/export_presets.cfg:13`. The volume-slider README says so directly: "Web is single-threaded and uses Stream audio so effects work without cross-origin isolation" (`prototypes/volume-slider/README.md:19`). risd-godot's loader passes `threads: GODOT_THREADS_ENABLED` (`~/risd-godot/web/loading_shell.html:291,363`), and risd-godot is published to GitHub Pages by `scripts/publish-pages.sh`.
- Plain canvas and three.js need no special headers at all.

What the primary docs say:
- **Godot:** "Since Godot 4.3 … single thread … is the preferred and now default way to export your games on the Web." Only with threads (or extensions) do exports need `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp`; otherwise "the project will not run". A PWA service worker can fake the headers (`progressive_web_app/ensure_cross_origin_isolation_headers`). Web is WebGL 2 / Compatibility renderer only. A game "can be inserted into an <iframe>". (https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html, https://docs.godotengine.org/en/stable/classes/class_editorexportplatformweb.html)
- **Isolation in an iframe:** "The entire chain of the documents, including parent frames and child frames, must be cross-origin isolated", delegated with `allow="cross-origin-isolated"` (https://web.dev/articles/coop-coep; MDN: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cross-Origin-Embedder-Policy, https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer). So a *threaded* Godot iframe on the class site would need headers on the class site too, not just on Reid's host.
- **GitHub Pages:** no custom headers. GitHub staff (2023): "This is a scenario we would support with custom headers. No ETA at the moment" (https://github.com/orgs/community/discussions/13309). Limits: 1 GB site, soft 100 GB/month bandwidth (https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits). The workaround is `coi-serviceworker`, a same-origin script that reloads once on first visit (https://github.com/gzuidhof/coi-serviceworker). Godot's docs list GitHub Pages as gzip-compressing on the fly.
- **Cloudflare Pages:** `_headers` file, up to 100 rules (https://developers.cloudflare.com/pages/configuration/headers/). 25 MiB per file, 20,000 files (https://developers.cloudflare.com/pages/platform/limits/). The 39.5 MB uncompressed Godot `.wasm` would exceed 25 MiB (inferred).
- **Netlify:** `_headers` or `netlify.toml` `[[headers]]` (https://docs.netlify.com/manage/routing/headers/). The free plan is 300 credits/month, 15 per deploy and 20 per GB (https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/).
- **nginx:** `add_header Cross-Origin-Opener-Policy same-origin always;` etc. Headers inherit only if the current level has no `add_header` of its own (https://nginx.org/en/docs/http/ngx_http_headers_module.html).

| Host | Custom headers (COOP/COEP) | Already used by Reid | Fit for this |
|---|---|---|---|
| GitHub Pages (current) | No custom headers (see docs above); the `coi-serviceworker` shim is the workaround | Yes: the class site; risd-godot `gh-pages` (`~/risd-godot/scripts/publish-pages.sh:1-16`, which drops files over 95 MB) | Fine for canvas, three.js and non-threaded Godot. Classmates keep their workflow. |
| Reid's CM3588 nginx + Cloudflare tunnel | Yes, `add_header` | Yes: `homework.reidsurmeier.wtf` on the CM3588 behind the tunnel (`~/risd-godot/homework/README.md:32`); `gamectc.reidsurmeier.wtf` for the volume slider (`prototypes/volume-slider/deploy/README.md:3-11`) | Full control. Moves the class homepage, or part of it, onto Reid's machine; classmates lose direct deploys unless the iframe points there. |
| Cloudflare Pages | Yes, `_headers` file | No Pages project found (Reid does use Cloudflare tunnels) | Static, free, headers by file. Would need the repo connected. |
| Netlify | Yes, `_headers` or `netlify.toml` | None found | Same as Cloudflare Pages. |

`game.reidsurmeier.wtf` is the public gallery build and is out of scope; nothing here touches it.

## 4. Asset inventory

### 4a. `props_GLBFiles.zip` (`~/orca/projects/are.na-MAP/.orca/drops/props_GLBFiles.zip`, 4,974,118 bytes)

`unzip -l` lists 18 entries: 7 GLBs, 1 `.DS_Store`, 10 `__MACOSX` resource forks. Only the 7 GLBs were extracted, into an empty scratch folder, and read with a header-only parser under `python3 -I` (JSON chunk and PNG IHDR). Nothing from the zip was executed. All were written by "Khronos glTF Blender I/O v5.2.40". Each is one mesh, one node, triangles, with POSITION/NORMAL/TEXCOORD_0. None has skins or animations.

| GLB | Bytes | Tris | Verts | Material | Texture | Size (m, from bounds) | Status |
|---|---:|---:|---:|---|---|---|---|
| props_Cup | 723,372 | 256 | 154 | `coffee` | 1080×1080 PNG | 0.08 × 0.10 × 0.08 | static, usable |
| props_Cigs | 893,024 | 68 | 76 | `cigs` | 1080×1080 PNG | 0.10 × 0.02 × 0.06 | static, usable |
| props_Sword | 864,816 | 68 | 64 | `sword` | 1080×1080 PNG | 0.06 × 1.16 × 0.11 | static, usable |
| props_Soda | 948,712 | 120 | 106 | `soda` | 1080×1080 PNG | 0.075 × 0.12 × 0.075 | static, usable |
| props_Monitor | 743,712 | 60 | 60 | `monitor` | 1080×1080 PNG | 0.13 × 0.34 × 0.42 | static, usable |
| props_Noodles | 810,836 | 60 | 56 | `ramen` | 1080×1080 PNG | 0.14 × 0.14 × 0.10 | static, usable |
| props_Bottle | 1,668 | 10 | 20 | none | none | 2 × 0.62 × 2 | **placeholder or broken export**: a 10-triangle untextured shape far larger than the others |

Several props sit off-origin (Monitor z 0.80–1.21, Sword z 1.37–1.48, Soda z 0.64–0.71), so they were probably exported from one arranged scene (inferred). A render rig should frame each by its bounds, not the origin. These are textured low-poly props, close to the reference screenshot's trash pile (bottles, phone, cups, fruit).

### 4b. Otani clay room (`~/otani-clay-room`)

- `main` is only the agentic-workflow template (`git log`: one commit, `94bf795`); `modules/` holds just `example`. The scene and figures live on branch `build/v0.1.0` (`figures/INDEX.md`, per-figure `PROVENANCE.md` and `material.json`). The meshes themselves are git-ignored. They are not on this disk (`find ~/otani-clay-room -name '*.glb'` found none). The in-use set (145 MiB) is backed up to Proton Drive `/my-files/Backups/otani-clay-room-meshes/<name>/mesh/` (`figures/INDEX.md`, "Backup").
- `exports/otani-room.blend` (416,216,667 bytes, untracked) is zstd-compressed and its header reads `BLENDER17-01v0502`, so it was saved by **Blender 5.2**. Blender 4.0.2 (`/usr/bin/blender`) refuses it ("not a blend file"), and so does 4.3.2 (`~/.local/opt/blender-4.3.2`: "incomplete header, may be from a newer version of Blender"). **Per-object polygon counts could not be read from the .blend on this PC.** The vertex counts below come from each figure's `PROVENANCE.md`.
- A string scan of the decompressed .blend shows 142 objects. Of those, 36 are figures, plus `monkey`, `octopus`, `rabbit-in-bath`, `plinth`, `disc`, room parts (boards, beams, frames, columns, grime decals, walls), lights `p-*`/`sky0-7`/`w-*` and camera `match`. No armature or action datablocks turned up (the only `AR` hit was `ARegion`), so the scene is unrigged and unanimated, as far as a string scan can show. `monkey`, `octopus` and `rabbit-in-bath` have no material of their own and are not in `figures/INDEX.md`. What they are is unknown.
- Each figure is a sculpture by Otani Workshop (Perrotin work pages cited per figure). Meshes were made from a Muse image or the photo with Trellis or Tripo H3.1 through Flora, then given a Clay Pack material (`figures/INDEX.md`; `figures/owl/PROVENANCE.md`). The Clay Pack is licensed and never committed; renders are fine (`~/otani-clay-room/AGENTS.md`, "This repository").

| Figure | Mesh | Verts | Material family |
|---|---|---:|---|
| arm-raised-figure | Trellis | 10,772 | slip |
| black-crouched | Trellis | 25,671 | glaze |
| black-curly-head | Tripo H3.1 | 248,701 | glaze |
| black-gnarly | Trellis | 15,223 | glaze |
| black-long-lying | Tripo H3.1 | 260,463 | glaze |
| black-lying-piece | Trellis | 20,344 | glaze |
| brown-cone-figure | Trellis | 13,469 | glaze |
| brown-potato | Trellis | 18,135 | clay |
| dark-glazed-head | Trellis | 25,253 | glaze |
| edge-dark-figure | Trellis | 15,073 | glaze |
| grey-dome | Trellis | 28,299 | glaze |
| hooded-head | Tripo H3.1 | 247,670 | glaze |
| ochre-fuzzy-head | Tripo H3.1 | 248,937 | clay |
| owl | Tripo H3.1 | 259,181 | bronze |
| peach-bob-bust | Trellis | 14,958 | clay |
| pig-eared-head | Trellis | 12,398 | slip |
| pink-elephant-head | Trellis | 19,996 | slip |
| pink-on-plate (octopus) | Trellis | 19,302 | clay |
| pink-teddy | Trellis | 11,246 | clay |
| seated-dark-small | Trellis | 11,248 | bronze |
| skull-head | Tripo H3.1 | 251,204 | slip |
| small-dark-creature | Trellis | 15,838 | bronze |
| standing-girl-dark | Trellis | 7,280 | glaze |
| tan-bald-head | Tripo H3.1 | 250,534 | clay |
| tan-big-head | Trellis | 11,346 | clay |
| white-bear-eared | Trellis | 10,236 | slip |
| white-cat (seated bear) | Trellis | 10,034 | slip |
| white-figure-bird | Trellis | 11,507 | slip |
| white-girl-head | Trellis | 12,630 | slip |
| white-head-right | Trellis | 17,384 | slip |
| white-lump | Trellis | 42,592 | slip |
| white-lumpy-figure | Tripo H3.1 | 256,772 | glaze |
| white-lying-bear | Trellis | 11,122 | slip |
| white-lying-doll | Trellis | 7,027 | slip |
| white-seated-child | Trellis | 49,276 | slip |
| yellow-head | Tripo H3.1 | 248,626 | impasto |

All 36 are static. Their poly counts don't matter for the sprite route: each is rendered once per view offline, and the browser only ever sees the finished sprite. They would matter for a live 3D runtime (section 9). Most are heads, busts and lumps with no limbs. Only a few have bodies that could plausibly "walk": standing-girl-dark, arm-raised-figure, seated-dark-small, pink-teddy, white-cat, white-lying-bear, white-lying-doll, white-figure-bird, owl, small-dark-creature. Which ones move is Reid's call.

**Rights note.** The figures copy another artist's works, and the repo says the reference photos are others' copyright and "the repository stays private" (`~/otani-clay-room/AGENTS.md`, "This repository"). A public class homepage is a different audience from a private materials study. That is one of the open decisions.

## 5. The sprite look and its pipeline

### 5a. What the look is, measured

- **Room shell:** `site/room/assets/shell.png` (`build/site-pages`) is 400×300 RGB, built from frames 0 and 19 of the board GIF `board/regions/3-178.gif` with only the bathtub and toilet removed. The shell check records zero changes among 103,862 pixels outside those masks (`site/room/README.md:25-28`). Reid's rule: every room's shell is this GIF room, never redrawn (auto-memory `fileserver-site-look.md`).
- **Palette for new objects:** `INK #242d38`, `CREAM #f7e7bc`, `PINK #ffb4bd`, `BLUE #8bc5ce`, `PURPLE #777393` (`site/room/tools/prepare_furniture.py:13-17`). Flat faces with a 1-px ink outline (`prepare_furniture.py:24-25`). Optional quantise to the GIF's own palette, no dither (`prepare_furniture.py:28-33`).
- **Hatched drop shadow:** a polygon filled with ink `(36,45,56)` wherever `(x+y) % 3 != 0`, i.e. diagonal hatching (`prepare_furniture.py:36-43`). The polygon is the footprint swept down-right: `(x+3,y+h-4),(x+w,y+h-4),(x+w+12,y+h+8),(x+15,y+h+10)` (`site/room/tools/prepare_pages.py:142`). The older canvas helper draws ordered dots, "no blur or soft CSS drop shadows" (`site/room/room.js:124-132`).
- **Degradation, the rule for everything new:** `tools/degrade/pipeline.py:57-74` `degrade(image, settings)`: optional unsharp mask → Lanczos downscale by `scale` → JPEG at `quality`, 4:2:0 subsampling → decode → upscale back with `upscale` (bilinear or bicubic). The docstring says "No nearest-neighbour scaling or final lossy encode". The room objects use calibration region `1-46`: **scale 0.975, JPEG 70, bicubic, sharpen 60** (`tools/degrade/calibration.json`; `docs/rooms/GUIDE.md:54`). Other regions: `1-48` 0.667/70/bilinear/60, `1-53` 0.975/40/bicubic/120 (`calibration.json`). `tools/degrade/README.md:96-97` still prints older values for these regions; `calibration.json` is what `prepare_pages.py:22` actually loads.
- **The degrade is applied inside the object's mask only:** each object is composited over the shell, degraded, then its exact binary alpha is restored, so JPEG change cannot leak outside it (`prepare_pages.py:232-238`; `GUIDE.md:54`).
- **Display:** the canvas is 400×300 at native pixels, CSS-scaled with `image-rendering: pixelated` and `imageSmoothingEnabled=false` (`site/room/a/renderer.js:15-16,50`). The softness lives in the pixels (the degrade), not in browser scaling.
- **Coloured-pencil variant** (bathroom-room "objects around the rug", the pass Reid asked to "match the rug's rendering"): `image-work/bathroom-room/pencil.py`. It draws at 8× (`:6`) on paper `(252,251,248)` (`:7`). Horizontal scribble hatching covers `0.2 + 0.65·dark` of the paper (`:24`), in pastel tints mixing `0.24 − 0.14·dark` paper (`:28`). Darks become the rug's outline grey `(112,108,94)`, never black (`:8`). The outline is wobbly, about 1 output px, with random breaks (`:36-41`). It is then box-averaged down 8× (`:44-45`), with coverage doubled so thin parts stay opaque (`:49`) and +25 % colour, +12 % contrast. The contact shadow is outline grey at 65 % (`objects.py:45-47`).

### 5b. From a 3D model (or photo) to one room sprite: the steps that exist

Pieced together from the objects-room standard (v2→v4), the bathroom-room rug pass and the site-pages degrade. A Blender render takes the place of the Muse "photoreal scan", because here real 3D already exists.

1. **Neutral base render, no AI.** Render each model alone on a plain ground, one fixed key light from the upper left and no fill, orthographic or one shared camera, at one scale, roughly 1024 px. This matches the v2 scan brief "hard key light upper left, no fill, white ground" (`image-work/objects-room/README.md:73`) and the DIS rule "non-AI base first (straightened photos, a CAD render)" (auto-memory `muse-dis-pipeline-for-assets.md`). The view angle should match the room's camera, which looks steeply down on the floor with vanishing points measured in `image-work/bathroom-room/README.md:30,39`. Use a mid-grey ground for white objects so the cutout doesn't leak (`objects-room/README.md:35`). *Blocker:* the Otani .blend needs Blender ≥ 5.0 (section 4b). The GLB props open in any Blender with glTF import (inferred).
2. **Colour study.** Posterize the render through a seeded per-object colour packet: `python3 -I sprite.py still <render> <slug> <out>` → longest side 200 px, hard luminance cuts, colours ⊆ the packet (`objects-room/README.md:74-75`; packets dealt by `sprite.py:50-69`).
3. **One Muse redraw.** `build_redraw.py` (`objects-room/build_redraw.py:33-45`) puts three references on 1024² white canvases: (1) the colour study, nearest-scaled; (2) the render, cropped to the same box; (3) `references/gif-examples.png`. It writes the prompt from `image-work/redraw-template.txt` and an `edit` plan at `"size": "1024x1024"`. `./run_still.sh <slug>-redraw` runs `image-pipeline prepare --unit-cost 0.01 --budget 0.01`, then `image … --execute` under the Bitwarden runner (`objects-room/run_still.sh:6-9`). The prompt asks for a continuous 1-px black outline on the real silhouette, interior lines only at real part edges, black shadow side plus checker dither across the half-shadow, "only the colours already in reference 1, plus black and white", "no floor, no cast shadow" (`objects-room/image-work/redraw-template.txt:1-12`).
4. **Snap to the grid.** `python3 -I sprite.py cells <redraw> <slug> <out>` → `finish_cells(..., long=160, black_share=0.55, mix=0.3)` (`sprite.py:209-259,330`). Colours are mapped at full resolution, then each cell votes: ≥55 % black → black; two colours close in share → checker; else majority. Every silhouette-edge cell turns black (a thick 1-cell outline).
5. **Room finish.** Either (a) re-run `finish_cells` at room size, e.g. tools 44 px long side on the 2× grid (`bathroom-room/objects.py:17,35`), or (b) the coloured-pencil finish `pencil(src, alpha, long, seed)` (`objects.py:32`; parameters in 5a).
6. **Place and shadow.** Drop the sprite at a bottom-centre foot point (`objects.py:19-25,37`). Cast the shadow from the bottom 45 % of the silhouette swept down-right by (1,1), (2,1), (3,2) (`objects.py:39-42`), or use the site's hatched footprint polygon (`prepare_pages.py:142`).
7. **Degrade.** Composite over the shell, `degrade(…, 1-46 settings)`, restore the binary alpha (`prepare_pages.py:234-238`). This is the step that satisfies "low-res render with old-OS anti-aliasing → JPEG → soft upscale; not crisp vector, not nearest-neighbour" (auto-memory `fileserver-site-look.md`).
8. **Check.** The site checks every scene against the shell outside its object masks (`site/room/README.md:27-28`); `tools/check-room.cjs` tests walking, depth, pixel preservation and cleanup at three viewport sizes (`README.md:37-39`). For CFGI there is no shell to preserve unless one is chosen. The reference screenshot is plain white ground (decision: white ground or the bathroom shell).

**For moving actors** the site's layers are full-canvas 400×300 PNGs drawn at (0,0) (`renderer.js:59`). That works for furniture that never moves. Actors need cut-out sprites with a foot anchor, the way the walker is a 100×140 cell with foot at (50,135) (`site/room/assets/provenance.json`, `sheet`), drawn at `x-50, y-135` (`renderer.js:58`). Shadows for moving actors must then be drawn at runtime: the existing `drawShadow` ordered-dot helper (`room.js:124-132`), or a pre-baked shadow sprite.

### 5c. How the walking character is animated

- **Source:** no generation. Frames are exact crops from Reid's GIFs `character/bathroom.gif`, `stairs.gif` and `front.gif`, with difference masks against the empty bathroom. "Deterministic source crops, exact RGB masks, nearest-neighbor display. No generated/redrawn character pixels." Two small leg-alpha regions are hand-traced (`site/room/assets/provenance.json`, `method`, `limitation`; `paid_calls: 0`).
- **Sheet:** `character/walk-sheet.png`, 400×560, cells 100×140, foot at (50,135), rows right/up/down/left; left is right mirrored (`provenance.json`, `sheet`, `left`).
- **Timing:** `site/room/a/animation.json` lists per-direction frames (source GIF frame → sheet cell, `delay_ms`): right/left 8 frames over 470 ms, up 8 over 450 ms, down 4 over 800 ms. Delays are 50–60 ms except down. `frameAt(seconds, direction)` loops through them (`renderer.js:34-39`). The pose timer resets when direction changes (`room.js:94-95`).
- **Motion:** logical space 800×600, twice the canvas (`room.js:1-3`). Speed is 78 logical px/s (`room.js:82`). Each step faces the dominant axis (`room.js:85`). Paths come from BFS on an 8-px grid (`room.js:28-51`). Walkable means inside the floor trapezoid and outside furniture footprints plus a 26-px radius (`room.js:19-26`; `renderer.js:41`). `wander()` picks seeded-random targets at least 100 px away (`room.js:56-64`). The PRNG is an LCG with seed 83 (`room.js:55`, `:146`).
- **Lifecycle:** stands for 350 ms, then wanders forever. `requestAnimationFrame` with dt capped at 50 ms. Pauses when `document.hidden` or reduced motion (`room.js:147-163`). Depth: all layers sorted by foot `y` each frame (`renderer.js:55`).

## 6. The Muse step

- **Routing.** `~/.claude/skills/image-generation-pipeline/SKILL.md:6-21` says to use `~/Image-generation-pipline/bin/image-pipeline`, "Muse via OpenRouter is Reid's default", with `identity` → `prepare` → `image`, where `--execute` is the spending step, and credentials come from the `access-bitwarden-secrets` runner as `OPENROUTER_API_KEY`. `~/.claude/skills/imagegen/SKILL.md:8-10` routes here too and forbids falling back to OpenAI or Qwen.
- **Model and protocol.** `meta/muse-image` on OpenRouter. Each request is one output; "Muse does not promise exact output pixels or deterministic seeds". Prompt and reference hashes are checked before dispatch, and a run is never resubmitted (`~/Image-generation-pipline/procedures/muse/README.md:3,21,40,90`). The procedures are `image` (create), `edit` (ordered references + prompt, e.g. 1024x1024) and `dis-composite` with a `refineFrom` pass (`README.md:9-54`).
- **Real calls used for sprites:**
  - objects-room v3 redraw: an `edit` with 3 references (colour study, aligned render, GIF examples), 1024×1024, prompt `objects-room/image-work/redraw-template.txt`. Run record example: `objects-room/runs-log/blue-ferrule-crimper-redraw.out` (`cost 0.010000`, `checks.outcome human_decision_required`, `retryState never-resubmit`).
  - Books: orthographic faces on one 1024×1536 mid-grey canvas, `dis-composite` refine (`objects-room/README.md:19-29`, `book_ortho.py`).
  - bathroom-room: Muse edits for the clean plate and desk rounds at $0.01 each, with placement, perspective and shading done in code ("Placement and perspective are code, not Muse", `bathroom-room/README.md:7,11,31`).
  - volume-slider-art: four `meta/muse-image` outputs, $0.04 total, with exact-pixel restoration masks afterwards (`image-work/volume-slider-art/costs.json`; `README.md:9,19-21`).
- **Lessons recorded:** Muse ignores blockout size and position (`bathroom-room/README.md:23,40`), so do geometry in code and let Muse only re-render. Muse copies the front pose of an identity sprite if you pass one (`objects-room/README.md:54`). Naming a title makes Muse print it (`objects-room/README.md:27`).

## 7. Cost model

**Unit price.** $0.01 per Muse output:
- 356 of 358 run logs in `image-work/objects-room/runs-log/` record `"cost": "0.010000"`; the other 2 are Seedance at 0.1358.
- OpenRouter's model list (`https://openrouter.ai/api/v1/models?output_modalities=image`, fetched 2026-11-03) prices `meta/muse-image` at `image_output: 0.00000239520958083832` per token. $0.01 is about 4,175 output tokens; that conversion is inferred.
- Model page: https://openrouter.ai/meta/muse-image.

**Rework.** objects-room spent 237 Muse images on 16 objects across four standards, about 15 per object (`objects-room/README.md:108`). That was while the standard was still being invented. Once fixed, a pass was close to 1 per item: v3 redraws 16 for 16, books 44 for ~45 faces (`objects-room/README.md:29,106`). The table uses ×1 for a standard pass and ×2 as a realistic budget with reruns.

Cast for pricing: 6 usable props + 36 Otani figures = **42 actors**. "Movers" = 12 (an assumption for pricing; Reid picks). A mirrored side is free (left = right flipped, as the walker does).

| Scenario | Muse calls | ×1 | ×2 (budget) | vs $5 |
|---|---:|---:|---:|---|
| A. One still per actor | 42 | $0.42 | $0.84 | under |
| B. Movers get 3 facings (front, back, side; other side mirrored) | 30 + 12×3 = 66 | $0.66 | $1.32 | under |
| C. Movers get 3 facings × 4 walk drawings | 30 + 12×12 = 174 | $1.74 | $3.48 | under |
| D. Every actor 5 unique of 8 directions × 4 drawings | 42×20 = 840 | $8.40 | $16.80 | **over: needs Reid's approval** |
| Style test set in `tests/` before the standard pass | ~5–10 | $0.05–0.10 | — | under |

Not in these numbers:
- **Flora Seedance turnarounds** (video, Flora MCP only): $0.22–0.85 per spin observed (`objects-room/README.md:13,15`). They come out of the separate ≤$20/session Flora allowance (global CLAUDE.md, "Reid's time").
- **Re-meshing** Otani figures: $0 if the Proton backup is restored. Flora mesh fits cost $0.42–1.44 each (`figures/owl/PROVENANCE.md`).

## 8. From single images to actors

- **One still per prop.** Props (cup, soda, noodles, cigs, sword, monitor) don't move by themselves. One 3/4 still each, placed as depth-sorted layers. They can be picked up, carried and dropped by moving the sprite, with no extra art.
- **A few frames per walker, only where it earns it.** The fileserver walker has 4 directions × 4–8 drawings (5c). For sculptures without legs, the cheap version uses one still per facing and moves it procedurally: a 1–2 px vertical bob at walking cadence, a slight squash on landing, a flip for the other side. That costs no Muse (scenario B). Real in-between drawings are scenario C.
- **Standardize before stylizing** (auto-memory `standardize-before-stylizing.md`): run one manifest + one template + one script over all 42 actors, show the whole set, and only then style. Experiments go in `tests/`. Concretely: one Blender render rig (same light, camera, scale, ground) → one colour-study rule → one redraw template → one finish (cells or pencil) → one degrade setting.
- **Edit, don't regenerate** (auto-memory `edit-dont-regenerate.md`): when Reid likes an actor but wants a change, edit those pixels (move, re-finish, touch up, as in `bathroom-room/touchup.py`, "319 of 6108 desk px changed", `README.md:59-61`). Spend a Muse call only for the one part that needs it.
- **Homepage figures are never painted over** (auto-memory `homepage-characters-stay.md`): that rule is about the fileserver homepage (sensorium figure, anime face, gnome). If the walker or those figures appear on CFGI, they are used as-is.

## 9. Runtime options

Primary-doc facts used below:
- **Godot.** The 4.3 web blog: "the 4.3 release Web build .wasm is around 40 MB uncompressed, and 5 MB compressed with Brotli" (https://godotengine.org/article/progress-report-web-export-in-4-3/). The export doc says gzip shrinks it to "around a quarter".
- **three.js.** The current release is r187 (https://github.com/mrdoob/three.js/releases/tag/r187). `Sprite`: "a plane that always faces towards the camera … Sprites do not cast shadows" (https://threejs.org/docs/pages/Sprite.html). `SpriteMaterial.sizeAttenuation` defaults to true (https://threejs.org/docs/pages/SpriteMaterial.html). npm ships no minified build. jsDelivr's auto-minified `three.module.min.js` + `three.core.min.js` measured 392,177 B + 422,062 B, about 195 KB gzip (measured from https://data.jsdelivr.com/v1/packages/npm/three@0.187.0).

| | (a) Godot 4 web export in an iframe | (b) Plain JS canvas + sprites + agent loop | (c) three.js billboards |
|---|---|---|---|
| Prior art in Reid's code | risd-godot (Godot 4.7.2, `AGENTS.md:7`); volume-slider prototype | **fileserver `site/room` (live)**: canvas, depth sort, BFS walker | none found |
| Download | `index.wasm` 39,514,754 B raw (volume-slider `tests/evidence/export-manifest.json`); ~9.6 MiB gzip, 10,084,286 B (`risd-godot/homework/README.md:24`; `docs/research/gallery-load-720-followup.md:15`) + pack | `room.js` 7,745 B + `renderer.js` 2,896 B (`git ls-tree -l`) + sprite PNGs ~195 KB gzip (three.module.min + three.core.min, r187) + sprites |
| Cold start | 12.9 s at 10 Mbps for the Week 3 booth (`homework/README.md:24`) | one frame after images load | one frame after module + images load |
| Headers | none if `thread_support=false` (Reid's default) | none | none |
| Fits CFGI capsule swap | iframe must be created/removed in `initializeClassPage`; Godot restarts on every return | mount/destroy like `mountRoom` (`room.js:135-172`) | same as (b) |
| Look | 3D scene can render the meshes live, but the sprite look is a 2D pass; Godot would just draw billboards | exactly the fileserver pipeline: pre-degraded sprites, pixelated canvas | sprites in 3D space; perspective scaling would resample sprites and fight the degraded pixels (inferred) |
| Agent logic | GDScript; Godot has navigation, but none of Reid's web builds use agents | ~200 lines on top of `createWalk` (estimate) | same JS as (b) |
| Mobile | heavy download on phone data; WebGL2/Compatibility renderer | light; reduce actor count under 800 px | medium |
| Risk | load time on a homepage; iframe focus/scroll capture | low; known code | extra dependency for little gain |

**Reading of the evidence (inferred, Reid decides):** (b) is the cheapest path to "a video game that plays itself" in this look. The walker loop, depth sort, shadow helper, reduced-motion and hidden-tab handling already exist and are live. Godot pays a large download for 3D that the sprite pipeline throws away. three.js sits between them and buys nothing the sprites need.

**Agent behaviour depth (options, not a choice):**
1. Wander only, like the current walker (`room.js:56-64`), with N actors and mutual avoidance.
2. Drives: each actor has needs that rise over time (hunger, curiosity, company, rest). It picks the target that best answers the strongest need (a prop, another actor, a corner), walks there with the existing BFS and plays a short "use" pose. Seeded, endless, never the same twice.
3. Drives + relationships + memory: actors remember who they met, follow or avoid each other, carry props (the dog-on-leash pairing). The world drifts over hours, and state persists across visits through `sessionStorage`/`localStorage`.

## 10. Open decisions for `/wayfinder` (only Reid can answer)

1. **Runtime:** (a) Godot iframe, (b) plain JS canvas extending the fileserver room code, or (c) three.js billboards.
2. **Hosting:** stay on noahcha0907's GitHub Pages (PR from Reid's fork, or a direct push, which his token allows), or serve the sim from his own nginx/Cloudflare tunnel in an iframe, or Cloudflare Pages/Netlify. Only a threaded Godot build forces this.
3. **Cast:** which of the 6 usable props and 36 Otani figures go in. Is `props_Bottle.glb` re-exported? What are `monkey`/`octopus`/`rabbit-in-bath`? Are copies of Otani Workshop's sculptures OK on a public class page?
4. **Poses and angles:** one still each (A), 3 facings for movers (B), walk drawings (C) or full 8-way (D); and which figures move.
5. **Ground:** plain white like the Ian Cheng screenshot, or the bathroom GIF shell (cream floor, pink rug).
6. **Behaviour depth:** wander, drives, or drives + relationships + persistence.
7. **Mobile:** same sim with fewer actors, a still frame, or off under 800 px.
8. **Muse budget:** the scenario to approve. A–C stay under $5; D needs an explicit yes. Flora spins come from the separate Flora allowance.
9. **Blender 5.x:** install a Blender ≥ 5.0 on the PC, or render the Otani views on the Mac that saved the .blend.

## Could not reach or find

- **Otani polygon counts from the .blend.** It is a Blender 5.2 file; local Blender 4.0.2 and 4.3.2 cannot open it. Vertex counts come from `PROVENANCE.md`. The meshes are not on disk; they are in the Proton Drive backup, which was not downloaded.
- **`monkey`, `octopus`, `rabbit-in-bath`** in the .blend: not documented in `figures/INDEX.md`; what they are is unknown.
- **`image-work/bathroom-room/runs-log/` costs**: the README states $0.01 per call (`README.md:7,11,34,44`); the per-run files were not opened one by one.
- **Old `tests/` folder** for bathroom-room: none exists; objects-room has `tests/ink-bottle-stylization/` (`objects-room/README.md:100-102`).
- **moma.org** exhibition pages (https://www.moma.org/calendar/exhibitions/3656, /3796): HTTP 403 to fetch. MoMA PS1 facts come from Pilar Corrias.
- **Gladstone** (https://gladstonegallery.com/exhibit/bob, /exhibit/thousand-lives): JavaScript-only or 404. Gladstone and Venice dates for BOB, Gladstone Seoul dates for Thousand Lives and the 3FACE mint details appeared only in search snippets, so they are left out.
- **No text extracted** from https://www.theshed.org/program/192-ian-cheng-life-after-bob-the-chalice-study and http://worldto.live.
- **Not consulted:** the *Emissaries Guide to Worlding* book itself (the 2017 Park Guide scan was used), and the Rhizome, Frieze and Art in America interviews. The early-work videos are Vimeo-only and were not viewed.
- **"Behaviour trees":** no primary source found.

## Method

Everything local was read in place. The zip's GLBs were extracted only into a scratch folder and parsed by a header reader under `python3 -I`. The Otani .blend was decompressed to scratch for a string scan of datablock names, then the copy was deleted. Web facts were gathered from primary pages (section 1 and the docs notes in sections 3 and 9). No paid call, deploy or push other than this PR.
