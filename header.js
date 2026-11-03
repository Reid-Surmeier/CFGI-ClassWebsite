//header buttons dodges mouse 7 times before going still
//different sound effect is played in succession with each dodge

const dodge = [
  [-36, 16],
  [42, -20],
  [-54, -24],
  [28, 30],
  [56, 8],
  [-24, -32],
  [12, -36],
];

const dodgeStates = new WeakMap();

document.addEventListener("pointerover", (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;

  const link = target.closest(".topbar__course a, .topbar__nav a");
  if (!link || (event.relatedTarget instanceof Node && link.contains(event.relatedTarget))) return;

  const state = dodgeStates.get(link) ?? { count: 0, offsetX: 0, offsetY: 0 };
  if (state.count >= dodge.length) return;

  const sound = new Audio(
    `sound-effects/Combo%20Sound%20Effect_${state.count + 1}.mp3`
  );
  sound.play().catch(() => {});

  const [x, y] = dodge[state.count];
  const rect = link.getBoundingClientRect();
  const baseLeft = rect.left - state.offsetX;
  const baseRight = rect.right - state.offsetX;
  const baseTop = rect.top - state.offsetY;
  const baseBottom = rect.bottom - state.offsetY;
  state.offsetX = Math.max(-baseLeft, Math.min(x, window.innerWidth - baseRight));
  state.offsetY = Math.max(-baseTop, Math.min(y, window.innerHeight - baseBottom));
  link.style.transform = `translate(${state.offsetX}px, ${state.offsetY}px)`;
  state.count += 1;
  dodgeStates.set(link, state);
});