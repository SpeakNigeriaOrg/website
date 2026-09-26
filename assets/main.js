/* Speak Nigeria — shared interactions */

/* -----------------------------------------------------------
   Rotating greeting under the big Yorùbá welcome.
   NOTE FOR TEE: Yorùbá, Igbo, and Hausa below are correct.
   The last three are placeholders — please confirm the
   correct "welcome/hello" with a native speaker before launch.
   ----------------------------------------------------------- */
const GREETINGS = [
  { word: "Ẹ káàb" + "o" + "\u0323" + "\u0300", lang: "Yorùbá" },   // Uses an explicit decomposed sequence so the dot-below and grave stay attached to the same letter
  { word: "Nnọọ", lang: "Igbo" },   // Uses direct Unicode characters for the dot-below + ogonek-style mark
  { word: "Barka da zuwa", lang: "Hausa" },   // ✓ verified
  { word: "Obọkhian", lang: "Bini" },   // Uses direct Unicode characters for the dot-below mark
  { word: "Í bó sá",           lang: "Ijaw"   },   // ⚠ verify
  { word: "Emedi",       lang: "Efik"   },   // ✓ verified
];

(function greetingRotator() {
  const big = document.querySelector("[data-greeting]");
  const sub = document.querySelector("[data-greeting-sub]");
  if (!big && !sub) return;
  let i = 0;
  const render = () => {
    if (big) big.textContent = GREETINGS[i].word;
    if (sub) sub.textContent = `Welcome in ${GREETINGS[i].lang}`;
  };
  render();
  if (big) big.style.transition = "opacity .3s ease";
  if (sub) sub.style.transition = "opacity .3s ease";
  setInterval(() => {
    i = (i + 1) % GREETINGS.length;
    if (big) big.style.opacity = 0;
    if (sub) sub.style.opacity = 0;
    setTimeout(() => {
      render();
      if (big) big.style.opacity = 1;
      if (sub) sub.style.opacity = 1;
    }, 300);
  }, 3000);
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

/* Zeffy membership pop-up: stay on the page once Zeffy's script has built
   the modal; if it failed to load, the link opens the Zeffy page instead. */
(function zeffyLinks() {
  document.querySelectorAll("[zeffy-form-link]").forEach(link => {
    link.addEventListener("click", (e) => {
      if (document.querySelector('iframe[src^="https://www.zeffy.com/embed/"]')) e.preventDefault();
    });
  });
})();

/* Courses page forms (class inquiry + language interest): each opens in a
   dialog and posts to a Google Apps Script web app (see apps-script/README.md).
   Without JS or <dialog> support, the trigger links fall back to their href. */
function dialogForm(dialogId, triggerSelector) {
  const dialog = document.getElementById(dialogId);
  if (!dialog || typeof dialog.showModal !== "function") return;

  const form = dialog.querySelector("form");
  const status = form.querySelector(".form-status");
  const submit = form.querySelector('button[type="submit"]');
  const done = form.querySelector(".inquiry-done");
  const hooks = { reset() {} };

  function reset() {
    form.reset();
    hooks.reset();
    status.textContent = "";
    done.hidden = true;
    dialog.classList.remove("is-done");
    submit.disabled = false;
  }

  function open(e) {
    e.preventDefault();
    if (!form.dataset.ready || !done.hidden) { reset(); form.dataset.ready = "1"; }
    form.elements.started.value = Date.now();
    dialog.showModal();
    document.body.classList.add("dialog-open");
  }

  // "Choose at least one" groups: valid when any box is ticked, or when the
  // text field named in data-require-one (e.g. "Another language") is filled
  function groupsMissing() {
    return [...form.querySelectorAll("[data-require-one]")].filter(g => {
      const alt = g.dataset.requireOne && form.elements[g.dataset.requireOne];
      return !g.querySelector("input:checked") && !(alt && alt.value.trim());
    });
  }

  function refreshGroups() {
    const missing = groupsMissing();
    form.querySelectorAll("[data-require-one][aria-invalid]").forEach(g => {
      if (!missing.includes(g)) g.removeAttribute("aria-invalid");
    });
  }

  function clearStatusIfFixed() {
    if (!submit.disabled && !form.querySelector("[aria-invalid]")) status.textContent = "";
  }

  document.querySelectorAll(triggerSelector).forEach(link => link.addEventListener("click", open));
  dialog.addEventListener("close", () => document.body.classList.remove("dialog-open"));
  form.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", () => dialog.close()));
  form.addEventListener("change", (e) => {
    refreshGroups();
    const peers = e.target.type === "radio" ? form.querySelectorAll(`[name="${e.target.name}"]`) : [e.target];
    peers.forEach(el => { if (el.checkValidity()) el.removeAttribute("aria-invalid"); });
    clearStatusIfFixed();
  });
  form.addEventListener("input", (e) => {
    if (e.target.checkValidity()) e.target.removeAttribute("aria-invalid");
    refreshGroups();
    clearStatusIfFixed();
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    form.querySelectorAll("[aria-invalid]").forEach(el => el.removeAttribute("aria-invalid"));
    const invalid = [...form.querySelectorAll("input, select, textarea")].filter(el => !el.checkValidity());
    const groups = groupsMissing();
    if (invalid.length || groups.length) {
      invalid.forEach(el => el.setAttribute("aria-invalid", "true"));
      groups.forEach(g => g.setAttribute("aria-invalid", "true"));
      status.textContent = "Please fill in the highlighted fields.";
      (groups[0]?.querySelector("input") || invalid[0]).focus();
      return;
    }

    const data = new URLSearchParams(new FormData(form));
    const endpoint = form.dataset.endpoint;
    submit.disabled = true;
    status.textContent = "Sending…";

    try {
      if (!endpoint) {
        // Not connected: preview the thank-you screen locally only.
        if (!/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) throw new Error("not configured");
        console.info("Form (preview, not sent):", [...data]);
        await new Promise(r => setTimeout(r, 600));
      } else {
        const res = await fetch(endpoint, { method: "POST", body: data });
        const json = await res.json();
        if (!json.ok) throw new Error(json.error || "failed");
      }
      status.textContent = "";
      done.hidden = false;
      dialog.classList.add("is-done");
      done.querySelector("button").focus();
    } catch (err) {
      submit.disabled = false;
      status.innerHTML = 'Sorry, that didn\'t send. Please try again, or email <a href="mailto:hello@speaknigeria.org">hello@speaknigeria.org</a>.';
    }
  });

  return { form, hooks };
}

/* Class inquiry: one row of fields per child, added from a <template> */
(function inquiryForm() {
  const setup = dialogForm("inquiry", "[data-form-info]");
  const tpl = document.getElementById("child-row");
  if (!setup || !tpl) return;

  const MAX_CHILDREN = 6;
  const { form, hooks } = setup;
  const list = form.querySelector("[data-children]");
  const addBtn = form.querySelector("[data-add-child]");

  function renumber() {
    list.querySelectorAll(".child").forEach((child, i) => {
      child.querySelector(".child-label").textContent = `Child ${i + 1}`;
      child.querySelectorAll("[data-name]").forEach(el => { el.name = `${el.dataset.name}_${i}`; });
    });
    addBtn.hidden = list.children.length >= MAX_CHILDREN;
  }

  function addChild() {
    list.appendChild(tpl.content.cloneNode(true));
    renumber();
  }

  hooks.reset = () => { list.innerHTML = ""; addChild(); };
  addBtn.addEventListener("click", () => {
    addChild();
    list.lastElementChild.querySelector("input").focus();
  });
  list.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-remove-child]");
    if (btn && list.children.length > 1) { btn.closest(".child").remove(); renumber(); }
  });
})();

/* Language interest */
dialogForm("interest", "[data-form-interest]");
