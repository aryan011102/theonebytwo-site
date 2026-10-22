// Homepage motion: reveal sections as they scroll in, count numbers up,
// shuffle the names in blind mode and let floating tiles lean from the pointer.
// The page reads fine without it; every animated element has a resting state.
(() => {
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const countUp = (el) => {
    const to = Number(el.dataset.countTo);
    const from = Number(el.dataset.countFrom || 0);
    const start = performance.now();
    const step = (now) => {
      const p = Math.min((now - start) / 1400, 1);
      el.textContent = Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  if (!still) {
    document.querySelectorAll('[data-count-to]').forEach((el) => {
      el.textContent = el.dataset.countFrom || 0;
    });
  }

  const reveal = (el) => {
    if (el.classList.contains('in')) return;
    el.classList.add('in');
    if (!still) {
      el.querySelectorAll('[data-count-to]').forEach((n) => {
        setTimeout(() => countUp(n), Number(n.dataset.countDelay || 0));
      });
    }
  };
  const seen = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      reveal(entry.target);
      seen.unobserve(entry.target);
    }
  }, { threshold: 0.2 });
  document.querySelectorAll('[data-reveal]').forEach((el) => seen.observe(el));

  // Blind mode's tiles: the page has one block; three copies make a 2 × 2 plane,
  // so it can drift one block across and one down and start again unseen.
  document.querySelectorAll('.bl-plane').forEach((plane) => {
    const block = plane.querySelector('.bl-block');
    for (let i = 0; i < 3; i += 1) plane.append(block.cloneNode(true));
    plane.classList.add('looping');
  });

  // Blind mode: every few seconds the floating names swap for new people.
  const blind = document.querySelector('[data-shuffle]');
  if (blind && !still) {
    const names = ['Ananya', 'Rahul', 'Kritika', 'Meher', 'Kabir', 'Zoya', 'Ishaan', 'Tara', 'Vikram', 'Naina', 'Aarav', 'Riya'];
    const chips = blind.querySelectorAll('.who');
    const button = blind.querySelector('.shuf');
    let next = chips.length;
    let turns = 0;
    let visible = false;
    new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }).observe(blind);
    setInterval(() => {
      if (!visible || document.hidden) return;
      turns += 1;
      button.style.rotate = `${turns * 180}deg`;
      blind.classList.add('shuffling');
      setTimeout(() => {
        chips.forEach((chip) => { chip.textContent = names[next++ % names.length]; });
        blind.classList.remove('shuffling');
      }, 380);
    }, 2800);
  }

  // Desktop strip: while it is pinned, scrolling down slides the cards sideways.
  const strip = document.querySelector('[data-strip]');
  if (strip) {
    const track = strip.querySelector('.strip-track');
    const bar = strip.querySelector('.strip-progress i');
    const cards = [...track.children];
    const wide = matchMedia('(min-width: 900px)');
    let travel = 0;
    const move = () => {
      if (!wide.matches || !travel) return;
      const p = Math.min(Math.max(-strip.getBoundingClientRect().top / travel, 0), 1);
      track.style.translate = `${-p * travel}px 0`;
      bar.style.scale = `${p} 1`;
      // Cards move sideways inside a pinned box, so reveal them here as they slide in.
      if (strip.getBoundingClientRect().top < innerHeight * 0.5) {
        for (const card of cards) if (card.getBoundingClientRect().left < innerWidth * 0.85) reveal(card);
      }
    };
    const measure = () => {
      if (!wide.matches) {
        travel = 0;
        strip.style.height = '';
        track.style.translate = '';
        return;
      }
      // Fit the 952px-tall cards between the nav (64px) and the progress bar.
      const room = strip.querySelector('.strip-sticky').clientHeight - 64 - 72;
      track.style.setProperty('--cz', Math.min(1, room / 952).toFixed(3));
      travel = Math.max(track.scrollWidth - innerWidth, 0);
      strip.style.height = `${travel + innerHeight}px`;
      move();
    };
    addEventListener('scroll', move, { passive: true });
    addEventListener('resize', measure);
    wide.addEventListener('change', measure);
    measure();
  }

  // The waitlist: a wall of everyone who joined, newest first, and the form over it.
  // Tiles take the app's shapes and colours, picked by place number, so a tile
  // looks the same for everyone. Empty slots are plain tiles, never made-up names.
  const fold = document.querySelector('[data-waitlist]');
  if (fold) {
    const local = ['localhost', '127.0.0.1'].includes(location.hostname);
    const api = (local && new URLSearchParams(location.search).get('api')) || fold.dataset.api;
    const wallEl = fold.querySelector('.wall');
    const countEl = fold.querySelector('.wl-count');
    const form = fold.querySelector('.wl-form');
    const errorEl = form.querySelector('.wl-error');
    const button = form.querySelector('.wl-submit');
    const SHAPES = ['big', 'half', 'tall', 'wide', 'half', 'half', 'wide', 'tall'];
    const COLORS = [
      'linear-gradient(160deg,#9b4487,#4a1d42)',
      'linear-gradient(160deg,#2c8479,#0b3f3a)',
      'linear-gradient(160deg,#c9812b,#7a3a04)',
      'linear-gradient(160deg,#5b49a8,#241a4c)',
      'linear-gradient(160deg,#c24e66,#6e162c)',
      'linear-gradient(165deg,#3f8a49,#1d4424)',
      'linear-gradient(160deg,#7b4a30,#3b2117)',
      'linear-gradient(160deg,#d4483a,#8a2318)',
    ];
    const SLOTS = 40;
    const seen = new Set();
    let shown = [];
    let mine = null;
    let drawn = false;

    const tile = (entry, n) => {
      const el = document.createElement('div');
      el.className = `wtile ${SHAPES[n % SHAPES.length]}`;
      el.style.setProperty('--bg', COLORS[(n * 3) % COLORS.length]);
      if (!entry) {
        el.classList.add('blank');
        return el;
      }
      const name = document.createElement('b');
      name.textContent = entry.name;
      const place = document.createElement('span');
      place.textContent = `Waitlisted at #${entry.position}`;
      el.append(name, place);
      if (drawn && !seen.has(entry.position) && !still) el.classList.add('fresh');
      if (entry.position === mine) el.classList.add('mine');
      return el;
    };

    const draw = () => {
      const tiles = shown.map((entry) => tile(entry, entry.position));
      for (let i = shown.length; i < SLOTS; i += 1) tiles.push(tile(null, i));
      wallEl.replaceChildren(...tiles);
      shown.forEach((entry) => seen.add(entry.position));
      drawn = true;
    };

    const load = async () => {
      try {
        const res = await fetch(`${api}/api/v1/waitlist/wall`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        const changed = data.entries.map((e) => e.position).join() !== shown.map((e) => e.position).join();
        shown = data.entries;
        if (changed) draw();
        if (data.total > 0) {
          const people = data.total === 1 ? 'person has' : 'people have';
          countEl.textContent = `${data.total.toLocaleString('en-IN')} ${people} joined`;
          countEl.hidden = false;
        }
      } catch {
        // Offline or the server is away: the wall of plain tiles stays.
      }
    };

    draw();
    // New joiners appear for everyone while the fold is near the screen; a tab in
    // the background asks nothing.
    const near = () => {
      const r = fold.getBoundingClientRect();
      return r.top < innerHeight + 300 && r.bottom > -300;
    };
    new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) load();
    }, { rootMargin: '300px 0px' }).observe(fold);
    if (near()) load();
    setInterval(() => {
      if (!document.hidden && near()) load();
    }, 5000);

    const fail = (message, field) => {
      errorEl.textContent = message;
      errorEl.hidden = false;
      form.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
      if (field) {
        field.setAttribute('aria-invalid', 'true');
        field.focus();
      }
    };

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      errorEl.hidden = true;
      const f = form.elements;
      const name = f.full_name.value.trim();
      const age = Number(f.age.value);
      const email = f.email.value.trim();
      let code = f.code.value.trim();
      if (code && !code.startsWith('+')) code = `+${code}`;
      if (!name) return fail('Tell us your name.', f.full_name);
      if (!Number.isInteger(age) || age < 18) return fail('You need to be 18 or older to join.', f.age);
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail('That email address does not look right.', f.email);
      if (!/^\+\d{1,4}$/.test(code)) return fail('Add your country code, like +91.', f.code);
      if (f.phone.value.replace(/\D/g, '').length < 6) return fail('That phone number does not look right.', f.phone);

      button.disabled = true;
      button.textContent = 'Joining…';
      try {
        const res = await fetch(`${api}/api/v1/waitlist`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            full_name: name,
            age,
            email,
            phone: `${code}${f.phone.value}`,
            company: f.company.value,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return fail(data?.error?.message || 'Something went wrong. Try again.');
        mine = data.position;
        if (!shown.some((entry) => entry.position === mine)) {
          shown = [{ position: data.position, name: data.name }, ...shown].slice(0, SLOTS);
        }
        draw();
        fold.querySelector('.wl-done-number b').textContent = data.position;
        fold.querySelector('.wl-done-kicker').textContent = data.already
          ? 'You’re already on the waitlist'
          : 'You’re on the waitlist';
        fold.querySelector('.wl-form-view').hidden = true;
        const done = fold.querySelector('.wl-done-view');
        done.hidden = false;
        done.tabIndex = -1;
        done.focus();
      } catch {
        fail('We could not reach the waitlist. Check your connection and try again.');
      } finally {
        button.disabled = false;
        button.textContent = 'Join the waitlist';
      }
      return undefined;
    });
  }

  // Floating tiles lean away from the pointer, on devices that have one.
  if (!still && matchMedia('(pointer: fine)').matches) {
    document.querySelectorAll('[data-parallax]').forEach((field) => {
      field.addEventListener('pointermove', (e) => {
        const r = field.getBoundingClientRect();
        field.style.setProperty('--px', ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
        field.style.setProperty('--py', ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
      });
      field.addEventListener('pointerleave', () => {
        field.style.setProperty('--px', 0);
        field.style.setProperty('--py', 0);
      });
    });
  }
})();
