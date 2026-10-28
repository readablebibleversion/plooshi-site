/* Plooshi Play games: Color Plooshi, Memory Match, Bubble Pop Counting */
(function () {
  const { tone, NOTES, sfx, store, confetti, say, earn } = window.Plooshi;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ---------- Color Plooshi ---------- */
  const colorer = $('#colorer');
  if (colorer) {
    const svg = $('svg', colorer);
    const colors = ['#5ec8f2', '#ec3d8f', '#ffc93c', '#6fdcae', '#8b6cf0', '#ff8a3d', '#ff5a5a', '#ffffff', '#a8e063', '#f9a8d4', '#8b5a2b', '#1d3260', '#ffe066', '#7dd3fc', '#c4b5fd', '#ffd1a1'];
    const pal = $('.palette', colorer);
    let current = colors[1];
    colors.forEach((c, i) => {
      const b = document.createElement('button'); b.className = 'swatch'; b.style.background = c; b.setAttribute('aria-label', 'Color ' + (i + 1)); b.setAttribute('aria-pressed', i === 1);
      b.addEventListener('click', () => { current = c; $$('.swatch', pal).forEach(s => s.setAttribute('aria-pressed', s === b)); tone(NOTES[['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'][i % 8]], 0.3); });
      pal.appendChild(b);
    });
    const saved = store.get('colorer', {});
    $$('[data-fill]', svg).forEach(p => { if (saved[p.dataset.fill]) p.setAttribute('fill', saved[p.dataset.fill]); });
    svg.addEventListener('click', e => {
      const p = e.target.closest('[data-fill]'); if (!p) return;
      $$(`[data-fill="${p.dataset.fill}"]`, svg).forEach(x => x.setAttribute('fill', current));
      saved[p.dataset.fill] = current; store.set('colorer', saved); sfx.pop();
      const n = store.get('colorCount', 0) + 1; store.set('colorCount', n); if (n === 10) earn('color');
    });
    $('#color-reset').addEventListener('click', () => { $$('[data-fill]', svg).forEach(p => p.setAttribute('fill', p.dataset.orig)); store.set('colorer', {}); sfx.boing(); });
    $('#color-random').addEventListener('click', () => {
      $$('[data-fill]', svg).forEach(p => { const c = colors[Math.floor(Math.random() * colors.length)]; $$(`[data-fill="${p.dataset.fill}"]`, svg).forEach(x => x.setAttribute('fill', c)); saved[p.dataset.fill] = c; });
      store.set('colorer', saved); sfx.yay();
    });
  }

  /* ---------- Memory Match ---------- */
  const mem = $('#memory');
  if (mem) {
    const animals = [['🐸', 'Frog', 'C5'], ['🦆', 'Duck', 'E5'], ['🐑', 'Sheep', 'G4'], ['🐪', 'Camel', 'A4'], ['🐵', 'Monkey', 'D5'], ['🦈', 'Shark', 'C4'], ['🕷️', 'Spider', 'F4'], ['🐰', 'Bunny', 'B4']];
    const moves = $('#mem-moves'), best = $('#mem-best');
    const avatar = $('.logo img').getAttribute('src');  // already carries any sub-folder prefix
    function deal() {
      mem.innerHTML = ''; let first = null, lock = false, n = 0, found = 0;
      moves.textContent = 0; best.textContent = store.get('memBest', '—');
      const deck = [...animals, ...animals].sort(() => Math.random() - 0.5);
      deck.forEach(([e, name, note]) => {
        const c = document.createElement('button'); c.className = 'mcard'; c.setAttribute('aria-label', 'Hidden card');
        c.innerHTML = `<span class="f"><img src="${avatar}" alt="" width="60" height="60"></span><span class="b">${e}</span>`;
        c.addEventListener('click', () => {
          if (lock || c.classList.contains('flip') || c.classList.contains('done')) return;
          c.classList.add('flip'); c.setAttribute('aria-label', name); tone(NOTES[note], 0.4);
          if (!first) { first = c; first.dataset.name = name; return; }
          n++; moves.textContent = n;
          if (first.dataset.name === name) {
            [first, c].forEach(x => { x.classList.add('done'); }); first = null; found++;
            setTimeout(() => { sfx.yay(); say(name + '!'); }, 250);
            if (found === animals.length) setTimeout(() => { confetti(); say('You found them all!'); earn('memory'); const b = store.get('memBest', 999); if (n < b) { store.set('memBest', n); best.textContent = n; } }, 700);
          } else {
            lock = true; const a = first; first = null;
            setTimeout(() => { a.classList.remove('flip'); c.classList.remove('flip'); a.setAttribute('aria-label', 'Hidden card'); c.setAttribute('aria-label', 'Hidden card'); lock = false; }, 900);
          }
        });
        mem.appendChild(c);
      });
    }
    $('#mem-new').addEventListener('click', () => { sfx.boing(); deal(); });
    deal();
  }

  /* ---------- Bubble Pop Counting ---------- */
  const pond = $('#bubbles');
  if (pond) {
    const startBtn = $('#bub-start'), nextEl = $('#bub-next'), msg = $('#bub-msg');
    const scale = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5'];
    const cols = ['#ec3d8f', '#5ec8f2', '#ffc93c', '#6fdcae', '#8b6cf0', '#ff8a3d'];
    let next = 1, running = false, spawner, upTo = 10;
    function spawn(num) {
      const b = document.createElement('button'); b.className = 'bub'; b.textContent = num; b.dataset.n = num;
      const size = 70 + Math.random() * 30; b.style.width = b.style.height = size + 'px';
      b.style.left = Math.random() * (pond.clientWidth - size) + 'px'; b.style.bottom = -size + 'px';
      b.style.setProperty('--c', cols[num % cols.length]); b.style.animationDuration = 7 + Math.random() * 4 + 's';
      b.setAttribute('aria-label', 'Bubble number ' + num);
      b.addEventListener('animationend', ev => { if (ev.animationName === 'rise') { b.remove(); if (running && +b.dataset.n >= next) spawn(+b.dataset.n); } else b.remove(); });
      b.addEventListener('pointerdown', ev => {
        ev.preventDefault(); if (!running) return;
        if (+b.dataset.n === next) {
          b.style.animation = 'pop .25s forwards'; tone(NOTES[scale[next - 1]], 0.5, 'sine', 0.3); say(String(next));
          next++; nextEl.textContent = next <= upTo ? next : '🎉';
          if (next > upTo) { running = false; clearInterval(spawner); msg.textContent = 'You counted to ' + upTo + '! Amazing! 🌟'; setTimeout(() => { sfx.yay(); confetti(); if (upTo >= 10) earn('count'); }, 300); startBtn.textContent = 'Play again'; }
        } else { sfx.oops(); b.animate([{ translate: '0 0' }, { translate: '-8px 0' }, { translate: '8px 0' }, { translate: '0 0' }], { duration: 300 }); }
      });
      pond.appendChild(b);
    }
    startBtn.addEventListener('click', () => {
      $$('.bub', pond).forEach(b => b.remove());
      upTo = +$('#bub-level').value; next = 1; running = true; nextEl.textContent = 1; msg.textContent = 'Pop the bubbles in order!';
      sfx.boing();
      const nums = Array.from({ length: upTo }, (_, i) => i + 1).sort(() => Math.random() - 0.5);
      nums.forEach((n, i) => setTimeout(() => running && spawn(n), i * 450));
    });
  }

  /* ---------- Freeze Dance ---------- */
  const floor = $('#dance-floor');
  if (floor) {
    const m = $('.mascot', floor), word = $('.freeze-word', floor), btn = $('#dance-start'), score = $('#freeze-count');
    const BPM = 116, beat = 60 / BPM;
    const bass = ['C3', 'C3', 'G3', 'A3', 'F3', 'F3', 'G3', 'G3'], hz = { C3: 130.81, G3: 196, A3: 220, F3: 174.61 };
    const melody = ['E5', 'G4', 'C5', 'G4', 'D5', 'G4', 'C5', 'E5'];
    let playing = false, frozen = false, nextT = 0, step = 0, sched, freezeT, freezes = 0;
    const A = () => { const c = window.AudioContext || window.webkitAudioContext; return (A.c = A.c || (c && new c())); };
    function drum(ac, t, kind) {
      if (kind === 'kick') {
        const o = ac.createOscillator(), g = ac.createGain(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(40, t + .15);
        g.gain.setValueAtTime(.6, t); g.gain.exponentialRampToValueAtTime(.001, t + .2); o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + .22);
      } else {
        const len = kind === 'snare' ? .15 : .04, b = ac.createBuffer(1, ac.sampleRate * len, ac.sampleRate), d = b.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
        const s = ac.createBufferSource(), g = ac.createGain(), f = ac.createBiquadFilter(); s.buffer = b;
        f.type = 'highpass'; f.frequency.value = kind === 'snare' ? 1200 : 7000; g.gain.value = kind === 'snare' ? .35 : .15;
        s.connect(f); f.connect(g); g.connect(ac.destination); s.start(t);
      }
    }
    function note(ac, t, f, dur, type, vol) {
      const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.value = f;
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur); o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + dur + .02);
    }
    function schedule() {
      const ac = A(); if (!ac) return;
      while (nextT < ac.currentTime + .15) {
        if (!frozen && store.get('sound', true)) {
          const half = step % 2 === 0, bar = Math.floor(step / 2) % 8;
          if (half) drum(ac, nextT, (Math.floor(step / 2) % 2) ? 'snare' : 'kick');
          drum(ac, nextT, 'hat');
          if (half) note(ac, nextT, hz[bass[bar]], beat * .9, 'triangle', .22);
          if (step % 4 === 0) note(ac, nextT, NOTES[melody[(step / 4) % 8]], beat * 1.5, 'square', .05);
        }
        nextT += beat / 2; step++;
      }
    }
    function planFreeze() { freezeT = setTimeout(doFreeze, 4000 + Math.random() * 5000); }
    function doFreeze() {
      frozen = true; m.classList.remove('dance'); m.classList.add('frozen'); floor.classList.remove('on');
      word.textContent = 'FREEZE!'; word.classList.add('show'); say('Freeze!');
      score.textContent = ++freezes; if (freezes === 5) earn('freeze');
      freezeT = setTimeout(() => {
        word.textContent = 'DANCE!'; say('Dance!'); frozen = false;
        m.classList.remove('frozen'); m.classList.add('dance'); floor.classList.add('on');
        setTimeout(() => word.classList.remove('show'), 700); planFreeze();
      }, 2200 + Math.random() * 1800);
    }
    function start() {
      const ac = A(); if (!ac) return; ac.resume();
      playing = true; frozen = false; nextT = ac.currentTime + .05; step = 0;
      sched = setInterval(schedule, 40); m.classList.add('dance'); floor.classList.add('on');
      btn.textContent = '⏹ Stop'; planFreeze();
    }
    function stop() {
      playing = false; clearInterval(sched); clearTimeout(freezeT);
      m.classList.remove('dance', 'frozen'); floor.classList.remove('on'); word.classList.remove('show'); btn.textContent = '▶ Start the music';
    }
    btn.addEventListener('click', () => playing ? stop() : start());
    window.addEventListener('pagehide', stop);
  }

  /* ---------- Animal Quiz ---------- */
  const quizEl = $('#quiz-data');
  if (quizEl) {
    const animals = JSON.parse(quizEl.textContent), q = $('#quiz-q'), opts = $('#quiz-opts'), fact = $('#quiz-fact'), sc = $('#quiz-score');
    let right = 0, target, locked = false;
    function round() {
      locked = false; fact.hidden = true;
      const pool = [...animals].sort(() => Math.random() - .5).slice(0, 3);
      target = pool[Math.floor(Math.random() * 3)];
      q.textContent = `Can you find the ${target.n}?`; say(`Can you find the ${target.n}?`);
      opts.innerHTML = '';
      pool.forEach(a => {
        const b = document.createElement('button'); b.className = 'quiz-opt'; b.type = 'button'; b.textContent = a.e; b.setAttribute('aria-label', a.n);
        b.addEventListener('click', () => {
          if (locked) return;
          if (a === target) {
            locked = true; b.classList.add('right'); sfx.yay(); say(`Yes! The ${a.n}!`);
            sc.textContent = ++right; if (right === 5) earn('quiz');
            fact.innerHTML = `<span style="font-size:1.6rem">${a.e}</span> ${a.f.replace(/</g, '&lt;')} <a href="${a.p}">More ${a.n} facts →</a>`;
            fact.hidden = false; setTimeout(round, 4200);
          } else { b.classList.remove('wrong'); void b.offsetWidth; b.classList.add('wrong'); sfx.oops(); say(`That's the ${a.n}. Try again!`); }
        });
        opts.appendChild(b);
      });
    }
    $('#quiz-skip').addEventListener('click', () => { sfx.pop(); round(); });
    round();
  }

  /* ---------- Dress up Plooshi ---------- */
  const closet = $('#closet');
  if (closet) {
    const o = window.Plooshi.outfit();
    $$('button[data-slot]', closet).forEach(b => {
      b.setAttribute('aria-pressed', o[b.dataset.slot] === b.dataset.val);
      b.addEventListener('click', () => {
        o[b.dataset.slot] = b.dataset.val; store.set('outfit', o); window.Plooshi.applyOutfit(o);
        $$(`button[data-slot="${b.dataset.slot}"]`, closet).forEach(x => x.setAttribute('aria-pressed', x === b));
        const m = $('#dressup .mascot'); m.classList.remove('jump'); void m.getBoundingClientRect(); m.classList.add('jump');
        sfx.pop(); if (b.dataset.val) earn('dress');
      });
    });
    $('#dress-random').addEventListener('click', () => {
      ['hat', 'eyes', 'neck'].forEach(slot => { const c = $$(`button[data-slot="${slot}"]`, closet); c[Math.floor(Math.random() * c.length)].click(); });
    });
  }
})();
