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

    return new Response(renderLanding(), {
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'public, max-age=120',
      },
    });
  },
};

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
      display: grid;
      place-items: center;
      border-radius: .58rem;
      background: linear-gradient(145deg, var(--pink), var(--accent));
      color: white;
      box-shadow: 0 1rem 2rem rgba(233, 30, 115, .24);
      font-size: 1.35rem;
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
          <div class="mark" aria-hidden="true">🍑</div>
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
        <a class="follow" href="https://x.com/bootyblockapp" rel="noreferrer" target="_blank">Follow for updates ↗</a>
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
