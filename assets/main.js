/* Speak Nigeria — shared interactions */

/* -----------------------------------------------------------
   Rotating greeting under the big Yoruba welcome.
   NOTE FOR TEE: Yoruba, Igbo, and Hausa below are correct.
   The last three are placeholders — please confirm the
   correct "welcome/hello" with a native speaker before launch.
   ----------------------------------------------------------- */
const GREETINGS = [
  { word: "Ẹ káàbọ̀",      lang: "Yoruba" },   // ✓ verified
  { word: "Nnọọ",          lang: "Igbo"   },   // ✓ verified
  { word: "Barka da zuwa", lang: "Hausa"  },   // ✓ verified
  { word: "Obọkhian",      lang: "Bini"   },   // ⚠ verify
  { word: "Doo",           lang: "Ijaw"   },   // ⚠ verify
  { word: "Mesiere",       lang: "Efik"   },   // ⚠ verify
];

(function greetingRotator() {
  const el = document.querySelector("[data-greeting-sub]");
  if (!el) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let i = 0;
  const render = () => { el.textContent = `${GREETINGS[i].word} — welcome in ${GREETINGS[i].lang}`; };
  render();
  if (reduce) return;
  setInterval(() => { i = (i + 1) % GREETINGS.length; el.style.opacity = 0;
    setTimeout(() => { render(); el.style.opacity = 1; }, 250);
  }, 2800);
  el.style.transition = "opacity .25s ease";
})();

/* Scroll reveal */
(function reveal() {
  const items = document.querySelectorAll(".reveal");
  if (!items.length || !("IntersectionObserver" in window)) {
    items.forEach(el => el.classList.add("in")); return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
  }, { threshold: 0.12 });
  items.forEach(el => io.observe(el));
})();

/* Mobile menu */
(function mobileMenu() {
  const btn = document.querySelector(".nav-toggle");
  const menu = document.querySelector(".mobile-menu");
  if (!btn || !menu) return;
  btn.addEventListener("click", () => {
    const open = menu.classList.toggle("open");
    btn.setAttribute("aria-expanded", String(open));
  });
})();
