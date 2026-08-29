// ===================================================================
// TRANSLATIONS — UI strings (t) and spoken-audio phrase builders (s),
// one block per language. app.js only ever calls T.xxx / S.xxx(...);
// it never contains language-specific wording itself.
//
// To add a language: copy one whole block (e.g. "en: { ... }"),
// translate every value, keep every key name identical, and add the
// new key to SUPPORTED_LANGS below.
// ===================================================================
const SUPPORTED_LANGS = ['it', 'en', 'es', 'de', 'nl'];
const DEFAULT_LANG = 'it';

const I18N = {

  // ============================== ITALIANO ==============================
  it: {
    locale: 'it-IT',
    speechLang: 'it-IT',
    nativeName: 'Italiano',

    t: {
      historyAria: 'Attività',
      settingsAria: 'Impostazioni',
      langSwitchAria: 'Cambia lingua',
      chooseLanguageTitle: 'Scegli la lingua',

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

      audioSectionLabel: '🔊 Aggiornamenti periodici',
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
    nativeName: 'English',

    t: {
      historyAria: 'Activity',
      settingsAria: 'Settings',
      langSwitchAria: 'Change language',
      chooseLanguageTitle: 'Choose language',

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

      audioSectionLabel: '🔊 Periodic updates',
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
    nativeName: 'Español',

    t: {
      historyAria: 'Actividad',
      settingsAria: 'Ajustes',
      langSwitchAria: 'Cambiar idioma',
      chooseLanguageTitle: 'Elegir idioma',

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

      audioSectionLabel: '🔊 Avisos periódicos',
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
  },

  // ============================== DEUTSCH ==============================
  de: {
    locale: 'de-DE',
    speechLang: 'de-DE',
    nativeName: 'Deutsch',

    t: {
      historyAria: 'Aktivität',
      settingsAria: 'Einstellungen',
      langSwitchAria: 'Sprache ändern',
      chooseLanguageTitle: 'Sprache wählen',

      statusSearching: 'Suche nach Signal…',
      statusWeak: 'Schwaches Signal…',
      statusActive: 'GPS-Signal aktiv',
      statusPermissionDenied: 'Zugriff verweigert',
      statusUnsupported: 'Nicht unterstützt',
      statusPaused: 'Pausiert',
      statusAutoPaused: 'Automatisch pausiert',

      hintUnsupported: 'Dieser Browser bietet keine Geolokalisierungs-API.',
      hintPermissionDenied: 'Du hast den Standortzugriff blockiert. Aktiviere den Standort für diese Seite in den Browser-Einstellungen und versuche es erneut.',
      hintDefault: 'Das GPS ist bereits im Hintergrund aktiv: warte auf eine gute Genauigkeit und tippe dann auf Start.',

      statDistance: 'Distanz',
      statTime: 'Zeit',
      statAvgPace: 'Ø Tempo',
      paceUnit: 'min/km',
      inTarget: 'Im Ziel',

      audioSectionLabel: '🔊 Regelmäßige Ansagen',
      everyWord: 'Alle',
      unitMeters: 'Meter',
      unitSeconds: 'Sekunden',

      startBtn: 'Lauf starten',
      pauseBtnPause: 'Pause',
      pauseBtnResume: 'Fortsetzen',
      endBtn: 'Beenden',

      planToggleBtn: '📋 Plan',
      targetToggleBtn: '🎯 Ziel',
      addStepBtn: '+ Schritt',
      addGroupBtn: '+ Wiederholung',

      targetDistBtn: 'Distanz',
      targetTimeBtn: 'Zeit',
      targetRitmoLabel: 'Tempo',
      targetPaceUnitTag: '/km · Toleranz ±10s',
      placeholderMin: 'min',
      placeholderSec: 'sek',

      stepModeRun: 'Lauf',
      stepModeRest: 'Erholung',
      moveUpAria: 'Nach oben',
      moveDownAria: 'Nach unten',
      removeAria: 'Entfernen',
      repeatWord: 'Wiederholen',
      timesWord: 'mal',
      removeGroupAria: 'Gruppe entfernen',
      addStepInGroupBtn: '+ Schritt in der Gruppe',

      historyTitle: 'Aktivität',
      historyEmpty: 'Noch keine Läufe gespeichert.',
      deleteRunAria: 'Lauf löschen',

      endConfirmText: 'Möchtest du den Lauf wirklich beenden? Er wird in deiner Aktivität gespeichert.',
      endConfirmBtn: 'Beenden & speichern',
      cancelBtn: 'Abbrechen',
      deleteConfirmText: 'Möchtest du diesen Lauf löschen? Das kann nicht rückgängig gemacht werden.',
      deleteConfirmBtn: 'Endgültig löschen',

      planStatusStepWord: 'Schritt',
      targetCompletedStatus: 'Ziel erreicht',
      planCompletedStatus: 'Plan abgeschlossen',

      insufficientDataChart: 'Nicht genügend Daten für ein Diagramm',
      chartHint: 'Gedrückt halten und ziehen, um das Tempo an jedem Punkt zu sehen',
      kmSplitsLabel: 'Tempo pro km',
      planLogLabel: 'Tempo pro Plan-Abschnitt',
      kmWord: 'Km'
    },

    s: {
      pacePhrase(sec){
        const m = Math.floor(sec / 60);
        const s = Math.round(sec % 60);
        return s === 0 ? `${m} glatt` : `${m} ${s}`;
      },
      durationPhrase(sec){
        sec = Math.max(0, Math.round(sec));
        const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
        const parts = [];
        if (h > 0) parts.push(`${h} ${h === 1 ? 'Stunde' : 'Stunden'}`);
        if (h > 0 || m > 0) parts.push(`${m} ${m === 1 ? 'Minute' : 'Minuten'}`);
        if (h === 0) parts.push(`${s} ${s === 1 ? 'Sekunde' : 'Sekunden'}`);
        return parts.join(' und ');
      },
      amountPhrase(durType, durValue){
        return durType === 'distance' ? `${durValue} Meter` : `${durValue} Sekunden`;
      },
      distancePhrase(km){
        return km >= 1 ? `${km.toFixed(2)} Kilometer` : `${Math.round(km * 1000)} Meter`;
      },
      currentPaceAnnouncement(paceSec){
        return `Aktuelles Tempo, ${this.pacePhrase(paceSec)}`;
      },
      paceVsTarget(targetSec, diffSec, status){
        const base = `Ziel ${this.pacePhrase(targetSec)}`;
        if (status === 'on') return `${base}, genau im Ziel`;
        if (status === 'slow') return `${base}, ${diffSec} Sekunden langsamer als das Ziel`;
        return `${base}, ${Math.abs(diffSec)} Sekunden schneller als das Ziel`;
      },
      offTargetWarning(direction){
        return direction === 'slow' ? 'Achtung, Tempo zu langsam' : 'Achtung, Tempo zu schnell';
      },
      repetitionIntro(repIndex, repTotal){
        return repIndex === repTotal ? 'Letzte Wiederholung.' : `Wiederholung ${repIndex} von ${repTotal}.`;
      },
      restStart(amount){
        return `Erholung, ${amount}.`;
      },
      runStart(amount, pacePhraseOrNull){
        return `Los, ${amount}${pacePhraseOrNull ? ` im Tempo ${pacePhraseOrNull}` : ''}.`;
      },
      halfwaySegment(){
        return 'Wir sind auf halber Strecke des Abschnitts.';
      },
      halfwayRunAvg(pacePhraseVal){
        return `Wir sind auf halber Strecke des Abschnitts. Durchschnittstempo bisher, ${pacePhraseVal}.`;
      },
      endingSoonLastSegment(){
        return 'Der Abschnitt ist fast vorbei. Das ist der letzte Teil des Plans.';
      },
      endingSoonNextRest(amount){
        return `Der Abschnitt ist fast vorbei. Danach Erholung, ${amount}.`;
      },
      endingSoonNextRun(amount, pacePhraseOrNull){
        return `Der Abschnitt ist fast vorbei. Danach los, ${amount}${pacePhraseOrNull ? ` im Tempo ${pacePhraseOrNull}` : ''}.`;
      },
      segmentAvgPace(pacePhraseVal){
        return `Durchschnittstempo für den Abschnitt, ${pacePhraseVal}.`;
      },
      planCompleted(){
        return 'Plan abgeschlossen!';
      },
      runSummary(distancePhraseVal, durationPhraseVal, pacePhraseOrNull){
        const paceClause = pacePhraseOrNull ? `, Durchschnittstempo ${pacePhraseOrNull} pro Kilometer` : '';
        return `Lauf abgeschlossen. ${distancePhraseVal} in ${durationPhraseVal}${paceClause}.`;
      }
    }
  },

  // ============================== NEDERLANDS ==============================
  nl: {
    locale: 'nl-NL',
    speechLang: 'nl-NL',
    nativeName: 'Nederlands',

    t: {
      historyAria: 'Activiteit',
      settingsAria: 'Instellingen',
      langSwitchAria: 'Taal wijzigen',
      chooseLanguageTitle: 'Kies een taal',

      statusSearching: 'Signaal zoeken…',
      statusWeak: 'Zwak signaal…',
      statusActive: 'GPS-signaal actief',
      statusPermissionDenied: 'Toegang geweigerd',
      statusUnsupported: 'Niet ondersteund',
      statusPaused: 'Gepauzeerd',
      statusAutoPaused: 'Automatisch gepauzeerd',

      hintUnsupported: 'Deze browser biedt geen geolocatie-API.',
      hintPermissionDenied: 'Je hebt locatietoegang geblokkeerd. Schakel de locatie voor deze pagina in via je browserinstellingen en probeer het opnieuw.',
      hintDefault: 'GPS is al actief op de achtergrond: wacht tot de nauwkeurigheid goed is en tik dan op Start.',

      statDistance: 'Afstand',
      statTime: 'Tijd',
      statAvgPace: 'Gem. tempo',
      paceUnit: 'min/km',
      inTarget: 'Op doel',

      audioSectionLabel: '🔊 Periodieke meldingen',
      everyWord: 'Elke',
      unitMeters: 'meter',
      unitSeconds: 'seconden',

      startBtn: 'Start hardlopen',
      pauseBtnPause: 'Pauze',
      pauseBtnResume: 'Hervatten',
      endBtn: 'Beëindigen',

      planToggleBtn: '📋 Plan',
      targetToggleBtn: '🎯 Doel',
      addStepBtn: '+ Stap',
      addGroupBtn: '+ Herhaalgroep',

      targetDistBtn: 'Afstand',
      targetTimeBtn: 'Tijd',
      targetRitmoLabel: 'Tempo',
      targetPaceUnitTag: '/km · tolerantie ±10s',
      placeholderMin: 'min',
      placeholderSec: 'sec',

      stepModeRun: 'Lopen',
      stepModeRest: 'Rust',
      moveUpAria: 'Omhoog',
      moveDownAria: 'Omlaag',
      removeAria: 'Verwijderen',
      repeatWord: 'Herhaal',
      timesWord: 'keer',
      removeGroupAria: 'Groep verwijderen',
      addStepInGroupBtn: '+ Stap in groep',

      historyTitle: 'Activiteit',
      historyEmpty: 'Nog geen lopen opgeslagen.',
      deleteRunAria: 'Loop verwijderen',

      endConfirmText: 'Wil je de loop echt beëindigen? Deze wordt opgeslagen in je activiteit.',
      endConfirmBtn: 'Beëindigen en opslaan',
      cancelBtn: 'Annuleren',
      deleteConfirmText: 'Wil je deze loop verwijderen? Dit kan niet ongedaan worden gemaakt.',
      deleteConfirmBtn: 'Definitief verwijderen',

      planStatusStepWord: 'Stap',
      targetCompletedStatus: 'Doel behaald',
      planCompletedStatus: 'Plan voltooid',

      insufficientDataChart: 'Onvoldoende gegevens voor een grafiek',
      chartHint: 'Houd ingedrukt en sleep om het tempo op elk punt te zien',
      kmSplitsLabel: 'Tempo per km',
      planLogLabel: 'Tempo per planonderdeel',
      kmWord: 'Km'
    },

    s: {
      pacePhrase(sec){
        const m = Math.floor(sec / 60);
        const s = Math.round(sec % 60);
        return s === 0 ? `${m} precies` : `${m} en ${s}`;
      },
      durationPhrase(sec){
        sec = Math.max(0, Math.round(sec));
        const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
        const parts = [];
        if (h > 0) parts.push(`${h} uur`);
        if (h > 0 || m > 0) parts.push(`${m} ${m === 1 ? 'minuut' : 'minuten'}`);
        if (h === 0) parts.push(`${s} ${s === 1 ? 'seconde' : 'seconden'}`);
        return parts.join(' en ');
      },
      amountPhrase(durType, durValue){
        return durType === 'distance' ? `${durValue} meter` : `${durValue} seconden`;
      },
      distancePhrase(km){
        return km >= 1 ? `${km.toFixed(2)} kilometer` : `${Math.round(km * 1000)} meter`;
      },
      currentPaceAnnouncement(paceSec){
        return `Huidig tempo, ${this.pacePhrase(paceSec)}`;
      },
      paceVsTarget(targetSec, diffSec, status){
        const base = `Doel ${this.pacePhrase(targetSec)}`;
        if (status === 'on') return `${base}, precies op doel`;
        if (status === 'slow') return `${base}, ${diffSec} seconden langzamer dan het doel`;
        return `${base}, ${Math.abs(diffSec)} seconden sneller dan het doel`;
      },
      offTargetWarning(direction){
        return direction === 'slow' ? 'Let op, tempo te langzaam' : 'Let op, tempo te snel';
      },
      repetitionIntro(repIndex, repTotal){
        return repIndex === repTotal ? 'Laatste herhaling.' : `Herhaling ${repIndex} van ${repTotal}.`;
      },
      restStart(amount){
        return `Rust, ${amount}.`;
      },
      runStart(amount, pacePhraseOrNull){
        return `Ga, ${amount}${pacePhraseOrNull ? ` in een tempo van ${pacePhraseOrNull}` : ''}.`;
      },
      halfwaySegment(){
        return 'We zijn halverwege het onderdeel.';
      },
      halfwayRunAvg(pacePhraseVal){
        return `We zijn halverwege het onderdeel. Gemiddeld tempo tot nu toe, ${pacePhraseVal}.`;
      },
      endingSoonLastSegment(){
        return 'Het onderdeel is bijna voorbij. Dit is het laatste stuk van het plan.';
      },
      endingSoonNextRest(amount){
        return `Het onderdeel is bijna voorbij. Daarna rust, ${amount}.`;
      },
      endingSoonNextRun(amount, pacePhraseOrNull){
        return `Het onderdeel is bijna voorbij. Daarna gaan, ${amount}${pacePhraseOrNull ? ` in een tempo van ${pacePhraseOrNull}` : ''}.`;
      },
      segmentAvgPace(pacePhraseVal){
        return `Gemiddeld tempo voor dit onderdeel, ${pacePhraseVal}.`;
      },
      planCompleted(){
        return 'Plan voltooid!';
      },
      runSummary(distancePhraseVal, durationPhraseVal, pacePhraseOrNull){
        const paceClause = pacePhraseOrNull ? `, gemiddeld tempo ${pacePhraseOrNull} per kilometer` : '';
        return `Loop voltooid. ${distancePhraseVal} in ${durationPhraseVal}${paceClause}.`;
      }
    }
  }
};
