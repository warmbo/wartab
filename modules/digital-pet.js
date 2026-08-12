/* ═══════════════════════════════════════════
   WarTab — Digital Pet Module (Tamagotchi)
   A virtual pet you care for: hunger, happiness,
   dirt, energy, and health all decay over real time.
   Care for it with Feed / Pet / Clean / Play /
   Sleep / Medicine. It never dies — health floors
   at a sick level and recovers with care.
   ═══════════════════════════════════════════ */
registerModule('digital-pet', {
  defaults: {
    petName: '', hunger: 80, happiness: 80, waste: 10, energy: 80, health: 100,
    sleeping: false,
    lastFed: Date.now(), lastPetted: Date.now(), lastCleaned: Date.now(),
    lastPlayed: Date.now(), lastSlept: Date.now(), lastMed: Date.now(),
  },
  render: (sec, card, cw) => {
    const w = document.createElement('div'); w.className = 'dp-container';
    w.dataset.secId = sec.id;

    // ── One-time migration: seed new tamagotchi fields on existing sections
    //    (created before energy/health/sleeping existed). Without this, an old
    //    pet falls back to an ancient lastFed timestamp and starts sick.
    const nowTs = Date.now();
    if (sec.energy === undefined) sec.energy = 80;
    if (sec.health === undefined) sec.health = 100;
    if (sec.sleeping === undefined) sec.sleeping = false;
    if (sec.lastEnergyTs === undefined) sec.lastEnergyTs = nowTs;
    if (sec.lastHealthTs === undefined) sec.lastHealthTs = nowTs;

    // Front-facing cat — 11x5, moves side-to-side
    const C = '  /\\_/\\  ( \n ( ^.^ ) _)\n   \\"/  (   \n ( | | )   \n(__d b__)  ';
    const eyes = { idle: '^', blink: '-', happy: '*', love: '♥', curious: 'O', hungry: 'o', sad: ';', dead: 'x', angry: '#', sick: 'u', sleepy: '.', sleep: '-', tired: 'o' };
    let _mood = 'idle', _walking = false, _lastX = 50, _blink = false, _wag = false, _disposed = false;

    // Top bar
    const top = document.createElement('div'); top.className = 'dp-top';
    const nameEl = document.createElement('span'); nameEl.className = 'dp-name'; nameEl.textContent = sec.petName || 'cat'; top.appendChild(nameEl);
    const moodLabel = document.createElement('span'); moodLabel.className = 'dp-mood-label'; top.appendChild(moodLabel);
    w.appendChild(top);

    // Room
    const pen = document.createElement('div'); pen.className = 'dp-pen';
    const floor = document.createElement('div'); floor.className = 'dp-floor'; pen.appendChild(floor);
    const hfloor = document.createElement('div'); hfloor.className = 'dp-hallway-floor'; pen.appendChild(hfloor);
    const lineHeights = [2, 8, 15, 23, 32, 42, 53];
    for (let i = 0; i < lineHeights.length; i++) {
      const fl = document.createElement('div'); fl.className = 'dp-floor-line';
      fl.style.cssText = `top:${lineHeights[i]}px;position:absolute;left:0;width:100%;height:1px;background:rgba(255,255,255,0.05);pointer-events:none;`;
      hfloor.appendChild(fl);
    }
    const dwfloor = document.createElement('div'); dwfloor.className = 'dp-doorway-floor'; pen.appendChild(dwfloor);
    const doorway = document.createElement('div'); doorway.className = 'dp-doorway'; pen.appendChild(doorway);
    const door = document.createElement('div'); door.className = 'dp-door'; pen.appendChild(door);
    const windowEl = document.createElement('div'); windowEl.className = 'dp-window'; pen.appendChild(windowEl);
    const sillEl = document.createElement('div'); sillEl.className = 'dp-window-sill'; pen.appendChild(sillEl);
    const speech = document.createElement('div'); speech.className = 'dp-speech'; pen.appendChild(speech);
    const creature = document.createElement('pre'); creature.className = 'dp-creature'; pen.appendChild(creature);
    const envProps = document.createElement('div'); envProps.className = 'dp-env'; pen.appendChild(envProps);
    w.appendChild(pen);

    // Stats
    const stats = document.createElement('div'); stats.className = 'dp-stats';
    function makeStat(label, getVal, invert) {
      const row = document.createElement('div'); row.className = 'dp-stat-row';
      const lbl = document.createElement('span'); lbl.className = 'dp-stat-lbl'; lbl.textContent = label; row.appendChild(lbl);
      const bar = document.createElement('div'); bar.className = 'dp-bar';
      const fill = document.createElement('div'); fill.className = 'dp-fill'; bar.appendChild(fill); row.appendChild(bar);
      const valEl = document.createElement('span'); valEl.className = 'dp-val'; row.appendChild(valEl);
      const upd = () => { const v = Math.max(0, Math.min(100, getVal())); fill.style.width = v + '%'; const hue = Math.round((invert ? 100 - v : v) * 1.2); fill.style.background = `hsl(${hue},70%,45%)`; fill.style.boxShadow = `0 0 6px hsla(${hue},70%,45%,0.3)`; valEl.textContent = Math.round(v); };
      return { row, upd, fill };
    }
    const elapsed = (ts) => (Date.now() - (ts || Date.now())) / 60000;

    // ── Derived stats ──
    // Hunger drains ~2/min; happiness ~1/min; dirt rises ~0.5/min (existing).
    const curHunger = () => Math.max(0, (sec.hunger || 80) - elapsed(sec.lastFed) * 2);
    const curHappy = () => Math.max(0, (sec.happiness || 80) - elapsed(sec.lastPetted) * 1);
    const curWaste = () => Math.min(100, (sec.waste || 10) + elapsed(sec.lastCleaned) * 0.5);
    // Energy: drains ~1.2/min awake, recovers ~2.5/min while sleeping.
    const curEnergy = () => {
      const base = sec.energy || 80;
      const mins = elapsed(sec.lastEnergyTs || sec.lastSlept);
      const delta = sec.sleeping ? mins * 2.5 : -mins * 1.2;
      return Math.max(0, Math.min(100, base + delta));
    };
    // Health: drains when neglected (very hungry, very dirty, or exhausted);
    // slowly recovers toward ~80 when cared for. Floors at 15 — never dies.
    const curHealth = () => {
      const base = sec.health || 100;
      const mins = elapsed(sec.lastHealthTs || sec.lastFed);
      const h = curHunger(), wa = curWaste(), en = curEnergy();
      let rate = 1.2; // gentle recovery by default
      if (h < 15 || wa > 85 || en <= 0) rate = -2.2;  // neglected → decline
      else if (h < 30) rate = -0.8;                     // hungry → slow decline
      return Math.max(15, Math.min(100, base + rate * mins));
    };

    const hS = makeStat('Hunger', curHunger); stats.appendChild(hS.row);
    const haS = makeStat('Mood', curHappy); stats.appendChild(haS.row);
    const wS = makeStat('Dirt', curWaste, true); stats.appendChild(wS.row);
    const eS = makeStat('Energy', curEnergy); stats.appendChild(eS.row);
    const heS = makeStat('Health', curHealth, true); stats.appendChild(heS.row);
    w.appendChild(stats);

    // Info line — colored by mood / urgency
    const infoEl = document.createElement('div'); infoEl.className = 'dp-info'; w.appendChild(infoEl);

    // Actions
    const acts = document.createElement('div'); acts.className = 'dp-actions';
    const sleepBtn = document.createElement('button');
    function mkBtn(label, onClick) {
      const b = document.createElement('button'); b.className = 'btn btn-glass btn-sm'; b.textContent = label;
      b.addEventListener('click', function (e) { e.stopPropagation(); onClick(b); });
      acts.appendChild(b); return b;
    }
    mkBtn('Feed', () => { sec.lastFed = Date.now(); sec.hunger = Math.min(100, (sec.hunger || 80) + 30); sec.happiness = Math.min(100, (sec.happiness || 80) + 5); sec.waste = Math.min(100, (sec.waste || 10) + 10); sec.lastEnergyTs = Date.now(); sec.lastHealthTs = Date.now(); saveConfig(); updateAll(); speak('Nom nom nom...'); });
    mkBtn('Pet', () => { sec.lastPetted = Date.now(); sec.happiness = Math.min(100, (sec.happiness || 80) + 20); sec.lastHealthTs = Date.now(); saveConfig(); updateAll(); speak('Purr... purr...'); });
    mkBtn('Clean', () => { sec.lastCleaned = Date.now(); sec.waste = Math.max(0, (sec.waste || 10) - 40); sec.lastHealthTs = Date.now(); saveConfig(); updateAll(); speak('Ahh, much cleaner!'); });
    mkBtn('Play', () => { sec.lastPlayed = Date.now(); sec.happiness = Math.min(100, (sec.happiness || 80) + 25); sec.energy = Math.max(0, (sec.energy || 80) - 15); sec.waste = Math.min(100, (sec.waste || 10) + 5); sec.lastEnergyTs = Date.now(); sec.lastHealthTs = Date.now(); saveConfig(); updateAll(); speak('Wheee! That was fun!'); });
    // Sleep toggles a sustained state; energy recovers while asleep.
    mkBtn('Sleep', (btn) => {
      sec.sleeping = !sec.sleeping;
      sec.lastSlept = Date.now(); sec.lastEnergyTs = Date.now();
      if (!sec.sleeping) sec.lastHealthTs = Date.now();
      btn.textContent = sec.sleeping ? 'Wake' : 'Sleep';
      updateAll(); saveConfig();
      if (sec.sleeping) speak('Zzz... zzz...');
      else speak('I am awake!');
    });
    mkBtn('Medicine', () => {
      sec.lastMed = Date.now();
      sec.health = Math.min(100, (sec.health || 100) + 55);   // strong boost
      sec.lastHealthTs = Date.now();
      saveConfig(); updateAll(); speak('Feeling much better!');
    });
    w.appendChild(acts);
    cw.appendChild(w);

    // Click/tap the pet to pet it
    creature.style.cursor = 'pointer';
    creature.addEventListener('pointerdown', function (e) {
      e.stopPropagation();
      if (_disposed) return;
      if (sec.sleeping) return;
      sec.lastPetted = Date.now(); sec.happiness = Math.min(100, (sec.happiness || 80) + 8);
      sec.lastHealthTs = Date.now(); saveConfig(); updateAll();
      // brief heart burst
      envProps.innerHTML = '<pre class="dp-env-heart" style="left:50%;top:4px;">♥</pre>';
      setTimeout(() => { if (!_disposed) updateAll(); }, 1200);
    });

    // Network speech
    let _sayTimer, _walkTimer, _blinkTimer, _wagTimer, _initialSayTimer, _updateTimer, _retryTimer, _baselineTimer;
    function fetchNetFact() {
      storage.getStats('local', '').then(function (d) {
        if (_disposed) return;
        const facts = [];
        if (d.hostname) facts.push('Hello, ' + d.hostname + ' here!');
        if (d.uptime && d.uptime.string) facts.push("I've been up " + d.uptime.string + ' ... getting sleepy.');
        if (typeof d.cpu === 'number') {
          if (d.cpu > 80) facts.push('CPU is ' + d.cpu + "% ... that's hot!");
          else if (d.cpu < 10) facts.push('CPU is only ' + d.cpu + '% ... so quiet.');
          else facts.push("CPU chillin' at " + d.cpu + '%.');
        }
        if (d.memory) {
          const memPct = d.memory.percent !== undefined ? d.memory.percent : (d.memory.total > 0 ? Math.round(d.memory.active / d.memory.total * 100) : 0);
          if (memPct > 80) facts.push('RAM is ' + memPct + "% full ... need more sticks!");
          else if (memPct < 30) facts.push('Plenty of RAM free ... ' + memPct + '% used.');
          else facts.push('Memory looking good at ' + memPct + '%.');
        }
        if (d.disks && d.disks[0]) {
          const diskPct = d.disks[0].percent !== undefined ? d.disks[0].percent : (d.disks[0].total > 0 ? Math.round(d.disks[0].used / d.disks[0].total * 100) : 0);
          if (diskPct > 90) facts.push('Disk is ' + diskPct + "% full ... yikes!");
          else if (diskPct > 70) facts.push('Disk at ' + diskPct + "% ... might want to clean up.");
          else facts.push('Disk has plenty of space ... ' + diskPct + '% used.');
        }
        facts.push('The network looks good.');
        if (d.hostname) facts.push(d.hostname + ' is alive and well.');
        speak(facts[Math.floor(Math.random() * facts.length)]);
      }).catch(function (e) {
        if (_disposed) return;
        if (e && e.retry) {
          clearTimeout(_retryTimer);
          _retryTimer = setTimeout(fetchNetFact, 60000);
          return;
        }
        const fb = ['No signal... is the server okay?', "Can't reach the network...", 'Hello? Anyone there?', 'The network is quiet... too quiet.'];
        speak(fb[Math.floor(Math.random() * fb.length)]);
      });
    }
    function speak(msg) {
      if (sec.sleeping) return; // don't talk while asleep
      speech.textContent = msg; speech.classList.add('visible');
      clearTimeout(speech._hide); speech._hide = setTimeout(function () { speech.classList.remove('visible'); }, 6000);
    }
    _sayTimer = setInterval(fetchNetFact, 18000 + Math.random() * 12000);
    _initialSayTimer = setTimeout(fetchNetFact, 3000 + Math.random() * 4000);

    // Perspective shift — smoother
    function updatePerspective(x) {
      const pw = pen.offsetWidth || 260;
      const creatureWidth = creature.getBoundingClientRect().width || 94;
      let pct = x / Math.max(1, pw - creatureWidth - 8);
      if (pct < 0) pct = 0; if (pct > 1) pct = 1;
      windowEl.style.right = (6 + pct * 12) + 'px';
      windowEl.style.opacity = (0.3 + pct * 0.5) + '';
      sillEl.style.right = (6 + pct * 12 - 2) + 'px';
      sillEl.style.opacity = (0.3 + pct * 0.5) + '';
      door.style.left = (4 + (1 - pct) * 10) + 'px';
      door.style.opacity = (0.3 + (1 - pct) * 0.5) + '';
      doorway.style.left = (2 + (1 - pct) * 10) + 'px';
      doorway.style.opacity = (0.3 + (1 - pct) * 0.5) + '';
      hfloor.style.opacity = (0.3 + (1 - pct) * 0.5) + '';
      dwfloor.style.opacity = (0.3 + (1 - pct) * 0.5) + '';
    }

    // Render cat with mood eyes, blink, tail wag; sleep/sick states
    function setFrame() {
      let ec;
      if (sec.sleeping) ec = eyes.sleep;
      else ec = _blink ? '-' : (eyes[_mood] || '^');
      let txt = C.replace(/\^/g, ec);
      if (_wag && !sec.sleeping) txt = txt.replace('d', '\x00').replace('b', 'd').replace('\x00', 'b');
      creature.textContent = txt;
      creature.classList.toggle('dp-sleeping', !!sec.sleeping);
      creature.classList.toggle('dp-sick', _mood === 'sick');
    }

    // Glide to new position — smoother
    function startWalk() {
      if (_walking || sec.sleeping || _disposed) return; _walking = true;
      const pw = pen.offsetWidth || 260, ph = pen.offsetHeight || 180;
      const creatureWidth = creature.getBoundingClientRect().width || 94;
      const travel = Math.max(0, pw - creatureWidth - 8);
      const nx = 4 + Math.random() * travel;
      const ny = ph - 24 - 82 + Math.random() * 8;
      _lastX = nx;
      creature.style.left = nx + 'px'; creature.style.top = ny + 'px';
      updatePerspective(nx); setFrame();
      clearTimeout(_walkTimer);
      _walkTimer = setTimeout(function () { _walking = false; }, 2600);
    }

    // Update mood + urgency — with info line
    function updateAll() {
      hS.upd(); haS.upd(); wS.upd(); eS.upd(); heS.upd();
      const h = Math.max(0, curHunger()), ha = Math.max(0, curHappy()), wa = Math.max(0, curWaste());
      const en = Math.max(0, curEnergy()), he = Math.max(0, curHealth());
      let moodKey, moodTxt;
      if (sec.sleeping) { moodKey = 'sleep'; moodTxt = 'Sleeping'; }
      else if (he < 25) { moodKey = 'sick'; moodTxt = 'Sick'; }
      else if (h < 20 && ha < 20) { moodKey = 'angry'; moodTxt = 'Angry'; }
      else if (h < 25) { moodKey = 'hungry'; moodTxt = 'Hungry'; }
      else if (en < 20) { moodKey = 'tired'; moodTxt = 'Tired'; }
      else if (wa > 70) { moodKey = 'sad'; moodTxt = 'Dirty'; }
      else if (ha < 30) { moodKey = 'sad'; moodTxt = 'Sad'; }
      else if (ha > 80 && h > 65 && wa < 30 && en > 50 && he > 70) { moodKey = 'love'; moodTxt = 'Loved'; }
      else if (ha > 65 && h > 50) { moodKey = 'happy'; moodTxt = 'Happy'; }
      else if (ha > 40) { moodKey = 'curious'; moodTxt = 'Curious'; }
      else { moodKey = 'idle'; moodTxt = (sec.petName || 'cat'); }
      if (moodKey !== _mood) { _mood = moodKey; }
      moodLabel.textContent = moodTxt;
      setFrame();

      // Environment props
      let envHtml = '';
      if (!sec.sleeping && Date.now() - sec.lastFed < 180000) envHtml += '<pre class="dp-env-food" style="left:12px;bottom:20px;">\\___/</pre>';
      if (wa > 50) { const piles = Math.min(3, Math.ceil(wa / 30)); for (let pi = 0; pi < piles; pi++) envHtml += '<pre class="dp-env-dirt" style="right:' + (8 + pi * 18) + 'px;bottom:' + (16 + pi * 4) + 'px;">~!~</pre>'; }
      if (ha > 70 && !sec.sleeping) envHtml += '<pre class="dp-env-sparkle" style="left:50%;top:10px;">✦</pre>';
      if (moodKey === 'love') envHtml += '<pre class="dp-env-heart" style="left:calc(50% + 24px);top:4px;">♥</pre>';
      if (sec.sleeping) envHtml += '<pre class="dp-env-zzz" style="right:16px;top:14px;">z Z z</pre>';
      if (moodKey === 'sick') envHtml += '<pre class="dp-env-sick" style="right:24px;top:12px;">💊</pre>';
      envProps.innerHTML = envHtml;

      // Info line — status + urgency
      const infoParts = [];
      if (sec.sleeping) infoParts.push('sleeping');
      if (he < 30) infoParts.push('I am sick!');
      else if (he < 50) infoParts.push('health low');
      if (h < 25) infoParts.push('Feed me!');
      if (wa > 70) infoParts.push('dirty!');
      if (en < 20) infoParts.push('so sleepy...');
      const statusTxt = sec.sleeping ? 'asleep' : (_walking ? 'walking' : 'watching');
      infoParts.push(statusTxt);
      infoEl.replaceChildren();
      infoParts.forEach(function (part) {
        const token = document.createElement('span'); token.className='dp-info-token'; token.textContent = part; infoEl.appendChild(token);
      });
    }
    updateAll();
    _updateTimer = setInterval(updateAll, 5000);

    // Persist the ever-moving energy/health baselines periodically so they
    // don't rewind on reload.
    _baselineTimer = setInterval(function () {
      sec.energy = curEnergy(); sec.health = curHealth();
      sec.lastEnergyTs = Date.now(); sec.lastHealthTs = Date.now();
      saveConfig();
    }, 60000);

    const motionReduced = typeof prefersReducedMotion==='function' && prefersReducedMotion();
    if (!motionReduced) startWalk();
    const walkTimer = motionReduced ? null : setInterval(function () { if (!_walking && !sec.sleeping) startWalk(); }, 4500 + Math.random() * 2500);
    // Blink every 4s (not while sleeping)
    _blinkTimer = motionReduced ? null : setInterval(function () { if (!sec.sleeping) { _blink = !_blink; if (!_walking) setFrame(); } }, 4000);
    // Tail wag every 600ms (not while sleeping)
    _wagTimer = motionReduced ? null : setInterval(function () { if (!sec.sleeping) { _wag = !_wag; if (!_walking) setFrame(); } }, 600);

    // Cleanup — all timers
    WarTabLifecycle.addCleanup(cw, function () {
      _disposed = true;
      if (walkTimer) clearInterval(walkTimer);
      if (_walkTimer) clearTimeout(_walkTimer);
      if (_sayTimer) clearInterval(_sayTimer);
      if (_initialSayTimer) clearTimeout(_initialSayTimer);
      if (_retryTimer) clearTimeout(_retryTimer);
      if (speech._hide) clearTimeout(speech._hide);
      if (_updateTimer) clearInterval(_updateTimer);
      if (_blinkTimer) clearInterval(_blinkTimer);
      if (_wagTimer) clearInterval(_wagTimer);
      if (_baselineTimer) clearInterval(_baselineTimer);
    });
  },
  editor: (sec, card, bd) => {
    const nr = document.createElement('div'); nr.style.cssText = 'margin-bottom:10px;';
    nr.appendChild(el('label', 'font-size:var(--text-xs);font-weight:600;color:var(--text-secondary);margin-bottom:3px;display:block;', 'Pet Name'));
    const ni = document.createElement('input'); ni.type = 'text'; ni.value = sec.petName || ''; ni.placeholder = 'cat'; ni.style.cssText = 'width:100%;padding:7px 10px;background:rgba(0,0,0,0.3);border:1px solid var(--surface-border);color:var(--text-primary);font-size:var(--text-base);outline:none;';
    ni.addEventListener('change', () => { sec.petName = ni.value; saveAndRefresh(); }); nr.appendChild(ni); bd.appendChild(nr);

    const rr = document.createElement('div'); rr.style.cssText = 'margin-bottom:10px;';
    const rb = document.createElement('button'); rb.className = 'btn btn-glass btn-sm btn-danger'; rb.textContent = 'Reset Pet';
    rb.addEventListener('click', function (e) { e.stopPropagation(); const d = Date.now(); sec.hunger = 80; sec.happiness = 80; sec.waste = 10; sec.energy = 80; sec.health = 100; sec.sleeping = false; sec.lastFed = d; sec.lastPetted = d; sec.lastCleaned = d; sec.lastPlayed = d; sec.lastSlept = d; sec.lastMed = d; sec.lastEnergyTs = d; sec.lastHealthTs = d; saveAndRefresh(); });
    rr.appendChild(rb); bd.appendChild(rr);
  },
});
