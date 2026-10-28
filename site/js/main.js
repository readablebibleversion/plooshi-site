/* Plooshi — shared interactivity: sound, mascot, videos, filters, reveal, confetti */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const store = {
    get(k, d) { try { const v = localStorage.getItem('plooshi:' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('plooshi:' + k, JSON.stringify(v)); } catch (e) {} }
  };

  /* ---------- Tiny synth (no audio files needed) ---------- */
  let ctx = null;
  let soundOn = store.get('sound', true);
  function ac() {
    if (!ctx) { const A = window.AudioContext || window.webkitAudioContext; if (A) ctx = new A(); }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function tone(freq, dur = 0.5, type = 'sine', vol = 0.25, when = 0) {
    if (!soundOn) return;
    const c = ac(); if (!c) return;
    const t = c.currentTime + when;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.05);
    // shimmer overtone for a xylophone-y sound
    if (type === 'sine') {
      const o2 = c.createOscillator(), g2 = c.createGain();
      o2.frequency.setValueAtTime(freq * 4, t); g2.gain.setValueAtTime(vol * 0.15, t);
      g2.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.3);
      o2.connect(g2); g2.connect(c.destination); o2.start(t); o2.stop(t + dur);
    }
  }
  const NOTES = { C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392, A4: 440, B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.25 };
  const sfx = {
    pop() { tone(600 + Math.random() * 500, 0.12, 'triangle', 0.2); },
    boing() { if (!soundOn) return; const c = ac(); if (!c) return; const t = c.currentTime, o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(180, t); o.frequency.exponentialRampToValueAtTime(620, t + 0.15); o.frequency.exponentialRampToValueAtTime(260, t + 0.35); g.gain.setValueAtTime(0.25, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4); o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + 0.45); },
    yay() { ['C5', 'E5', 'G4', 'C5'].forEach((n, i) => tone(NOTES[n] * (i === 2 ? 2 : 1), 0.35, 'sine', 0.2, i * 0.09)); },
    oops() { tone(220, 0.25, 'triangle', 0.15); tone(185, 0.3, 'triangle', 0.15, 0.12); },
    jingle() { ['C4', 'E4', 'G4', 'C5', 'G4', 'C5'].forEach((n, i) => tone(NOTES[n], 0.4, 'sine', 0.22, i * 0.11)); }
  };
  window.Plooshi = { tone, NOTES, sfx, store, confetti, say };

  function syncSoundBtn() {
    $$('.sound-btn').forEach(b => { b.setAttribute('aria-pressed', soundOn); b.textContent = soundOn ? '🔊' : '🔇'; b.setAttribute('aria-label', soundOn ? 'Turn sounds off' : 'Turn sounds on'); });
  }
  $$('.sound-btn').forEach(b => b.addEventListener('click', () => { soundOn = !soundOn; store.set('sound', soundOn); syncSoundBtn(); if (soundOn) sfx.pop(); }));
  syncSoundBtn();

  /* ---------- Mobile menu ---------- */
  const menuBtn = $('.menu-btn'), nav = $('.nav');
  if (menuBtn) menuBtn.addEventListener('click', () => { const o = nav.classList.toggle('open'); menuBtn.setAttribute('aria-expanded', o); menuBtn.textContent = o ? '✕' : '☰'; });

  /* ---------- Speech (optional, for pre-readers) ---------- */
  function say(text) {
    if (!soundOn || !('speechSynthesis' in window)) return;
    try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.rate = 1; u.pitch = 1.5; speechSynthesis.speak(u); } catch (e) {}
  }

  /* ---------- Confetti ---------- */
  function confetti(n = 80) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const colors = ['#ec3d8f', '#5ec8f2', '#ffc93c', '#6fdcae', '#8b6cf0', '#ff8a3d'];
    for (let i = 0; i < n; i++) {
      const c = document.createElement('i'); c.className = 'confetti';
      c.style.left = Math.random() * 100 + 'vw'; c.style.background = colors[i % colors.length];
      c.style.animationDuration = 1.8 + Math.random() * 1.8 + 's'; c.style.animationDelay = Math.random() * 0.4 + 's';
      c.style.borderRadius = Math.random() > 0.5 ? '50%' : '3px';
      document.body.appendChild(c); setTimeout(() => c.remove(), 4200);
    }
  }

  /* ---------- Mascot ---------- */
  const phrases = ['Hi friend! 👋', "Let's sing! 🎵", 'Tee-hee! That tickles!', 'Boing boing! 🦘', 'You are awesome! ⭐', 'Wanna color with me? 🖍️', 'Wiggle your toes! 🦶', "I'm Plooshi! 💙", 'Clap your hands! 👏', 'High five! ✋'];
  $$('.mascot').forEach(m => {
    const stage = m.closest('.mascot-stage'), bubble = stage && $('.bubble', stage), hint = stage && $('.tap-hint', stage);
    let i = 0, timer;
    function poke(e) {
      m.classList.remove('jump'); void m.getBoundingClientRect(); m.classList.add('jump', 'happy');
      sfx.boing();
      const melody = [['C5', 'E5'], ['G4', 'C5'], ['E4', 'G4'], ['D5', 'E5']][i % 4];
      melody.forEach((n, k) => tone(NOTES[n], 0.4, 'sine', 0.18, 0.2 + k * 0.14));
      if (bubble) { const p = phrases[i % phrases.length]; bubble.textContent = p; bubble.classList.add('show'); clearTimeout(timer); timer = setTimeout(() => { bubble.classList.remove('show'); m.classList.remove('happy'); }, 2200); }
      if (hint) hint.remove();
      if (stage) for (let k = 0; k < 4; k++) {
        const n = document.createElement('span'); n.className = 'note'; n.textContent = ['🎵', '🎶', '⭐', '💙', '🎈'][(i + k) % 5];
        n.style.left = 30 + Math.random() * 40 + '%'; n.style.top = 30 + Math.random() * 30 + '%';
        n.style.setProperty('--dx', (Math.random() * 160 - 80) + 'px'); n.style.animationDelay = k * 0.1 + 's';
        stage.appendChild(n); setTimeout(() => n.remove(), 2000);
      }
      i++;
      if (i % 10 === 0) confetti(60);
    }
    m.addEventListener('click', poke);
    m.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); poke(); } });
    // eyes follow the pointer
    const pupils = $$('.pupil', m);
    window.addEventListener('pointermove', e => {
      const r = m.getBoundingClientRect(); if (!r.width) return;
      const cx = r.left + r.width / 2, cy = r.top + r.height * 0.5;
      const a = Math.atan2(e.clientY - cy, e.clientX - cx), d = Math.min(1, Math.hypot(e.clientX - cx, e.clientY - cy) / 300);
      pupils.forEach(p => p.setAttribute('transform', `translate(${Math.cos(a) * 7 * d} ${Math.sin(a) * 7 * d})`));
    }, { passive: true });
  });

  /* ---------- Lite YouTube (loads player only on click — fast & privacy-friendly) ---------- */
  document.addEventListener('click', e => {
    const b = e.target.closest('.vthumb[data-id]');
    if (!b || b.querySelector('iframe')) return;
    e.preventDefault(); sfx.pop();
    const f = document.createElement('iframe');
    f.src = `https://www.youtube-nocookie.com/embed/${b.dataset.id}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;
    f.title = b.getAttribute('aria-label') || 'Plooshi video';
    f.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen';
    f.allowFullscreen = true;
    b.appendChild(f); b.removeAttribute('role');
  });

  /* ---------- Filter chips + search (videos & printables) ---------- */
  $$('[data-filter-group]').forEach(group => {
    const target = $(group.dataset.filterGroup);
    const search = $(group.dataset.search || '__none');
    const counter = $(group.dataset.counter || '__none');
    const empty = $(group.dataset.empty || '__none');
    const items = $$('[data-cats]', target);
    let cat = 'All';
    const favs = new Set(store.get('favs', []));
    function apply() {
      const q = (search && search.value.trim().toLowerCase()) || '';
      let shown = 0;
      items.forEach(it => {
        const okCat = cat === 'All' || (cat === 'Faves' ? favs.has(it.dataset.slug) : it.dataset.cats.split(',').includes(cat));
        const okQ = !q || it.dataset.name.includes(q);
        const ok = okCat && okQ; it.hidden = !ok; if (ok) shown++;
      });
      if (counter) counter.textContent = shown === items.length ? `Showing all ${shown}! 🎉` : `${shown} found`;
      if (empty) empty.hidden = shown > 0;
    }
    group.addEventListener('click', e => {
      const c = e.target.closest('.chip'); if (!c) return;
      if (c.dataset.surprise !== undefined) {
        const vis = items.filter(i => !i.hidden), pick = vis[Math.floor(Math.random() * vis.length)];
        if (pick) { pick.scrollIntoView({ behavior: 'smooth', block: 'center' }); pick.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.08) rotate(-3deg)' }, { transform: 'scale(1)' }], { duration: 700, iterations: 2 }); sfx.yay(); }
        return;
      }
      $$('.chip:not([data-surprise])', group).forEach(x => x.setAttribute('aria-pressed', x === c));
      cat = c.dataset.cat; sfx.pop(); apply();
    });
    if (search) search.addEventListener('input', apply);
    // favourites (printables)
    $$('.fav', target).forEach(b => {
      const slug = b.closest('[data-slug]').dataset.slug;
      b.setAttribute('aria-pressed', favs.has(slug));
      b.addEventListener('click', () => {
        if (favs.has(slug)) favs.delete(slug); else { favs.add(slug); sfx.yay(); }
        b.setAttribute('aria-pressed', favs.has(slug)); store.set('favs', [...favs]);
        if (cat === 'Faves') apply();
      });
    });
    // deep link: /printable/?q=unicorn or #animals
    const params = new URLSearchParams(location.search);
    if (search && params.get('q')) search.value = params.get('q');
    apply();
  });

  /* ---------- Download celebration ---------- */
  document.addEventListener('click', e => { if (e.target.closest('a[data-dl]')) { sfx.jingle(); confetti(40); } });

  /* ---------- Reveal on scroll ---------- */
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { threshold: 0.12 });
    $$('.reveal').forEach(el => io.observe(el));
  } else $$('.reveal').forEach(el => el.classList.add('in'));

  /* ---------- Xylophone ---------- */
  $$('.xylo').forEach(x => {
    const bars = $$('.bar', x);
    const keys = ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k'];
    function hit(b) { tone(NOTES[b.dataset.note], 0.9, 'sine', 0.28); b.classList.add('hit'); setTimeout(() => b.classList.remove('hit'), 140); x.dispatchEvent(new CustomEvent('note', { detail: b.dataset.note })); }
    bars.forEach(b => b.addEventListener('pointerdown', e => { e.preventDefault(); hit(b); }));
    window.addEventListener('keydown', e => { const k = keys.indexOf(e.key.toLowerCase()); if (k > -1 && bars[k] && !e.target.closest('input')) hit(bars[k]); });
    // play-along: highlight the next bar to tap
    const songs = {
      twinkle: 'C4 C4 G4 G4 A4 A4 G4 F4 F4 E4 E4 D4 D4 C4',
      mary: 'E4 D4 C4 D4 E4 E4 E4 D4 D4 D4 E4 G4 G4',
      buns: 'E4 D4 C4 E4 D4 C4 C4 C4 C4 C4 D4 D4 D4 D4 E4 D4 C4',
      row: 'C4 C4 C4 D4 E4 E4 D4 E4 F4 G4'
    };
    const wrap = x.parentElement, status = $('.xylo-status', wrap);
    let seq = null, pos = 0;
    function mark() { bars.forEach(b => b.style.outline = ''); if (seq && seq[pos]) { const b = bars.find(b => b.dataset.note === seq[pos]); if (b) b.style.outline = '6px solid #1d3260'; } }
    $$('[data-song]', wrap).forEach(btn => btn.addEventListener('click', () => { seq = songs[btn.dataset.song].split(' '); pos = 0; mark(); if (status) status.textContent = `Tap the bar with the dark ring! (${btn.textContent.trim()})`; }));
    x.addEventListener('note', e => {
      if (!seq) return;
      if (e.detail === seq[pos]) { pos++; if (pos >= seq.length) { seq = null; if (status) status.textContent = 'You played the whole song! 🎉'; setTimeout(() => { sfx.yay(); confetti(); }, 500); } }
      mark();
    });
  });
})();
