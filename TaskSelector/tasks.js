// Task Rotator main JS
(() => {
  const main = document.getElementById('mainarea')
  const statusLeft = document.getElementById('status-left')
  const statusCenter = document.getElementById('status-center')
  const statusRight = document.getElementById('status-right')
  const csvInput = document.getElementById('csvfile')

  let tasks = []
  let currentIndex = 0
  let participantM = ''
  let participantF = ''
  let maxVisits = 5
  let animating = false
  let lastCsvName = ''

  // Render a die as inline SVG. If `value` is falsy, render an empty die face.
  function dieSVG(value){
    const size = 64
    const r = 6
    const positions = {
      1: [[0.5,0.5]],
      2: [[0.25,0.25],[0.75,0.75]],
      3: [[0.25,0.25],[0.5,0.5],[0.75,0.75]],
      4: [[0.25,0.25],[0.25,0.75],[0.75,0.25],[0.75,0.75]],
      5: [[0.25,0.25],[0.25,0.75],[0.5,0.5],[0.75,0.25],[0.75,0.75]],
      6: [[0.25,0.2],[0.25,0.5],[0.25,0.8],[0.75,0.2],[0.75,0.5],[0.75,0.8]]
    }
    if (!value) {
      return `<svg viewBox="0 0 64 64" width="36" height="36" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="60" height="60" rx="8" fill="white" stroke="#aaa"/></svg>`
    }
    const pts = positions[value] || positions[1]
    const circles = pts.map(p => `<circle cx="${Math.round(p[0]*size)}" cy="${Math.round(p[1]*size)}" r="${r}" fill="#111"/>`).join('')
    return `<svg viewBox="0 0 64 64" width="36" height="36" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="60" height="60" rx="8" fill="white" stroke="#aaa"/>${circles}</svg>`
  }

  function renderDie(el, value){
    el.innerHTML = dieSVG(value)
    el.setAttribute('role','img')
    el.setAttribute('aria-label', value ? `Die ${value}` : 'Die')
  }

  function showConfigView() {
    statusLeft.innerHTML = ''
    statusCenter.innerHTML = ''
    statusRight.innerHTML = ''
    main.innerHTML = ''
    const panel = document.createElement('div')
    panel.className = 'panel'

    const html = `
      <div class="config">
        <div class="config-row"><label class="label">CSV Tasks File</label>
          <button id="chooseCsv" class="btn">Choose CSV File</button>
          <span id="csvname" style="margin-left:8px;color:#666"></span>
        </div>
        <div class="config-row"><label class="label">Participant 1 Name</label>
          <input id="p1" type="text" placeholder="Participant 1"></div>
        <div class="config-row"><label class="label">Participant 2 Name</label>
          <input id="p2" type="text" placeholder="Participant 2"></div>
        <div class="config-row"><label class="label">Max visits per VISIT task</label>
          <input id="maxv" type="number" min="1" value="5"></div>
        <div class="config-row"><button id="beginBtn" class="btn">Begin</button></div>
      </div>`

    panel.innerHTML = html
    main.appendChild(panel)

    document.getElementById('chooseCsv').addEventListener('click', ()=> csvInput.click())
    // avoid attaching multiple listeners if config view is shown repeatedly
    try{ csvInput.removeEventListener('change', handleCSVSelected) }catch(e){}
    csvInput.addEventListener('change', handleCSVSelected)
    // show previously selected CSV name so user doesn't need to reselect
    const csvnameEl = document.getElementById('csvname')
    if (csvnameEl) csvnameEl.textContent = lastCsvName || (tasks.length ? 'Loaded' : '')
    document.getElementById('beginBtn').addEventListener('click', () => {
      participantM = document.getElementById('p1').value || 'Player 1'
      participantF = document.getElementById('p2').value || 'Player 2'
      maxVisits = parseInt(document.getElementById('maxv').value,10) || 5
      if (!tasks.length) { alert('Please choose a CSV tasks file first.'); return }
      currentIndex = 0
      renderTaskView()
    })
  }

  function handleCSVSelected(e){
    const f = e.target.files[0]
    if (!f) return
    lastCsvName = f.name
    const csvnameEl = document.getElementById('csvname')
    if (csvnameEl) csvnameEl.textContent = f.name
    const reader = new FileReader()
    reader.onload = ()=>{
      tasks = parseCSV(reader.result)
      // initialize visit counts
      tasks.forEach(t=>t.visits=0)
    }
    reader.readAsText(f)
  }

  function parseCSV(text){
    const rows = []
    // simple CSV parser handling quoted fields
    let cur = ''
    let row = []
    let inQuotes = false
    for (let i=0;i<text.length;i++){
      const ch = text[i]
      if (ch==='"') { inQuotes = !inQuotes }
      else if (ch===',' && !inQuotes) { row.push(cur); cur=''}
      else if ((ch==='\n' || ch==='\r') && !inQuotes) {
        if (cur!==''||row.length) { row.push(cur); rows.push(row); row=[]; cur=''}
      } else { cur+=ch }
    }
    if (cur!==''||row.length) { row.push(cur); rows.push(row) }
    // map rows to tasks: title,color,type,description,owner, extras...
    // ignore comment lines that start with '#' in the first cell (after trimming)
    return rows.filter(r=>{
      if (!r || r.length===0) return false
      const first = (r[0]||'').toString().trim()
      if (first.startsWith('#')) return false
      return true
    }).map(r=>{
      const [title=color,type,desc,owner] = [r[0]||'', r[2]||'', r[3]||'', r[4]||'']
      // But because columns shift, interpret properly:
      // r[0]=title, r[1]=color, r[2]=type, r[3]=description, r[4]=owner, r[5+]=extras
      const t = {
        title: (r[0]||'').trim(),
        color: (r[1]||'#ffffff').trim(),
        type: ((r[2]||'BASIC').trim()).toUpperCase(),
        description: (r[3]||'').trim(),
        owner: (r[4]||'').trim(),
        extras: r.slice(5).map(s=>s.trim()),
        visits: 0
      }
      return t
    })
  }

  function renderTaskView(){
    statusLeft.innerHTML = ''
    statusCenter.innerHTML = ''
    statusRight.innerHTML = ''
    // status controls
    const rollBtn = document.createElement('button')
    rollBtn.className = 'btn'
    rollBtn.textContent = 'Roll'
    const resetBtn = document.createElement('button')
    resetBtn.className = 'btn'
    resetBtn.textContent = 'Reset'
    const diceA = document.createElement('div')
    const diceB = document.createElement('div')
    diceA.className='dice'; diceB.className='dice'
    // start with random faces when first shown
    renderDie(diceA, rollDie()); renderDie(diceB, rollDie())
    // Left: Reset button (left-justified). Center: left empty. Right: Roll + dice.
    statusLeft.appendChild(resetBtn)
    statusRight.appendChild(rollBtn)
    statusRight.appendChild(diceA)
    statusRight.appendChild(diceB)

    rollBtn.addEventListener('click', ()=> doRoll(diceA,diceB,rollBtn,resetBtn))
    resetBtn.addEventListener('click', ()=> doReset())

    main.innerHTML = ''
    const container = document.createElement('div')
    container.className = 'panel'
    main.appendChild(container)

    renderCurrentTask(container)
  }

  // Animate replacing the current panel child with a new node: old slides left, new slides in from right
  function animateReplace(container, newNode){
    const old = container.querySelector('.panel-child')
    newNode.classList.add('panel-child')
    // ensure the new node can scroll within the panel
    newNode.style.width = '100%'
    newNode.style.height = '100%'
    newNode.style.boxSizing = 'border-box'
    newNode.style.overflow = 'auto'

    // If there's no existing child, just insert the new node
    if (!old){
      container.innerHTML = ''
      container.appendChild(newNode)
      return
    }

    // Build a track containing the old and new nodes side-by-side
    const track = document.createElement('div')
    track.className = 'panel-track'
    // ensure children are full-width
    old.style.flex = '0 0 100%'
    newNode.style.flex = '0 0 100%'
    track.appendChild(old)
    track.appendChild(newNode)

    // place track into the container
    container.innerHTML = ''
    container.appendChild(track)

    // force layout then animate track translating left to reveal newNode
    track.getBoundingClientRect()
    track.style.transform = 'translateX(-100%)'
//lqms    
    track.style.transitionDuration = '1ms'

    const cleanup = () => {
      // remove track and leave newNode as single child
      if (track.parentNode) track.parentNode.removeChild(track)
      newNode.style.flex = ''
      container.innerHTML = ''
      container.appendChild(newNode)
      track.removeEventListener('transitionend', cleanup)
    }
    track.addEventListener('transitionend', cleanup)
  }

  // Build a DOM node for a given task (same structure used by renderCurrentTask)
  function buildTaskNode(t){
    const node = document.createElement('div')
    if (!t) { node.textContent = 'No task'; return node }
    const type = t.type
    if (type==='BASIC' || type==='COUNT' || type==='TIME' || type==='GOTO'){
      node.style.background = t.color
      const title = document.createElement('div'); title.className='task-title'; title.textContent = t.title
      const desc = document.createElement('div'); desc.className='task-desc'
      if (type==='TIME'){
        const d = rollDie()
        desc.innerHTML = substitutePlaceholders(t.description, d)
        node.appendChild(title); node.appendChild(desc)
        attachTimer(node, t, false, d * 60)
      } else if (type==='COUNT'){
        const d = rollDie()
        desc.innerHTML = substitutePlaceholders(t.description, d)
        node.appendChild(title); node.appendChild(desc)
      } else {
        desc.innerHTML = substitutePlaceholders(t.description)
        node.appendChild(title); node.appendChild(desc)
      }
    } else if (type==='VISIT_COUNT' || type==='VISIT_TIME'){
      node.style.background = '#eee'
      const bar = document.createElement('div'); bar.className='title-bar'; bar.style.background = t.color; bar.textContent = t.title
      const visitsRow = document.createElement('div'); visitsRow.className='visits-row'
      for (let i=0;i<t.visits;i++){ const h=document.createElement('div'); h.className='house'; h.textContent='🏠'; visitsRow.appendChild(h) }
      const desc = document.createElement('div'); desc.className='task-desc'; desc.innerHTML=substitutePlaceholdersVisit(t)
      node.appendChild(bar); node.appendChild(visitsRow); node.appendChild(desc)
      if (type==='VISIT_TIME') attachTimer(node, t, true)
    } else if (type==='SELECTION'){
      node.style.background = t.color
      const title = document.createElement('div'); title.className='task-title'; title.textContent = t.title
      node.appendChild(title)
      const ul = document.createElement('ul'); ul.className='selection-list'
      // create placeholder list items
      const items = t.extras.slice(0,6)
      items.forEach((it,idx)=>{
        const li = document.createElement('li')
        ul.appendChild(li)
      })
      node.appendChild(ul)
      // single roll to choose option; use same roll for %N minute calculations
      const sel = rollDie()
      const chosen = Math.max(1, Math.min(6, sel))

      // populate list item texts, substituting placeholders
      for (let i=0;i<ul.children.length;i++){
        const li = ul.children[i]
        const raw = items[i] || ''
        const sel2 = rollDie()
        const sel3 = rollDie()
        // basic substitutions
        let txt = String(raw).replace(/%M/g, participantM).replace(/%F/g, participantF).replace(/%D/g, String(sel2))
        // If this item contains a %T<number> token, treat it as a display replacement
        // and, if it's the chosen item, mark the node to trigger a selection->GOTO.
        const tMatch = raw.match(/%T(\d+)/)
        if (tMatch){
          const targetNum = parseInt(tMatch[1],10)
          const targetIndex = ((targetNum-1) % tasks.length + tasks.length) % tasks.length
          const targetTitle = (tasks[targetIndex] && tasks[targetIndex].title) ? tasks[targetIndex].title : `Task ${targetNum}`
          txt = txt.replace(/%T\d+/, targetTitle)
          if (i === chosen-1) node.dataset.selectionGoto = String(targetIndex)
        }
        // Now expand numeric multipliers (e.g. %3 -> 3 * sel3)
        txt = txt.replace(/%(\d+)/g, (m,n)=> String(parseInt(n,10) * sel3))
        li.textContent = `${i+1}. ${txt}`
        if(i === chosen-1)
        {
          li.classList.add('highlight')
          // Attach timer only if the chosen raw text has a numeric %N and is NOT a %T token
          if (!raw.match(/%T(\d+)/)){
            const m = raw.match(/%(\d+)/)
            if (m){
              const minutes = parseInt(m[1],10) * sel3
              attachTimer(node, null, false, minutes * 60)
            }
          }
        }
      }
      const note = document.createElement('div'); note.style.marginTop='8px'; note.textContent=`Selected: ${chosen}`
      node.appendChild(note)
    } else {
      node.textContent = 'Unknown task type: '+t.type
    }
    return node
  }

  // Perform a continuous track slide of `steps` steps starting from startIndex.
  // Returns a Promise that resolves when the slide completes and the container has been updated.
  function performTrackSlide(container, startIndex, steps){
    return new Promise((resolve)=>{
      const n = tasks.length
      if (!n || steps<=0){ resolve(); return }
      // current visible node
      const current = container.querySelector('.panel-child') || buildTaskNode(tasks[startIndex])
      // ensure current is a panel-child and attached
      if (!current.parentNode) {
        current.classList.add('panel-child')
        container.appendChild(current)
      }
      // create track
      const track = document.createElement('div'); track.className='panel-track'
      // move current into track (remove from container)
      if (current.parentNode === container) container.removeChild(current)
      current.style.flex = '0 0 100%'
      track.appendChild(current)
      // append nodes for each intermediate step
      const nodes = []
      for (let s=1;s<=steps;s++){
        const idx = (startIndex + s) % n
        const node = buildTaskNode(tasks[idx])
        // ensure padding and shared styles apply during slide
        node.classList.add('panel-child')
        node.style.flex = '0 0 100%'
        nodes.push(node)
        track.appendChild(node)
      }
      // insert track into container
      container.innerHTML = ''
      container.appendChild(track)
      // force layout
      track.getBoundingClientRect()
      // set duration proportional to steps
      // slower per-step timing for a more leisurely continuous slide
      const perStepMs = 1000
      track.style.transition = `transform ${Math.max(200, perStepMs*steps)}ms cubic-bezier(.22,.9,.28,1)`
      // translate to reveal final node
      requestAnimationFrame(()=> track.style.transform = `translateX(-${100*steps}%)`)

      const onEnd = ()=>{
        // cleanup: leave only the final node in container
        const finalNode = nodes[nodes.length-1]
        if (finalNode){
          finalNode.classList.add('panel-child')
        }
        // remove track
        if (track.parentNode) track.parentNode.removeChild(track)
        container.innerHTML = ''
        if (finalNode) container.appendChild(finalNode)
        track.removeEventListener('transitionend', onEnd)
        resolve()
      }
      track.addEventListener('transitionend', onEnd)
    })
  }

  // Follow selection-initiated GOTO or GOTO tile chains starting from the currentIndex.
  // This will pause briefly when a selection indicates a GOTO, slide to the target,
  // then follow any GOTO tiles found at the destination (animating each hop).
  async function followGotoChain(container){
    const n = tasks.length
    if (!n) return
    const pauseOnGotoMs = 1500
    // If the displayed node indicates a selection-initiated GOTO, follow it first
    const disp = container.querySelector('.panel-child')
    if (disp && disp.dataset && disp.dataset.selectionGoto){
      const targetIndex = parseInt(disp.dataset.selectionGoto,10)
      if (!isNaN(targetIndex) && targetIndex !== currentIndex){
        await new Promise(r=>setTimeout(r,pauseOnGotoMs))
        const extraSteps = (targetIndex - currentIndex + n) % n
        if (extraSteps > 0){
          await performTrackSlide(container, currentIndex, extraSteps)
          currentIndex = targetIndex
        }
      }
    }

    // Now follow any GOTO tiles starting from currentIndex
    let stepsFollowed = 0
    while (stepsFollowed < n){
      const gtask = tasks[currentIndex]
      if (!gtask || gtask.type !== 'GOTO') break
      const raw = (gtask.extras && gtask.extras[0]) ? gtask.extras[0] : null
      const targetNum = raw !== null ? parseInt(raw,10) : NaN
      if (isNaN(targetNum)) break
      const targetIndex = ((targetNum-1) % n + n) % n
      const extraSteps = (targetIndex - currentIndex + n) % n
      if (extraSteps === 0) break
      await performTrackSlide(container, currentIndex, extraSteps)
      currentIndex = targetIndex
      stepsFollowed++
      await new Promise(r=>setTimeout(r,300))
    }
  }

  function renderCurrentTask(container){
    const t = tasks[currentIndex]
    if (!t) {
      // create a simple empty node
      const empty = document.createElement('div')
      empty.textContent = 'No task'
      animateReplace(container, empty)
      return
    }
    // handle types — build a new content node, then animateReplace into container
    const type = t.type
    const newNode = document.createElement('div')
    if (type==='BASIC' || type==='COUNT' || type==='TIME' || type==='GOTO'){
      newNode.style.background = t.color
      const title = document.createElement('div'); title.className='task-title'; title.textContent = t.title
      const desc = document.createElement('div'); desc.className='task-desc'
      if (type==='TIME'){
        const d = rollDie()
        desc.innerHTML = substitutePlaceholders(t.description, d)
        newNode.appendChild(title); newNode.appendChild(desc)
        attachTimer(newNode, t, false, d * 60)
      } else if (type==='COUNT'){
        const d = rollDie()
        desc.innerHTML = substitutePlaceholders(t.description, d)
        newNode.appendChild(title); newNode.appendChild(desc)
      } else {
        desc.innerHTML = substitutePlaceholders(t.description)
        newNode.appendChild(title); newNode.appendChild(desc)
      }
    } else if (type==='VISIT_COUNT' || type==='VISIT_TIME'){
      newNode.style.background = '#eee'
      const bar = document.createElement('div'); bar.className='title-bar'; bar.style.background = t.color; bar.textContent = t.title
      const visitsRow = document.createElement('div'); visitsRow.className='visits-row'
      for (let i=0;i<t.visits;i++){ const h=document.createElement('div'); h.className='house'; h.textContent='🏠'; visitsRow.appendChild(h) }
      const desc = document.createElement('div'); desc.className='task-desc'; desc.innerHTML=substitutePlaceholdersVisit(t)
      newNode.appendChild(bar); newNode.appendChild(visitsRow); newNode.appendChild(desc)
      if (type==='VISIT_TIME') attachTimer(newNode, t, true)
    } else if (type==='SELECTION'){
      newNode.style.background = t.color
      const title = document.createElement('div'); title.className='task-title'; title.textContent = t.title
      newNode.appendChild(title)
      const ul = document.createElement('ul'); ul.className='selection-list'
      const items = t.extras.slice(0,6)
      items.forEach(()=>{ const li = document.createElement('li'); ul.appendChild(li) })
      newNode.appendChild(ul)
      const sel = rollDie()
      const chosen = Math.max(1, Math.min(6, sel))
      // populate list entries; for chosen item compute %N -> minutes using sel and show timer if present
      for (let i=0;i<ul.children.length;i++){
        const li = ul.children[i]
        const raw = items[i] || ''
        const sel2 = rollDie()
        const sel3 = rollDie()
        // basic substitutions
        let txt = String(raw).replace(/%M/g, participantM).replace(/%F/g, participantF).replace(/%D/g, String(sel2))
        // If this item contains a %T<number> token, replace it with the target title
        // for display. If it's the chosen item, also mark dataset.selectionGoto.
        const tMatch = raw.match(/%T(\d+)/)
        if (tMatch){
          const targetNum = parseInt(tMatch[1],10)
          const targetIndex = ((targetNum-1) % tasks.length + tasks.length) % tasks.length
          const targetTitle = (tasks[targetIndex] && tasks[targetIndex].title) ? tasks[targetIndex].title : `Task ${targetNum}`
          txt = txt.replace(/%T\d+/, targetTitle)
          if (i === chosen-1) newNode.dataset.selectionGoto = String(targetIndex)
        }
        // Now expand numeric multipliers (e.g. %3 -> 3 * sel3)
        txt = txt.replace(/%(\d+)/g,(m,n)=> String(parseInt(n,10) * sel3))
        li.textContent = `${i+1}. ${txt}`
        if (i === chosen-1){
          li.classList.add('highlight')
          // Attach timer only if chosen raw contains a numeric %N and NOT a %T token
          if (!raw.match(/%T(\d+)/)){
            const m = raw.match(/%(\d+)/)
            if (m){
              const minutes = parseInt(m[1],10) * sel3
              attachTimer(newNode, null, false, minutes * 60)
            }
          }
        }
      }
      const note = document.createElement('div'); note.style.marginTop='8px'; note.textContent=`Selected: ${chosen}`
      newNode.appendChild(note)
    } else {
      newNode.textContent = 'Unknown task type: '+t.type
    }

    // perform the animated replace
    animateReplace(container, newNode)
  }

  // substitute placeholders. If `roll` is provided it will be used for %D replacements
  function substitutePlaceholders(s, roll=null){
    if (!s) return ''
    let out = String(s)
    out = out.replace(/%M/g, participantM).replace(/%F/g, participantF)
    if (out.match(/%D/)){
      const val = (roll !== null) ? roll : rollDie()
      out = out.replace(/%D/g, String(val))
    }
    // replace bare %N with the literal N (visit-handling uses a separate function)
    out = out.replace(/%(\d+)/g, (m,n)=>{ return (parseInt(n,10)).toString() })
    return out
  }

  function substitutePlaceholdersVisit(t){
    let s = t.description||''
    // %N where N is number like %3 -> multiply by visits
    s = s.replace(/%(\d+)/g,(m,n)=>{ return (parseInt(n,10)* (t.visits||0)).toString() })
    s = s.replace(/%M/g, participantM).replace(/%F/g, participantF)
    return s
  }

  // attachTimer: if initialSeconds is provided, use it; otherwise compute from task and visitTime
  function attachTimer(container, task, visitTime=false, initialSeconds=null){
    const timerWrap = document.createElement('div'); timerWrap.style.marginTop='12px'
    const display = document.createElement('div'); display.textContent = '00:00'; display.style.fontSize='28px'; display.style.marginBottom='8px'
    const start = document.createElement('button'); start.className='btn'; start.textContent='Start'
    const pause = document.createElement('button'); pause.className='btn'; pause.textContent='Pause'
    const reset = document.createElement('button'); reset.className='btn'; reset.textContent='Reset'
    start.style.marginRight='6px'
    pause.style.marginRight='6px'
    timerWrap.appendChild(display); timerWrap.appendChild(start); timerWrap.appendChild(pause); timerWrap.appendChild(reset)
    container.appendChild(timerWrap)

    let totalSeconds = (initialSeconds !== null) ? initialSeconds : computeTimerSeconds(task, visitTime)
    let remaining = totalSeconds
    let timerId = null

    function updateDisplay(){
      const mm = String(Math.floor(remaining/60)).padStart(2,'0')
      const ss = String(remaining%60).padStart(2,'0')
      display.textContent = `${mm}:${ss}`
    }
    updateDisplay()

    start.addEventListener('click', ()=>{
      if (timerId) return
      const startTs = Date.now()
      timerId = setInterval(()=>{
        remaining--
        if (remaining<=0){ clearInterval(timerId); timerId=null; remaining=0; updateDisplay(); onTimerExpire(container) }
        else updateDisplay()
      },1000)
    })
    pause.addEventListener('click', ()=>{ if (timerId){ clearInterval(timerId); timerId=null } })
    reset.addEventListener('click', ()=>{ if (timerId){ clearInterval(timerId); timerId=null } remaining=totalSeconds; updateDisplay() })
  }

  function computeTimerSeconds(task, visitTime){
    if (visitTime){ // find %N multiplier in description -> interpreted as minutes per visit
      const m = (task.description||'').match(/%(\d+)/)
      const n = m?parseInt(m[1],10):1
      return n * (task.visits||0) * 60
    }
    // TIME: %D single die (minutes)
    const d = rollDie()
    return d * 60
  }

  function onTimerExpire(container){
    // flash and beep: play a beep for each animation iteration
    const flashCount = 3
    const iterMs = 800
    container.classList.add('flash')
    for (let i=0;i<flashCount;i++){
      setTimeout(()=>{
        try{ beep() }catch(e){}
      }, i * iterMs)
    }
    // remove flash class after animation completes (with small padding)
    setTimeout(()=>container.classList.remove('flash'), flashCount * iterMs + 200)
  }

  function beep(){
    try{
      const ctx = new (window.AudioContext||window.webkitAudioContext)()
      const o = ctx.createOscillator(); const g = ctx.createGain()
      o.type='sine'; o.frequency.value=880; o.connect(g); g.connect(ctx.destination); g.gain.value=0.05
      o.start(); setTimeout(()=>{ o.stop(); ctx.close() },400)
    }catch(e){ console.log('beep failed',e) }
  }

  function rollDie(){ return 1 + Math.floor(Math.random()*6) }

  async function doRoll(dA,dB,rollBtn,resetBtn){
    if (animating) return
    animating = true
    rollBtn.disabled = true; resetBtn.disabled=true
    // animate dice for 1s
    const dur = 1000
    const start = Date.now()
    const intv = setInterval(()=>{ renderDie(dA, 1+Math.floor(Math.random()*6)); renderDie(dB, 1+Math.floor(Math.random()*6)) },80)
    await new Promise(r=>setTimeout(r,dur))
    clearInterval(intv)
    const v1 = rollDie(); const v2 = rollDie(); renderDie(dA,v1); renderDie(dB,v2)
    const total = v1+v2
    // animate moving through tasks
    await animateAdvance(total)
    animating = false
    rollBtn.disabled=false; resetBtn.disabled=false
  }

  function animateAdvance(steps){
    return new Promise(async (resolve)=>{
      const container = document.querySelector('#mainarea .panel')
      if (!container) { resolve(); return }
      const n = tasks.length
      const startIndex = currentIndex
      // perform one continuous track slide for the dice steps
      await performTrackSlide(container, startIndex, steps)
      // update currentIndex to final
      currentIndex = (startIndex + steps) % n
      // After the slide, handle visit count and potential GOTO chaining
      // increment only the current final destination (will be updated if GOTOs follow)
      let finalIndex = currentIndex
      let finalTask = tasks[finalIndex]
      // Resolve any selection->GOTO or GOTO tile chains starting from currentIndex
      await followGotoChain(container)
      // final destination is currentIndex / finalIndex
      tasks[currentIndex].visits = (tasks[currentIndex].visits||0)+1
      // ensure the displayed node is the current one (build/render if needed)
      renderCurrentTask(container)
      // check for reaching max for VISIT types on the ultimate currentIndex
      const t = tasks[currentIndex]
      if ((t.type==='VISIT_COUNT'||t.type==='VISIT_TIME') && t.visits>=maxVisits){
        showFinishView(t)
      }
      resolve()
    })
  }

  function showFinishView(task){
    // Hide status bar contents while the completion page is shown
    try{ statusLeft.innerHTML = ''; statusCenter.innerHTML = ''; statusRight.innerHTML = '' }catch(e){}
    main.innerHTML = ''
    const panel = document.createElement('div'); panel.className='panel centered'
    const ownerName = mapOwnerToName(task.owner)
    const h = document.createElement('div'); h.className='task-title'; h.textContent = `${ownerName} has completed all their tasks!`
    const btn = document.createElement('button'); btn.className='btn'; btn.textContent='Finish'
    btn.addEventListener('click', ()=>{ resetAllVisits(); showConfigView() })
    panel.appendChild(h); panel.appendChild(btn)
    main.appendChild(panel)
  }

  function mapOwnerToName(owner){
    if (!owner) return ''
    const o = owner.trim().toUpperCase()
    if (o==='M' || o==='%M') return participantM
    if (o==='F' || o==='%F') return participantF
    return owner
  }

  function resetAllVisits(){ tasks.forEach(t=>t.visits=0); currentIndex=0 }

  function doReset(){
    if (!confirm('Reset all visit counts and return to configuration?')) return
    resetAllVisits()
    showConfigView()
  }

  // initial
  showConfigView()
/*
  // populate sample file input if tasks.csv exists by fetching it
  (async ()=>{
    try{
      const r = await fetch('tasks.csv')
      if (r.ok){ const txt = await r.text(); tasks = parseCSV(txt); tasks.forEach(t=>t.visits=0) }
    }catch(e){}
  })()
*/
})();
