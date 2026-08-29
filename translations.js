// ===================================================================
// TRANSLATIONS — UI strings (t) and spoken-audio phrase builders (s),
// one block per language. app.js only ever calls T.xxx / S.xxx(...);
// it never contains language-specific wording itself.
//
// To add a language: copy one whole block (e.g. "en: { ... }"),
// translate every value, keep every key name identical, and add the
// new key to SUPPORTED_LANGS below.
// ===================================================================
const SUPPORTED_LANGS = ['it', 'en', 'es'];
const DEFAULT_LANG = 'it';

const I18N = {

  // ============================== ITALIANO ==============================
  it: {
    locale: 'it-IT',
    speechLang: 'it-IT',

    t: {
      historyAria: 'Attività',
      settingsAria: 'Impostazioni',
      langSwitchAria: 'Cambia lingua',

      statusSearching: 'Ricerca del segnale…',
      statusWeak: 'Segnale debole…',
      statusActive: 'Segnale GPS attivo',
      statusPermissionDenied: 'Permesso negato',
      statusUnsupported: 'Non supportato',
      statusPaused: 'In pausa',
      statusAutoPaused: 'Pausa automatica',

      hintUnsupported: 'Questo browser non espone le API di geolocalizzazione.',
      hintPermissionDenied: 'Hai bloccato l\'accesso alla posizione. Abilita la localizzazione per questa pagina nelle impostazioni del browser e riprova.',
      hintDefault: 'Il GPS è già attivo in background: aspetta che la precisione sia buona, poi tocca Avvia.',

      statDistance: 'Distanza',
      statTime: 'Tempo',
      statAvgPace: 'Ritmo medio',
      paceUnit: 'min/km',
      inTarget: 'In target',

      audioSectionLabel: 'Aggiornamenti periodici',
      everyWord: 'Ogni',
      unitMeters: 'metri',
      unitSeconds: 'secondi',

      startBtn: 'Avvia corsa',
      pauseBtnPause: 'Pausa',
      pauseBtnResume: 'Riprendi',
      endBtn: 'Termina',

      planToggleBtn: '📋 Piano',
      targetToggleBtn: '🎯 Target',
      addStepBtn: '+ Passo',
      addGroupBtn: '+ Gruppo ripetuto',

      targetDistBtn: 'Distanza',
      targetTimeBtn: 'Tempo',
      targetRitmoLabel: 'Ritmo',
      targetPaceUnitTag: '/km · tolleranza ±10s',
      placeholderMin: 'min',
      placeholderSec: 'sec',

      stepModeRun: 'Corsa',
      stepModeRest: 'Recupero',
      moveUpAria: 'Sposta su',
      moveDownAria: 'Sposta giù',
      removeAria: 'Rimuovi',
      repeatWord: 'Ripeti',
      timesWord: 'volte',
      removeGroupAria: 'Rimuovi gruppo',
      addStepInGroupBtn: '+ Passo nel gruppo',

      historyTitle: 'Attività',
      historyEmpty: 'Nessuna corsa salvata ancora.',
      deleteRunAria: 'Elimina corsa',

      endConfirmText: 'Vuoi davvero concludere la corsa? Verrà salvata nelle tue attività.',
      endConfirmBtn: 'Concludi e salva',
      cancelBtn: 'Annulla',
      deleteConfirmText: 'Vuoi eliminare questa corsa? L\'operazione non è reversibile.',
      deleteConfirmBtn: 'Elimina definitivamente',

      planStatusStepWord: 'Passo',
      targetCompletedStatus: 'Target completato',
      planCompletedStatus: 'Piano completato',

      insufficientDataChart: 'Dati insufficienti per il grafico',
      chartHint: 'Tieni premuto e scorri per vedere il ritmo punto per punto',
      kmSplitsLabel: 'Ritmo per km',
      planLogLabel: 'Ritmo per segmento del piano',
      kmWord: 'Km'
    },

    s: {
      pacePhrase(sec){
        const m = Math.floor(sec / 60);
        const s = Math.round(sec % 60);
        return s === 0 ? `${m} esatti` : `${m} e ${s}`;
      },
      durationPhrase(sec){
        sec = Math.max(0, Math.round(sec));
        const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
        const parts = [];
        if (h > 0) parts.push(`${h} or${h === 1 ? 'a' : 'e'}`);
        if (h > 0 || m > 0) parts.push(`${m} minut${m === 1 ? 'o' : 'i'}`);
        if (h === 0) parts.push(`${s} second${s === 1 ? 'o' : 'i'}`);
        return parts.join(' e ');
      },
      amountPhrase(durType, durValue){
        return durType === 'distance' ? `${durValue} metri` : `${durValue} secondi`;
      },
      distancePhrase(km){
        return km >= 1 ? `${km.toFixed(2)} chilometri` : `${Math.round(km * 1000)} metri`;
      },
      currentPaceAnnouncement(paceSec){
        return `Ritmo attuale, ${this.pacePhrase(paceSec)}`;
      },
      paceVsTarget(targetSec, diffSec, status){
        const base = `Obiettivo ${this.pacePhrase(targetSec)}`;
        if (status === 'on') return `${base}, in linea con l'obiettivo`;
        if (status === 'slow') return `${base}, ${diffSec} secondi più lento dell'obiettivo`;
        return `${base}, ${Math.abs(diffSec)} secondi più veloce dell'obiettivo`;
      },
      offTargetWarning(direction){
        return direction === 'slow' ? 'Attenzione, ritmo troppo lento' : 'Attenzione, ritmo troppo veloce';
      },
      repetitionIntro(repIndex, repTotal){
        return repIndex === repTotal ? 'Ultima ripetuta.' : `Ripetuta ${repIndex} di ${repTotal}.`;
      },
      restStart(amount){
        return `Recupero, ${amount}.`;
      },
      runStart(amount, pacePhraseOrNull){
        return `Via, ${amount}${pacePhraseOrNull ? ` a ritmo ${pacePhraseOrNull}` : ''}.`;
      },
      halfwaySegment(){
        return 'Siamo a metà del segmento.';
      },
      halfwayRunAvg(pacePhraseVal){
        return `Siamo a metà del segmento. Ritmo medio della corsa, ${pacePhraseVal}.`;
      },
      endingSoonLastSegment(){
        return 'Siamo quasi alla fine del segmento. È l\'ultimo tratto del piano.';
      },
      endingSoonNextRest(amount){
        return `Siamo quasi alla fine del segmento. Poi recupero, ${amount}.`;
      },
      endingSoonNextRun(amount, pacePhraseOrNull){
        return `Siamo quasi alla fine del segmento. Poi via, ${amount}${pacePhraseOrNull ? ` a ritmo ${pacePhraseOrNull}` : ''}.`;
      },
      segmentAvgPace(pacePhraseVal){
        return `Ritmo medio del segmento, ${pacePhraseVal}.`;
      },
      planCompleted(){
        return 'Piano completato!';
      },
      runSummary(distancePhraseVal, durationPhraseVal, pacePhraseOrNull){
        const paceClause = pacePhraseOrNull ? `, ritmo medio ${pacePhraseOrNull} al chilometro` : '';
        return `Corsa completata. ${distancePhraseVal} in ${durationPhraseVal}${paceClause}.`;
      }
    }
  },

  // ============================== ENGLISH ==============================
  en: {
    locale: 'en-US',
    speechLang: 'en-US',

    t: {
      historyAria: 'Activity',
      settingsAria: 'Settings',
      langSwitchAria: 'Change language',

      statusSearching: 'Searching for signal…',
      statusWeak: 'Weak signal…',
      statusActive: 'GPS signal active',
      statusPermissionDenied: 'Permission denied',
      statusUnsupported: 'Not supported',
      statusPaused: 'Paused',
      statusAutoPaused: 'Auto-paused',

      hintUnsupported: 'This browser does not expose the geolocation API.',
      hintPermissionDenied: 'You\'ve blocked location access. Enable location for this page in your browser settings and try again.',
      hintDefault: 'GPS is already active in the background: wait for good accuracy, then tap Start.',

      statDistance: 'Distance',
      statTime: 'Time',
      statAvgPace: 'Avg pace',
      paceUnit: 'min/km',
      inTarget: 'On target',

      audioSectionLabel: 'Periodic updates',
      everyWord: 'Every',
      unitMeters: 'meters',
      unitSeconds: 'seconds',

      startBtn: 'Start run',
      pauseBtnPause: 'Pause',
      pauseBtnResume: 'Resume',
      endBtn: 'Finish',

      planToggleBtn: '📋 Plan',
      targetToggleBtn: '🎯 Target',
      addStepBtn: '+ Step',
      addGroupBtn: '+ Repeat group',

      targetDistBtn: 'Distance',
      targetTimeBtn: 'Time',
      targetRitmoLabel: 'Pace',
      targetPaceUnitTag: '/km · ±10s tolerance',
      placeholderMin: 'min',
      placeholderSec: 'sec',

      stepModeRun: 'Run',
      stepModeRest: 'Rest',
      moveUpAria: 'Move up',
      moveDownAria: 'Move down',
      removeAria: 'Remove',
      repeatWord: 'Repeat',
      timesWord: 'times',
      removeGroupAria: 'Remove group',
      addStepInGroupBtn: '+ Step in group',

      historyTitle: 'Activity',
      historyEmpty: 'No runs saved yet.',
      deleteRunAria: 'Delete run',

      endConfirmText: 'Do you really want to finish the run? It will be saved to your activity.',
      endConfirmBtn: 'Finish & save',
      cancelBtn: 'Cancel',
      deleteConfirmText: 'Do you want to delete this run? This can\'t be undone.',
      deleteConfirmBtn: 'Delete permanently',

      planStatusStepWord: 'Step',
      targetCompletedStatus: 'Target completed',
      planCompletedStatus: 'Plan completed',

      insufficientDataChart: 'Not enough data for a chart',
      chartHint: 'Press and drag to see the pace at each point',
      kmSplitsLabel: 'Pace per km',
      planLogLabel: 'Pace per plan segment',
      kmWord: 'Km'
    },

    s: {
      pacePhrase(sec){
        const m = Math.floor(sec / 60);
        const s = Math.round(sec % 60);
        return s === 0 ? `${m} flat` : `${m} ${s}`;
      },
      durationPhrase(sec){
        sec = Math.max(0, Math.round(sec));
        const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
        const parts = [];
        if (h > 0) parts.push(`${h} hour${h === 1 ? '' : 's'}`);
        if (h > 0 || m > 0) parts.push(`${m} minute${m === 1 ? '' : 's'}`);
        if (h === 0) parts.push(`${s} second${s === 1 ? '' : 's'}`);
        return parts.join(' and ');
      },
      amountPhrase(durType, durValue){
        return durType === 'distance' ? `${durValue} meters` : `${durValue} seconds`;
      },
      distancePhrase(km){
        return km >= 1 ? `${km.toFixed(2)} kilometers` : `${Math.round(km * 1000)} meters`;
      },
      currentPaceAnnouncement(paceSec){
        return `Current pace, ${this.pacePhrase(paceSec)}`;
      },
      paceVsTarget(targetSec, diffSec, status){
        const base = `Target ${this.pacePhrase(targetSec)}`;
        if (status === 'on') return `${base}, right on target`;
        if (status === 'slow') return `${base}, ${diffSec} seconds slower than target`;
        return `${base}, ${Math.abs(diffSec)} seconds faster than target`;
      },
      offTargetWarning(direction){
        return direction === 'slow' ? 'Careful, pace too slow' : 'Careful, pace too fast';
      },
      repetitionIntro(repIndex, repTotal){
        return repIndex === repTotal ? 'Last repeat.' : `Repeat ${repIndex} of ${repTotal}.`;
      },
      restStart(amount){
        return `Rest, ${amount}.`;
      },
      runStart(amount, pacePhraseOrNull){
        return `Go, ${amount}${pacePhraseOrNull ? ` at a pace of ${pacePhraseOrNull}` : ''}.`;
      },
      halfwaySegment(){
        return 'We\'re halfway through the segment.';
      },
      halfwayRunAvg(pacePhraseVal){
        return `We're halfway through the segment. Average pace so far, ${pacePhraseVal}.`;
      },
      endingSoonLastSegment(){
        return 'The segment is almost over. This is the last part of the plan.';
      },
      endingSoonNextRest(amount){
        return `The segment is almost over. Then rest, ${amount}.`;
      },
      endingSoonNextRun(amount, pacePhraseOrNull){
        return `The segment is almost over. Then go, ${amount}${pacePhraseOrNull ? ` at a pace of ${pacePhraseOrNull}` : ''}.`;
      },
      segmentAvgPace(pacePhraseVal){
        return `Average pace for the segment, ${pacePhraseVal}.`;
      },
      planCompleted(){
        return 'Plan completed!';
      },
      runSummary(distancePhraseVal, durationPhraseVal, pacePhraseOrNull){
        const paceClause = pacePhraseOrNull ? `, average pace ${pacePhraseOrNull} per kilometer` : '';
        return `Run completed. ${distancePhraseVal} in ${durationPhraseVal}${paceClause}.`;
      }
    }
  },

  // ============================== ESPAÑOL ==============================
  es: {
    locale: 'es-ES',
    speechLang: 'es-ES',

    t: {
      historyAria: 'Actividad',
      settingsAria: 'Ajustes',
      langSwitchAria: 'Cambiar idioma',

      statusSearching: 'Buscando señal…',
      statusWeak: 'Señal débil…',
      statusActive: 'Señal GPS activa',
      statusPermissionDenied: 'Permiso denegado',
      statusUnsupported: 'No compatible',
      statusPaused: 'En pausa',
      statusAutoPaused: 'Pausa automática',

      hintUnsupported: 'Este navegador no ofrece la API de geolocalización.',
      hintPermissionDenied: 'Has bloqueado el acceso a la ubicación. Actívalo para esta página en los ajustes del navegador e inténtalo de nuevo.',
      hintDefault: 'El GPS ya está activo en segundo plano: espera a que la precisión sea buena y pulsa Iniciar.',

      statDistance: 'Distancia',
      statTime: 'Tiempo',
      statAvgPace: 'Ritmo medio',
      paceUnit: 'min/km',
      inTarget: 'En objetivo',

      audioSectionLabel: 'Avisos periódicos',
      everyWord: 'Cada',
      unitMeters: 'metros',
      unitSeconds: 'segundos',

      startBtn: 'Iniciar carrera',
      pauseBtnPause: 'Pausa',
      pauseBtnResume: 'Reanudar',
      endBtn: 'Terminar',

      planToggleBtn: '📋 Plan',
      targetToggleBtn: '🎯 Objetivo',
      addStepBtn: '+ Paso',
      addGroupBtn: '+ Grupo repetido',

      targetDistBtn: 'Distancia',
      targetTimeBtn: 'Tiempo',
      targetRitmoLabel: 'Ritmo',
      targetPaceUnitTag: '/km · tolerancia ±10s',
      placeholderMin: 'min',
      placeholderSec: 'seg',

      stepModeRun: 'Carrera',
      stepModeRest: 'Recuperación',
      moveUpAria: 'Subir',
      moveDownAria: 'Bajar',
      removeAria: 'Eliminar',
      repeatWord: 'Repetir',
      timesWord: 'veces',
      removeGroupAria: 'Eliminar grupo',
      addStepInGroupBtn: '+ Paso en el grupo',

      historyTitle: 'Actividad',
      historyEmpty: 'Todavía no hay carreras guardadas.',
      deleteRunAria: 'Eliminar carrera',

      endConfirmText: '¿Seguro que quieres terminar la carrera? Se guardará en tu actividad.',
      endConfirmBtn: 'Terminar y guardar',
      cancelBtn: 'Cancelar',
      deleteConfirmText: '¿Quieres eliminar esta carrera? Esta acción no se puede deshacer.',
      deleteConfirmBtn: 'Eliminar definitivamente',

      planStatusStepWord: 'Paso',
      targetCompletedStatus: 'Objetivo completado',
      planCompletedStatus: 'Plan completado',

      insufficientDataChart: 'Datos insuficientes para el gráfico',
      chartHint: 'Mantén pulsado y desliza para ver el ritmo punto por punto',
      kmSplitsLabel: 'Ritmo por km',
      planLogLabel: 'Ritmo por segmento del plan',
      kmWord: 'Km'
    },

    s: {
      pacePhrase(sec){
        const m = Math.floor(sec / 60);
        const s = Math.round(sec % 60);
        return s === 0 ? `${m} justos` : `${m} y ${s}`;
      },
      durationPhrase(sec){
        sec = Math.max(0, Math.round(sec));
        const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
        const parts = [];
        if (h > 0) parts.push(`${h} hora${h === 1 ? '' : 's'}`);
        if (h > 0 || m > 0) parts.push(`${m} minuto${m === 1 ? '' : 's'}`);
        if (h === 0) parts.push(`${s} segundo${s === 1 ? '' : 's'}`);
        return parts.join(' y ');
      },
      amountPhrase(durType, durValue){
        return durType === 'distance' ? `${durValue} metros` : `${durValue} segundos`;
      },
      distancePhrase(km){
        return km >= 1 ? `${km.toFixed(2)} kilómetros` : `${Math.round(km * 1000)} metros`;
      },
      currentPaceAnnouncement(paceSec){
        return `Ritmo actual, ${this.pacePhrase(paceSec)}`;
      },
      paceVsTarget(targetSec, diffSec, status){
        const base = `Objetivo ${this.pacePhrase(targetSec)}`;
        if (status === 'on') return `${base}, en línea con el objetivo`;
        if (status === 'slow') return `${base}, ${diffSec} segundos más lento que el objetivo`;
        return `${base}, ${Math.abs(diffSec)} segundos más rápido que el objetivo`;
      },
      offTargetWarning(direction){
        return direction === 'slow' ? 'Atención, ritmo demasiado lento' : 'Atención, ritmo demasiado rápido';
      },
      repetitionIntro(repIndex, repTotal){
        return repIndex === repTotal ? 'Última repetición.' : `Repetición ${repIndex} de ${repTotal}.`;
      },
      restStart(amount){
        return `Recuperación, ${amount}.`;
      },
      runStart(amount, pacePhraseOrNull){
        return `Adelante, ${amount}${pacePhraseOrNull ? ` a ritmo ${pacePhraseOrNull}` : ''}.`;
      },
      halfwaySegment(){
        return 'Vamos por la mitad del segmento.';
      },
      halfwayRunAvg(pacePhraseVal){
        return `Vamos por la mitad del segmento. Ritmo medio de la carrera, ${pacePhraseVal}.`;
      },
      endingSoonLastSegment(){
        return 'Estamos casi al final del segmento. Es el último tramo del plan.';
      },
      endingSoonNextRest(amount){
        return `Estamos casi al final del segmento. Luego recuperación, ${amount}.`;
      },
      endingSoonNextRun(amount, pacePhraseOrNull){
        return `Estamos casi al final del segmento. Luego adelante, ${amount}${pacePhraseOrNull ? ` a ritmo ${pacePhraseOrNull}` : ''}.`;
      },
      segmentAvgPace(pacePhraseVal){
        return `Ritmo medio del segmento, ${pacePhraseVal}.`;
      },
      planCompleted(){
        return '¡Plan completado!';
      },
      runSummary(distancePhraseVal, durationPhraseVal, pacePhraseOrNull){
        const paceClause = pacePhraseOrNull ? `, ritmo medio ${pacePhraseOrNull} por kilómetro` : '';
        return `Carrera completada. ${distancePhraseVal} en ${durationPhraseVal}${paceClause}.`;
      }
    }
  }
};
