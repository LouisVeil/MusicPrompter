// Smooth accumulative fractional scroll engine
function toggleScroll() {
  var btn = document.getElementById('play-btn');
  var viewport = document.getElementById('viewport');

  if (isScrolling) {
    clearInterval(scrollInterval);
    btn.innerText = "▶ Play";
    btn.className = "btn play";
    isScrolling = false;
  } else {
    var speedInput = document.getElementById('scroll-speed');
    var speed = parseFloat(speedInput.value) || 1;
    var exactPositionTracker = viewport.scrollTop;

    scrollInterval = setInterval(function() {
      exactPositionTracker += speed;
      var wholePixelsToMove = Math.floor(exactPositionTracker) - viewport.scrollTop;

      if (wholePixelsToMove >= 1) {
        viewport.scrollBy(0, wholePixelsToMove);
      }
    }, 16.67);

    btn.innerText = "❚❚ Pause";
    btn.className = "btn stop";
    isScrolling = true;
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

  // 2. Merge {Merge} lines just like compileMarkupToHTML
  var mergedLines = [];
  for (var i = 0; i < lines.length; i++) {
    var cur = lines[i];
    if (cur.toLowerCase().startsWith("{merge}") && mergedLines.length > 0) {
      mergedLines[mergedLines.length - 1] += " " + cur.substring(7).trim();
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
