var TAB_REGISTRY = {};
var tabBlockCounter = 1;
var activeTabPlayback = null;

var STRING_BASE_MIDI = "64,59,55,50,45,40".split(",").map(Number);
var STRING_NAMES = ["e", "B", "G", "D", "A", "E"];
var STRING_MAP = { "e": 0, "B": 1, "G": 2, "D": 3, "A": 4, "E": 5 };

function parseTabBlock(headerStr, rawBodyLines) {
  var title = "Guitar Tab";
  var speedMult = 1.0;

  if (headerStr) {
    headerStr.split("|").forEach(function(part) {
      var p = part.trim();
      if (/^speed\s*:/i.test(p)) {
        speedMult = parseFloat(p.split(":").pop()) || 1.0;
      } else if (p.length > 0) {
        title = p;
      }
    });
  }

  var strLines = ["", "", "", "", "", ""];
  var assigned = 0;
  rawBodyLines.forEach(function(ln) {
    var m = ln.trim().match(/^([eBGDAE])\s*\|(.*)$/);
    if (m) {
      m.shift();
      var sChar = m.shift();
      var content = m.shift();
      var idx = (sChar === "e") ? 0 : (sChar === "E" ? 5 : STRING_MAP[sChar]);
      strLines[idx] = content;
      assigned++;
    }
  });

  if (assigned === 0) {
    for (var i = 0; i < Math.min(6, rawBodyLines.length); i++) {
      strLines[i] = rawBodyLines.at(i).trim().replace(/^\|/, "");
    }
  }

  var maxLen = 0;
  strLines.forEach(function(s) { if (s.length > maxLen) maxLen = s.length; });

  var columns = [];
  var colIdx = 0;
  while (colIdx < maxLen) {
    var isBar = false;
    var stepWidth = 1;

    for (var s = 0; s < 6; s++) {
      var ch = strLines.at(s).charAt(colIdx) || "-";
      if (ch === "|") isBar = true;
      var rest = strLines.at(s).slice(colIdx);
      var tokMatch = rest.match(/^(\d{1,2}(?:[hp\/\\b]\d{1,2})*~?|\d{1,2}~)/);
      if (tokMatch) {
        var matched = tokMatch.shift();
        if (matched.length > stepWidth) stepWidth = matched.length;
      }
    }

    if (isBar) {
      columns.push({ isBar: true, cells: ["|", "|", "|", "|", "|", "|"] });
      colIdx += 1;
      continue;
    }

    var cells = [];
    for (var r = 0; r < 6; r++) {
      var slice = (strLines.at(r).slice(colIdx, colIdx + stepWidth) || "-").replace(/^-+$/, "-");
      cells.push(slice || "-");
    }
    columns.push({ isBar: false, cells: cells });
    colIdx += stepWidth;
  }

  return { title: title, speedMult: speedMult, columns: columns };
}
function parseTabPickLine(rawStr) {
  var title = "Fingerpick Pattern";
  var speedMult = 1.0;
  var patternPart = rawStr;

  if (rawStr.indexOf("|") !== -1) {
    var segments = rawStr.split("|");
    var firstSeg = segments.shift().trim();
    if (!/^[(\[]?[eBGDAE]-/i.test(firstSeg) && firstSeg !== ".") {
      title = firstSeg || title;
      if (segments.length > 0 && /^speed\s*:/i.test(segments.at(0).trim())) {
        speedMult = parseFloat(segments.shift().split(":").pop()) || 1.0;
      }
      patternPart = segments.join(" | ");
    } else {
      patternPart = firstSeg + " | " + segments.join(" | ");
    }
  }

  var columns = [];
  var tokens = patternPart.trim().split(/\s+/);

  tokens.forEach(function(tok) {
    if (!tok) return;
    if (tok === "|") {
      columns.push({ isBar: true, cells: ["|", "|", "|", "|", "|", "|"] });
      return;
    }
    var cells = ["-", "-", "-", "-", "-", "-"];
    if (tok !== "." && tok !== "-") {
      var clean = tok.replace(/^[\(\[]|[\)\]]$/g, "");
      clean.split("+").forEach(function(noteTok) {
        var m = noteTok.match(/^([eBGDAE])-(.+)$/);
        if (m) {
          m.shift();
          var sChar = m.shift();
          var fretExpr = m.shift();
          var idx = (sChar === "e") ? 0 : (sChar === "E" ? 5 : STRING_MAP[sChar]);
          if (idx !== undefined) cells[idx] = fretExpr;
        }
      });
    }
    columns.push({ isBar: false, cells: cells });
  });

  return { title: title, speedMult: speedMult, columns: columns };
}

function formatTabCellHTML(cellText) {
  if (!cellText || cellText === "-" || cellText === "|") return cellText || "-";
  return cellText.replace(/([hp\/\\b~])/g, '<span class="tab-tech">$1</span>');
}

function registerAndRenderTabHTML(parsedTab) {
  if (!parsedTab || !parsedTab.columns || parsedTab.columns.length === 0) return "";
  var tabId = "tab_box_" + (tabBlockCounter++);
  TAB_REGISTRY[tabId] = parsedTab;

  var headerHtml = '<div class="tab-viewer-header">' +
    '<span class="tab-viewer-title">🎸 ' + parsedTab.title + '</span>' +
    '<div class="tab-viewer-controls">' +
      '<button class="control-btn" id="' + tabId + '_play_btn" onclick="startTabPlayback(\'' + tabId + '\', true)">🔊 Play</button>' +
      '<button class="control-btn" id="' + tabId + '_scroll_btn" onclick="startTabPlayback(\'' + tabId + '\', false)">📜 Scroll</button>' +
      '<label style="font-size:11px; color:#bbb; display:flex; align-items:center; gap:3px; cursor:pointer;">' +
        '<input type="checkbox" id="' + tabId + '_loop"> 🔁 Loop' +
      '</label>' +
    '</div>' +
  '</div>';

  var rowsHtml = "";
  for (var s = 0; s < 6; s++) {
    rowsHtml += '<tr><td class="tab-string-label">' + STRING_NAMES.at(s) + '|</td>';
    for (var c = 0; c < parsedTab.columns.length; c++) {
      var col = parsedTab.columns.at(c);
      var cls = col.isBar ? 'tab-step-cell bar-col' : 'tab-step-cell';
      rowsHtml += '<td class="' + cls + '" data-tab-col="' + c + '">' + formatTabCellHTML(col.cells.at(s)) + '</td>';
    }
    rowsHtml += '</tr>';
  }

  return '<div class="tab-viewer-box" id="' + tabId + '">' +
    headerHtml +
    '<div class="tab-scroll-viewport" id="' + tabId + '_viewport">' +
      '<table class="tab-grid-table">' + rowsHtml + '</table>' +
    '</div>' +
  '</div>';
}
function stopActiveTabPlayback() {
  if (!activeTabPlayback) return;
  clearInterval(activeTabPlayback.timer);
  var oldId = activeTabPlayback.tabId;
  var box = document.getElementById(oldId);
  if (box) {
    box.querySelectorAll('.active-col').forEach(function(el) { el.classList.remove('active-col'); });
    var pBtn = document.getElementById(oldId + '_play_btn');
    var sBtn = document.getElementById(oldId + '_scroll_btn');
    if (pBtn) pBtn.innerText = '🔊 Play';
    if (sBtn) sBtn.innerText = '📜 Scroll';
  }
  activeTabPlayback = null;
}

function startTabPlayback(tabId, withAudio) {
  var wasSame = (activeTabPlayback && activeTabPlayback.tabId === tabId && activeTabPlayback.withAudio === withAudio);
  stopActiveTabPlayback();
  if (wasSame) return;

  var tabData = TAB_REGISTRY[tabId];
  var box = document.getElementById(tabId);
  var viewport = document.getElementById(tabId + '_viewport');
  if (!tabData || !box || !viewport) return;

  if (withAudio && typeof ensureBeatAudioCtx === "function") ensureBeatAudioCtx();

  var bpm = parseFloat(document.getElementById('metro-bpm').value) || 120;
  var stepMs = (60 / bpm / 2) * 1000 / (tabData.speedMult || 1.0);
  var activeBtn = document.getElementById(tabId + (withAudio ? '_play_btn' : '_scroll_btn'));
  if (activeBtn) activeBtn.innerText = '⏹ Stop';

  var colIndex = 0;
  viewport.scrollLeft = 0;

  function stepTick() {
    box.querySelectorAll('.active-col').forEach(function(el) { el.classList.remove('active-col'); });

    while (colIndex < tabData.columns.length && tabData.columns.at(colIndex).isBar) {
      colIndex++;
    }

    if (colIndex >= tabData.columns.length) {
      var loopChk = document.getElementById(tabId + '_loop');
      if (loopChk && loopChk.checked) {
        colIndex = 0;
        viewport.scrollLeft = 0;
      } else {
        stopActiveTabPlayback();
        return;
      }
    }

    var activeCells = box.querySelectorAll('[data-tab-col="' + colIndex + '"]');
    activeCells.forEach(function(el) { el.classList.add('active-col'); });

    if (activeCells.length > 0) {
      var cellEl = activeCells.item(0);
      var targetScroll = cellEl.offsetLeft - (viewport.clientWidth * 0.35);
      viewport.scrollLeft = Math.max(0, targetScroll);
    }

    if (withAudio) {
      playTabColumnAudio(tabData.columns.at(colIndex), stepMs / 1000);
    }

    colIndex++;
  }

  stepTick();
  activeTabPlayback = {
    tabId: tabId,
    withAudio: withAudio,
    timer: setInterval(stepTick, stepMs)
  };
}

function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function playTabColumnAudio(col, stepSec) {
  if (!col || col.isBar || typeof audioCtx === "undefined" || !audioCtx) return;
  var now = audioCtx.currentTime;
  var outNode = (typeof getBeatOutputNode === "function") ? getBeatOutputNode() : audioCtx.destination;

  for (var s = 0; s < 6; s++) {
    var expr = (col.cells.at(s) || "-").trim();
    if (!expr || expr === "-" || expr === "x" || expr === "X") continue;

    var baseMidi = STRING_BASE_MIDI.at(s);
    var hasVibrato = expr.indexOf("~") !== -1;
    var cleanExpr = expr.replace(/~/g, "");

    var techMatch = cleanExpr.match(/^(\d+)([hp\/\\b])(\d+)$/);
    if (techMatch) {
      techMatch.shift();
      var startFret = parseInt(techMatch.shift(), 10);
      var tech = techMatch.shift();
      var endFret = parseInt(techMatch.shift(), 10);
      synthTabStringTechnique(now, baseMidi + startFret, baseMidi + endFret, tech, stepSec, outNode);
    } else {
      var fretNum = parseInt(cleanExpr, 10);
      if (!isNaN(fretNum)) {
        var dur = hasVibrato ? (stepSec * 2.6) : (stepSec * 1.9);
        synthTabSinglePluck(now, midiToFreq(baseMidi + fretNum), dur, hasVibrato, outNode);
      }
    }
  }
}
function synthTabSinglePluck(time, freq, dur, vibrato, outNode) {
  var osc = audioCtx.createOscillator();
  var filter = audioCtx.createBiquadFilter();
  var gain = audioCtx.createGain();

  osc.type = "triangle";
  osc.frequency.setValueAtTime(freq, time);
  if (vibrato) {
    osc.frequency.setValueAtTime(freq * 1.012, time + dur * 0.35);
    osc.frequency.setValueAtTime(freq * 0.992, time + dur * 0.65);
    osc.frequency.setValueAtTime(freq, time + dur * 0.85);
  }

  filter.type = "lowpass";
  filter.frequency.setValueAtTime(2200, time);
  filter.frequency.exponentialRampToValueAtTime(520, time + dur);

  gain.gain.setValueAtTime(0.001, time);
  gain.gain.linearRampToValueAtTime(0.28, time + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(outNode);
  osc.start(time);
  osc.stop(time + dur + 0.02);
}

function synthTabStringTechnique(time, startMidi, endMidi, tech, stepSec, outNode) {
  var f1 = midiToFreq(startMidi);
  var f2 = midiToFreq(endMidi);
  var dur = stepSec * 2.1;

  var osc = audioCtx.createOscillator();
  var filter = audioCtx.createBiquadFilter();
  var gain = audioCtx.createGain();

  osc.type = "triangle";
  osc.frequency.setValueAtTime(f1, time);

  if (tech === "/" || tech === "\\" || tech === "b") {
    osc.frequency.linearRampToValueAtTime(f2, time + stepSec * 0.65);
  } else {
    osc.frequency.setValueAtTime(f2, time + stepSec * 0.45);
  }

  filter.type = "lowpass";
  filter.frequency.setValueAtTime(2300, time);
  filter.frequency.exponentialRampToValueAtTime(550, time + dur);

  gain.gain.setValueAtTime(0.001, time);
  gain.gain.linearRampToValueAtTime(0.3, time + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(outNode);
  osc.start(time);
  osc.stop(time + dur + 0.02);
}

function openDirectivesHelpModal() {
  var bodyEl = document.getElementById("directives-help-body");
  if (!bodyEl) return;

  bodyEl.innerHTML =
    '<h4 style="color:#4fc3f7; margin:0 0 6px 0;">1. Song Metadata & Layout Directives</h4>' +
    '<pre style="background:#121212; padding:10px; border-radius:4px; color:#ddd; overflow-x:auto;">' +
    '{Title: Song Name}\n' +
    '{Subtitle: Artist Name}\n' +
    '{Key: Am}\n' +
    '{Capo: Capo 2}\n' +
    '{Tempo: 120}\n' +
    '{Beat: 4/4}\n' +
    '{BeatStyle: Key:Am | Drums:rock@80 | Bass:root-fifth@75}\n' +
    '{Comment: Any performance note}</pre>' +

    '<h4 style="color:#4fc3f7; margin:14px 0 6px 0;">2. Custom Chord Diagrams (Optional)</h4>' +
    '<pre style="background:#121212; padding:10px; border-radius:4px; color:#ddd; overflow-x:auto;">' +
    '{ChordDef: Fmaj7, X X 3-3 2-2 1-1 O}\n' +
    '{ChordPos: top}   &lt;!-- top | bottom | none --&gt;</pre>' +

    '<h4 style="color:#4fc3f7; margin:14px 0 6px 0;">3. Single-Line Fingerpicking ({TabPick: ...})</h4>' +
    '<p style="color:#bbb; margin:0 0 6px 0;">Use string names <b>e B G D A E</b> + fret number. Use <b>.</b> for pause, <b>(A-0+B-1)</b> for simultaneous pinch, and <b>|</b> for bar lines:</p>' +
    '<pre style="background:#121212; padding:10px; border-radius:4px; color:#4fc3f7; overflow-x:auto;">' +
    '{TabPick: Intro Travis | (A-0+e-3) . D-2 G-0 B-1h3 p1 G-0 | (E-3+B-0) . D-0 G-0 B-3~ . G-0 .}</pre>' +

    '<h4 style="color:#4fc3f7; margin:14px 0 6px 0;">4. Full 6-String Tab Block ({Tab: ...} ... {EndTab})</h4>' +
    '<pre style="background:#121212; padding:10px; border-radius:4px; color:#4fc3f7; overflow-x:auto;">' +
    '{Tab: Solo Lick | Speed: 1.0}\n' +
    'e|---3-------3-----|-----------------|\n' +
    'B|-----1h3p1---1---|---3/5---3~------|\n' +
    'G|-------0-------0-|-----------------|\n' +
    'D|---2-------------|---0-------------|\n' +
    'A|---3-------------|-----------------|\n' +
    'E|-----------------|-----------------|\n' +
    '{EndTab}</pre>' +

    '<h4 style="color:#ffb74d; margin:14px 0 6px 0;">5. Technique Symbols (Supported in Both Formats)</h4>' +
    '<ul style="color:#ccc; margin:0; padding-left:18px;">' +
      '<li><b>5h7</b> = Hammer-on &nbsp;|&nbsp; <b>7p5</b> = Pull-off</li>' +
      '<li><b>5/7</b> = Slide up &nbsp;|&nbsp; <b>7\\5</b> = Slide down</li>' +
      '<li><b>7b9</b> = Bend up &nbsp;|&nbsp; <b>7~</b> = Vibrato / Let ring</li>' +
    '</ul>';

  document.getElementById("directives-help-modal").classList.add("open");
}

