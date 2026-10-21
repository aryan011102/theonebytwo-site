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
