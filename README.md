# speaknigeria.org

Website for **Speak Nigeria**, a nonprofit helping children connect with
Nigerian heritage languages.

Plain static HTML/CSS/JS. No build step. Deployed on **Cloudflare Pages** with
DNS at **Squarespace**.

---

## Repo structure

```
speaknigeria/
├── index.html          Home
├── about.html          About + mission statement
├── courses.html        Online courses for children
├── resources.html      Open-source games + YouTube videos
├── favicon.svg
├── robots.txt
├── sitemap.xml
├── _headers            Cloudflare Pages: security + cache headers
├── _redirects          Cloudflare Pages: clean URLs (/about → /about.html)
├── assets/
│   ├── styles.css      Design system (all styling)
│   └── main.js         Greeting rotator, scroll reveal, mobile menu
├── .gitignore
├── LICENSE             MIT
└── README.md           This file
```

`_headers` and `_redirects` are Cloudflare Pages conventions — Cloudflare reads
them automatically at deploy time. No config needed elsewhere.

---

## Local preview

Any static server works. From this folder:

```bash
# Python (already installed on most systems)
python3 -m http.server 8080

# or Node
npx serve .
```

Then open http://localhost:8080.

---

## Push to GitHub

Create an empty repo on GitHub first (e.g. `speak-nigeria/website`), then:

```bash
cd speaknigeria
git init
git add .
git commit -m "Initial site scaffold"
git branch -M main
git remote add origin git@github.com:speak-nigeria/website.git
git push -u origin main
```

---

## Deploy to Cloudflare Pages

1. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git**.
2. Pick the repo. Build settings:
   - **Framework preset:** None
   - **Build command:** *(leave blank)*
   - **Build output directory:** `/`
3. Deploy. You'll get a `*.pages.dev` preview URL.

Every push to `main` will auto-deploy from now on.

---

## DNS: point speaknigeria.org at it (staying on Squarespace)

In **Cloudflare Pages → your project → Custom domains**, add both
`www.speaknigeria.org` and `speaknigeria.org`. Cloudflare will give you a target
like `speak-nigeria.pages.dev`.

In **Squarespace → your domain → DNS settings**:

| Type   | Host | Value                         |
|--------|------|-------------------------------|
| CNAME  | www  | `speak-nigeria.pages.dev`     |
| ALIAS/ANAME (if supported) | @ | `speak-nigeria.pages.dev` |

If Squarespace doesn't support ALIAS/ANAME at the apex, use domain **forwarding**
to redirect `speaknigeria.org` → `https://www.speaknigeria.org` and treat `www`
as canonical.

Cloudflare provisions SSL automatically once DNS validates (usually minutes,
sometimes a few hours).

---

## Before launch — fill these in

Search the codebase for each:

1. **YouTube link** — `data-youtube` (footer of every page + resources page).
   Replace `href="#"` with your channel URL.
2. **Games link** — `data-games` on `resources.html`. Point at your game app
   (e.g. your Netlify deployment).
3. **Email** — `hello@speaknigeria.org`. Change if you use a different address.
4. **Language greetings** — `assets/main.js`, the `GREETINGS` array.
   Yoruba, Igbo, and Hausa are correct.
   **Bini, Ijaw, and Efik are placeholders** — confirm with a native speaker.
5. **Logo** — the brand mark is the letter "Ṣ" for now (`.brand-mark` in
   `styles.css`, and `favicon.svg`). Swap for real artwork when ready.

---

## License

Site content and code © 2026 Speak Nigeria, released under the MIT License.
