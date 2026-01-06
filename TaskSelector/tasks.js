// Task Selector main script
(function(){
  const BOARD_SIZE = 11;
  const PERIMETER_COUNT = (BOARD_SIZE*4) - 4; // 40 for 11x11
  const board = document.getElementById('board');
  const centerTitle = document.getElementById('centerTitle');
  const centerActivity = document.getElementById('centerActivity');
  const csvInput = document.getElementById('csvFile');
  const selectBtn = document.getElementById('selectTask');
  const dieA = document.getElementById('dieA');
  const dieB = document.getElementById('dieB');

  let cells = []; // length PERIMETER_COUNT
  let visits = new Array(PERIMETER_COUNT).fill(0);
  let currentIndex = 0; // start top-left visited

  function idxToCoord(i){
    const n = BOARD_SIZE;
    if(i < n) return {r:0, c:i}; // top row
    i -= n;
    if(i < n-1) return {r: 1 + i, c: n-1}; // right col (excluding top)
    i -= (n-1);
    if(i < n-1) return {r: n-1, c: n-2 - i}; // bottom row (excluding bottom-right)
    i -= (n-1);
    return {r: n-2 - i, c:0}; // left col (excluding top and bottom)
  }

  function createPerimeterDOM(){
    board.innerHTML = '';
    // create empty placeholders for full grid so center display aligns
    for(let r=0;r<BOARD_SIZE;r++){
      for(let c=0;c<BOARD_SIZE;c++){
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.style.gridRowStart = r+1;
        cell.style.gridColumnStart = c+1;
        // check if perimeter
        if(isPerimeter(r,c)){
          const idx = coordToIdx(r,c);
          cell.dataset.idx = idx;
          // title bar
          const title = document.createElement('div');
          title.className = 'title';
          title.textContent = '';
          cell.appendChild(title);
          const content = document.createElement('div');
          content.className = 'content';
          const houses = document.createElement('div');
          houses.className = 'houses';
          houses.textContent = '';
          content.appendChild(houses);
          cell.appendChild(content);
          cell.addEventListener('click', ()=>{ moveToIndex(parseInt(cell.dataset.idx)); });
        } else {
          cell.classList.add('hidden-cell');
        }
        board.appendChild(cell);
      }
    }
  }

  function isPerimeter(r,c){
    const n=BOARD_SIZE;
    return r===0 || r===n-1 || c===0 || c===n-1;
  }

  function coordToIdx(r,c){
    const n=BOARD_SIZE;
    if(r===0) return c;
    if(c===n-1) return (n) + (r-1);
    if(r===n-1) return (n) + (n-1) + (n-2 - c);
    // left col
    return (n) + (n-1) + (n-1) + (n-2 - r);
  }

  function renderCells(){
    const cellDivs = board.querySelectorAll('.cell');
    cellDivs.forEach(div => {
      if(!div.dataset.idx) return;
      const idx = parseInt(div.dataset.idx);
      const data = cells[idx] || {};
      const titleDiv = div.querySelector('.title');
      titleDiv.textContent = data.title || `Cell ${idx+1}`;
      const bg = data.color || '#666';
      titleDiv.style.background = bg;
      // set contrasting text color based on title bar background
      try{ titleDiv.style.color = getContrastColor(bg); } catch(e){ titleDiv.style.color = '#fff'; }
      const houses = div.querySelector('.houses');
      // only show visit count for times_per_visit and minutes_per_visit cells
      if((data.type === 'times_per_visit' || data.type === 'minutes_per_visit') && visits[idx] > 0){
        houses.textContent = String(visits[idx]);
      } else {
        houses.textContent = '';
      }
      div.classList.remove('highlight');
      if(idx === currentIndex) div.classList.add('highlight');
    });
  }

  function repeatIcon(icon, n){
    if(n<=0) return '';
    // cap icons for display based on the visit cap input (default 10)
    const cap = getVisitCap();
    const show = Math.min(n, cap);
    return icon.repeat(show);
  }

  function getVisitCap(){
    let cap = 10;
    try{
      const el = document.getElementById('visitCap');
      if(el){
        const v = parseInt(el.value, 10);
        if(!isNaN(v) && v > 0) cap = v;
      }
    }catch(e){}
    return cap;
  }

  function escapeHtml(str){
    if(str == null) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  function getContrastColor(cssColor){
    // Accepts hex (#rgb or #rrggbb), rgb(...) or named color.
    // Returns '#000' or '#fff' for best contrast using YIQ formula.
    function rgbFromCss(c){
      c = (c||'').trim();
      if(!c) return null;
      if(c[0] === '#'){
        // expand shorthand
        if(c.length === 4){
          const r = c[1]; const g = c[2]; const b = c[3];
          c = '#' + r + r + g + g + b + b;
        }
        const bigint = parseInt(c.slice(1),16);
        if(isNaN(bigint)) return null;
        return {r: (bigint>>16)&255, g: (bigint>>8)&255, b: bigint&255};
      }
      if(c.startsWith('rgb')){
        const vals = c.replace(/[^0-9,]/g,'').split(',').map(v=>parseInt(v.trim()));
        if(vals.length>=3) return {r:vals[0], g:vals[1], b:vals[2]};
      }
      // fallback: attempt to compute via temporary element for named colors
      try{
        const el = document.createElement('div');
        el.style.display = 'none';
        el.style.color = c;
        document.body.appendChild(el);
        const cs = getComputedStyle(el).color;
        document.body.removeChild(el);
        if(cs.startsWith('rgb')){
          const vals = cs.replace(/[^0-9,]/g,'').split(',').map(v=>parseInt(v.trim()));
          if(vals.length>=3) return {r:vals[0], g:vals[1], b:vals[2]};
        }
      }catch(e){ /* ignore */ }
      return null;
    }

    const rgb = rgbFromCss(cssColor) || {r:107,g:140,b:255};
    const yiq = ((rgb.r*299) + (rgb.g*587) + (rgb.b*114)) / 1000;
    return (yiq >= 128) ? '#000' : '#fff';
  }

  function moveToIndex(newIdx){
    // immediate move without animation
    currentIndex = newIdx % PERIMETER_COUNT;
    visits[currentIndex]++;
    renderCells();
    performCell(cells[currentIndex], currentIndex);
  }

  async function performCell(cell, idx){
    const visitsCount = visits[idx];
    // stop any running timer when changing cells (hide timer on cell change)
    stopTimer(true);
    // type handling
    // types: basic, times_per_visit, minutes_per_visit, six_choice_die, single_times_die, single_minutes_die, move_to
    const type = (cell && cell.type) || 'basic';
    let activityText = '';
    // base value for %T substitutions (number of times or minutes)
    let tBase = undefined;
    let sixChoice = null;
    let sixAlts = null;
    if(type === 'basic'){
      activityText = cell.activity || 'Do: ' + (cell.title||'Task');
    } else if(type === 'times_per_visit'){
      activityText = `${cell.activity || 'Do activity'}`;
      tBase = visitsCount;
    } else if(type === 'minutes_per_visit'){
      activityText = `${cell.activity || 'Do activity'}`;
      tBase = visitsCount;
    } else if(type === 'six_choice_die'){
      const choice = rollDie(6);
      sixChoice = choice; // 1-based
      sixAlts = cell.alts || [];
      activityText = cell.activity || 'Choose an option';
    } else if(type === 'single_times_die'){
      const n = rollDie(6);
      activityText = `${cell.activity || 'Do activity'}`;
      tBase = n;
    } else if(type === 'single_minutes_die'){
      const n = rollDie(6);
      activityText = `${cell.activity || 'Do activity'}`;
      tBase = n;
    } else if(type === 'move_to'){
      activityText = `${cell.activity || 'Move to another cell'}`;
      // if cell.target defined, jump to it after a short pause
      if(typeof cell.target === 'number'){
        setTimeout(()=>{
          animateJumpTo(cell.target);
        }, 700);
      }
    }
    // helper: substitute %T and %T<number> tokens with the appropriate count
    // substitute %T tokens and also return the last calculated numeric %T value
    function substituteT(s){
      if(!s || typeof s !== 'string') return {text: s || '', lastT: undefined};
      // fallback base when undefined
      const base = (typeof tBase === 'number') ? tBase : visitsCount;
      const V = visitsCount;
      const N = (typeof tBase === 'number') ? tBase : 0; // die result or base
      let lastT = undefined;

      // safe evaluator for simple arithmetic expressions using variables T, V, N
      function safeEval(expr){
        if(!expr || typeof expr !== 'string') return null;
        // allow digits, whitespace, T, V, N, parentheses and arithmetic operators
        if(!/^[0-9\sTVNtvn+\-*/().]+$/.test(expr)) return null;
        try{
          // eslint-disable-next-line no-new-func
          const fn = new Function('T','V','N', 'return (' + expr + ')');
          const res = fn(base, V, N);
          if(typeof res !== 'number' || !isFinite(res)) return null;
          return Math.round(res);
        }catch(e){
          return null;
        }
      }

      const replaced = s.replace(/%T(?:\(([^)]+)\)|(\d+))?/g, (m, exprGroup, numGroup) => {
        let val = undefined;
        if(exprGroup){
          const ev = safeEval(exprGroup);
          val = (ev === null) ? base : ev;
        } else if(numGroup){
          const mul = parseInt(numGroup,10) || 1;
          val = base * mul;
        } else {
          val = base;
        }
        lastT = val;
        return String(val);
      });

      return {text: replaced, lastT: lastT};
    }

    // substitute player names (%M -> player A, %F -> player B) in title and activity
    function getPlayerNames(){
      const a = (document.getElementById('playerA') && document.getElementById('playerA').value) || 'Player A';
      const b = (document.getElementById('playerB') && document.getElementById('playerB').value) || 'Player B';
      return {A: a, B: b};
    }
    function substituteNames(s){
      if(!s || typeof s !== 'string') return s || '';
      const p = getPlayerNames();
      return s.replace(/%M/g, p.A).replace(/%F/g, p.B);
    }

    // First substitute %T, then substitute names so names can appear in expansions
    const rawTitle = cell && cell.title ? cell.title : `Cell ${idx+1}`;
    const titleResult = substituteT(rawTitle);
    const activityResult = substituteT(activityText);
    const titleStr = titleResult.text;
    const activityStr = activityResult.text;
    const lastT = (typeof activityResult.lastT === 'number') ? activityResult.lastT : ((typeof titleResult.lastT === 'number') ? titleResult.lastT : undefined);
    centerTitle.textContent = substituteNames(titleStr);
    // For six_choice_die show a numbered list with the chosen item highlighted
    if(type === 'six_choice_die'){
      const listItems = [];
      for(let i=0;i<6;i++){
        const rawAlt = sixAlts[i] || `Option ${i+1}`;
        const altT = substituteT(rawAlt).text;
        const altWithNames = substituteNames(altT);
        const isSelected = (sixChoice === (i+1));
        const li = `<li class="choice-item ${isSelected? 'choice-selected':''}">${escapeHtml(altWithNames)}</li>`;
        listItems.push(li);
      }
      const html = `<ol class="choice-list">${listItems.join('')}</ol>`;
      centerActivity.innerHTML = html;
    } else {
      centerActivity.textContent = substituteNames(activityStr);
    }
    // show house icons across the top of the center area for each visit
    const centerHouses = document.getElementById('centerHouses');
    if(centerHouses){
      const cellType = (cell && cell.type) || '';
      if((cellType === 'times_per_visit' || cellType === 'minutes_per_visit') && visitsCount > 0){
        centerHouses.textContent = repeatIcon('🏠', visitsCount);
      } else {
        centerHouses.textContent = '';
      }
    }
    // determine timer start based on most recent %T calculation (activity then title), fall back to tBase or visits
    const effectiveT = (typeof lastT === 'number') ? lastT : (typeof tBase === 'number' ? tBase : visitsCount);
    if(type === 'minutes_per_visit' || type === 'single_minutes_die'){
      showTimer(effectiveT * 60);
    }

    // check cap and show completion overlay if visits reached cap (for relevant types)
    const cap = getVisitCap();
    if((cell && (cell.type === 'times_per_visit' || cell.type === 'minutes_per_visit')) && visitsCount >= cap){
      const owner = cell.owner || '';
      showCompletionOverlay(owner);
    }
  }

  // Timer state
  let timerInterval = null;
  let timerRemaining = 0; // seconds
  let timerInitial = 0;

  function formatTimeSec(sec){
    sec = Math.max(0, Math.floor(sec));
    const m = Math.floor(sec/60).toString().padStart(2,'0');
    const s = (sec%60).toString().padStart(2,'0');
    return `${m}:${s}`;
  }

  function showTimer(seconds){
    const wrap = document.getElementById('timerWrap');
    const disp = document.getElementById('timerDisplay');
    if(!wrap || !disp) return;
    timerInitial = Math.max(0, Math.floor(seconds));
    timerRemaining = timerInitial;
    disp.textContent = formatTimeSec(timerRemaining);
    wrap.style.display = '';
    // set button states
    document.getElementById('timerStart').disabled = false;
    document.getElementById('timerPause').disabled = true;
    document.getElementById('timerStop').disabled = false;
  }

  function updateTimerDisplay(){
    const disp = document.getElementById('timerDisplay');
    if(!disp) return;
    disp.textContent = formatTimeSec(timerRemaining);
  }

  function startTimer(){
    if(timerInterval) return; // already running
    if(timerRemaining <= 0) timerRemaining = timerInitial;
    document.getElementById('timerStart').disabled = true;
    document.getElementById('timerPause').disabled = false;
    document.getElementById('timerStop').disabled = false;
    timerInterval = setInterval(()=>{
      timerRemaining -= 1;
      updateTimerDisplay();
      if(timerRemaining <= 0){
        // timer expired: stop ticking, keep timer visible, flash and play alert
        if(timerInterval){ clearInterval(timerInterval); timerInterval = null; }
        timerRemaining = 0;
        updateTimerDisplay();
        // visual flash
        const disp = document.getElementById('timerDisplay');
        if(disp){
          disp.classList.remove('timer-flash');
          // trigger reflow to restart animation
          void disp.offsetWidth;
          disp.classList.add('timer-flash');
        }
        // audible alert
        playBeep();
        // adjust buttons
        document.getElementById('timerStart').disabled = true;
        document.getElementById('timerPause').disabled = true;
        document.getElementById('timerStop').disabled = false;
      }
    }, 1000);
  }

  function pauseTimer(){
    if(!timerInterval) return;
    clearInterval(timerInterval);
    timerInterval = null;
    document.getElementById('timerStart').disabled = false;
    document.getElementById('timerPause').disabled = true;
  }

  function stopTimer(hide = false){
    if(timerInterval){ clearInterval(timerInterval); timerInterval = null; }
    // Do not reset remaining/initial unless explicitly hiding (cell change)
    if(hide){
      timerRemaining = 0;
      timerInitial = 0;
    }
    const wrap = document.getElementById('timerWrap');
    if(wrap && hide) wrap.style.display = 'none';
    // update buttons
    const startBtn = document.getElementById('timerStart');
    const pauseBtn = document.getElementById('timerPause');
    if(startBtn) startBtn.disabled = false;
    if(pauseBtn) pauseBtn.disabled = true;
  }

  function resetTimer(){
    // reset to initial value and pause (do not hide)
    timerRemaining = timerInitial;
    updateTimerDisplay();
    if(timerInterval){ clearInterval(timerInterval); timerInterval = null; }
    document.getElementById('timerStart').disabled = false;
    document.getElementById('timerPause').disabled = true;
  }

  function playBeep(){
    try{
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = 880;
      g.gain.value = 0.0001;
      o.connect(g);
      g.connect(ctx.destination);
      const now = ctx.currentTime;
      g.gain.exponentialRampToValueAtTime(0.2, now + 0.01);
      o.start(now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
      o.stop(now + 0.9);
      // close context after short delay
      setTimeout(()=>{ try{ ctx.close(); }catch(e){} }, 1200);
    }catch(e){ /* ignore if audio not allowed */ }
  }

  // Completion overlay utilities
  function createCompletionOverlay(){
    if(document.getElementById('completeOverlay')) return;
    const back = document.createElement('div');
    back.id = 'completeOverlay';
    back.className = 'overlay-backdrop';
    back.style.display = 'none';
    const panel = document.createElement('div');
    panel.className = 'overlay-panel';
    panel.innerHTML = `<h3 id="overlayTitle">All tasks complete</h3><p id="overlayText">All tasks complete for player</p><div><button id="overlayDismiss">Reset & Close</button></div>`;
    back.appendChild(panel);
    document.body.appendChild(back);
    document.getElementById('overlayDismiss').addEventListener('click', ()=>{
      hideCompletionOverlay();
      // reset visits and move to top-left
      resetAllVisitsAndReturnHome();
    });
  }

  function showCompletionOverlay(owner){
    createCompletionOverlay();
    const back = document.getElementById('completeOverlay');
    const title = document.getElementById('overlayTitle');
    const text = document.getElementById('overlayText');
    let playerLabel = 'Player';
    if(owner){
      const a = (document.getElementById('playerA') && document.getElementById('playerA').value) || 'Player A';
      const b = (document.getElementById('playerB') && document.getElementById('playerB').value) || 'Player B';
      if(owner.toUpperCase() === 'A' || owner.toUpperCase() === 'M') playerLabel = a;
      else if(owner.toUpperCase() === 'B' || owner.toUpperCase() === 'F') playerLabel = b;
    }
    if(title) title.textContent = 'All tasks complete';
    if(text) text.textContent = `All tasks complete for ${playerLabel}.`;
    if(back) back.style.display = 'flex';
  }

  function hideCompletionOverlay(){
    const back = document.getElementById('completeOverlay');
    if(back) back.style.display = 'none';
  }

  function resetAllVisitsAndReturnHome(){
    // stop timers
    stopTimer(true);
    for(let i=0;i<visits.length;i++) visits[i] = 0;
    currentIndex = 0;
    renderCells();
    performCell(cells[currentIndex], currentIndex);
  }

  // wire timer buttons
  (function wireTimerButtons(){
    document.addEventListener('DOMContentLoaded', ()=>{
      const s = document.getElementById('timerStart');
      const p = document.getElementById('timerPause');
      const t = document.getElementById('timerStop');
      const r = document.getElementById('timerReset');
      if(s) s.addEventListener('click', startTimer);
      if(p) p.addEventListener('click', pauseTimer);
      if(t) t.addEventListener('click', ()=>{ stopTimer(false); updateTimerDisplay(); });
      if(r) r.addEventListener('click', resetTimer);
    });
    // in case DOM already loaded
    const s = document.getElementById('timerStart');
    const p = document.getElementById('timerPause');
    const t = document.getElementById('timerStop');
    const r = document.getElementById('timerReset');
    if(s) s.addEventListener('click', startTimer);
    if(p) p.addEventListener('click', pauseTimer);
    if(t) t.addEventListener('click', ()=>{ stopTimer(false); updateTimerDisplay(); });
    if(r) r.addEventListener('click', resetTimer);
  })();

  function rollDie(sides){
    return Math.floor(Math.random()*sides)+1;
  }

  function animateDice(targetA, targetB, ms=800){
    return new Promise(res=>{
      const start = Date.now();
      const iv = setInterval(()=>{
        dieA.textContent = rollDie(6);
        dieB.textContent = rollDie(6);
        if(Date.now() - start >= ms){
          clearInterval(iv);
          dieA.textContent = targetA;
          dieB.textContent = targetB;
          res();
        }
      },80);
    });
  }

  async function animateSelection(steps){
    // animate moving highlight along perimeter steps
    let idx = currentIndex;
    const delay = 120;
    for(let s=1;s<=steps;s++){
      idx = (idx+1) % PERIMETER_COUNT;
      highlightIndex(idx);
      await wait(delay);
    }
    // done
    currentIndex = idx;
    visits[currentIndex]++;
    renderCells();
    performCell(cells[currentIndex], currentIndex);
  }

  function highlightIndex(idx){
    const prev = board.querySelector('.highlight');
    if(prev) prev.classList.remove('highlight');
    const el = board.querySelector(`[data-idx='${idx}']`);
    if(el) el.classList.add('highlight');
  }

  function wait(ms){return new Promise(r=>setTimeout(r,ms));}

  async function doSelectTask(){
    // roll two dice with animation, then advance that many cells along the perimeter
    const a = rollDie(6), b = rollDie(6);
    await animateDice(a,b,900);
    const sum = a + b;
    await animateSelection(sum);
  }

  async function animateJumpTo(targetIdx){
    // animate stepping along to the target from currentIndex
    targetIdx = ((targetIdx % PERIMETER_COUNT)+PERIMETER_COUNT)%PERIMETER_COUNT;
    let steps = (targetIdx - currentIndex + PERIMETER_COUNT) % PERIMETER_COUNT;
    if(steps === 0) return; // already there
    await animateSelection(steps);
  }

  function parseCSV(text){
    // simplistic CSV parse supporting quoted fields
    // ignore empty lines and comment lines that start with '#'
    const lines = text.split(/\r?\n/).map(l=>l.trim()).filter(l=>l.length>0 && !l.startsWith('#'));
    const rows = [];
    for(const line of lines){
      const row = [];
      let cur='';
      let inQ=false;
      for(let i=0;i<line.length;i++){
        const ch = line[i];
        if(ch === '"') { inQ = !inQ; continue; }
        if(ch === ',' && !inQ){ row.push(cur); cur=''; } else cur+=ch;
      }
      row.push(cur);
      rows.push(row);
    }
    return rows;
  }

  function loadFromRows(rows){
    // expected columns (flexible): title,color,type,activity,alt1..alt6,target
    const out = [];
    for(let i=0;i<PERIMETER_COUNT;i++){
      const r = rows[i] || [];
      const title = r[0]||`Cell ${i+1}`;
      const color = r[1] || '#6b8cff';
      const type = (r[2] || 'basic').trim();
      const activity = r[3] || '';
      const alts = r.slice(4,10).map(x=>x||'').filter(x=>x!=='');
      let target = undefined;
      if(r[10]){
        const v = parseInt(r[10]);
        if(!isNaN(v)) target = v;
      }
      // optional owner/player indicator in column 11 (A/B/M/F)
      const ownerRaw = (r[11] || '').toString().trim();
      let owner = '';
      if(ownerRaw){
        const o = ownerRaw.toUpperCase();
        if(o === 'A' || o === 'M') owner = 'A';
        else if(o === 'B' || o === 'F') owner = 'B';
      }
      out.push({title, color, type, activity, alts, target, owner});
    }
    cells = out;
    visits = new Array(PERIMETER_COUNT).fill(0);
    currentIndex = 0;
    renderCells();
    // initial visit top-left
    visits[currentIndex]++;
    renderCells();
    performCell(cells[currentIndex], currentIndex);
  }

  csvInput.addEventListener('change', (ev)=>{
    const f = ev.target.files && ev.target.files[0];
    if(!f) return;
    const reader = new FileReader();
    reader.onload = ()=>{
      const rows = parseCSV(reader.result || '');
      loadFromRows(rows);
    };
    reader.readAsText(f);
  });

  selectBtn.addEventListener('click', ()=>{
    selectBtn.disabled = true;
    doSelectTask().finally(()=> selectBtn.disabled = false);
  });

  // init empty/perimeter DOM
  createPerimeterDOM();

  // Move the existing center display into the board grid so it sits in the interior
  (function placeCenterDisplay(){
    const center = document.getElementById('centerDisplay');
    if(!center) return;
    // append into grid so grid positioning applies
    board.appendChild(center);
    // ensure it spans the interior 9x9 (columns 2..10, rows 2..10)
    center.style.gridColumnStart = '2';
    center.style.gridColumnEnd = '11';
    center.style.gridRowStart = '2';
    center.style.gridRowEnd = '11';
  })();

  // If there's a built-in CSV file in workspace, try to fetch it as default
  fetch('tasks.csv').then(r=>{
    if(!r.ok) throw new Error('no default');
    return r.text();
  }).then(txt=>{
    const rows = parseCSV(txt);
    loadFromRows(rows);
  }).catch(()=>{
    // build default placeholder cells so UI is usable
    const placeholder = [];
    for(let i=0;i<PERIMETER_COUNT;i++){
      const t = `Task ${i+1}`;
      const c = ['#6b8cff','#ff8a65','#7bd389','#ffd166','#a29bfe','#ff6bcb','#6bd3ff'][i%7];
      const typeList = ['basic','times_per_visit','minutes_per_visit','six_choice_die','single_times_die','single_minutes_die','move_to'];
      const ty = typeList[i%7];
      const row = [t,c,ty,`Activity for ${t}`];
      // add some alt choices for six_choice_die
      if(ty==='six_choice_die'){
        row.push('A','B','C','D','E','F');
      }
      // move_to sample targets
      if(ty==='move_to') row[10] = (i+3) % PERIMETER_COUNT;
      placeholder.push(row);
    }
    loadFromRows(placeholder);
  });

})();
