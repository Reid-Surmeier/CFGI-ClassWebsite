// Reinitialize page interactions after capsule navigation.
window.initializeClassPage = function () {
  window.classPageListeners?.abort();
  const listeners = new AbortController();
  window.classPageListeners = listeners;
  if (document.querySelector('.page--info .about')) window.startPictureRain(listeners.signal);
// List interactions for the Projects and Students pages.
// - Hover a row: the type gets a blurred spot-color overlay (CSS) and a
//   strip of the tab peeks up from the bottom.
// - Click a row: the full tab rises with a square per piece of work.
//     Projects page -> one square per student for that project.
//     Students page -> one square per project for that student.
//   Click the row again, press Esc, or click outside to close.

const STUDENTS = [
  "Alisha Zhou",
  "Candice Lee",
  "Em Ayuso Rizzo",
  "Julia Primiero",
  "Nicole Sun",
  "Noah Cha",
  "Runping Mao Wei",
  "Sara Parulekar",
  "Samuel Li",
  "Susan He",
  "Reid Surmeier",
  "Yeonjai Song",
  "Zihan Huang",
];

const PROJECTS = [
  { num: "01", title: "Hello World and Algorithmic Drawing" },
  { num: "02", title: "Open GL, Generative Design" },
  { num: "03", title: "Image Processing" },
  { num: "04", title: "3D Software" },
  { num: "05", title: "Parametric 3D and Simulation" },
  { num: "06", title: "Intro to User Interfaces" },
  { num: "07", title: "UX" },
  { num: "08", title: "Games as Interfaces" },
  { num: "09", title: "HID" },
  { num: "10", title: "Final Project" },
];

// Student links live in work.js (the WORK object), so students can fill
// them in without touching this file.

const tab = document.querySelector(".project-tab");
const rows = document.querySelectorAll(".js-row");

//student and homepage button animation setup
rows.forEach((row) => {
  if (!row.dataset.project) return;
  const content = document.createElement("span");
  content.className = "project__content";
  content.append(...row.childNodes);
  row.append(content);
});

// The squares to show for a clicked row.
function piecesFor(row) {
  const { project, student } = row.dataset;
  if (project) {
    const title = PROJECTS.find((p) => p.num === project)?.title ?? "";
    return STUDENTS.map((name) => ({
      project,
      student: name,
      label: `${name} — ${project} ${title}`,
    }));
  }
  return PROJECTS.map((p) => ({
    project: p.num,
    student,
    label: `${p.num} ${p.title} — ${student}`,
  }));
}

if (tab) {
  let openRow = null;

  const setColor = (row) =>
    tab.style.setProperty("--spot", row.style.getPropertyValue("--spot"));

  // Only allow normal web links or local files, never "javascript:" etc.
  const safeUrl = (value) => {
    if (!value || typeof value !== "string") return "";
    try {
      const url = new URL(value.trim(), document.baseURI);
      return ["http:", "https:", "file:"].includes(url.protocol) ? url.href : "";
    } catch {
      return "";
    }
  };

  // Each square links to the student's work and shows a preview of it:
  // their thumbnail image if they gave one, otherwise a tiny live view
  // of the linked page. Squares without a link stay gray.
  const fillSquares = (row) => {
    tab.replaceChildren(
      ...piecesFor(row).map(({ project, student, label }) => {
        const entry = (typeof WORK !== "undefined" && WORK[student]?.[project]) || {};
        const link = safeUrl(entry.link);
        const thumbnail = safeUrl(entry.thumbnail);

        const square = document.createElement(link ? "a" : "span");
        square.className = "work";
        square.dataset.project = project;
        square.dataset.student = student;
        square.setAttribute("aria-label", label);

        if (link) {
          square.href = link;
          square.target = "_blank";
          square.rel = "noopener";
        } else {
          square.classList.add("is-empty");
          square.tabIndex = 0; // still focusable so the big name shows
        }

        if (thumbnail) {
          const img = document.createElement("img");
          img.src = thumbnail;
          img.alt = "";
          img.loading = "lazy";
          square.append(img);
        } else if (link) {
          const preview = document.createElement("iframe");
          preview.src = link;
          preview.title = "";
          preview.loading = "lazy";
          preview.tabIndex = -1;
          preview.setAttribute("aria-hidden", "true");
          // Previews are silent: no scripts, so the embedded page can't
          // start audio. Pages that draw with JavaScript need a thumbnail.
          preview.setAttribute("sandbox", "allow-same-origin");
          preview.setAttribute("allow", "autoplay 'none'");
          square.append(preview);
        }
        return square;
      })
    );
  };

  const deactivate = () => {
    if (!openRow) return;
    openRow.classList.remove("is-active");
    openRow.setAttribute("aria-expanded", "false");
    openRow = null;
  };

  const open = (row) => {
    deactivate();
    openRow = row;
    setColor(row);
    fillSquares(row);
    row.classList.add("is-active");
    row.setAttribute("aria-expanded", "true");
    tab.inert = false;
    tab.classList.add("is-open");
    document.body.classList.add("tab-open");
  };

  const close = () => {
    if (!openRow) return;
    deactivate();
    bigName.classList.remove("is-on");
    tab.classList.remove("is-open", "is-peek");
    tab.inert = true;
    document.body.classList.remove("tab-open");
  };

  const peek = (row) => {
    if (openRow) return; // don't change an open tab on hover
    setColor(row);
    tab.classList.add("is-peek");
  };
  const unpeek = () => tab.classList.remove("is-peek");

  rows.forEach((row) => {
    row.addEventListener("mouseenter", () => peek(row));
    row.addEventListener("mouseleave", unpeek);
    row.addEventListener("focus", () => peek(row));
    row.addEventListener("blur", unpeek);
    row.addEventListener("click", (e) => {
      e.stopPropagation();

      //student name and project name animations and sound effects
      //for project names animation goes right off the screen and reappears left onto screen before returning to original pos
      if (row.dataset.project) {
        const content = row.querySelector(".project__content");
        if (content) {
          const rect = content.getBoundingClientRect();
          const offscreenRight = window.innerWidth - rect.left + rect.width + 1;
          const offscreenLeft = -rect.right - 1;
          content.animate(
            [
              { transform: "translateX(0)", offset: 0 },
              { transform: `translateX(${offscreenRight}px)`, offset: 0.45 },
              { transform: `translateX(${offscreenLeft}px)`, offset: 0.46 },
              { transform: "translateX(0)", offset: 1 },
            ],
            { duration: 500, easing: "linear" }
          );
        }
        //for student names rotate 360 deg
      } else {
        row.querySelector(".fx")?.animate(
          [{ rotate: "0deg" }, { rotate: "360deg" }],
          { duration: 600, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" }
        );
      }
      //sound effect is played
      new Audio(new URL("sound-effects/short_woosh.mp3", document.baseURI))
        .play()
        .catch(() => {});
      openRow === row ? close() : open(row);
    });
    row.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        row.click();
      }
    });
  });

  // Hovering a square shows a name huge and blurred over the page:
  // the student's name on the Projects page, the project title on the
  // Students page.
  const bigName = document.createElement("div");
  bigName.className = "work-name";
  bigName.setAttribute("aria-hidden", "true");
  document.body.append(bigName);

  // Split text into at most `count` lines of similar length, breaking
  // only between words.
  const splitLines = (text, count) => {
    const words = text.trim().split(/\s+/);
    if (words.length <= 1 || count <= 1) return [words.join(" ")];
    if (words.length <= count) return words;
    let best = null;
    let bestLongest = Infinity;
    // Try every way to place the line breaks; keep the most even one.
    const tryBreaks = (start, linesLeft, lines) => {
      if (linesLeft === 1) {
        const all = [...lines, words.slice(start).join(" ")];
        const longest = Math.max(...all.map((l) => l.length));
        if (longest < bestLongest) [best, bestLongest] = [all, longest];
        return;
      }
      for (let end = start + 1; end <= words.length - linesLeft + 1; end++) {
        tryBreaks(end, linesLeft - 1, [...lines, words.slice(start, end).join(" ")]);
      }
    };
    tryBreaks(0, count, []);
    return best;
  };

  const renderLines = (text, count) =>
    bigName.replaceChildren(
      ...splitLines(text, count).map((line) => {
        const span = document.createElement("span");
        span.textContent = line;
        return span;
      })
    );

  // One size for every big name on a page: the design size (276px), or
  // smaller if needed so that the longest one fits the width AND the
  // whole block ends above the open tab.
  let sharedSize = null;
  const getSharedSize = (texts, count) => {
    if (sharedSize) return sharedSize;
    const u = Math.max(1, window.innerWidth / 1728);
    const designSize = 276.171 * u;
    const maxWidth = 1526 * u;
    const top = 287 * u;
    const gap = 24 * u; // breathing room above the tab (and for the blur)
    const maxHeight = window.innerHeight - tab.offsetHeight - top - gap;

    bigName.style.fontSize = `${designSize}px`;
    let widest = 0;
    let mostLines = 1;
    for (const text of texts) {
      renderLines(text, count);
      mostLines = Math.max(mostLines, bigName.children.length);
      for (const span of bigName.children) {
        widest = Math.max(widest, span.scrollWidth);
      }
    }
    const lineHeight = 0.8; // matches .work-name line-height
    const widthFit = maxWidth / widest;
    const heightFit = maxHeight / (mostLines * lineHeight * designSize);
    sharedSize = designSize * Math.max(0.1, Math.min(1, widthFit, heightFit));
    return sharedSize;
  };
  window.addEventListener("resize", () => (sharedSize = null), { signal: listeners.signal });
  // Measure again once the web font has loaded.
  document.fonts?.ready.then(() => (sharedSize = null));

  const showName = (square) => {
    // Projects page: student names in 2 lines.
    // Students page: project titles in up to 3 lines.
    const onProjectsPage = Boolean(openRow?.dataset.project);
    const texts = onProjectsPage ? STUDENTS : PROJECTS.map((p) => p.title);
    const count = onProjectsPage ? 2 : 3;
    const size = getSharedSize(texts, count);
    renderLines(
      onProjectsPage
        ? square.dataset.student
        : PROJECTS.find((p) => p.num === square.dataset.project)?.title ?? "",
      count
    );
    bigName.style.fontSize = `${size}px`;
    bigName.style.setProperty("--spot", tab.style.getPropertyValue("--spot"));
    bigName.classList.add("is-on");
  };
  const hideName = () => bigName.classList.remove("is-on");

  tab.addEventListener("mouseover", (e) => {
    const square = e.target.closest(".work");
    square ? showName(square) : hideName();
  });
  tab.addEventListener("mouseleave", hideName);
  tab.addEventListener("focusin", (e) => {
    const square = e.target.closest(".work");
    if (square) showName(square);
  });
  tab.addEventListener("focusout", hideName);

  tab.addEventListener("click", (e) => e.stopPropagation());
  document.addEventListener("click", close, { signal: listeners.signal });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  }, { signal: listeners.signal });
}

// Projects page: (Weekly) / (Final) toggle. "Final" moves project 10 to
// the top of the list; "Weekly" puts it back at the end. Rows slide to
// their new places.
const viewButtons = document.querySelectorAll(".view-toggle button");
const projectList = document.getElementById("project-list");

if (viewButtons.length && projectList) {
  const finalRow = projectList.querySelector('[data-project="10"]');
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  // Move rows, then animate each from its old spot to its new one.
  const moveWithSlide = (move) => {
    const items = [...projectList.children];
    const before = new Map(items.map((el) => [el, el.getBoundingClientRect().top]));
    move();
    if (reduceMotion.matches) return;
    items.forEach((el) => {
      const shift = before.get(el) - el.getBoundingClientRect().top;
      if (!shift) return;
      el.animate(
        [{ transform: `translateY(${shift}px)` }, { transform: "translateY(0)" }],
        { duration: 500, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" }
      );
    });
  };

  const setView = (view) => {
    viewButtons.forEach((btn) =>
      btn.setAttribute("aria-pressed", String(btn.dataset.view === view))
    );
    const wantFirst = view === "final";
    const isFirst = projectList.firstElementChild === finalRow;
    if (wantFirst === isFirst) return;
    moveWithSlide(() =>
      wantFirst ? projectList.prepend(finalRow) : projectList.append(finalRow)
    );
  };

  viewButtons.forEach((btn) =>
    btn.addEventListener("click", (e) => {
      e.stopPropagation(); // don't close an open tab
      new Audio(new URL("sound-effects/short_woosh.mp3", document.baseURI))
        .play()
        .catch(() => {});
      setView(btn.dataset.view);
    })
  );
}

// by noah cha
// Info-page character highlights follow document scrolling in both directions.
const about = document.querySelector('.page--info .about');
if (about) {
  const CHANNEL_STEPS = 256;
  const COLOR_COUNT = CHANNEL_STEPS ** 3;
  const characterSeed = character => {
    let hash = 2166136261;
    for (const symbol of character) hash = Math.imul(hash ^ symbol.codePointAt(0), 16777619);
    hash = Math.imul(hash ^ (hash >>> 16), 2246822507);
    return (hash ^ (hash >>> 13)) >>> 0;
  };
  const hexFromIndex = index => `#${[0, 1, 2].map(power =>
    (Math.floor(index / CHANNEL_STEPS ** power) % CHANNEL_STEPS).toString(16).padStart(2, '0')
  ).join('')}`;
  const characterColors = characters => {
    const occurrences = new Map();
    const groups = new Map();
    const reserved = new Set();
    return characters.map(character => {
      const occurrence = occurrences.get(character) ?? 0;
      occurrences.set(character, occurrence + 1);
      const batch = Math.floor(occurrence / 5);
      const key = JSON.stringify([character, batch]);
      if (groups.has(key)) return groups.get(key);
      if (reserved.size >= COLOR_COUNT) throw new Error('Character highlight palette exhausted');
      let index = (characterSeed(character) + batch * 3 * (1 + CHANNEL_STEPS + CHANNEL_STEPS ** 2)) % COLOR_COUNT;
      let hex = hexFromIndex(index);
      while (reserved.has(hex)) {
        index = (index + 1) % COLOR_COUNT;
        hex = hexFromIndex(index);
      }
      reserved.add(hex);
      groups.set(key, hex);
      return hex;
    });
  };

  // Wrap text nodes only, leaving emphasis and superscripts intact.
  if (!about.querySelector('[data-reading-character]')) {
    const walker = document.createTreeWalker(about, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);
    for (const node of textNodes) {
      const fragment = document.createDocumentFragment();
      for (const word of node.textContent.split(/(\s+)/).filter(Boolean)) {
        const wrapper = document.createElement('span');
        wrapper.className = /^\s+$/.test(word) ? 'reading-space' : 'reading-word';
        for (const character of Array.from(word)) {
          const span = document.createElement('span');
          span.className = 'reading-character';
          span.dataset.readingCharacter = '';
          span.textContent = character;
          wrapper.append(span);
        }
        fragment.append(wrapper);
      }
      node.replaceWith(fragment);
    }
  }
  const characters = Array.from(about.querySelectorAll('[data-reading-character]'));
  const colors = characterColors(characters.map(character => character.textContent));
  characters.forEach((character, index) => character.style.setProperty('--marker-color', colors[index]));
  const previousFill = new Array(characters.length).fill(-1);
  let frame = 0;
  const update = () => {
    frame = 0;
    const runway = document.documentElement.scrollHeight - window.innerHeight;
    const progress = runway > 0 ? Math.max(0, Math.min(1, window.scrollY / runway)) : 0;
    const read = progress * characters.length;
    characters.forEach((character, index) => {
      const fill = Math.max(0, Math.min(1, read - index));
      if (previousFill[index] === fill) return;
      previousFill[index] = fill;
      character.style.setProperty('--read', `${fill * 100}%`);
      character.style.color = fill < 1 ? '#ffffff' : '#000000';
    });
  };
  const schedule = () => {
    if (!frame && !listeners.signal.aborted) frame = requestAnimationFrame(update);
  };
  const observer = new ResizeObserver(schedule);
  observer.observe(document.querySelector('main.page'));
  observer.observe(about);
  window.addEventListener('scroll', schedule, { passive: true, signal: listeners.signal });
  window.addEventListener('resize', schedule, { signal: listeners.signal });
  document.fonts?.ready.then(schedule);
  listeners.signal.addEventListener('abort', () => {
    cancelAnimationFrame(frame);
    observer.disconnect();
  }, { once: true });
  update();
}

};
window.initializeClassPage();
