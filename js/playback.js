var appElapsedSeconds = 0;
var lastFrameTimestamp = null;
var exactPositionTracker = 0;

// Smooth accumulative fractional scroll engine + Aligned App Position Cursor
function toggleScroll() {
  var btn = document.getElementById('play-btn');
  var viewport = document.getElementById('viewport');
  var syncBeatEl = document.getElementById('beat-auto-scroll-sync');
  var shouldSyncBeat = syncBeatEl ? syncBeatEl.checked : false;

  if (isScrolling) {
    clearInterval(scrollInterval);
    btn.innerText = "▶ Play";
    btn.className = "btn play";
    isScrolling = false;
    lastFrameTimestamp = null;
    if (shouldSyncBeat && typeof isBeatRunning !== 'undefined' && isBeatRunning) {
      toggleBeatEngine();
    }
  } else {
    if (viewport.scrollTop < 10) {
      appElapsedSeconds = 0;
      alignCursorToFirstLine();
      if (document.getElementById('auto-speed-toggle') && document.getElementById('auto-speed-toggle').checked) {
        var stats = analyzeSongBeatsAndLines(loadedSongsMap[activeSongName]);
        document.getElementById('scroll-speed').value = calculateAutoScrollSpeed(stats);
      }
    }

    var speedInput = document.getElementById('scroll-speed');
    exactPositionTracker = viewport.scrollTop;
    lastFrameTimestamp = performance.now();

    bindLineClickHandlers();
    updateAppCursorPosition();

    scrollInterval = setInterval(function() {
      var now = performance.now();
      var deltaSec = (now - lastFrameTimestamp) / 1000;
      lastFrameTimestamp = now;
      appElapsedSeconds += deltaSec;

      var speed = parseFloat(speedInput.value) || 1;
      exactPositionTracker += speed;
      var wholePixelsToMove = Math.floor(exactPositionTracker) - viewport.scrollTop;

      if (wholePixelsToMove >= 1) {
        viewport.scrollBy(0, wholePixelsToMove);
      }

      updateAppCursorPosition();
    }, 16.67);

    btn.innerText = "❚❚ Pause";
    btn.className = "btn stop";
    isScrolling = true;
    if (shouldSyncBeat && typeof isBeatRunning !== 'undefined' && !isBeatRunning) {
      toggleBeatEngine();
    }
  }
}

// Snap the fixed Read Line to the vertical center of Line 1 at the start of a song
function alignCursorToFirstLine() {
  var viewport = document.getElementById('viewport');
  var cursorLine = document.getElementById('reading-cursor-line');
  var firstLine = document.querySelector('#prompter-stage .line-container');
  if (!viewport || !cursorLine || !firstLine) return;

  var vpRect = viewport.getBoundingClientRect();
  var lineRect = firstLine.getBoundingClientRect();
  var lineCenterOffset = (lineRect.top + lineRect.height / 2) - vpRect.top;
  var pct = Math.max(15, Math.min(65, Math.round((lineCenterOffset / vpRect.height) * 100)));

  cursorLine.style.top = pct + "%";

  var posEl = document.getElementById('opt-cursor-pos');
  var labelEl = document.getElementById('cursor-pos-label');
  if (posEl) posEl.value = pct;
  if (labelEl) labelEl.innerText = pct + "%";
}

// Calculate exact auto-scroll speed from Line 1 center to Last Line center
function calculateAutoScrollSpeed(stats) {
  var bpm = parseFloat(document.getElementById('metro-bpm').value) || 90;
  if (stats.beats <= 0 || bpm <= 0) return 0.2;

  var totalSeconds = (stats.beats / bpm) * 60;
  var lineEls = document.querySelectorAll('#prompter-stage .line-container');

  var scrollablePixels = 0;
  if (lineEls.length >= 2) {
    var firstRect = lineEls[0].getBoundingClientRect();
    var lastRect = lineEls[lineEls.length - 1].getBoundingClientRect();
    scrollablePixels = Math.max(0, (lastRect.top + lastRect.height / 2) - (firstRect.top + firstRect.height / 2));
  } else {
    var stage = document.getElementById('prompter-stage');
    var viewport = document.getElementById('viewport');
    var stageHeight = stage ? stage.scrollHeight : 0;
    var visibleBuffer = viewport ? (viewport.clientHeight * 0.45) : 0;
    scrollablePixels = Math.max(stageHeight - visibleBuffer, stageHeight * 0.5);
  }

  var pixelsPerFrame = scrollablePixels / (totalSeconds * 60);
  return Math.max(0.05, Math.round(pixelsPerFrame * 1000) / 1000);
}

// Build cumulative beat weights for each rendered .line-container so long/short lines advance accurately
function getLineBeatMilestones(lineEls, totalBeats) {
  var milestones = [];
  var rawWeights = [];
  var weightSum = 0;

  lineEls.forEach(function(el) {
    // Count chords on this rendered line as a weight proxy (minimum 1 unit so lyric-only lines still advance)
    var chordSpans = el.querySelectorAll('.chord, .chord-item, .chord-row');
    var textChords = (el.querySelector('.chord-row') ? el.querySelector('.chord-row').innerText.trim().split(/\s+/).filter(Boolean).length : 0);
    var weight = Math.max(1, textChords || chordSpans.length || 1);
    rawWeights.push(weight);
    weightSum += weight;
  });

  var running = 0;
  for (var i = 0; i < rawWeights.length; i++) {
    running += (rawWeights[i] / weightSum) * totalBeats;
    milestones.push(running);
  }
  return milestones;
}

function updateAppCursorPosition() {
  var showCursorEl = document.getElementById('opt-show-cursor');
  if (showCursorEl && !showCursorEl.checked) return;

  var lineEls = document.querySelectorAll('#prompter-stage .line-container');
  if (!lineEls.length) return;

  var targetIndex = 0;
  var isAuto = document.getElementById('auto-speed-toggle') && document.getElementById('auto-speed-toggle').checked;

  if (isAuto && activeSongName && loadedSongsMap[activeSongName]) {
    var stats = analyzeSongBeatsAndLines(loadedSongsMap[activeSongName]);
    var bpm = parseFloat(document.getElementById('metro-bpm').value) || 90;
    var elapsedBeats = (appElapsedSeconds / 60) * bpm;

    if (stats.beats > 0) {
      var milestones = getLineBeatMilestones(lineEls, stats.beats);
      targetIndex = lineEls.length - 1;
      for (var i = 0; i < milestones.length; i++) {
        if (elapsedBeats < milestones[i]) {
          targetIndex = i;
          break;
        }
      }
    }
  } else {
    var viewport = document.getElementById('viewport');
    var cursorLine = document.getElementById('reading-cursor-line');
    var readY = cursorLine
      ? cursorLine.getBoundingClientRect().top
      : viewport.getBoundingClientRect().top + (viewport.clientHeight * 0.32);

    var closestDist = Infinity;
    lineEls.forEach(function(el, idx) {
      var rect = el.getBoundingClientRect();
      var center = rect.top + rect.height / 2;
      var dist = Math.abs(center - readY);
      if (dist < closestDist) {
        closestDist = dist;
        targetIndex = idx;
      }
    });
  }

  lineEls.forEach(function(el, idx) {
    if (idx === targetIndex) {
      el.classList.add('app-active-line');
    } else {
      el.classList.remove('app-active-line');
    }
  });
}

function bindLineClickHandlers() {
  var lineEls = document.querySelectorAll('#prompter-stage .line-container');
  lineEls.forEach(function(el, idx) {
    if (el.dataset.cursorBound) return;
    el.dataset.cursorBound = "true";
    el.addEventListener('click', function() {
      jumpCursorToLine(idx);
    });
  });
}

function jumpCursorToLine(lineIdx) {
  var lineEls = document.querySelectorAll('#prompter-stage .line-container');
  if (!lineEls[lineIdx]) return;

  if (activeSongName && loadedSongsMap[activeSongName]) {
    var stats = analyzeSongBeatsAndLines(loadedSongsMap[activeSongName]);
    var bpm = parseFloat(document.getElementById('metro-bpm').value) || 90;
    var milestones = getLineBeatMilestones(lineEls, stats.beats);
    var startBeat = lineIdx === 0 ? 0 : milestones[lineIdx - 1];
    appElapsedSeconds = (startBeat / bpm) * 60;
  }

  var viewport = document.getElementById('viewport');
  var cursorLine = document.getElementById('reading-cursor-line');
  var readY = cursorLine
    ? cursorLine.getBoundingClientRect().top
    : viewport.getBoundingClientRect().top + (viewport.clientHeight * 0.32);
  var lineRect = lineEls[lineIdx].getBoundingClientRect();
  var lineCenter = lineRect.top + (lineRect.height / 2);

  // Jump immediately and update exactPositionTracker so continuous scrolling never stalls
  viewport.scrollTop += (lineCenter - readY);
  exactPositionTracker = viewport.scrollTop;
  lastFrameTimestamp = performance.now();

  updateAppCursorPosition();
}

function syncCursorToViewport() {
  var viewport = document.getElementById('viewport');
  var cursorLine = document.getElementById('reading-cursor-line');
  var lineEls = document.querySelectorAll('#prompter-stage .line-container');
  if (!lineEls.length) return;

  var readY = cursorLine
    ? cursorLine.getBoundingClientRect().top
    : viewport.getBoundingClientRect().top + (viewport.clientHeight * 0.32);

  var closestIdx = 0;
  var closestDist = Infinity;
  lineEls.forEach(function(el, idx) {
    var rect = el.getBoundingClientRect();
    var dist = Math.abs((rect.top + rect.height / 2) - readY);
    if (dist < closestDist) {
      closestDist = dist;
      closestIdx = idx;
    }
  });

  if (activeSongName && loadedSongsMap[activeSongName]) {
    var stats = analyzeSongBeatsAndLines(loadedSongsMap[activeSongName]);
    var bpm = parseFloat(document.getElementById('metro-bpm').value) || 90;
    var milestones = getLineBeatMilestones(lineEls, stats.beats);
    var startBeat = closestIdx === 0 ? 0 : milestones[closestIdx - 1];
    appElapsedSeconds = (startBeat / bpm) * 60;
  }

  updateAppCursorPosition();
}

function updateReadingCursorSettings() {
  var showEl = document.getElementById('opt-show-cursor');
  var posEl = document.getElementById('opt-cursor-pos');
  var labelEl = document.getElementById('cursor-pos-label');
  var cursorLine = document.getElementById('reading-cursor-line');

  var isVisible = showEl ? showEl.checked : true;
  var pct = posEl ? posEl.value : 32;

  if (labelEl) labelEl.innerText = pct + "%";
  if (cursorLine) {
    cursorLine.style.display = isVisible ? "block" : "none";
    cursorLine.style.top = pct + "%";
  }

  if (!isVisible) {
    document.querySelectorAll('.app-active-line').forEach(function(el) {
      el.classList.remove('app-active-line');
    });
  } else {
    updateAppCursorPosition();
  }
}


function analyzeSongBeatsAndLines(rawText) {
  var lines = rawText.split(/\r?\n/).map(function(ln) { return ln.trim(); });

  var chordIdx = 1;
  var beatIdx = 2;
  var numIdx = 0;
  var denIdx = 1;

  // 1. Detect {Beat: num/den} time signature (defaults to 4 beats per measure)
  var beatsPerMeasure = 4;
  for (var b = 0; b < lines.length; b++) {
    if (lines[b].toLowerCase().startsWith("{beat:")) {
      var beatVal = lines[b].replace(/\{beat:\s*/i, "").replace(/\}/, "").trim();
      var slashParts = beatVal.split("/");
      var topNum = parseFloat(slashParts[numIdx]);
      if (!isNaN(topNum) && topNum > 0) {
        beatsPerMeasure = topNum;
      }
      break;
    }
  }

  // 2. Handle {Merge} lines based on the Display Settings checkbox
  var mergeLinesEl = document.getElementById('opt-merge-lines');
  var shouldMergeLines = mergeLinesEl ? mergeLinesEl.checked : true;
  var mergedLines = [];

  for (var i = 0; i < lines.length; i++) {
    var cur = lines[i];
    if (cur.toLowerCase().startsWith("{merge}")) {
      var textAfterTag = cur.substring(7).trim();
      if (shouldMergeLines && mergedLines.length > 0) {
        mergedLines[mergedLines.length - 1] += " " + textAfterTag;
      } else {
        mergedLines.push(textAfterTag);
      }
      continue;
    }
    mergedLines.push(cur);
  }

  var totalChordBeats = 0;
  var totalContentLines = 0;
  var lastLineBeats = 0;

  mergedLines.forEach(function(ln) {
    if (!ln) return;

    // Check for standalone {Repeat: n} directive on its own line
    var standaloneRepeatMatch = ln.match(/^\{repeat\s*:\s*(\d+)\s*\}$/i);
    if (standaloneRepeatMatch) {
      var repCount = parseInt(standaloneRepeatMatch[chordIdx], 10) || 1;
      if (repCount > 1 && lastLineBeats > 0) {
        totalChordBeats += lastLineBeats * (repCount - 1);
        totalContentLines += (repCount - 1);
      }
      return;
    }

    // Skip all other directive lines
    if (ln.startsWith("{") && ln.endsWith("}")) return;

    // Check for inline {Repeat: n} or legacy [x2] anywhere on a lyric/chord line
    var lineMultiplier = 1;
    var inlineRepeatMatch = ln.match(/\{repeat\s*:\s*(\d+)\s*\}/i) || ln.match(/\[x(\d+)\]/i);
    if (inlineRepeatMatch) {
      lineMultiplier = parseInt(inlineRepeatMatch[chordIdx], 10) || 1;
    }

    // Scan every [Chord] and optional {n} or {1/2}
    var reg = /\[([^\]]+)\](?:\s*\{([^}:]*)\})?/g;
    var m;
    var lineMeasureUnits = 0;

    while ((m = reg.exec(ln)) !== null) {
      var chordLabel = m[chordIdx].trim();
      if (/^x\d+$/i.test(chordLabel)) continue;

      var beatStr = (m[beatIdx] || "").trim();
      var measureFactor = 1;

      if (beatStr.indexOf("/") !== -1) {
        var parts = beatStr.split("/");
        var num = parseFloat(parts[numIdx]);
        var den = parseFloat(parts[denIdx]);
        if (!isNaN(num) && !isNaN(den) && den !== 0) {
          measureFactor = num / den;
        }
      } else if (beatStr !== "") {
        var parsed = parseFloat(beatStr);
        if (!isNaN(parsed)) {
          measureFactor = parsed;
        }
      }

      lineMeasureUnits += measureFactor;
    }

    var singlePassBeats = lineMeasureUnits * beatsPerMeasure;
    totalChordBeats += singlePassBeats * lineMultiplier;
    totalContentLines += lineMultiplier;
    lastLineBeats = singlePassBeats;
  });

  var beatsPerLine = totalContentLines > 0
    ? (totalChordBeats / totalContentLines).toFixed(2)
    : "0.00";

  return {
    beats: totalChordBeats,
    lines: totalContentLines,
    beatsPerLine: beatsPerLine,
    beatsPerMeasure: beatsPerMeasure
  };
}

function getManualSongScrollSpeed(rawText) {
  var foundScrollSpeed = 0.2;
  var firstMatchIdx = 0;
  var lines = rawText.split(/\r?\n/).map(function(ln) { return ln.trim(); });

  lines.forEach(function(ln) {
    if (ln.toLowerCase().startsWith("{scrollspeed:")) {
      var rawSpeedVal = ln.replace(/\{scrollspeed:\s*/i, "").replace(/\}/, "").trim();
      var floatMatch = rawSpeedVal.match(/[\d.]+/);
      if (floatMatch) {
        var extractedSpeed = parseFloat(floatMatch[firstMatchIdx]);
        if (!isNaN(extractedSpeed)) foundScrollSpeed = extractedSpeed;
      }
    }
  });

  return foundScrollSpeed;
}

function calculateAutoScrollSpeed(stats) {
  var bpm = parseFloat(document.getElementById('metro-bpm').value) || 90;
  if (stats.beats <= 0 || bpm <= 0) return 0.2;

  var totalSeconds = (stats.beats / bpm) * 60;
  var stage = document.getElementById('prompter-stage');
  var viewport = document.getElementById('viewport');
  var stageHeight = stage ? stage.scrollHeight : 0;
  var visibleBuffer = viewport ? (viewport.clientHeight * 0.45) : 0;
  var scrollablePixels = Math.max(stageHeight - visibleBuffer, stageHeight * 0.5);

  var pixelsPerFrame = scrollablePixels / (totalSeconds * 60);
  return Math.max(0.05, Math.round(pixelsPerFrame * 100) / 100);
}

function toggleAutoSpeedState() {
  var isChecked = document.getElementById('auto-speed-toggle').checked;
  var existingBanner = document.getElementById('auto-scroll-stats');
  if (existingBanner) existingBanner.remove();

  var speedInput = document.getElementById('scroll-speed');

  if (!isChecked) {
    if (activeSongName && loadedSongsMap[activeSongName]) {
      speedInput.value = getManualSongScrollSpeed(loadedSongsMap[activeSongName]);
    } else {
      speedInput.value = 0.2;
    }
    return;
  }

  if (!activeSongName || !loadedSongsMap[activeSongName]) {
    alert("Select a song first to calculate Auto Scroll stats.");
    document.getElementById('auto-speed-toggle').checked = false;
    return;
  }

  var stats = analyzeSongBeatsAndLines(loadedSongsMap[activeSongName]);
  var banner = document.createElement('div');
  banner.id = 'auto-scroll-stats';
  banner.style.textAlign = 'center';
  banner.style.fontSize = '13px';
  banner.style.color = '#ffb74d';
  banner.style.background = 'rgba(255, 183, 77, 0.1)';
  banner.style.border = '1px solid rgba(255, 183, 77, 0.3)';
  banner.style.borderRadius = '4px';
  banner.style.padding = '6px 12px';
  banner.style.margin = '0 auto 14px auto';
  banner.style.maxWidth = '640px';
  banner.innerText =
    "⚡ Auto Calc (" + stats.beatsPerMeasure + "/4) — " +
    "Total Beats: " + stats.beats +
    " | Total Lines: " + stats.lines +
    " | Beats / Line: " + stats.beatsPerLine;

  var stage = document.getElementById('prompter-stage');
  var titleEl = stage.querySelector('.song-title');
  if (titleEl && titleEl.nextSibling) {
    stage.insertBefore(banner, titleEl.nextSibling);
  } else {
    stage.insertBefore(banner, stage.firstChild);
  }

  speedInput.value = calculateAutoScrollSpeed(stats);
}

// Metronome audio & visual engine
function toggleMetronome() {
  var btn = document.getElementById('metro-btn');
  if (isMetroRunning) {
    clearInterval(metroInterval);
    isMetroRunning = false;
    btn.innerText = "⏱️ Start";
    btn.style.background = "#222";
    document.getElementById('metro-visual').style.background = "#333";
  } else {
    isMetroRunning = true;
    btn.innerText = "⏱️ Stop";
    btn.style.background = "#cc1111";
    metroBeatCounter = 0;
    runMetronomeTickerLoop();
  }
}

function updateMetronomeTempo() {
  if (isMetroRunning) {
    clearInterval(metroInterval);
    runMetronomeTickerLoop();
  }
}

function adjustBPM(amount) {
  var bpmInput = document.getElementById('metro-bpm');
  var currentBPM = parseInt(bpmInput.value) || 120;
  var newBPM = Math.min(300, Math.max(30, currentBPM + amount));
  bpmInput.value = newBPM;
  updateMetronomeTempo();
}

function runMetronomeTickerLoop() {
  var bpm = parseInt(document.getElementById('metro-bpm').value) || 120;
  var intervalMs = (60 / bpm) * 1000;

  executeSingleMetronomeBeat();

  metroInterval = setInterval(function() {
    executeSingleMetronomeBeat();
  }, intervalMs);
}

function executeSingleMetronomeBeat() {
  var visualBox = document.getElementById('metro-visual');
  var soundEnabled = document.getElementById('metro-audio-toggle').checked;

  metroBeatCounter++;
  if (metroBeatCounter > 4) metroBeatCounter = 1;

  if (metroBeatCounter === 1) {
    visualBox.style.background = "#ff3333";
  } else {
    visualBox.style.background = "#ffb74d";
  }

  setTimeout(function() {
    if (isMetroRunning) visualBox.style.background = "#222";
  }, 100);

  if (soundEnabled) {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();

      var osc = audioCtx.createOscillator();
      var gain = audioCtx.createGain();

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (metroBeatCounter === 1) {
        osc.frequency.setValueAtTime(1000, audioCtx.currentTime);
      } else {
        osc.frequency.setValueAtTime(600, audioCtx.currentTime);
      }

      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.06);
    } catch (e) {
      console.log("Audio Engine context delayed or blocked: " + e);
    }
  }
}
