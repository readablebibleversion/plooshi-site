/* Plooshi Play games: Color Plooshi, Memory Match, Bubble Pop Counting */
(function () {
  const { tone, NOTES, sfx, store, confetti, say } = window.Plooshi;
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
            if (found === animals.length) setTimeout(() => { confetti(); say('You found them all!'); const b = store.get('memBest', 999); if (n < b) { store.set('memBest', n); best.textContent = n; } }, 700);
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
          if (next > upTo) { running = false; clearInterval(spawner); msg.textContent = 'You counted to ' + upTo + '! Amazing! 🌟'; setTimeout(() => { sfx.yay(); confetti(); }, 300); startBtn.textContent = 'Play again'; }
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
})();
