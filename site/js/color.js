/* Plooshi online coloring: tap-to-fill any printable coloring page right in the browser */
(function () {
  const { sfx, store, confetti, earn, tone, NOTES } = window.Plooshi;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const D = JSON.parse($('#color-data').textContent);
  const slug = new URLSearchParams(location.search).get('p');
  const pic = D.pages.find(p => p.s === slug);
  if (!pic) return;                                   // no picture chosen: the picker grid stays visible

  $('#picker').hidden = true; $('#app').hidden = false;
  $('#color-title').textContent = `Color the ${pic.t}! 🎨`;
  document.title = `Color the ${pic.t} online • Plooshi`;
  $('#color-print-link').href = D.base + pic.pdf;
  $('#color-back').href = D.base + '/printable/' + pic.s + '/';

  const COLORS = ['#ff5a5a', '#ff8a3d', '#ffc93c', '#ffe066', '#a8e063', '#6fdcae', '#2bb673', '#5ec8f2', '#2a9fd6', '#1d3260',
                  '#8b6cf0', '#c4b5fd', '#ec3d8f', '#f9a8d4', '#ffd1a1', '#8b5a2b', '#9aa3b8', '#ffffff'];
  const canvas = $('#art'), ctx = canvas.getContext('2d', { willReadFrequently: true });
  let W, H, lum, mask, out, color = COLORS[0], mode = 'paint', undo = [], fills = 0;

  // palette
  const pal = $('.palette', $('#tools'));
  COLORS.forEach((c, i) => {
    const b = document.createElement('button'); b.className = 'swatch'; b.style.background = c; b.type = 'button';
    b.setAttribute('aria-label', 'Color ' + (i + 1)); b.setAttribute('aria-pressed', i === 0);
    b.addEventListener('click', () => { color = c; setMode('paint'); $$('.swatch', pal).forEach(s => s.setAttribute('aria-pressed', s === b)); tone(NOTES[['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'][i % 8]], 0.25); showCurrent(); });
    pal.appendChild(b);
  });
  function showCurrent() {
    $('#current-dot').style.background = mode === 'rainbow' ? 'conic-gradient(red,orange,yellow,lime,cyan,blue,violet,red)' : mode === 'erase' ? '#fff' : color;
    $('#current-name').textContent = mode === 'rainbow' ? 'Rainbow magic!' : mode === 'erase' ? 'Eraser' : 'Tap to fill';
  }
  function setMode(m) { mode = m; $('#tool-rainbow').classList.toggle('tool-on', m === 'rainbow'); $('#tool-erase').classList.toggle('tool-on', m === 'erase'); showCurrent(); }
  $('#tool-rainbow').addEventListener('click', () => setMode(mode === 'rainbow' ? 'paint' : 'rainbow'));
  $('#tool-erase').addEventListener('click', () => setMode(mode === 'erase' ? 'paint' : 'erase'));

  // load the picture
  const img = new Image();
  img.onload = () => {
    W = canvas.width = img.naturalWidth; H = canvas.height = img.naturalHeight;
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); ctx.drawImage(img, 0, 0);
    const src = ctx.getImageData(0, 0, W, H);
    lum = new Uint8Array(W * H); mask = new Uint8Array(W * H);
    for (let i = 0, j = 0; i < lum.length; i++, j += 4) {
      const l = (src.data[j] * 299 + src.data[j + 1] * 587 + src.data[j + 2] * 114) / 1000;
      lum[i] = l; mask[i] = l < 150 ? 1 : 0;            // dark pixels are the outlines
    }
    out = src;
    const saved = store.get('art:' + pic.s, null);       // pick up where they left off
    if (saved) { const r = new Image(); r.onload = () => { ctx.drawImage(r, 0, 0); out = ctx.getImageData(0, 0, W, H); }; r.src = saved; }
    $('.canvas-wrap .loading').remove();
  };
  img.onerror = () => { $('.canvas-wrap .loading').textContent = 'Oops, the picture would not load 🙈'; };
  img.src = D.base + pic.img;

  function nearestOpen(i) {
    if (!mask[i]) return i;
    const x0 = i % W, y0 = (i / W) | 0;
    for (let r = 1; r <= 8; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const x = x0 + dx, y = y0 + dy;
      if (x >= 0 && y >= 0 && x < W && y < H && !mask[y * W + x]) return y * W + x;
    }
    return -1;
  }
  function hex(c) { return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]; }

  function fill(start, rgb) {
    const seen = new Uint8Array(W * H), d = out.data, stack = [start];
    const open = p => !mask[p] && !seen[p];
    while (stack.length) {
      let p = stack.pop(); if (!open(p)) continue;
      const y = (p / W) | 0, rowStart = y * W;
      while (p > rowStart && open(p - 1)) p--;
      let upOpen = false, downOpen = false;
      for (; p < rowStart + W && open(p); p++) {
        seen[p] = 1;
        const k = p * 4, f = lum[p] / 255;                // multiply keeps the soft outline edges
        d[k] = rgb[0] * f; d[k + 1] = rgb[1] * f; d[k + 2] = rgb[2] * f;
        if (y > 0) { const u = open(p - W); if (u && !upOpen) stack.push(p - W); upOpen = u; }
        if (y < H - 1) { const v = open(p + W); if (v && !downOpen) stack.push(p + W); downOpen = v; }
      }
    }
    ctx.putImageData(out, 0, 0);
  }

  canvas.addEventListener('pointerdown', e => {
    if (!out) return;
    const r = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - r.left) * W / r.width), y = Math.floor((e.clientY - r.top) * H / r.height);
    const start = nearestOpen(y * W + x); if (start < 0) return;
    undo.push(new ImageData(new Uint8ClampedArray(out.data), W, H)); if (undo.length > 10) undo.shift();
    const c = mode === 'erase' ? '#ffffff' : mode === 'rainbow' ? COLORS[Math.floor(Math.random() * 17)] : color;
    fill(start, hex(c)); sfx.pop();
    if (++fills === 10) earn('color');
    clearTimeout(canvas._t); canvas._t = setTimeout(() => { try { store.set('art:' + pic.s, canvas.toDataURL('image/jpeg', 0.85)); } catch (err) {} }, 800);
  });

  $('#tool-undo').addEventListener('click', () => { const u = undo.pop(); if (!u) return sfx.oops(); out = u; ctx.putImageData(out, 0, 0); sfx.boing(); });
  $('#tool-clear').addEventListener('click', () => {
    if (!confirm('Start this picture over?')) return;
    undo.push(new ImageData(new Uint8ClampedArray(out.data), W, H));
    const d = out.data; for (let i = 0, k = 0; i < lum.length; i++, k += 4) d[k] = d[k + 1] = d[k + 2] = lum[i];
    ctx.putImageData(out, 0, 0); store.set('art:' + pic.s, null); sfx.boing();
  });
  $('#tool-save').addEventListener('click', () => {
    canvas.toBlob(b => {
      const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `plooshi-${pic.s}.png`;
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      if (!earn('art')) { sfx.yay(); confetti(40); }
    }, 'image/png');
  });
  $('#tool-print').addEventListener('click', () => {
    $('#print-art').innerHTML = `<img src="${canvas.toDataURL('image/png')}" alt="">`;
    setTimeout(() => window.print(), 100);
  });
  showCurrent();
})();
