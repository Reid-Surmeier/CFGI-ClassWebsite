//header buttons dodges mouse 7 times before going still
//different sound effect is played in succession with each dodge

// Candice Lee: made the dodge movement much tighter
const dodge = [
  [-5, 2],
  [6, -3],
  [-8, -3],
  [4, 4],
  [8, 1],
  [-3, -5],
  [2, -5],
];

// Candice Lee: fixed click box the size of the dodge area, only the text moves
const linkSelector = ".topbar__course a, .topbar__nav a";

document.documentElement.style.setProperty(
  "--dodge-x",
  `${Math.max(...dodge.map(([x]) => Math.abs(x)))}px`
);
document.documentElement.style.setProperty(
  "--dodge-y",
  `${Math.max(...dodge.map(([, y]) => Math.abs(y)))}px`
);

function addClickBoxes() {
  document.querySelectorAll(linkSelector).forEach((link) => {
    if (link.querySelector(".topbar__hit")) return;
    const hit = document.createElement("span");
    const label = document.createElement("span");
    hit.className = "topbar__hit";
    label.className = "topbar__label";
    label.append(...link.childNodes);
    hit.append(label);
    link.append(hit);
  });
}

addClickBoxes();
// Candice Lee: page transitions swap in a new header, so add the boxes again
new MutationObserver(addClickBoxes).observe(document.body, { childList: true });

const dodgeStates = new WeakMap();

document.addEventListener("pointerover", (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;

  const link = target.closest(linkSelector);
  if (!link || (event.relatedTarget instanceof Node && link.contains(event.relatedTarget))) return;

  const state = dodgeStates.get(link) ?? { count: 0, offsetX: 0, offsetY: 0 };
  if (state.count >= dodge.length) return;

  const sound = new Audio(
    `sound-effects/Combo%20Sound%20Effect_${state.count + 1}.mp3`
  );
  sound.play().catch(() => {});

  const [x, y] = dodge[state.count];
  // Candice Lee: move the text instead of the link
  const label = link.querySelector(".topbar__label");
  const rect = label.getBoundingClientRect();
  const baseLeft = rect.left - state.offsetX;
  const baseRight = rect.right - state.offsetX;
  const baseTop = rect.top - state.offsetY;
  const baseBottom = rect.bottom - state.offsetY;
  state.offsetX = Math.max(-baseLeft, Math.min(x, window.innerWidth - baseRight));
  state.offsetY = Math.max(-baseTop, Math.min(y, window.innerHeight - baseBottom));
  label.style.transform = `translate(${state.offsetX}px, ${state.offsetY}px)`;
  state.count += 1;
  dodgeStates.set(link, state);
});