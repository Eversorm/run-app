(function(){
  "use strict";

  // ===================================================================
  // TUNABLE CONSTANTS — safe to edit
  // ===================================================================
  const TOLERANCE_SEC = 10;        // seconds/km window counted as "on target"
  const GAUGE_FAST_SEC = 270;      // 4:30/km -> gauge reads full
  const GAUGE_SLOW_SEC = 510;      // 8:30/km -> gauge reads empty
  const MAX_PACE_SEC = 1200;       // 20:00/km -> beyond this, show --:-- (includes walking)
  const SPEED_SMOOTHING_ALPHA_BASE = 0.55;  // light baseline smoothing for normal, steady conditions
  const SPEED_SMOOTHING_ALPHA_POOR = 0.25;  // extra damping only when GPS accuracy is genuinely poor
  const SPEED_SMOOTHING_ALPHA_SNAP = 0.9;   // near-immediate response to a real pace change
  const ACCURACY_GOOD_M = 20;               // at/below this, use the light baseline
  const ACCURACY_POOR_M = 35;               // at/above this, damp harder
  const SPEED_CHANGE_SNAP_RATIO = 0.25;     // relative change vs current speed that counts as "real", not noise
  const IMPLAUSIBLE_SPEED_KMH = 35;         // faster than this for a runner -> treat the fix as a glitch and drop it
  const MIN_SAVE_DISTANCE_KM = 0.03; // don't save accidental taps with almost no distance
  const RUNS_STORAGE_KEY = 'ritmoCorsaRuns';
  const MAX_SAVED_RUNS = 100;
  const LANG_STORAGE_KEY = 'ritmoCorsaLang';

  // ---- language state: T = current UI strings, S = current speech-phrase
  // builders. Everything below reads through T/S and never contains
  // language-specific wording itself — see translations.js. ----
  function detectLanguage(){
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    if (saved && I18N[saved]) return saved;
    const nav = (navigator.language || DEFAULT_LANG).slice(0, 2).toLowerCase();
    return I18N[nav] ? nav : DEFAULT_LANG;
  }
  let currentLang = detectLanguage();
  let T = I18N[currentLang].t;
  let S = I18N[currentLang].s;

  // ---- DOM refs ----
  const appEl = document.getElementById('app');
  const statusText = document.getElementById('statusText');
  const accuracyValue = document.getElementById('accuracyValue');
  const settingsToggle = document.getElementById('settingsToggle');
  const settingsPanel = document.getElementById('settingsPanel');
  const mainScreen = document.getElementById('mainScreen');
  const langToggleBtn = document.getElementById('langToggleBtn');
  const langDropdown = document.getElementById('langDropdown');
  const langDropdownTitle = document.getElementById('langDropdownTitle');
  const langOptionList = document.getElementById('langOptionList');

  const historyToggle = document.getElementById('historyToggle');
  const historyScreen = document.getElementById('historyScreen');
  const historyList = document.getElementById('historyList');
  const historyEmptyHint = document.getElementById('historyEmptyHint');
  const historyTitle = document.getElementById('historyTitle');

  const targetEnabled = document.getElementById('targetEnabled');
  const targetInputs = document.getElementById('targetInputs');
  const targetMin = document.getElementById('targetMin');
  const targetSec = document.getElementById('targetSec');
  const targetRitmoLabel = document.getElementById('targetRitmoLabel');
  const targetPaceUnitTag = document.getElementById('targetPaceUnitTag');
  const targetDistUnitLabel = document.getElementById('targetDistUnitLabel');
  const targetTimeUnitLabel = document.getElementById('targetTimeUnitLabel');

  const audioEnabledBox = document.getElementById('audioEnabled');
  const audioInputs = document.getElementById('audioInputs');
  const audioInterval = document.getElementById('audioInterval');
  const audioTrigger = document.getElementById('audioTrigger');
  const audioSectionLabel = document.getElementById('audioSectionLabel');
  const audioEveryLabel = document.getElementById('audioEveryLabel');

  const planToggleBtn = document.getElementById('planToggleBtn');
  const planBuilderHome = document.getElementById('planBuilderHome');
  const planSteps = document.getElementById('planSteps');
  const addStepBtn = document.getElementById('addStepBtn');
  const addGroupBtn = document.getElementById('addGroupBtn');

  const targetToggleBtn = document.getElementById('targetToggleBtn');
  const targetBuilderHome = document.getElementById('targetBuilderHome');
  const targetDistBtn = document.getElementById('targetDistBtn');
  const targetTimeBtn = document.getElementById('targetTimeBtn');
  const targetDistWrap = document.getElementById('targetDistWrap');
  const targetTimeWrap = document.getElementById('targetTimeWrap');
  const targetDistValue = document.getElementById('targetDistValue');
  const targetTimeValue = document.getElementById('targetTimeValue');

  const statLabelDistance = document.getElementById('statLabelDistance');
  const statLabelTime = document.getElementById('statLabelTime');
  const statLabelAvg = document.getElementById('statLabelAvg');
  const paceUnitLabel = document.getElementById('paceUnitLabel');

  const startBtn = document.getElementById('startBtn');
  const runControls = document.getElementById('runControls');
  const pauseBtn = document.getElementById('pauseBtn');
  const endBtn = document.getElementById('endBtn');
  const hintText = document.getElementById('hintText');

  const confirmModal = document.getElementById('confirmModal');
  const confirmModalText = document.getElementById('confirmModalText');
  const confirmCancelBtn = document.getElementById('confirmCancelBtn');
  const confirmEndBtn = document.getElementById('confirmEndBtn');
  let pendingConfirmAction = null; // callback fired by confirmEndBtn, set per use (end run / delete run)

  function showConfirmModal(text, btnLabel, action){
    confirmModalText.textContent = text;
    confirmEndBtn.textContent = btnLabel;
    pendingConfirmAction = action;
    confirmModal.classList.remove('hidden');
  }

  const gaugeFill = document.getElementById('gaugeFill');
  const paceValue = document.getElementById('paceValue');
  const paceDelta = document.getElementById('paceDelta');
  const planStatus = document.getElementById('planStatus');
  const distValue = document.getElementById('distValue');
  const timeValue = document.getElementById('timeValue');
  const avgValue = document.getElementById('avgValue');

  const R = 130, CIRC = 2 * Math.PI * R;
  gaugeFill.style.strokeDasharray = CIRC.toFixed(2);
  gaugeFill.style.strokeDashoffset = CIRC.toFixed(2);

  // ---- geo / run state ----
  let gpsWatchId = null;      // single persistent watch, alive for the whole page lifetime
  let tracking = false;
  let paused = false;
  let pausedIsAuto = false;   // true when the current pause was triggered automatically
  let lastPos = null;
  let smoothedSpeedKmh = 0;
  let currentPaceSec = null; // null = stopped/too slow/uncertain -> shown as --:--
  let totalDistanceKm = 0;
  let trackingStartTime = null;

  // ---- pause bookkeeping: any wall-clock duration spent paused is excluded
  // from pace/duration/split calculations ----
  let pausedTotalMs = 0;
  let pauseStartTime = 0;
  let pausedAtStart = 0;

  // ---- audio cadence state ----
  let lastAnnounceDistanceM = 0;
  let lastAnnounceTimeMs = 0;
  let lastAnnouncedTargetSec = null;

  // ---- reactive off-target warning: fires once per "excursion" past ±30s ----
  const PACE_WARN_THRESHOLD_SEC = 30;
  let paceWarnActive = false;

  // ---- plan engine state ----
  let planActive = false;
  let planSegments = [];
  let planIndex = -1;
  let isTargetMode = false; // true when planSegments was built from the Target panel (single goal), not from actual plan steps
  let planSegStartDistM = 0;
  let planSegStartTime = 0;
  let pausedAtSegStart = 0;
  let planTickTimer = null;
  let segHalfwayAnnounced = false;
  let segEndingAnnounced = false;
  let seg100mAnnounced = false;
  const SEG_ENDING_WARNING_SEC = 10;
  const SEG_100M_CHECK_M = 100;

  // ---- session logging (for the saved activity record) ----
  let sessionPaceSamples = [];
  let sessionKmSplits = [];
  let sessionPlanLog = [];
  let sessionRoutePoints = [];

  // ---- live map (Leaflet) ----
  const liveMapWrap = document.getElementById('liveMapWrap');
  let liveMap = null, liveMapLine = null, liveMapMarker = null;
  let lastKmCount = 0;
  let lastKmBoundaryTime = 0;
  let pausedAtLastKmBoundary = 0;

  // ---- live clock, independent of GPS fix timing ----
  let clockTimer = null;

  // ===================================================================
  // Small formatting helpers
  // ===================================================================
  function haversineKm(lat1, lon1, lat2, lon2){
    const toRad = d => d * Math.PI / 180;
    const RE = 6371;
    const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
    return 2 * RE * Math.asin(Math.sqrt(a));
  }

  // How hard to smooth the speed reading. Baseline comes from GPS accuracy
  // (clean fix -> light damping, noisy fix -> more), but a relative change
  // large enough to be a genuine pace shift (not just jitter) always snaps
  // through almost immediately, regardless of accuracy.
  function speedSmoothingAlpha(accuracy, relDelta){
    let alpha;
    if (accuracy == null || accuracy <= ACCURACY_GOOD_M) alpha = SPEED_SMOOTHING_ALPHA_BASE;
    else if (accuracy >= ACCURACY_POOR_M) alpha = SPEED_SMOOTHING_ALPHA_POOR;
    else {
      const t = (accuracy - ACCURACY_GOOD_M) / (ACCURACY_POOR_M - ACCURACY_GOOD_M);
      alpha = SPEED_SMOOTHING_ALPHA_BASE + t * (SPEED_SMOOTHING_ALPHA_POOR - SPEED_SMOOTHING_ALPHA_BASE);
    }
    if (relDelta > SPEED_CHANGE_SNAP_RATIO) alpha = Math.max(alpha, SPEED_SMOOTHING_ALPHA_SNAP);
    return alpha;
  }

  function formatPace(sec){
    if (sec == null || !isFinite(sec)) return '--:--';
    const total = Math.round(sec); // round once on the whole value, so 59.6s rolls over into the next minute
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${String(s).padStart(2,'0')}`;
  }

  function formatDuration(sec){
    sec = Math.max(0, Math.round(sec));
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    return h > 0 ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}` : `${m}:${String(s).padStart(2,'0')}`;
  }

  // Compact "amount" label with no extra words — e.g. "2 km", "800 m", "1:30".
  function formatAmountShort(durType, durValue){
    if (durType === 'distance'){
      if (durValue >= 1000){
        const km = Math.round(durValue / 10) / 100;
        return `${km} km`;
      }
      return `${durValue} m`;
    }
    return `${durValue} s`;
  }

  function formatDateIt(ts){
    return new Date(ts).toLocaleDateString(I18N[currentLang].locale, { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' });
  }

  // Active (non-paused) milliseconds elapsed since a reference timestamp,
  // given the pausedTotalMs snapshot taken when that reference was set.
  // Also accounts for a pause that is still ongoing right now.
  function activeMsSince(refTime, pausedSnapshot){
    let effectivePaused = pausedTotalMs;
    if (paused) effectivePaused += (Date.now() - pauseStartTime);
    return (Date.now() - refTime) - (effectivePaused - pausedSnapshot);
  }

  // ===================================================================
  // AUDIO — every spoken phrase is built by S (translations.js), for the
  // language currently active. This section only decides WHAT to say
  // (which branch, which numbers), never the wording itself.
  // ===================================================================
  function speak(text){
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = I18N[currentLang].speechLang;
    u.rate = 1.0;
    window.speechSynthesis.speak(u);
  }

  function buildPeriodicMessage(paceSec, activeTargetSec){
    const base = S.currentPaceAnnouncement(paceSec);
    if (activeTargetSec == null) return base;

    const isFirstForThisTarget = activeTargetSec !== lastAnnouncedTargetSec;
    lastAnnouncedTargetSec = activeTargetSec;
    if (!isFirstForThisTarget) return base;

    const diff = Math.round(paceSec - activeTargetSec);
    const status = Math.abs(diff) <= TOLERANCE_SEC ? 'on' : (diff > 0 ? 'slow' : 'fast');
    return `${base}. ${S.paceVsTarget(activeTargetSec, diff, status)}`;
  }

  // Fires once whenever the current pace crosses ±30s away from the active
  // target — separate from the periodic cadence, so it can warn right away.
  function buildOffTargetWarning(diff){
    return S.offTargetWarning(diff > 0 ? 'slow' : 'fast');
  }

  function buildTransitionMessage(seg){
    const parts = [];
    if (seg.repTotal && seg.stepIndexInRep === 0){
      parts.push(S.repetitionIntro(seg.repIndex, seg.repTotal));
    }
    const amount = S.amountPhrase(seg.durType, seg.durValue);
    if (seg.mode === 'rest'){
      parts.push(S.restStart(amount));
    } else {
      parts.push(S.runStart(amount, seg.paceSec ? S.pacePhrase(seg.paceSec) : null));
    }
    return parts.join(' ');
  }

  // Halfway through a segment: always a heads-up; during a running segment,
  // also the average pace of the whole run so far.
  function buildHalfwayMessage(seg){
    if (seg.mode !== 'run' || totalDistanceKm <= 0) return S.halfwaySegment();
    const activeElapsedSec = activeMsSince(trackingStartTime, pausedAtStart) / 1000;
    const avgPaceSec = activeElapsedSec / totalDistanceKm;
    return S.halfwayRunAvg(S.pacePhrase(avgPaceSec));
  }

  // ~10 seconds before a segment ends: a heads-up plus a preview of what's next.
  function buildEndingSoonMessage(nextSeg){
    if (!nextSeg) return S.endingSoonLastSegment();
    const amount = S.amountPhrase(nextSeg.durType, nextSeg.durValue);
    return nextSeg.mode === 'rest'
      ? S.endingSoonNextRest(amount)
      : S.endingSoonNextRun(amount, nextSeg.paceSec ? S.pacePhrase(nextSeg.paceSec) : null);
  }

  // After the first 100m of a running segment: its average pace so far,
  // for immediate feedback on how the segment is going.
  function build100mMessage(segElapsedSec, segDistM){
    const avgPaceSec = segElapsedSec / (segDistM / 1000);
    return S.segmentAvgPace(S.pacePhrase(avgPaceSec));
  }

  // Full spoken recap of a run: distance, duration and average pace.
  function buildRunSummarySpeech(distanceKm, durationSec, avgPaceSec){
    const pacePhraseVal = avgPaceSec != null && isFinite(avgPaceSec) ? S.pacePhrase(avgPaceSec) : null;
    return S.runSummary(S.distancePhrase(distanceKm), S.durationPhrase(durationSec), pacePhraseVal);
  }

  // ===================================================================
  // Setup panel interactions
  // ===================================================================
  function bindToggle(checkbox, panel){
    checkbox.addEventListener('change', () => panel.classList.toggle('hidden', !checkbox.checked));
  }
  bindToggle(targetEnabled, targetInputs);

  // Piano and Target are alternative ways to run: opening one closes the
  // other's panel. If a plan has at least one step it always takes priority
  // at start time over a Target goal — see the branching in startTracking()
  // and activeTargetPaceSec().
  planToggleBtn.addEventListener('click', () => {
    showMainScreen();
    const hidden = planBuilderHome.classList.toggle('hidden');
    planToggleBtn.classList.toggle('active', !hidden);
    if (!hidden){ targetBuilderHome.classList.add('hidden'); targetToggleBtn.classList.remove('active'); }
  });

  targetToggleBtn.addEventListener('click', () => {
    showMainScreen();
    const hidden = targetBuilderHome.classList.toggle('hidden');
    targetToggleBtn.classList.toggle('active', !hidden);
    if (!hidden){ planBuilderHome.classList.add('hidden'); planToggleBtn.classList.remove('active'); }
  });

  // Distanza/Tempo are an exclusive either/or choice (tapping the active one
  // clears the goal entirely); Ritmo is a separate checkbox that can combine
  // with whichever of the two is picked, or stand alone with no completion.
  function setTargetGoalMode(mode){ // mode: 'distance' | 'time' | null
    targetDistBtn.classList.toggle('active', mode === 'distance');
    targetTimeBtn.classList.toggle('active', mode === 'time');
    targetDistWrap.classList.toggle('hidden', mode !== 'distance');
    targetTimeWrap.classList.toggle('hidden', mode !== 'time');
  }
  targetDistBtn.addEventListener('click', () => {
    setTargetGoalMode(targetDistBtn.classList.contains('active') ? null : 'distance');
  });
  targetTimeBtn.addEventListener('click', () => {
    setTargetGoalMode(targetTimeBtn.classList.contains('active') ? null : 'time');
  });

  function planHasSteps(){
    return planSteps.children.length > 0;
  }

  settingsToggle.addEventListener('click', () => {
    showMainScreen();
    langDropdown.classList.add('hidden');
    const nowHidden = settingsPanel.classList.toggle('hidden');
    settingsToggle.classList.toggle('active', !nowHidden);
  });

  // Moves a plan-step/plan-group one position up (-1) or down (+1) among its siblings.
  function moveItem(el, dir){
    if (!el) return;
    if (dir < 0 && el.previousElementSibling) el.parentNode.insertBefore(el, el.previousElementSibling);
    else if (dir > 0 && el.nextElementSibling) el.parentNode.insertBefore(el.nextElementSibling, el);
  }

  // ---- plan builder DOM ----
  function makeStepRow(){
    const row = document.createElement('div');
    row.className = 'plan-step';
    row.innerHTML = `
      <div class="step-move-group">
        <button class="step-move step-move-up" type="button" aria-label="${T.moveUpAria}">▲</button>
        <button class="step-move step-move-down" type="button" aria-label="${T.moveDownAria}">▼</button>
      </div>
      <select class="step-mode">
        <option value="run">${T.stepModeRun}</option>
        <option value="rest">${T.stepModeRest}</option>
      </select>
      <input type="number" class="step-durvalue" min="1" value="1000">
      <select class="step-durtype">
        <option value="distance">${T.unitMeters}</option>
        <option value="time">${T.unitSeconds}</option>
      </select>
      <span class="step-pace-group">
        <input type="number" class="step-pace-min" min="0" placeholder="${T.placeholderMin}" value="5" style="width:48px">
        <span>:</span>
        <input type="number" class="step-pace-sec" min="0" max="59" placeholder="${T.placeholderSec}" value="0" style="width:48px">
      </span>
      <button class="step-remove" type="button" aria-label="${T.removeAria}">✕</button>
    `;
    return row;
  }

  function makeGroupBlock(){
    const wrap = document.createElement('div');
    wrap.className = 'plan-group';
    wrap.innerHTML = `
      <div class="group-header">
        <span class="repeat-label">${T.repeatWord}</span>
        <input type="number" class="group-reps" min="1" value="5" style="width:52px">
        <span class="times-label">${T.timesWord}</span>
        <div class="step-move-group">
          <button class="step-move group-move-up" type="button" aria-label="${T.moveUpAria}">▲</button>
          <button class="step-move group-move-down" type="button" aria-label="${T.moveDownAria}">▼</button>
        </div>
        <button class="group-remove" type="button" aria-label="${T.removeGroupAria}">✕</button>
      </div>
      <div class="group-steps"></div>
      <button class="ghost-btn group-add-step" type="button">${T.addStepInGroupBtn}</button>
    `;
    wrap.querySelector('.group-steps').appendChild(makeStepRow());
    return wrap;
  }

  addStepBtn.addEventListener('click', () => planSteps.appendChild(makeStepRow()));
  addGroupBtn.addEventListener('click', () => planSteps.appendChild(makeGroupBlock()));

  planSteps.addEventListener('click', (e) => {
    if (e.target.classList.contains('step-remove')) e.target.closest('.plan-step').remove();
    if (e.target.classList.contains('group-remove')) e.target.closest('.plan-group').remove();
    if (e.target.classList.contains('group-add-step')){
      e.target.closest('.plan-group').querySelector('.group-steps').appendChild(makeStepRow());
    }
    if (e.target.classList.contains('step-move-up')) moveItem(e.target.closest('.plan-step'), -1);
    if (e.target.classList.contains('step-move-down')) moveItem(e.target.closest('.plan-step'), 1);
    if (e.target.classList.contains('group-move-up')) moveItem(e.target.closest('.plan-group'), -1);
    if (e.target.classList.contains('group-move-down')) moveItem(e.target.closest('.plan-group'), 1);
  });
  planSteps.addEventListener('change', (e) => {
    if (e.target.classList.contains('step-mode')){
      const row = e.target.closest('.plan-step');
      const paceGroup = row.querySelector('.step-pace-group');
      paceGroup.classList.toggle('hidden', e.target.value === 'rest');
      // Sensible defaults per mode: recovery is usually time-based (90s),
      // a running step usually distance-based (1km).
      if (e.target.value === 'rest'){
        row.querySelector('.step-durtype').value = 'time';
        row.querySelector('.step-durvalue').value = 90;
      } else {
        row.querySelector('.step-durtype').value = 'distance';
        row.querySelector('.step-durvalue').value = 1000;
      }
    }
    if (e.target.classList.contains('step-durtype')){
      e.target.closest('.plan-step').querySelector('.step-durvalue').value =
        e.target.value === 'time' ? 90 : 1000;
    }
  });

  function readStepRow(row){
    const mode = row.querySelector('.step-mode').value;
    const durType = row.querySelector('.step-durtype').value;
    const durValue = parseFloat(row.querySelector('.step-durvalue').value) || 0;
    let paceSec = null;
    if (mode === 'run'){
      const m = parseInt(row.querySelector('.step-pace-min').value, 10) || 0;
      const s = parseInt(row.querySelector('.step-pace-sec').value, 10) || 0;
      paceSec = m * 60 + s;
    }
    return { mode, durType, durValue, paceSec };
  }

  function buildPlanFromDOM(){
    const items = [];
    for (const child of planSteps.children){
      if (child.classList.contains('plan-step')){
        items.push({ kind: 'step', ...readStepRow(child) });
      } else if (child.classList.contains('plan-group')){
        const reps = parseInt(child.querySelector('.group-reps').value, 10) || 1;
        const steps = Array.from(child.querySelectorAll('.group-steps .plan-step')).map(readStepRow);
        items.push({ kind: 'group', reps, steps });
      }
    }
    return items;
  }

  function flattenPlan(items){
    const segs = [];
    for (const item of items){
      if (item.kind === 'step'){
        segs.push({ ...item, repIndex: 0, repTotal: 0, stepIndexInRep: 0 });
      } else {
        for (let r = 1; r <= item.reps; r++){
          item.steps.forEach((s, i) => {
            segs.push({ ...s, repIndex: r, repTotal: item.reps, stepIndexInRep: i });
          });
        }
      }
    }
    return segs;
  }

  // ===================================================================
  // Plan engine
  // ===================================================================
  function startPlanSegment(index){
    planIndex = index;
    const seg = planSegments[index];
    planSegStartDistM = totalDistanceKm * 1000;
    planSegStartTime = Date.now();
    pausedAtSegStart = pausedTotalMs;
    segHalfwayAnnounced = false;
    segEndingAnnounced = false;
    seg100mAnnounced = false;
    speak(buildTransitionMessage(seg));
    renderPlanStatus();
  }

  function renderPlanStatus(){
    if (!planActive || planIndex < 0){ planStatus.innerHTML = ''; return; }
    const seg = planSegments[planIndex];
    const rep = seg.repTotal ? ` <span class="hl">${seg.repIndex}/${seg.repTotal}</span>` : '';
    const label = seg.mode === 'rest' ? T.stepModeRest : T.stepModeRun;
    const amount = formatAmountShort(seg.durType, seg.durValue);
    const target = seg.mode === 'run' && seg.paceSec ? ` ${formatPace(seg.paceSec)}` : '';
    planStatus.innerHTML =
      `${T.planStatusStepWord} <span class="hl">${planIndex + 1}/${planSegments.length}</span> · ${label}${rep}` +
      `<span class="target">${amount}${target}</span>`;
  }

  function logCompletedSegment(seg){
    const segElapsedSec = activeMsSince(planSegStartTime, pausedAtSegStart) / 1000;
    const segDistM = totalDistanceKm * 1000 - planSegStartDistM;
    const achievedPaceSec = segDistM > 1 ? segElapsedSec / (segDistM / 1000) : null;
    sessionPlanLog.push({
      mode: seg.mode, durType: seg.durType, durValue: seg.durValue, paceSec: seg.paceSec,
      repIndex: seg.repIndex, repTotal: seg.repTotal,
      achievedPaceSec, actualDurationSec: segElapsedSec, actualDistanceM: segDistM
    });
  }

  function checkPlanProgress(){
    if (!planActive || planIndex < 0) return;
    const seg = planSegments[planIndex];
    const segElapsedSec = activeMsSince(planSegStartTime, pausedAtSegStart) / 1000;
    const segDistM = totalDistanceKm * 1000 - planSegStartDistM;

    // First 100m of a running segment: early read on how it's going.
    if (seg.mode === 'run' && !seg100mAnnounced && segDistM >= SEG_100M_CHECK_M){
      seg100mAnnounced = true;
      speak(build100mMessage(segElapsedSec, segDistM));
    }

    // Halfway through the segment (by whichever unit it's measured in).
    if (!segHalfwayAnnounced){
      const progress = seg.durType === 'distance' ? segDistM / seg.durValue : segElapsedSec / seg.durValue;
      if (progress >= 0.5){
        segHalfwayAnnounced = true;
        speak(buildHalfwayMessage(seg));
      }
    }

    // ~10 seconds before the segment ends. For distance segments this is
    // estimated from the current pace (falling back to the segment's own
    // target pace if the live pace isn't available yet).
    if (!segEndingAnnounced){
      let remainingSec;
      if (seg.durType === 'time'){
        remainingSec = seg.durValue - segElapsedSec;
      } else {
        const remainingDistM = seg.durValue - segDistM;
        const paceForEstimate = currentPaceSec != null ? currentPaceSec : seg.paceSec;
        remainingSec = paceForEstimate ? (remainingDistM / 1000) * paceForEstimate : null;
      }
      if (remainingSec != null && remainingSec >= 0 && remainingSec <= SEG_ENDING_WARNING_SEC){
        segEndingAnnounced = true;
        speak(buildEndingSoonMessage(planSegments[planIndex + 1] || null));
      }
    }

    let done = false;
    if (seg.durType === 'distance'){
      done = segDistM >= seg.durValue;
    } else {
      done = segElapsedSec >= seg.durValue;
    }
    if (done){
      logCompletedSegment(seg);
      if (planIndex + 1 < planSegments.length){
        startPlanSegment(planIndex + 1);
      } else {
        planActive = false;
        if (isTargetMode){
          const activeElapsedSec = activeMsSince(trackingStartTime, pausedAtStart) / 1000;
          const avgPaceSec = totalDistanceKm > 0 ? activeElapsedSec / totalDistanceKm : null;
          speak(buildRunSummarySpeech(totalDistanceKm, activeElapsedSec, avgPaceSec));
          planStatus.textContent = T.targetCompletedStatus;
        } else {
          speak(S.planCompleted());
          planStatus.textContent = T.planCompletedStatus;
        }
      }
    }
  }

  function activeTargetPaceSec(){
    if (planActive && planIndex >= 0){
      const seg = planSegments[planIndex];
      return seg.mode === 'run' ? seg.paceSec : null;
    }
    return targetEnabled.checked ? (parseInt(targetMin.value,10)||0)*60 + (parseInt(targetSec.value,10)||0) : null;
  }

  // ===================================================================
  // Pause / resume (shared by the manual button and auto-pause detection)
  // ===================================================================
  function enterPaused(isAuto){
    if (paused) return;
    paused = true;
    pausedIsAuto = isAuto;
    pauseStartTime = Date.now();
    if (planTickTimer){ clearInterval(planTickTimer); planTickTimer = null; }
    appEl.classList.add('paused');
    appEl.classList.remove('tracking');
    pauseBtn.textContent = T.pauseBtnResume;
    setStatus(isAuto ? T.statusAutoPaused : T.statusPaused);
  }

  function exitPaused(){
    if (!paused) return;
    pausedTotalMs += Date.now() - pauseStartTime;
    paused = false;
    pausedIsAuto = false;
    appEl.classList.remove('paused');
    appEl.classList.add('tracking');
    pauseBtn.textContent = T.pauseBtnPause;
    if (planActive) planTickTimer = setInterval(checkPlanProgress, 1000);
    setStatus(T.statusActive);
  }

  // ===================================================================
  // Rendering
  // ===================================================================
  function setStatus(msg, mode){
    statusText.textContent = msg;
    appEl.classList.remove('error');
    if (mode === 'error') appEl.classList.add('error');
  }

  // Fires a short spoken warning the moment the pace crosses ±30s away from
  // the active target, and re-arms once it's back within that window.
  function maybeWarnOffTarget(diff){
    if (diff == null || !tracking || paused){ paceWarnActive = false; return; }
    const isOff = Math.abs(diff) >= PACE_WARN_THRESHOLD_SEC;
    if (isOff && !paceWarnActive){
      paceWarnActive = true;
      speak(buildOffTargetWarning(diff));
    } else if (!isOff){
      paceWarnActive = false;
    }
  }

  function render(){
    paceValue.textContent = formatPace(currentPaceSec);

    const pct = currentPaceSec == null ? 0 :
      Math.min(Math.max((GAUGE_SLOW_SEC - currentPaceSec) / (GAUGE_SLOW_SEC - GAUGE_FAST_SEC), 0), 1);
    gaugeFill.style.strokeDashoffset = (CIRC * (1 - pct)).toFixed(2);

    const targetSecVal = activeTargetPaceSec();
    const diff = (targetSecVal != null && currentPaceSec != null) ? Math.round(currentPaceSec - targetSecVal) : null;

    if (planActive){
      // The whole gauge communicates on/off-target at a glance during a plan,
      // so the numeric badge is redundant here.
      paceDelta.classList.add('hidden');
      appEl.classList.remove('plan-good','plan-bad');
      if (diff != null) appEl.classList.add(Math.abs(diff) <= TOLERANCE_SEC ? 'plan-good' : 'plan-bad');
    } else {
      appEl.classList.remove('plan-good','plan-bad');
      if (diff != null){
        paceDelta.classList.remove('hidden');
        paceDelta.classList.remove('delta-fast','delta-slow','delta-target');
        if (Math.abs(diff) <= TOLERANCE_SEC){
          paceDelta.textContent = T.inTarget;
          paceDelta.classList.add('delta-target');
        } else if (diff > 0){
          paceDelta.textContent = `+${diff}s/km`;
          paceDelta.classList.add('delta-slow');
        } else {
          paceDelta.textContent = `${diff}s/km`;
          paceDelta.classList.add('delta-fast');
        }
      } else {
        paceDelta.classList.add('hidden');
      }
    }

    maybeWarnOffTarget(diff);

    distValue.textContent = `${totalDistanceKm.toFixed(2)} km`;
  }

  function updateClock(){
    if (!trackingStartTime) return;
    const activeElapsedSec = activeMsSince(trackingStartTime, pausedAtStart) / 1000;
    timeValue.textContent = formatDuration(activeElapsedSec);
    if (totalDistanceKm > 0.05) avgValue.textContent = formatPace(activeElapsedSec / totalDistanceKm);
  }

  function resetDisplay(){
    paceValue.textContent = '--:--';
    gaugeFill.style.strokeDashoffset = CIRC.toFixed(2);
    paceDelta.classList.add('hidden');
    appEl.classList.remove('plan-good','plan-bad');
    paceWarnActive = false;
    distValue.textContent = '0.00 km';
    timeValue.textContent = '0:00';
    avgValue.textContent = '--:--';
    planStatus.innerHTML = '';
  }

  // ===================================================================
  // Geolocation — a single watch runs for the whole page lifetime so
  // accuracy is already good by the time a run actually starts.
  // ===================================================================
  function onPosition(pos){
    const { latitude, longitude, speed, accuracy } = pos.coords;
    const now = pos.timestamp;

    accuracyValue.textContent = (accuracy != null) ? `±${Math.round(accuracy)} m` : '—';
    if (!paused) setStatus(T.statusActive);

    if (!tracking){
      // Not running yet: just keep the accuracy/status readout warm.
      lastPos = { lat: latitude, lon: longitude, time: now };
      return;
    }

    let speedKmh;
    if (speed != null && !isNaN(speed) && speed >= 0){
      speedKmh = speed * 3.6;
    } else if (lastPos){
      const distKm = haversineKm(lastPos.lat, lastPos.lon, latitude, longitude);
      const dtH = (now - lastPos.time) / 1000 / 3600;
      speedKmh = dtH > 0 ? distKm / dtH : 0;
    } else {
      speedKmh = 0;
    }

    // A single fix implying an impossible speed for a runner is almost
    // certainly a GPS glitch (position jump) — drop it entirely rather than
    // letting it corrupt distance/pace, and wait for the next fix.
    if (speedKmh > IMPLAUSIBLE_SPEED_KMH){
      return;
    }

    // Minimal smoothing: a light baseline for stability, damped further only
    // if this fix's accuracy is genuinely poor, but bypassed almost entirely
    // when the change looks like a real pace shift rather than jitter.
    const relDelta = smoothedSpeedKmh > 0.3
      ? Math.abs(speedKmh - smoothedSpeedKmh) / smoothedSpeedKmh
      : 1;
    const alpha = speedSmoothingAlpha(accuracy, relDelta);
    smoothedSpeedKmh += alpha * (speedKmh - smoothedSpeedKmh);

    const rawPaceSec = smoothedSpeedKmh > 0.05 ? 3600 / smoothedSpeedKmh : Infinity;
    const instantPaceSec = rawPaceSec <= MAX_PACE_SEC ? rawPaceSec : null;


    // ---- auto-pause / auto-resume ----
    if (!paused && instantPaceSec == null){
      enterPaused(true);
    } else if (paused && pausedIsAuto && instantPaceSec != null){
      exitPaused();
    }

    currentPaceSec = paused ? null : instantPaceSec;

    const accOk = accuracy == null || accuracy <= 30;
    if (lastPos && accOk && !paused){
      totalDistanceKm += haversineKm(lastPos.lat, lastPos.lon, latitude, longitude);
    }
    lastPos = { lat: latitude, lon: longitude, time: now };

    if (!paused){
      const activeElapsedSec = activeMsSince(trackingStartTime, pausedAtStart) / 1000;
      sessionPaceSamples.push({ t: activeElapsedSec, d: totalDistanceKm, p: currentPaceSec });
      while (Math.floor(totalDistanceKm) > lastKmCount){
        lastKmCount++;
        const splitSec = activeMsSince(lastKmBoundaryTime, pausedAtLastKmBoundary) / 1000;
        sessionKmSplits.push({ km: lastKmCount, paceSec: splitSec });
        lastKmBoundaryTime = Date.now();
        pausedAtLastKmBoundary = pausedTotalMs;
      }

      if (accOk){
        sessionRoutePoints.push({ lat: latitude, lon: longitude });
        updateLiveMap(latitude, longitude);
      }
    }

    render();
    if (!paused) maybeAnnouncePeriodic();
  }

  // The map is a purely visual layer on top of GPS data we're already
  // recording. It never blocks tracking: if Leaflet failed to load (e.g. no
  // connection when the page opened) or tiles can't be fetched, the route is
  // still saved and a map can be shown later whenever a connection is back.
  function updateLiveMap(lat, lon){
    if (typeof L === 'undefined') return;
    if (!liveMap){
      liveMap = L.map('liveMap', { zoomControl: true }).setView([lat, lon], 17);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap'
      }).addTo(liveMap);
      liveMapLine = L.polyline([[lat, lon]], { color: '#1B9E70', weight: 4 }).addTo(liveMap);
      liveMapMarker = L.circleMarker([lat, lon], { radius: 6, weight: 2, color: '#fff', fillColor: '#1B9E70', fillOpacity: 1 }).addTo(liveMap);
    } else {
      liveMapLine.addLatLng([lat, lon]);
      liveMapMarker.setLatLng([lat, lon]);
      liveMap.panTo([lat, lon]);
    }
  }

  function teardownLiveMap(){
    if (liveMap){ liveMap.remove(); liveMap = null; liveMapLine = null; liveMapMarker = null; }
  }

  function maybeAnnouncePeriodic(){
    if (!audioEnabledBox.checked || currentPaceSec == null) return;
    const mode = audioTrigger.value;
    const interval = parseFloat(audioInterval.value) || 0;
    if (interval <= 0) return;

    if (mode === 'distance'){
      const distM = totalDistanceKm * 1000;
      if (distM - lastAnnounceDistanceM >= interval){
        lastAnnounceDistanceM = distM;
        speak(buildPeriodicMessage(currentPaceSec, activeTargetPaceSec()));
      }
    } else {
      const nowMs = Date.now();
      if (nowMs - lastAnnounceTimeMs >= interval * 1000){
        lastAnnounceTimeMs = nowMs;
        speak(buildPeriodicMessage(currentPaceSec, activeTargetPaceSec()));
      }
    }
  }

  function onError(err){
    if (err.code === 1){
      if (gpsWatchId != null){ navigator.geolocation.clearWatch(gpsWatchId); gpsWatchId = null; }
      if (tracking) resetToIdle();
      setStatus(T.statusPermissionDenied, 'error');
      hintText.textContent = T.hintPermissionDenied;
    } else {
      // Transient (timeout / position unavailable): the watch keeps trying
      // on its own, so we just show it without interrupting a run in progress.
      setStatus(err.code === 3 ? T.statusWeak : T.statusSearching);
    }
  }

  function startGpsWarmup(){
    if (!('geolocation' in navigator)) return;
    gpsWatchId = navigator.geolocation.watchPosition(onPosition, onError, {
      enableHighAccuracy: true, maximumAge: 0, timeout: 12000
    });
  }

  // ===================================================================
  // Saved activities (localStorage)
  // ===================================================================
  function loadRuns(){
    try { return JSON.parse(localStorage.getItem(RUNS_STORAGE_KEY) || '[]'); }
    catch(e){ return []; }
  }

  function saveRun(run){
    const runs = loadRuns();
    runs.push(run);
    while (runs.length > MAX_SAVED_RUNS) runs.shift();
    try { localStorage.setItem(RUNS_STORAGE_KEY, JSON.stringify(runs)); }
    catch(e){ /* storage unavailable or full — the run just won't persist */ }
  }

  function deleteRun(id){
    const runs = loadRuns().filter(r => r.id !== id);
    try { localStorage.setItem(RUNS_STORAGE_KEY, JSON.stringify(runs)); }
    catch(e){ /* storage unavailable — nothing to persist */ }
  }

  function percentile(values, p){
    const sorted = values.slice().sort((a, b) => a - b);
    const idx = (sorted.length - 1) * p;
    const lo = Math.floor(idx), hi = Math.ceil(idx);
    return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
  }

  // ---- pace-vs-distance chart: whole-km gridlines on X, 30s-step pace
  // gridlines on Y, plus a touch/drag scrubber that reads out each sample ----
  function computePaceAxis(pMinRaw, pMaxRaw){
    let step = 30;
    let lo = Math.floor(pMinRaw / step) * step;
    let hi = Math.ceil(pMaxRaw / step) * step;
    if (hi === lo) hi = lo + step;
    if ((hi - lo) / step > 10){
      step = 60;
      lo = Math.floor(pMinRaw / step) * step;
      hi = Math.ceil(pMaxRaw / step) * step;
      if (hi === lo) hi = lo + step;
    }
    const ticks = [];
    for (let t = lo; t <= hi; t += step) ticks.push(t);
    return { lo, hi, step, ticks };
  }

  function computeKmTicks(dMax){
    const ticks = [0];
    for (let k = 1; k <= Math.floor(dMax); k++) ticks.push(k);
    if (dMax - Math.floor(dMax) > 0.08 && dMax > (ticks[ticks.length-1] + 0.08)){
      ticks.push(Number(dMax.toFixed(2)));
    }
    return ticks;
  }

  const CHART_M_LEFT = 34, CHART_M_TOP = 10, CHART_PLOT_W = 358, CHART_PLOT_H = 100;

  function buildRunDetailHtml(run){
    let html = (run.routePoints && run.routePoints.length > 1)
      ? '<div class="history-map"></div>'
      : '';

    const valid = run.paceSamples.filter(s => s.p != null);
    let chartSvg;
    if (valid.length < 2){
      chartSvg = `<svg class="history-chart" viewBox="0 0 400 130"><text x="10" y="60" fill="#63756A" font-size="11">${T.insufficientDataChart}</text></svg>`;
      run.__axis = null; run.__dMax = null;
    } else {
      const paces = valid.map(s => s.p);
      const dMax = valid[valid.length - 1].d || 1;
      // Cap the slow end at the 90th percentile: a slow first sample or two
      // (GPS/pace still settling at the start) would otherwise stretch the
      // whole axis and flatten the interesting variation. Slower points are
      // still drawn — just clamped to the bottom edge instead of widening the scale.
      const axisHiRaw = paces.length >= 4 ? percentile(paces, 0.9) : Math.max(...paces);
      const axis = computePaceAxis(Math.min(...paces), axisHiRaw);
      const kmTicks = computeKmTicks(dMax);
      run.__axis = axis; run.__dMax = dMax;

      const x = d => CHART_M_LEFT + (d / dMax) * CHART_PLOT_W;
      const y = p => CHART_M_TOP + ((Math.min(p, axis.hi) - axis.lo) / (axis.hi - axis.lo)) * CHART_PLOT_H;

      const yLines = axis.ticks.map(t => `
        <line x1="${CHART_M_LEFT}" y1="${y(t)}" x2="${CHART_M_LEFT+CHART_PLOT_W}" y2="${y(t)}" stroke="rgba(15,30,20,0.10)" stroke-width="1"/>
        <text x="2" y="${y(t)+3.5}" font-size="9.5" fill="#63756A">${formatPace(t)}</text>
      `).join('');
      const xLines = kmTicks.map(k => `
        <line x1="${x(k)}" y1="${CHART_M_TOP}" x2="${x(k)}" y2="${CHART_M_TOP+CHART_PLOT_H}" stroke="rgba(15,30,20,0.08)" stroke-width="1"/>
        <text x="${x(k)}" y="${CHART_M_TOP+CHART_PLOT_H+14}" font-size="9.5" fill="#63756A" text-anchor="middle">${k}</text>
      `).join('');
      const pts = valid.map(s => `${x(s.d).toFixed(1)},${y(s.p).toFixed(1)}`).join(' ');

      chartSvg = `
        <svg class="history-chart" viewBox="0 0 400 130" preserveAspectRatio="none">
          ${yLines}
          ${xLines}
          <text x="${CHART_M_LEFT+CHART_PLOT_W}" y="${CHART_M_TOP+CHART_PLOT_H+14}" font-size="9" fill="#63756A" text-anchor="end">km</text>
          <polyline points="${pts}" fill="none" stroke="#1B9E70" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          <rect class="chart-overlay" x="${CHART_M_LEFT}" y="${CHART_M_TOP}" width="${CHART_PLOT_W}" height="${CHART_PLOT_H}" fill="#000" opacity="0" pointer-events="all"/>
          <g class="chart-cursor" style="display:none">
            <line class="chart-cursor-line" x1="0" y1="${CHART_M_TOP}" x2="0" y2="${CHART_M_TOP+CHART_PLOT_H}" stroke="#16211B" stroke-width="1" stroke-dasharray="2,2"/>
            <circle class="chart-cursor-dot" r="4" fill="#1B9E70" stroke="#fff" stroke-width="1.5"/>
            <rect class="chart-cursor-label-bg" width="76" height="18" rx="4" fill="#16211B"/>
            <text class="chart-cursor-label-text" font-size="10" fill="#fff" text-anchor="middle"></text>
          </g>
        </svg>
        <p class="chart-hint">${T.chartHint}</p>
      `;
    }

    html += chartSvg;

    if (run.kmSplits && run.kmSplits.length){
      html += `<div class="history-section-label">${T.kmSplitsLabel}</div>`;
      run.kmSplits.forEach(s => {
        html += `<div class="split-row"><span>${T.kmWord} ${s.km}</span><span>${formatPace(s.paceSec)} /km</span></div>`;
      });
    }

    if (run.planLog && run.planLog.length){
      html += `<div class="history-section-label">${T.planLogLabel}</div>`;
      run.planLog.forEach(seg => {
        const rep = seg.repTotal ? ` ↻${seg.repIndex}/${seg.repTotal}` : '';
        const amount = formatAmountShort(seg.durType, seg.durValue);
        if (seg.mode === 'rest'){
          html += `<div class="plan-row"><span>${T.stepModeRest} (${amount})${rep}</span><span>${formatDuration(seg.actualDurationSec)} · ${formatPace(seg.achievedPaceSec)} /km</span></div>`;
        } else {
          const target = seg.paceSec ? ` ${formatPace(seg.paceSec)}` : '';
          html += `<div class="plan-row"><span>${T.stepModeRun} (${amount}${target})${rep}</span><span>${formatPace(seg.achievedPaceSec)}</span></div>`;
        }
      });
    }
    return html;
  }

  function wireHistoryMap(container, run){
    if (typeof L === 'undefined' || !run.routePoints || run.routePoints.length < 2) return;
    const mapEl = container.querySelector('.history-map');
    if (!mapEl) return;
    const map = L.map(mapEl, { zoomControl: true, scrollWheelZoom: false });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);
    const latlngs = run.routePoints.map(p => [p.lat, p.lon]);
    const line = L.polyline(latlngs, { color: '#1B9E70', weight: 4 }).addTo(map);
    map.fitBounds(line.getBounds(), { padding: [16, 16] });
    L.circleMarker(latlngs[0], { radius: 5, weight: 2, color: '#fff', fillColor: '#1B9E70', fillOpacity: 1 }).addTo(map);
    L.circleMarker(latlngs[latlngs.length - 1], { radius: 5, weight: 2, color: '#fff', fillColor: '#C94444', fillOpacity: 1 }).addTo(map);
  }

  function wireChartInteraction(container, run){
    if (!run.__axis) return;
    const svg = container.querySelector('.history-chart');
    const overlay = container.querySelector('.chart-overlay');
    if (!svg || !overlay) return;
    const cursor = container.querySelector('.chart-cursor');
    const cLine = container.querySelector('.chart-cursor-line');
    const cDot = container.querySelector('.chart-cursor-dot');
    const cLabelBg = container.querySelector('.chart-cursor-label-bg');
    const cLabelText = container.querySelector('.chart-cursor-label-text');
    const valid = run.paceSamples.filter(s => s.p != null);
    const { lo, hi } = run.__axis;
    const dMax = run.__dMax;

    const xOf = d => CHART_M_LEFT + (d / dMax) * CHART_PLOT_W;
    const yOf = p => CHART_M_TOP + ((Math.min(p, hi) - lo) / (hi - lo)) * CHART_PLOT_H;

    function nearestSample(d){
      let best = valid[0], bestDiff = Math.abs(valid[0].d - d);
      for (let i = 1; i < valid.length; i++){
        const diff = Math.abs(valid[i].d - d);
        if (diff < bestDiff){ best = valid[i]; bestDiff = diff; }
      }
      return best;
    }

    function updateAt(clientX){
      const rect = svg.getBoundingClientRect();
      let svgX = ((clientX - rect.left) / rect.width) * 400;
      svgX = Math.min(Math.max(svgX, CHART_M_LEFT), CHART_M_LEFT + CHART_PLOT_W);
      const d = ((svgX - CHART_M_LEFT) / CHART_PLOT_W) * dMax;
      const s = nearestSample(d);
      const px = xOf(s.d), py = yOf(s.p);

      cLine.setAttribute('x1', px); cLine.setAttribute('x2', px);
      cDot.setAttribute('cx', px); cDot.setAttribute('cy', py);

      let labelX = px - 38;
      labelX = Math.min(Math.max(labelX, CHART_M_LEFT), CHART_M_LEFT + CHART_PLOT_W - 76);
      const labelY = Math.max(py - 26, 2);
      cLabelBg.setAttribute('x', labelX); cLabelBg.setAttribute('y', labelY);
      cLabelText.setAttribute('x', labelX + 38); cLabelText.setAttribute('y', labelY + 13);
      cLabelText.textContent = `${formatPace(s.p)} · ${s.d.toFixed(2)}km`;
      cursor.style.display = '';
    }

    overlay.addEventListener('pointerdown', (e) => {
      overlay.setPointerCapture(e.pointerId);
      updateAt(e.clientX);
    });
    overlay.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'mouse' && e.buttons === 0) return;
      updateAt(e.clientX);
    });
    overlay.addEventListener('pointerup', () => { cursor.style.display = 'none'; });
    overlay.addEventListener('pointercancel', () => { cursor.style.display = 'none'; });
  }

  function renderHistoryList(){
    const runs = loadRuns().slice().reverse();
    historyEmptyHint.classList.toggle('hidden', runs.length > 0);
    historyList.innerHTML = '';
    runs.forEach(run => {
      const item = document.createElement('div');
      item.className = 'history-item';
      item.innerHTML = `
        <div class="history-item-head">
          <div>
            <div class="history-item-date">${formatDateIt(run.startTime)}</div>
            <div class="history-item-sub">${run.distanceKm.toFixed(2)} km · ${formatDuration(run.durationSec)}</div>
          </div>
          <div class="history-item-pace-group">
            <div class="history-item-pace">${formatPace(run.avgPaceSec)}<span> /km</span></div>
            <button class="history-delete" type="button" aria-label="${T.deleteRunAria}">✕</button>
          </div>
        </div>
        <div class="history-detail"></div>
      `;
      item.querySelector('.history-item-head').addEventListener('click', () => {
        const detail = item.querySelector('.history-detail');
        const nowOpen = detail.classList.toggle('open');
        if (nowOpen && !detail.dataset.built){
          detail.innerHTML = buildRunDetailHtml(run);
          detail.dataset.built = '1';
          wireHistoryMap(detail, run);
          wireChartInteraction(detail, run);
        }
      });
      item.querySelector('.history-delete').addEventListener('click', (e) => {
        e.stopPropagation();
        showConfirmModal(T.deleteConfirmText, T.deleteConfirmBtn, () => { deleteRun(run.id); renderHistoryList(); });
      });
      historyList.appendChild(item);
    });
  }

  function showHistoryScreen(){
    mainScreen.classList.add('hidden');
    historyScreen.classList.remove('hidden');
    historyToggle.classList.add('active');
    renderHistoryList();
  }
  function showMainScreen(){
    historyScreen.classList.add('hidden');
    mainScreen.classList.remove('hidden');
    historyToggle.classList.remove('active');
  }
  historyToggle.addEventListener('click', () => {
    historyScreen.classList.contains('hidden') ? showHistoryScreen() : showMainScreen();
  });

  // ===================================================================
  // Start / end (pause/resume are handled by enterPaused/exitPaused above)
  // ===================================================================
  function startTracking(){
    if (!('geolocation' in navigator)){
      setStatus(T.statusUnsupported, 'error');
      hintText.textContent = T.hintUnsupported;
      return;
    }
    if (gpsWatchId == null) startGpsWarmup();

    lastPos = null;
    smoothedSpeedKmh = 0;
    currentPaceSec = null;
    totalDistanceKm = 0;
    trackingStartTime = Date.now();
    pausedTotalMs = 0;
    pausedAtStart = 0;
    paused = false;
    pausedIsAuto = false;
    lastAnnounceDistanceM = 0;
    lastAnnounceTimeMs = Date.now();
    lastAnnouncedTargetSec = null;

    sessionPaceSamples = [];
    sessionKmSplits = [];
    sessionPlanLog = [];
    sessionRoutePoints = [];
    lastKmCount = 0;
    lastKmBoundaryTime = trackingStartTime;
    pausedAtLastKmBoundary = 0;

    teardownLiveMap();
    liveMapWrap.classList.remove('hidden');
    resetDisplay();

    if (planHasSteps()){
      planSegments = flattenPlan(buildPlanFromDOM());
      planActive = planSegments.length > 0;
      isTargetMode = false;
      if (planActive){
        startPlanSegment(0);
        planTickTimer = setInterval(checkPlanProgress, 1000);
      }
    } else if (targetDistBtn.classList.contains('active') || targetTimeBtn.classList.contains('active')){
      const durType = targetDistBtn.classList.contains('active') ? 'distance' : 'time';
      const durValue = durType === 'distance' ? (parseFloat(targetDistValue.value) || 0) : (parseFloat(targetTimeValue.value) || 0);
      const paceSec = targetEnabled.checked ? (parseInt(targetMin.value,10)||0)*60 + (parseInt(targetSec.value,10)||0) : null;
      planSegments = [{ mode:'run', durType, durValue, paceSec, repIndex:0, repTotal:0, stepIndexInRep:0 }];
      planActive = true;
      isTargetMode = true;
      startPlanSegment(0);
      planTickTimer = setInterval(checkPlanProgress, 1000);
    } else {
      planActive = false;
      isTargetMode = false;
      planStatus.innerHTML = '';
    }

    tracking = true;
    appEl.classList.add('tracking');
    appEl.classList.remove('error');
    hintText.textContent = '';
    settingsPanel.classList.add('hidden');
    settingsToggle.classList.remove('active');
    planBuilderHome.classList.add('hidden');
    planToggleBtn.classList.remove('active');
    targetBuilderHome.classList.add('hidden');
    targetToggleBtn.classList.remove('active');
    startBtn.classList.add('hidden');
    runControls.classList.remove('hidden');
    pauseBtn.textContent = T.pauseBtnPause;

    clockTimer = setInterval(updateClock, 1000);
    updateClock();
  }

  function resetToIdle(){
    if (planTickTimer) clearInterval(planTickTimer);
    if (clockTimer) clearInterval(clockTimer);
    planTickTimer = null; clockTimer = null;
    tracking = false; paused = false; pausedIsAuto = false;
    planActive = false; planIndex = -1; isTargetMode = false;
    window.speechSynthesis && window.speechSynthesis.cancel();

    appEl.classList.remove('tracking', 'paused', 'error', 'plan-good', 'plan-bad');
    setStatus(T.statusActive);
    hintText.textContent = T.hintDefault;
    settingsPanel.classList.add('hidden');
    settingsToggle.classList.remove('active');
    startBtn.classList.remove('hidden');
    runControls.classList.add('hidden');
    teardownLiveMap();
    liveMapWrap.classList.add('hidden');
    resetDisplay();
  }

  function finalizeAndSave(){
    if (totalDistanceKm >= MIN_SAVE_DISTANCE_KM){
      const activeElapsedSec = activeMsSince(trackingStartTime, pausedAtStart) / 1000;
      const avgPaceSec = totalDistanceKm > 0 ? activeElapsedSec / totalDistanceKm : null;
      speak(buildRunSummarySpeech(totalDistanceKm, activeElapsedSec, avgPaceSec));
      saveRun({
        id: Date.now(),
        startTime: trackingStartTime,
        durationSec: activeElapsedSec,
        distanceKm: totalDistanceKm,
        avgPaceSec,
        paceSamples: sessionPaceSamples,
        kmSplits: sessionKmSplits,
        planLog: sessionPlanLog.length ? sessionPlanLog : null,
        routePoints: sessionRoutePoints.length > 1 ? sessionRoutePoints : null
      });
    }
    resetToIdle();
  }

  startBtn.addEventListener('click', startTracking);
  pauseBtn.addEventListener('click', () => { paused ? exitPaused() : enterPaused(false); });
  endBtn.addEventListener('click', () => {
    showConfirmModal(T.endConfirmText, T.endConfirmBtn, finalizeAndSave);
  });
  confirmCancelBtn.addEventListener('click', () => {
    confirmModal.classList.add('hidden');
    pendingConfirmAction = null;
  });
  confirmEndBtn.addEventListener('click', () => {
    confirmModal.classList.add('hidden');
    if (pendingConfirmAction) pendingConfirmAction();
    pendingConfirmAction = null;
  });

  // ===================================================================
  // Language switching — relabels every static piece of UI from T, plus
  // any plan-step rows already built (their option/aria text, not their
  // entered values), and re-renders whatever dynamic content is visible.
  // ===================================================================
  function applyExistingPlanStepTranslations(){
    document.querySelectorAll('.plan-step').forEach(row => {
      row.querySelector('.step-move-up').setAttribute('aria-label', T.moveUpAria);
      row.querySelector('.step-move-down').setAttribute('aria-label', T.moveDownAria);
      row.querySelector('.step-mode option[value="run"]').textContent = T.stepModeRun;
      row.querySelector('.step-mode option[value="rest"]').textContent = T.stepModeRest;
      row.querySelector('.step-durtype option[value="distance"]').textContent = T.unitMeters;
      row.querySelector('.step-durtype option[value="time"]').textContent = T.unitSeconds;
      row.querySelector('.step-pace-min').placeholder = T.placeholderMin;
      row.querySelector('.step-pace-sec').placeholder = T.placeholderSec;
      row.querySelector('.step-remove').setAttribute('aria-label', T.removeAria);
    });
    document.querySelectorAll('.plan-group').forEach(group => {
      group.querySelector('.repeat-label').textContent = T.repeatWord;
      group.querySelector('.times-label').textContent = T.timesWord;
      group.querySelector('.group-move-up').setAttribute('aria-label', T.moveUpAria);
      group.querySelector('.group-move-down').setAttribute('aria-label', T.moveDownAria);
      group.querySelector('.group-remove').setAttribute('aria-label', T.removeGroupAria);
      group.querySelector('.group-add-step').textContent = T.addStepInGroupBtn;
    });
  }

  function applyTranslations(){
    document.documentElement.lang = currentLang;

    historyToggle.setAttribute('aria-label', T.historyAria);
    settingsToggle.setAttribute('aria-label', T.settingsAria);
    langToggleBtn.textContent = currentLang.toUpperCase();
    langToggleBtn.setAttribute('aria-label', T.langSwitchAria);

    statLabelDistance.textContent = T.statDistance;
    statLabelTime.textContent = T.statTime;
    statLabelAvg.textContent = T.statAvgPace;
    paceUnitLabel.textContent = T.paceUnit;

    audioSectionLabel.textContent = T.audioSectionLabel;
    audioEveryLabel.textContent = T.everyWord;
    audioTrigger.options[0].textContent = T.unitMeters;
    audioTrigger.options[1].textContent = T.unitSeconds;

    startBtn.textContent = T.startBtn;
    pauseBtn.textContent = paused ? T.pauseBtnResume : T.pauseBtnPause;
    endBtn.textContent = T.endBtn;

    planToggleBtn.textContent = T.planToggleBtn;
    targetToggleBtn.textContent = T.targetToggleBtn;
    addStepBtn.textContent = T.addStepBtn;
    addGroupBtn.textContent = T.addGroupBtn;
    applyExistingPlanStepTranslations();

    targetDistBtn.textContent = T.targetDistBtn;
    targetTimeBtn.textContent = T.targetTimeBtn;
    targetDistUnitLabel.textContent = T.unitMeters;
    targetTimeUnitLabel.textContent = T.unitSeconds;
    targetRitmoLabel.textContent = T.targetRitmoLabel;
    targetPaceUnitTag.textContent = T.targetPaceUnitTag;
    targetMin.placeholder = T.placeholderMin;
    targetSec.placeholder = T.placeholderSec;

    historyTitle.textContent = T.historyTitle;
    historyEmptyHint.textContent = T.historyEmpty;
    confirmCancelBtn.textContent = T.cancelBtn;
    langDropdownTitle.textContent = T.chooseLanguageTitle;

    if (!tracking) hintText.textContent = T.hintDefault;
    if (!historyScreen.classList.contains('hidden')) renderHistoryList();
    if (planActive) renderPlanStatus();
  }

  function selectLanguage(lang){
    currentLang = lang;
    localStorage.setItem(LANG_STORAGE_KEY, currentLang);
    T = I18N[currentLang].t;
    S = I18N[currentLang].s;
    applyTranslations();
    langDropdown.classList.add('hidden');
  }

  function openLangDropdown(){
    langOptionList.innerHTML = '';
    SUPPORTED_LANGS.forEach(lang => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ghost-btn' + (lang === currentLang ? ' active' : '');
      btn.textContent = I18N[lang].nativeName;
      btn.addEventListener('click', () => selectLanguage(lang));
      langOptionList.appendChild(btn);
    });
    settingsPanel.classList.add('hidden');
    settingsToggle.classList.remove('active');
    langDropdown.classList.remove('hidden');
  }

  langToggleBtn.addEventListener('click', () => {
    if (!langDropdown.classList.contains('hidden')){
      langDropdown.classList.add('hidden');
      return;
    }
    openLangDropdown();
  });

  // Both dropdowns are anchored popovers, not full-screen modals — clicking
  // anywhere outside a dropdown (and outside the button that opens it)
  // closes it, the way a native menu would.
  document.addEventListener('click', (e) => {
    if (!langDropdown.contains(e.target) && e.target !== langToggleBtn){
      langDropdown.classList.add('hidden');
    }
    if (!settingsPanel.contains(e.target) && e.target !== settingsToggle){
      settingsPanel.classList.add('hidden');
      settingsToggle.classList.remove('active');
    }
  });

  statusText.textContent = T.statusSearching;
  applyTranslations();

  if (!('geolocation' in navigator)){
    startBtn.disabled = true;
    setStatus(T.statusUnsupported, 'error');
    hintText.textContent = T.hintUnsupported;
  } else {
    startGpsWarmup();
  }
})();

if ('serviceWorker' in navigator){
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => { /* offline caching just won't be available */ });
  });
}

