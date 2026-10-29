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
    if (ctx && ctx.state !== 'running' && ctx.state !== 'closed') ctx.resume().catch(() => {});
    return ctx;
  }
  // Phones only let sound start from a finished tap (iOS ignores pointerdown/touchstart),
  // and iPhones mute web audio with the ring/silent switch unless the page plays as media.
  let unlocked = false;
  function unlock() {
    const c = ac(); if (!c) return;
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
    if (!unlocked) {
      unlocked = true;
      const s = c.createBufferSource(); s.buffer = c.createBuffer(1, 1, 22050); s.connect(c.destination); s.start(0);
      // a moment of silent <audio> moves older iPhones onto the media channel (ignores the silent switch)
      const n = 2205, b = new ArrayBuffer(44 + n * 2), v = new DataView(b), w = (o, t) => [...t].forEach((ch, i) => v.setUint8(o + i, ch.charCodeAt(0)));
      w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
      v.setUint32(24, 22050, true); v.setUint32(28, 44100, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
      const el = new Audio(URL.createObjectURL(new Blob([b], { type: 'audio/wav' }))); el.setAttribute('playsinline', ''); el.play().catch(() => {});
    }
    if (c.state === 'running') ['touchend', 'pointerup', 'click', 'keydown'].forEach(t => document.removeEventListener(t, unlock, true));
  }
  ['touchend', 'pointerup', 'click', 'keydown'].forEach(t => document.addEventListener(t, unlock, { capture: true, passive: true }));
  // iOS suspends ("interrupts") audio when the app is backgrounded or a call comes in
  document.addEventListener('visibilitychange', () => { if (!document.hidden && ctx && ctx.state !== 'running') ctx.resume().catch(() => {}); });
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
  /* ---------- Holidays: switch on and off by themselves from the visitor's date.
     Preview any of them with ?season=valentines|stpatricks|easter|july4|halloween|thanksgiving|christmas|newyear (or none). */
  const HOLIDAYS = {
    newyear:      { hat: 'party',   deco: ['🎉', '✨', '🎊', '⭐'], sticker: '🎉', say: ['Happy New Year! 🎉', 'Hip hip hooray! 🎊', "Let's count down! 3, 2, 1! ✨"] },
    valentines:   { hat: 'hearts',  deco: ['💖', '💕', '💗', '💝'], sticker: '💖', say: ['Happy Valentine\'s Day! 💖', 'I love you! 💕', 'You make my heart happy! 💗'] },
    stpatricks:   { hat: 'clover',  deco: ['🍀', '☘️', '🌈', '🪙'], sticker: '🍀', say: ['Happy St. Patrick\'s Day! 🍀', 'Find the pot of gold! 🌈', 'Lucky you! ☘️'] },
    easter:       { hat: 'chick',   deco: ['🥚', '🐣', '🌷', '🐰'], sticker: '🐣', say: ['Happy Easter! 🐣', 'Hop hop hop! 🐰', "Let's find eggs! 🥚"] },
    july4:        { hat: 'tophat',  deco: ['🎆', '⭐', '🎇', '🇺🇸'], sticker: '🎆', say: ['Happy Fourth of July! 🎆', 'Boom! Fireworks! 🎇', 'Red, white and blue! 🇺🇸'] },
    halloween:    { hat: 'witch',   deco: ['🦇', '🦇', '🎃', '👻'], sticker: '🎃', fly: true, say: ['Boo! 👻', 'Happy Halloween! 🎃', 'Trick or treat! 🍬'] },
    thanksgiving: { hat: 'leaves',  deco: ['🍂', '🍁', '🦃', '🍂'], sticker: '🦃', say: ['Happy Thanksgiving! 🦃', 'Gobble gobble! 🍂', "I'm thankful for YOU! 💙"] },
    christmas:    { hat: 'santa',   deco: ['❄️', '❄️', '⛄', '⭐'], sticker: '🎅', say: ['Ho ho ho! 🎅', 'Merry Christmas! 🎄', 'Is it snowing? ❄️'] }
  };
  function holidayOn(d) {
    const y = d.getFullYear(), t = new Date(y, d.getMonth(), d.getDate()).getTime();
    const day = (m, dd) => new Date(y, m - 1, dd).getTime(), within = (a, b) => t >= a && t <= b, DAY = 864e5;
    // Easter Sunday (Anonymous Gregorian algorithm)
    const a = y % 19, b = Math.floor(y / 100), c = y % 100, dd = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3),
          h = (19 * a + b - dd - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451),
          easter = day(Math.floor((h + l - 7 * m + 114) / 31), ((h + l - 7 * m + 114) % 31) + 1);
    // US Thanksgiving: the fourth Thursday of November
    const nov1 = new Date(y, 10, 1).getDay(), thanks = day(11, 1 + ((4 - nov1 + 7) % 7) + 21);
    if (within(day(12, 30), day(12, 31)) || within(day(1, 1), day(1, 2))) return 'newyear';
    if (within(day(2, 7), day(2, 14))) return 'valentines';
    if (within(day(3, 10), day(3, 17))) return 'stpatricks';
    if (within(easter - 7 * DAY, easter + DAY)) return 'easter';
    if (within(day(6, 28), day(7, 5))) return 'july4';
    if (within(day(10, 10), day(11, 1))) return 'halloween';
    if (within(thanks - 6 * DAY, thanks + DAY)) return 'thanksgiving';
    if (within(day(12, 1), day(12, 26))) return 'christmas';
    return '';
  }
  const season = (() => {
    const q = new URLSearchParams(location.search).get('season');
    if (q) return q === 'none' || !HOLIDAYS[q] ? '' : q;
    return holidayOn(new Date());
  })();
  const H = HOLIDAYS[season] || null;
  if (season) document.documentElement.dataset.season = season;
  $$('.season-banner').forEach(b => { b.hidden = !b.classList.contains(season || '-'); });
  $$('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });   // footer © year stays current

  /* ---------- Stickers (kept only on this device, no account needed) ---------- */
  const STICKERS = [
    ['hello', '👋', 'Hello Friend', 'Visit Plooshi'], ['tap', '💙', 'Tickle Champ', 'Tap Plooshi 5 times'],
    ['watch', '🎬', 'Movie Star', 'Watch a Plooshi video'], ['sing', '🎤', 'Superstar Singer', 'Finish a sing-along'],
    ['print', '🖨️', 'Print Pro', 'Print a coloring page'], ['color', '🎨', 'Little Artist', 'Color 10 spots online'],
    ['art', '🖼️', 'Gallery Star', 'Save a picture you colored'], ['fave', '💖', 'Collector', 'Save a fave coloring page'],
    ['memory', '🧠', 'Memory Master', 'Finish Memory Match'], ['count', '🔢', 'Counting Champ', 'Count the bubbles to 10'],
    ['xylo', '🎹', 'Music Maker', 'Play a whole xylophone song'], ['freeze', '🧊', 'Freeze Champ', 'Freeze 5 times in Freeze Dance'],
    ['quiz', '🦁', 'Animal Expert', 'Get 5 right in the Animal Quiz'], ['dress', '🎩', 'Fashion Friend', 'Dress up Plooshi'],
    ['read', '📚', 'Bookworm', 'Listen to a Read-to-me page'], ['explorer', '🔭', 'Explorer', 'Visit 3 fun fact pages'],
    ['bedtime', '🌙', 'Sleepy Head', 'Start the bedtime timer'], ['today', '🎁', 'Surprise Seeker', "Open today's surprise"],
    ['spooky', H ? H.sticker : '🎈', 'Holiday Friend', 'Tap Plooshi on a holiday'], ['pal', '🏆', 'Plooshi Pal', 'Collect 15 stickers']
  ];
  function earned() { return store.get('stickers', {}); }
  function syncStickerBtn() {
    const n = Object.keys(earned()).length;
    $$('.sticker-btn .n').forEach(el => el.textContent = n);
  }
  let toastTimer;
  function toast(emoji, title, sub) {
    let t = $('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.innerHTML = `<span class="big" aria-hidden="true">${emoji}</span><span><b>${title}</b><small>${sub}</small></span>`;
    requestAnimationFrame(() => t.classList.add('show'));
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 3600);
  }
  function earn(id) {
    const got = earned(); if (got[id]) return false;
    const s = STICKERS.find(x => x[0] === id); if (!s) return false;
    got[id] = new Date().toISOString().slice(0, 10); store.set('stickers', got);
    toast(s[1], 'New sticker: ' + s[2] + '!', 'Find it in your sticker book ⭐');
    sfx.yay(); confetti(30); syncStickerBtn();
    $$('.sticker-btn').forEach(b => { b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); });
    document.dispatchEvent(new CustomEvent('plooshi:sticker', { detail: id }));
    if (Object.keys(got).length >= 15 && id !== 'pal') setTimeout(() => earn('pal'), 3800);
    return true;
  }
  syncStickerBtn();

  window.Plooshi = { ac, tone, NOTES, sfx, store, confetti, say, earn, STICKERS, season };

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
    if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;  // browsers only allow speech after a tap
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
  if (H) phrases.unshift(...H.say);
  $$('.mascot').forEach(m => {
    const stage = m.closest('.mascot-stage'), bubble = stage && $('.bubble', stage), hint = stage && $('.tap-hint', stage);
    let i = 0, timer;
    function poke(e) {
      if (m.classList.contains('sleepy')) {  // bedtime: no boing, just a soft hush
        tone(NOTES.E4, 1.2, 'sine', 0.08); tone(NOTES.C4, 1.4, 'sine', 0.06, 0.3);
        if (bubble) { bubble.textContent = ['Shhh… 😴', 'Zzz… sweet dreams 💤', 'Night night 🌙'][i++ % 3]; bubble.classList.add('show'); clearTimeout(timer); timer = setTimeout(() => bubble.classList.remove('show'), 2200); }
        return;
      }
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
      if (i === 5) earn('tap');
      if (i === 2 && season) earn('spooky');
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
    earn('watch');
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
        if (favs.has(slug)) favs.delete(slug); else { favs.add(slug); if (!earn('fave')) sfx.yay(); }
        b.setAttribute('aria-pressed', favs.has(slug)); store.set('favs', [...favs]);
        if (cat === 'Faves') apply();
      });
    });
    // deep link: /printable/?q=unicorn or #animals
    const params = new URLSearchParams(location.search);
    if (search && params.get('q')) search.value = params.get('q');
    apply();
  });

  /* ---------- Spotify player loads only when tapped (keeps pages fast and cookie-free) ---------- */
  document.addEventListener('click', e => {
    const f = e.target.closest('.spotify-facade button'); if (!f) return;
    const box = f.parentElement, ifr = document.createElement('iframe');
    ifr.title = 'Plooshi on Spotify'; ifr.src = box.dataset.src + '&autoplay=1';
    ifr.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
    box.replaceWith(ifr); sfx.pop();
  });

  /* ---------- Download celebration ---------- */
  document.addEventListener('click', e => { if (e.target.closest('a[data-dl]')) { sfx.jingle(); confetti(40); setTimeout(() => earn('print'), 900); } });

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
    // listen on the whole xylophone so a tap in the gap between bars plays the nearest one
    x.addEventListener('pointerdown', e => {
      const near = bars.reduce((best, b) => { const r = b.getBoundingClientRect(), d = Math.max(r.left - e.clientX, 0, e.clientX - r.right); return d < best.d ? { b, d } : best; }, { b: null, d: Infinity });
      if (near.b) { e.preventDefault(); hit(near.b); }
    });
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
      if (e.detail === seq[pos]) { pos++; if (pos >= seq.length) { seq = null; if (status) status.textContent = 'You played the whole song! 🎉'; setTimeout(() => { if (!earn('xylo')) { sfx.yay(); confetti(); } }, 500); } }
      mark();
    });
  });

  /* ---------- Plooshi's outfit (chosen on the Play page, worn on every page) ---------- */
  function outfit() {
    const o = Object.assign({ hat: '', eyes: '', neck: '' }, store.get('outfit', {}));
    if (!store.get('outfit', null) && H) o.hat = H.hat;   // holiday hat until the child picks their own outfit
    return o;
  }
  function applyOutfit(o = outfit()) {
    $$('svg.mascot [data-acc]').forEach(g => {
      const [slot, val] = g.dataset.acc.split('-');
      g.style.display = o[slot] === val ? 'inline' : 'none';   // inline style beats the SVG's display="none"
    });
  }
  applyOutfit();
  Object.assign(window.Plooshi, { outfit, applyOutfit });

  /* ---------- Seasonal decorations in page headers ---------- */
  if (H && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const icons = H.deco;
    $$('.hero, .phero').forEach(h => {
      const d = document.createElement('div'); d.className = 'season-deco'; d.setAttribute('aria-hidden', 'true');
      for (let k = 0; k < (H.fly ? 5 : 14); k++) {
        const s = document.createElement('span'); s.textContent = icons[k % icons.length];
        if (H.fly) { s.style.top = 8 + Math.random() * 60 + '%'; s.style.animationDuration = 14 + Math.random() * 10 + 's'; }
        else { s.style.left = Math.random() * 100 + '%'; s.style.animationDuration = 9 + Math.random() * 9 + 's'; s.style.fontSize = 1 + Math.random() * 1.2 + 'rem'; }
        s.style.animationDelay = -Math.random() * 20 + 's';
        d.appendChild(s);
      }
      h.prepend(d);
    });
  }

  /* ---------- Stickers just for visiting ---------- */
  earn('hello');
  if (/-facts-|facts-for-kids|antarctica/.test(location.pathname)) {
    const seen = new Set(store.get('factsSeen', [])); seen.add(location.pathname); store.set('factsSeen', [...seen]);
    if (seen.size >= 3) setTimeout(() => earn('explorer'), 1500);
  }

  /* ---------- Sticker book page ---------- */
  const book = $('#sticker-book');
  if (book) {
    const render = () => {
      const got = earned(), n = STICKERS.filter(s => got[s[0]]).length;
      book.innerHTML = STICKERS.map(([id, e, name, hint]) => `<div class="sticker ${got[id] ? 'got' : 'locked'}"><span class="e" aria-hidden="true">${e}</span><b>${got[id] ? name : '???'}</b><small>${hint}</small></div>`).join('');
      $('#sticker-count').textContent = `${n} of ${STICKERS.length} stickers`;
      $('#sticker-bar').style.width = (n / STICKERS.length * 100) + '%';
    };
    render(); document.addEventListener('plooshi:sticker', render);
    const reset = $('#sticker-reset');
    if (reset) reset.addEventListener('click', () => { if (confirm('Start a brand new sticker book? This removes all your stickers on this device.')) { store.set('stickers', {}); syncStickerBtn(); render(); } });
  }

  /* ---------- Read to me (fact pages, printable pages) ---------- */
  const article = $('article.prose[data-read]');
  if (article && 'speechSynthesis' in window) {
    const blocks = $$('h2, h3, p, li', article).filter(b => !b.closest('.platforms, .print-hero, .song-actions, .lyrics') && b.textContent.trim().length > 2);
    if (blocks.length > 2) {
      const btn = document.createElement('button'); btn.className = 'btn sun read-btn'; btn.type = 'button';
      btn.textContent = '🔊 Read to me'; article.prepend(btn);
      let idx = 0, on = false, heard = 0;
      const voice = () => speechSynthesis.getVoices().find(v => /en(-|_)(US|GB)/i.test(v.lang) && /female|samantha|jenny|aria|zira|google us/i.test(v.name)) || speechSynthesis.getVoices().find(v => /^en/i.test(v.lang));
      const stop = () => { on = false; speechSynthesis.cancel(); blocks.forEach(b => b.classList.remove('reading')); btn.textContent = '🔊 Read to me'; };
      const next = () => {
        blocks.forEach(b => b.classList.remove('reading'));
        if (!on || idx >= blocks.length) { if (idx >= blocks.length) { idx = 0; earn('read'); } return stop(); }
        const b = blocks[idx++]; b.classList.add('reading'); b.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const u = new SpeechSynthesisUtterance(b.textContent.replace(/\s+/g, ' ').trim());
        u.rate = 0.95; u.pitch = 1.15; const v = voice(); if (v) u.voice = v;
        u.onend = () => { if (++heard === 6) earn('read'); next(); };
        u.onerror = () => stop();
        speechSynthesis.speak(u);
      };
      btn.addEventListener('click', () => { if (on) return stop(); on = true; btn.textContent = '⏸️ Stop reading'; speechSynthesis.cancel(); next(); });
      window.addEventListener('pagehide', stop);
    }
  }

  /* ---------- Sing-along mode (song pages) ---------- */
  const singBtn = $('#sing-btn'), lyr = $('.lyrics');
  if (singBtn && lyr) {
    const lines = lyr.innerText.split('\n').map(s => s.trim()).filter(Boolean);
    const k = document.createElement('div'); k.className = 'karaoke'; k.setAttribute('role', 'dialog'); k.setAttribute('aria-label', 'Sing-along');
    k.innerHTML = `<img class="mascot" src="${$('.logo img').getAttribute('src')}" alt="" width="110" height="110" style="border-radius:50%">
      <button class="btn sm white close" type="button">✕ Close</button>
      <div class="k-lines" aria-live="polite"></div><div class="k-bar"><i></i></div>
      <div class="k-controls"><button class="btn sm white" data-k="prev" type="button">◀ Back</button><button class="btn sun" data-k="auto" type="button">▶ Play</button><button class="btn sm white" data-k="next" type="button">Next ▶</button><button class="btn sm blue" data-k="speed" type="button">🐢 Slow</button></div>
      <p style="opacity:.7;margin-top:18px">Tap anywhere for the next line</p>`;
    document.body.appendChild(k);
    let at = 0, auto = null, slow = true;
    const show = () => {
      const L = (j) => lines[j] ? `<p class="k-line ${j === at ? 'now' : j < at ? 'prev' : 'next'}">${lines[j].replace(/</g, '&lt;')}</p>` : '';
      $('.k-lines', k).innerHTML = L(at - 1) + L(at) + L(at + 1);
      $('.k-bar i', k).style.width = ((at + 1) / lines.length * 100) + '%';
      $('.mascot', k).animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-16px)' }, { transform: 'translateY(0)' }], { duration: 400 });
      tone(NOTES[['C5', 'E5', 'G4', 'D5'][at % 4]], 0.3, 'sine', 0.08);
    };
    const step = (d) => {
      if (at + d >= lines.length) { stopAuto(); earn('sing'); confetti(); $('.k-lines', k).innerHTML = '<p class="k-line now">You sang the whole song! 🎉</p>'; return; }
      at = Math.max(0, at + d); show();
    };
    const stopAuto = () => { clearTimeout(auto); auto = null; $('[data-k="auto"]', k).textContent = '▶ Play'; };
    const tick = () => { auto = setTimeout(() => { step(1); if (auto) tick(); }, (slow ? 2200 : 1300) + lines[at].split(' ').length * (slow ? 260 : 160)); };
    k.addEventListener('click', e => {
      const b = e.target.closest('[data-k], .close');
      if (!b) return step(1);
      if (b.classList.contains('close')) { stopAuto(); k.classList.remove('open'); return; }
      const a = b.dataset.k;
      if (a === 'next') step(1);
      if (a === 'prev') step(-1);
      if (a === 'speed') { slow = !slow; b.textContent = slow ? '🐢 Slow' : '🐇 Fast'; }
      if (a === 'auto') { if (auto) stopAuto(); else { b.textContent = '⏸ Pause'; tick(); } }
    });
    document.addEventListener('keydown', e => { if (!k.classList.contains('open')) return; if (e.key === 'Escape') { stopAuto(); k.classList.remove('open'); } if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); step(1); } if (e.key === 'ArrowLeft') step(-1); });
    singBtn.addEventListener('click', () => { at = 0; show(); k.classList.add('open'); sfx.jingle(); });
  }

  /* ---------- Today's surprise (home page) ---------- */
  const todayEl = $('#today-data');
  if (todayEl) {
    const D = JSON.parse(todayEl.textContent), now = new Date();
    const key = now.toISOString().slice(0, 10), day = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 864e5) + now.getFullYear() * 366;
    const s = D.songs[day % D.songs.length], p = D.prints[(day * 7) % D.prints.length], f = D.facts[(day * 3) % D.facts.length];
    const box = $('#surprise'), gift = $('#gift');
    box.innerHTML = `
      <article class="card"><a class="vthumb" href="${D.base}${s.p}"><img src="https://i.ytimg.com/vi/${s.id}/hqdefault.jpg" alt="" loading="lazy"><span class="play"></span></a>
        <div class="body"><span class="badge">🎵 Song of the day</span><h3><a href="${D.base}${s.p}">${s.t} ${s.e}</a></h3></div></article>
      <article class="card"><a class="vthumb" href="${D.base}/color/?p=${p.s}"><img src="${D.base}${p.img}" alt="" loading="lazy" style="object-fit:contain;background:#fff"></a>
        <div class="body"><span class="badge">🎨 Color of the day</span><h3><a href="${D.base}/color/?p=${p.s}">Color the ${p.t}!</a></h3></div></article>
      <article class="card fact-card"><a class="vthumb" href="${D.base}${f.p}">${f.e}</a>
        <div class="body"><span class="badge">🔭 Fact of the day</span><p style="margin:6px 0 8px;font-weight:700;color:var(--ink)">${f.f}</p><a href="${D.base}${f.p}">More ${f.t} →</a></div></article>`;
    const open = (celebrate) => { gift.hidden = true; $('#gift-hint').hidden = true; box.hidden = false; if (celebrate) { confetti(70); sfx.jingle(); earn('today'); } store.set('todayOpened', key); };
    if (store.get('todayOpened', '') === key) open(false);
    gift.addEventListener('click', () => open(true));
  }

  /* ---------- Bedtime page ---------- */
  const bed = $('#bedtime');
  if (bed) {
    document.body.classList.add('night');
    const sky = document.createElement('div'); sky.className = 'stars'; sky.setAttribute('aria-hidden', 'true');
    for (let k = 0; k < 90; k++) { const s = document.createElement('i'); s.style.left = Math.random() * 100 + '%'; s.style.top = Math.random() * 100 + '%'; s.style.animationDelay = -Math.random() * 3 + 's'; s.style.opacity = .3 + Math.random() * .7; sky.appendChild(s); }
    document.body.prepend(sky);
    const left = $('#timer-left'), gn = $('#goodnight'), nl = $('#nightlight');
    let end = 0, iv;
    const sleep = () => {
      clearInterval(iv); end = 0; left.textContent = '';
      $$('.vthumb iframe').forEach(f => f.remove());                                                       // stops videos (tap again to replay)
      $$('iframe').forEach(f => { f.dataset.src = f.dataset.src || f.src; f.src = 'about:blank'; });   // stops Spotify
      if ('speechSynthesis' in window) speechSynthesis.cancel();
      gn.classList.add('open');
    };
    $$('[data-min]', bed).forEach(b => b.addEventListener('click', () => {
      end = Date.now() + (+b.dataset.min) * 60000; earn('bedtime'); tone(NOTES.G4, 1, 'sine', .08);
      clearInterval(iv); iv = setInterval(() => {
        const ms = end - Date.now(); if (ms <= 0) return sleep();
        const m = Math.floor(ms / 60000), s = Math.floor(ms / 1000) % 60;
        left.textContent = `🌙 Music stops in ${m}:${String(s).padStart(2, '0')}`;
      }, 500);
    }));
    $('#timer-cancel').addEventListener('click', () => { clearInterval(iv); end = 0; left.textContent = ''; });
    $('#nightlight-btn').addEventListener('click', () => { nl.classList.add('open'); if (nl.requestFullscreen) nl.requestFullscreen().catch(() => {}); });
    nl.addEventListener('click', () => { nl.classList.remove('open'); if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); });
    gn.addEventListener('click', () => { gn.classList.remove('open'); $$('iframe').forEach(f => { if (f.dataset.src && f.src === 'about:blank' && !f.closest('.vthumb')) f.src = f.dataset.src; }); });
  }
})();
