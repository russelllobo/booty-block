const TABLE_FALLBACK = 'waitlist_signups';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(request) });
    }

    if (url.pathname === '/api/waitlist') {
      return handleWaitlist(request, env);
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return json({ error: 'Method not allowed' }, 405, request);
    }

    const pathname = url.pathname.replace(/\/+$/, '') || '/';
    const pages = {
      '/privacy': renderPrivacy,
      '/support': renderSupport,
    };
    const renderPage = pages[pathname];

    if (renderPage) {
      return html(renderPage(), 200);
    }

    if (pathname !== '/') {
      return html(renderNotFound(), 404);
    }

    return html(renderLanding(), 200, {
      'cache-control': 'public, max-age=120',
    });
  },
};

function html(body, status = 200, extraHeaders = {}) {
  return new Response(body, {
    status,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=3600',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'strict-origin-when-cross-origin',
      ...extraHeaders,
    },
  });
}

function renderPrivacy() {
  return renderInfoPage({
    title: 'Privacy Policy',
    description: 'How Bootyblock handles information in the app and on this website.',
    content: `
      <p class="updated">Effective June 21, 2026</p>
      <p>Bootyblock is designed to keep your workout and app-blocking activity private. This policy explains what information Bootyblock processes and why.</p>

      <h2>Information the app processes</h2>
      <p>Bootyblock uses the camera to count squats. Camera frames and pose measurements are processed on your device and are not recorded, stored as video, or uploaded to our servers.</p>
      <p>If you grant Screen Time access, Apple provides Bootyblock with the controls needed to let you choose and temporarily block apps. Your selections are handled through Apple’s Family Controls and Device Activity frameworks. Bootyblock does not receive your browsing history, messages, passwords, or the contents of other apps.</p>
      <p>Preferences such as onboarding status, goals, selected-app setup status, and earned unlock sessions are stored locally on your device.</p>

      <h2>Website and waitlist information</h2>
      <p>If you join the waitlist, we collect your email address. We may also store limited technical information sent with the request, such as your browser user agent and referring page, to operate and protect the waitlist.</p>

      <h2>How information is used</h2>
      <ul>
        <li>Provide app-blocking, squat-counting, and unlock features.</li>
        <li>Remember your settings on your device.</li>
        <li>Send product availability or launch updates if you joined the waitlist.</li>
        <li>Maintain security, prevent abuse, and troubleshoot the service.</li>
      </ul>

      <h2>Sharing and service providers</h2>
      <p>We do not sell your personal information. We use service providers, including Cloudflare for website delivery and Supabase for waitlist storage, only to operate the service. They process information under their own applicable terms and privacy commitments.</p>

      <h2>Retention and deletion</h2>
      <p>App preferences remain on your device until you reset the app or remove it. Waitlist information is retained while it is needed for launch communications and service administration. You may request deletion of your waitlist information by contacting us.</p>

      <h2>Children</h2>
      <p>Bootyblock is not directed to children under 13, and we do not knowingly collect personal information from children under 13.</p>

      <h2>Changes to this policy</h2>
      <p>We may update this policy as Bootyblock evolves. The effective date at the top of this page will show when the latest version took effect.</p>

      <h2>Contact</h2>
      <p>Questions or privacy requests can be sent to <a href="mailto:russell@russell.systems">russell@russell.systems</a>.</p>
    `,
  });
}

function renderSupport() {
  return renderInfoPage({
    title: 'Bootyblock Support',
    description: 'Help with camera access, Screen Time setup, app selection, and local Bootyblock data.',
    content: `
      <p class="updated">We’re here to help.</p>
      <p>For support, email <a href="mailto:russell@russell.systems?subject=Bootyblock%20support">russell@russell.systems</a>. Include your iPhone model, iOS version, and a short description of what happened. Please do not send passwords or other sensitive information.</p>

      <h2>Camera or squat counting</h2>
      <p>Open iPhone Settings, find Bootyblock, and confirm Camera access is enabled. Place your phone where your full body is visible, use even lighting, and keep the camera steady while completing each squat.</p>

      <h2>Screen Time access</h2>
      <p>Bootyblock needs Apple’s Screen Time permission to block selected apps. If access was declined, review Bootyblock’s permission in iPhone Settings and try the setup again from Bootyblock Settings.</p>

      <h2>Changing blocked apps</h2>
      <p>Open Bootyblock, go to Settings, and choose “Change selection” under Blocked apps. Apple’s app picker lets you update the apps and categories managed by Bootyblock.</p>

      <h2>Resetting local data</h2>
      <p>Use “Reset app data” in Bootyblock Settings to clear onboarding, goals, and local session state from the device. You can also remove local app data by deleting the app.</p>

      <h2>Privacy</h2>
      <p>Read the <a href="/privacy">Bootyblock Privacy Policy</a> for details about on-device camera processing, Screen Time access, and waitlist information.</p>
    `,
  });
}

function renderNotFound() {
  return renderInfoPage({
    title: 'Page not found',
    description: 'The page you requested does not exist.',
    content: '<p>That page is not available. Return to the <a href="/">Bootyblock home page</a>.</p>',
  });
}

function renderInfoPage({ title, description, content }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} — Bootyblock</title>
  <meta name="description" content="${description}">
  <meta name="theme-color" content="#fff1f6">
  <link rel="icon" href="/favicon.png" type="image/png">
  <style>
    :root { color-scheme: light; --ink:#29101b; --muted:#805c6a; --line:#ffd0e3; --accent:#e91e73; }
    * { box-sizing: border-box; }
    body { margin:0; color:var(--ink); background:#fff7fa; font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
    a { color:#af1555; font-weight:700; }
    .shell { width:min(100% - 2rem, 48rem); margin:0 auto; }
    header { padding:1.5rem 0; border-bottom:1px solid var(--line); }
    .brand { display:inline-flex; align-items:center; gap:.65rem; color:var(--ink); font-size:1.18rem; font-weight:850; text-decoration:none; }
    .brand img { width:2rem; height:2rem; object-fit:contain; }
    main { padding:clamp(3rem,8vw,6rem) 0; }
    article { padding:clamp(1.5rem,5vw,3.5rem); border:1px solid #ffe0ec; border-radius:1.5rem; background:white; box-shadow:0 1.5rem 4rem rgba(175,21,85,.07); }
    h1 { margin:0; font-size:clamp(2.4rem,7vw,4.25rem); line-height:1; letter-spacing:-.045em; }
    h2 { margin:2.25rem 0 .65rem; font-size:1.3rem; line-height:1.25; }
    p, li { color:#573343; font-size:1rem; line-height:1.72; }
    p { margin:.75rem 0; }
    ul { padding-left:1.25rem; }
    .updated { margin:1rem 0 1.75rem; color:var(--muted); font-weight:700; }
    footer { display:flex; flex-wrap:wrap; gap:1rem 1.5rem; padding:0 0 3rem; color:var(--muted); font-size:.9rem; }
    footer a { color:inherit; }
  </style>
</head>
<body>
  <header>
    <div class="shell">
      <a class="brand" href="/"><img src="/logo.png" alt="" width="87" height="128"><span>Bootyblock</span></a>
    </div>
  </header>
  <main class="shell">
    <article>
      <h1>${title}</h1>
      ${content}
    </article>
  </main>
  <footer class="shell">
    <span>© 2026 Bootyblock</span>
    <a href="/privacy">Privacy</a>
    <a href="/support">Support</a>
  </footer>
</body>
</html>`;
}

async function handleWaitlist(request, env) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405, request);
  }

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return json({ error: 'Waitlist is not configured yet.' }, 503, request);
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'Send a valid email address.' }, 400, request);
  }

  if (payload?.company) {
    return json({ ok: true, message: 'You are on the list.' }, 200, request);
  }

  const email = String(payload?.email || '').trim().toLowerCase();
  if (!isValidEmail(email)) {
    return json({ error: 'Enter a valid email address.' }, 422, request);
  }

  const table = encodeURIComponent(env.WAITLIST_TABLE || TABLE_FALLBACK);
  const endpoint = `${env.SUPABASE_URL.replace(/\/+$/, '')}/rest/v1/${table}`;
  const insert = {
    email,
    source: 'bootyblock.app',
    user_agent: request.headers.get('user-agent') || null,
    referrer: request.headers.get('referer') || null,
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'content-type': 'application/json',
      prefer: 'return=minimal',
    },
    body: JSON.stringify(insert),
  });

  if (response.ok) {
    return json({ ok: true, message: 'You are on the list.' }, 201, request);
  }

  if (response.status === 409) {
    return json({ ok: true, message: 'You are already on the list.' }, 200, request);
  }

  return json({ error: 'Could not join the waitlist yet.' }, 502, request);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && email.length <= 254;
}

function json(body, status, request) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...corsHeaders(request),
    },
  });
}

function corsHeaders(request) {
  const origin = request.headers.get('origin');
  const allowed = origin && /^https?:\/\/(www\.)?bootyblock\.app$/i.test(origin);
  return {
    'access-control-allow-origin': allowed ? origin : 'https://bootyblock.app',
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
  };
}

function renderLanding() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Bootyblock</title>
  <meta name="description" content="An app that blocks your distractions until you pay the squat tax.">
  <meta property="og:title" content="Bootyblock">
  <meta property="og:description" content="Block your distracting apps. Unlock them with squats.">
  <meta property="og:type" content="website">
  <meta name="theme-color" content="#fff1f6">
  <link rel="icon" href="/favicon.png" type="image/png">
  <style>
    :root {
      color-scheme: light;
      --ink: #29101b;
      --muted: #805c6a;
      --soft: #fff1f6;
      --line: #ffd0e3;
      --accent: #e91e73;
      --accent-dark: #af1555;
      --pink: #ff8fbe;
    }

    * {
      box-sizing: border-box;
    }

    html {
      scroll-behavior: smooth;
    }

    body {
      margin: 0;
      min-height: 100vh;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: var(--ink);
      background:
        radial-gradient(circle at 82% 18%, rgba(255, 214, 231, .92), rgba(255, 214, 231, 0) 26rem),
        radial-gradient(circle at 10% 86%, rgba(255, 143, 190, .3), rgba(255, 143, 190, 0) 23rem),
        linear-gradient(118deg, #fff1f6 0%, #ffe3ef 48%, #fff8fb 100%);
      letter-spacing: 0;
    }

    a {
      color: inherit;
    }

    .page {
      min-height: 100svh;
      overflow: hidden;
    }

    .hero {
      width: 100%;
      min-height: 100svh;
      display: grid;
      grid-template-columns: minmax(2rem, 1fr) minmax(0, 36rem) minmax(22rem, 32rem) minmax(2rem, 1fr);
      align-items: center;
      gap: clamp(2rem, 5vw, 7rem);
      padding: clamp(2rem, 4vw, 4rem) 0;
    }

    .copy {
      grid-column: 2;
      animation: rise .72s cubic-bezier(.2,.8,.2,1) both;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: .75rem;
      margin-bottom: 1.7rem;
      font-weight: 800;
      font-size: clamp(1.35rem, 2vw, 1.62rem);
      line-height: 1;
    }

    .mark {
      width: 2.35rem;
      height: 2.35rem;
      object-fit: contain;
      filter: drop-shadow(0 .65rem .8rem rgba(175, 21, 85, .2));
    }

    h1 {
      max-width: 11ch;
      margin: 0;
      font-size: clamp(3.2rem, 7.5vw, 5.05rem);
      line-height: .98;
      letter-spacing: 0;
      font-weight: 850;
    }

    .lede {
      max-width: 33rem;
      margin: 1.25rem 0 1.75rem;
      color: #4f2536;
      font-size: clamp(1rem, 1.5vw, 1.22rem);
      line-height: 1.55;
    }

    .waitlist {
      display: flex;
      width: min(100%, 31rem);
      min-height: 3.75rem;
      border: 1px solid var(--line);
      border-radius: .55rem;
      overflow: hidden;
      background: rgba(255,255,255,.76);
      box-shadow: 0 1.25rem 3.5rem rgba(175, 21, 85, .1);
    }

    .waitlist input[type="email"] {
      min-width: 0;
      flex: 1;
      border: 0;
      background: transparent;
      padding: 0 1.15rem;
      color: var(--ink);
      font: inherit;
      outline: 0;
    }

    .waitlist input[name="company"] {
      display: none;
    }

    .waitlist button {
      border: 0;
      min-width: 9rem;
      padding: 0 1.25rem;
      color: white;
      background: linear-gradient(135deg, var(--accent), var(--accent-dark));
      font-weight: 800;
      font: inherit;
      cursor: pointer;
      transition: transform .18s ease, filter .18s ease, background .18s ease;
    }

    .waitlist button:hover {
      filter: brightness(1.06);
    }

    .waitlist button:active {
      transform: translateY(1px);
    }

    .waitlist button[disabled] {
      cursor: wait;
      filter: saturate(.7);
    }

    .form-note {
      min-height: 1.4rem;
      margin-top: .75rem;
      color: var(--muted);
      font-size: .92rem;
    }

    .follow {
      display: inline-flex;
      gap: .35rem;
      align-items: center;
      margin-top: 1.2rem;
      color: #986176;
      font-size: .95rem;
      font-weight: 700;
      text-decoration: none;
      transition: color .18s ease, transform .18s ease;
    }

    .follow:hover {
      color: var(--ink);
      transform: translateY(-1px);
    }

    .site-links {
      display: flex;
      flex-wrap: wrap;
      gap: .7rem 1.1rem;
      margin-top: 1.4rem;
      color: var(--muted);
      font-size: .86rem;
    }

    .site-links a {
      text-underline-offset: .2rem;
    }

    .visual {
      grid-column: 3;
      justify-self: center;
      position: relative;
      width: min(28rem, 88vw);
      height: min(42rem, 82svh);
      min-height: 34rem;
      animation: phone-in .82s .12s cubic-bezier(.2,.8,.2,1) both;
    }

    .phone {
      position: absolute;
      inset: 0;
      margin: auto;
      width: min(17.2rem, 60vw);
      height: min(35.6rem, 76svh);
      min-height: 32rem;
      border: .38rem solid #0f1014;
      border-radius: 2.65rem;
      background: #0f1014;
      box-shadow: 0 2rem 5rem rgba(17, 18, 24, .22);
      overflow: hidden;
    }

    .screen {
      position: absolute;
      inset: .45rem;
      overflow: hidden;
      border-radius: 2.1rem;
      background: #020205;
    }

    @keyframes rise {
      from { opacity: 0; transform: translateY(18px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @keyframes phone-in {
      from { opacity: 0; transform: translateY(26px) rotate(1deg); }
      to { opacity: 1; transform: translateY(0) rotate(0); }
    }

    @media (max-width: 860px) {
      .hero {
        min-height: auto;
        grid-template-columns: minmax(1.25rem, 1fr) minmax(0, 34rem) minmax(1.25rem, 1fr);
        gap: 2.5rem;
        padding: 2rem 0 0;
      }

      .copy,
      .visual {
        grid-column: 2;
      }

      h1 {
        max-width: 10.5ch;
      }

      .visual {
        height: 32rem;
        min-height: 32rem;
        margin-top: .4rem;
      }

      .phone {
        width: 16rem;
        height: 31.5rem;
        min-height: 31.5rem;
      }

    }

    @media (max-width: 520px) {
      body {
        background: linear-gradient(145deg, #fff1f6 0%, #ffe0ed 100%);
      }

      .hero {
        padding-top: 1.25rem;
      }

      .brand {
        margin-bottom: 1.15rem;
        font-size: 1.5rem;
      }

      .mark {
        width: 3.3rem;
        height: 3.3rem;
        font-size: 1.8rem;
      }

      h1 {
        font-size: clamp(3.45rem, 15vw, 4.25rem);
        line-height: 1.02;
      }

      .lede {
        margin-top: 1rem;
        font-size: 1.28rem;
        line-height: 1.48;
      }

      .waitlist {
        display: grid;
        min-height: 0;
      }

      .waitlist input[type="email"] {
        min-height: 3.4rem;
      }

      .waitlist button {
        min-height: 3.35rem;
        width: 100%;
      }

      .visual {
        width: 100%;
        height: 29rem;
        min-height: 29rem;
      }

      .phone {
        width: 14.5rem;
        height: 28.8rem;
        min-height: 28.8rem;
      }

    }
  </style>
</head>
<body>
  <main class="page">
    <section class="hero" aria-labelledby="headline">
      <div class="copy">
        <div class="brand" aria-label="Bootyblock">
          <img class="mark" src="/logo.png" alt="" width="87" height="128">
          <span>Bootyblock</span>
        </div>
        <h1 id="headline">App blocks with a squat tax</h1>
        <p class="lede">Block your distracting apps. Unlock them by doing the squats you promised yourself.</p>
        <form class="waitlist" id="waitlist" novalidate>
          <input id="email" name="email" type="email" inputmode="email" autocomplete="email" placeholder="Enter your email" required>
          <input name="company" type="text" tabindex="-1" autocomplete="off" aria-hidden="true">
          <button type="submit">Join waitlist</button>
        </form>
        <p class="form-note" id="form-note" role="status" aria-live="polite"></p>
        <a class="follow" href="https://www.tiktok.com/@booty.block" rel="noreferrer" target="_blank">Follow on TikTok ↗</a>
        <nav class="site-links" aria-label="Legal and support">
          <a href="/privacy">Privacy Policy</a>
          <a href="/support">Support</a>
        </nav>
      </div>

      <div class="visual" aria-hidden="true">
        <div class="phone">
          <div class="screen"></div>
        </div>
      </div>
    </section>
  </main>

  <script>
    const form = document.querySelector('#waitlist');
    const note = document.querySelector('#form-note');
    const email = document.querySelector('#email');
    const button = form.querySelector('button');

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      note.textContent = '';

      if (!email.validity.valid) {
        note.textContent = 'Enter a valid email address.';
        email.focus();
        return;
      }

      button.disabled = true;
      button.textContent = 'Joining...';

      try {
        const response = await fetch('/api/waitlist', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(Object.fromEntries(new FormData(form))),
        });
        const result = await response.json();
        note.textContent = result.message || result.error || 'Something went sideways. Try again.';
        if (response.ok) form.reset();
      } catch {
        note.textContent = 'Could not reach the waitlist. Try again in a moment.';
      } finally {
        button.disabled = false;
        button.textContent = 'Join waitlist';
      }
    });
  </script>
</body>
</html>`;
}
