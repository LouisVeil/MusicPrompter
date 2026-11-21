var DEFAULT_CHORD_DEFS = {
  "C":     { name: "C",     width: 68, height: 82, labelSize: 10, dotDia: 11, topFret: 0, fretQty: 4, strings: ["X", "3-3", "2-2", "O", "1-1", "O"] },
  "C7":    { name: "C7",    width: 68, height: 82, labelSize: 10, dotDia: 11, topFret: 0, fretQty: 4, strings: ["X", "3-3", "2-2", "3-4", "1-1", "O"] },
  "Cmaj7": { name: "Cmaj7", width: 68, height: 82, labelSize: 10, dotDia: 11, topFret: 0, fretQty: 4, strings: ["X", "3-3", "2-2", "O", "O", "O"] },
  "Cadd9": { name: "Cadd9", width: 68, height: 82, labelSize: 10, dotDia: 11, topFret: 0, fretQty: 4, strings: ["X", "3-2", "2-1", "O", "3-3", "3-4"] },
  "Cm":    { name: "Cm",    width: 68, height: 82, labelSize: 10, dotDia: 11, topFret: 3, fretQty: 4, strings: ["X", "1-1", "3-3", "3-4", "2-2", "1-1"] },
  "C#m":   { name: "C#m",   width: 68, height: 82, labelSize: 10, dotDia: 11, topFret: 4, fretQty: 4, strings: ["X", "1-1", "3-3", "3-4", "2-2", "1-1"] },
  "D":     { name: "D",     width: 68, height: 82, labelSize: 10, dotDia: 11, topFret: 0, fretQty: 4, strings: ["X", "X", "O", "2-1", "3-3", "2-2"] },
  "D7":    { name: "D7",    width: 68, height: 82, labelSize: 10, dotDia: 11, topFret: 0, fretQty: 4, strings: ["X", "X", "O", "2-2", "1-1", "2-3"] },
  "Dmaj7": { name: "Dmaj7", width: 68, height: 82, labelSize: 10, dotDia: 11, topFret: 0, fretQty: 4, strings: ["X", "X", "O", "2-1", "2-1", "2-1"] },
  "Dm":    { name: "Dm",    width: 68, height: 82, labelSize: 10, dotDia: 11, topFret: 0, fretQty: 4, strings: ["X", "X", "O", "2-2", "3-3", "1-1"] },
  "Dm7":   { name: "Dm7",   width: 68, height: 82, labelSize: 10, dotDia: 11, topFret: 0, fretQty: 4, strings: ["X", "X", "O", "2-2", "1-1", "1-1"] },
  "Dsus2": { name: "Dsus2", width: 68, height: 82, labelSize: 10, dotDia: 11, topFret: 0, fretQty: 4, strings: ["X", "X", "O", "2-1", "3-3", "O"] },
  "Dsus4": { name: "Dsus4", width: 68, height: 82, labelSize: 10, dotDia: 11, topFret: 0, fretQty: 4, strings: ["X", "X", "O", "2-1", "3-3", "3-4"] },
  "Eb":    { name: "Eb",    width: 68, height: 82, labelSize: 10, dotDia: 11, topFret: 3, fretQty: 4, strings: ["X", "X", "1-1", "3-2", "4-4", "3-3"] },
  "E":     { name: "E",     width: 68, height: 82, labelSize: 10, dotDia: 11, topFret: 0, fretQty: 4, strings: ["O", "2-2", "2-3", "1-1", "O", "O"] },
  "E7":    { name: "E7",    width: 68, height: 82, labelSize: 10, dotDia: 11, topFret: 0, fretQty: 4, strings: ["O", "2-2", "O", "1-1", "O", "O"] },
  "Em":    { name: "Em",    width: 68, height: 82, labelSize: 10, dotDia: 11, topFret: 0, fretQty: 4, strings: ["O", "2-2", "2-3", "O", "O", "O"] },
  "Em7":   { name: "Em7",   width: 68, height: 82, labelSize: 10, dotDia: 11, topFret: 0, fretQty: 4, strings: ["O", "2-2", "O", "O", "O", "O"] },
  "Esus4": { name: "Esus4", width: 68, height: 82, labelSize: 10, dotDia: 11, topFret: 0, fretQty: 4, strings: ["O", "2-2", "2-3", "2-4", "O", "O"] },
  "F":     { name: "F",     width: 68, height: 82, labelSize: 10, dotDia: 11, topFret: 0, fretQty: 4, strings: ["1-1", "3-3", "3-4", "2-2", "1-1", "1-1"] },
  "Fmaj7": { name: "Fmaj7", width: 68, height: 82, labelSize: 10, dotDia: 11, topFret: 0, fretQty: 4, strings: ["X", "X", "3-3", "2-2", "1-1", "O"] },
  "Fm":    { name: "Fm",    width: 68, height: 82, labelSize: 10, dotDia: 11, topFret: 0, fretQty: 4, strings: ["1-1", "3-3", "3-4", "1-1", "1-1", "1-1"] },
  "F#m":   { name: "F#m",   width: 68, height: 82, labelSize: 10, dotDia: 11, topFret: 2, fretQty: 4, strings: ["1-1", "3-3", "3-4", "1-1", "1-1", "1-1"] },
  "F#m7":  { name: "F#m7",  width: 68, height: 82, labelSize: 10, dotDia: 11, topFret: 2, fretQty: 4, strings: ["1-1", "3-3", "1-1", "1-1", "1-1", "1-1"] },
  "G":     { name: "G",     width: 68, height: 82, labelSize: 10, dotDia: 11, topFret: 0, fretQty: 4, strings: ["3-2", "2-1", "O", "O", "O", "3-3"] },
  "G7":    { name: "G7",    width: 68, height: 82, labelSize: 10, dotDia: 11, topFret: 0, fretQty: 4, strings: ["3-3", "2-2", "O", "O", "O", "1-1"] },
  "Gmaj7": { name: "Gmaj7", width: 68, height: 82, labelSize: 10, dotDia: 11, topFret: 0, fretQty: 4, strings: ["3-3", "2-2", "O", "O", "O", "2-1"] },
  "Gm":    { name: "Gm",    width: 68, height: 82, labelSize: 10, dotDia: 11, topFret: 3, fretQty: 4, strings: ["1-1", "3-3", "3-4", "1-1", "1-1", "1-1"] },
  "G#m":   { name: "G#m",   width: 68, height: 82, labelSize: 10, dotDia: 11, topFret: 4, fretQty: 4, strings: ["1-1", "3-3", "3-4", "1-1", "1-1", "1-1"] },
  "Ab":    { name: "Ab",    width: 68, height: 82, labelSize: 10, dotDia: 11, topFret: 4, fretQty: 4, strings: ["1-1", "3-3", "3-4", "2-2", "1-1", "1-1"] },
  "A":     { name: "A",     width: 68, height: 82, labelSize: 10, dotDia: 11, topFret: 0, fretQty: 4, strings: ["X", "O", "2-1", "2-2", "2-3", "O"] },
  "A7":    { name: "A7",    width: 68, height: 82, labelSize: 10, dotDia: 11, topFret: 0, fretQty: 4, strings: ["X", "O", "2-2", "O", "2-3", "O"] },
  "Amaj7": { name: "Amaj7", width: 68, height: 82, labelSize: 10, dotDia: 11, topFret: 0, fretQty: 4, strings: ["X", "O", "2-2", "1-1", "2-3", "O"] },
  "Am":    { name: "Am",    width: 68, height: 82, labelSize: 10, dotDia: 11, topFret: 0, fretQty: 4, strings: ["X", "O", "2-2", "2-3", "1-1", "O"] },
  "Am7":   { name: "Am7",   width: 68, height: 82, labelSize: 10, dotDia: 11, topFret: 0, fretQty: 4, strings: ["X", "O", "2-2", "O", "1-1", "O"] },
  "Asus2": { name: "Asus2", width: 68, height: 82, labelSize: 10, dotDia: 11, topFret: 0, fretQty: 4, strings: ["X", "O", "2-1", "2-2", "O", "O"] },
  "Asus4": { name: "Asus4", width: 68, height: 82, labelSize: 10, dotDia: 11, topFret: 0, fretQty: 4, strings: ["X", "O", "2-1", "2-2", "3-3", "O"] },
  "Bb":    { name: "Bb",    width: 68, height: 82, labelSize: 10, dotDia: 11, topFret: 0, fretQty: 4, strings: ["X", "1-1", "3-2", "3-3", "3-4", "1-1"] },
  "B":     { name: "B",     width: 68, height: 82, labelSize: 10, dotDia: 11, topFret: 2, fretQty: 4, strings: ["X", "1-1", "3-2", "3-3", "3-4", "1-1"] },
  "B7":    { name: "B7",    width: 68, height: 82, labelSize: 10, dotDia: 11, topFret: 0, fretQty: 4, strings: ["X", "2-2", "1-1", "2-3", "O", "2-4"] },
  "Bm":    { name: "Bm",    width: 68, height: 82, labelSize: 10, dotDia: 11, topFret: 2, fretQty: 4, strings: ["X", "1-1", "3-3", "3-4", "2-2", "1-1"] },
  "Bm7":   { name: "Bm7",   width: 68, height: 82, labelSize: 10, dotDia: 11, topFret: 2, fretQty: 4, strings: ["X", "1-1", "3-3", "1-1", "2-2", "1-1"] }
};

function parseChordDefString(paramsStr) {
  if (!paramsStr) return null;
  var tokens = paramsStr.split(",").map(function(t) { return t.trim(); });
  if (tokens.length >= 10) {
    var chordName = tokens.shift();
    tokens.shift();
    tokens.shift();
    var width = parseFloat(tokens.shift()) || 68;
    var height = parseFloat(tokens.shift()) || 82;
    var labelSize = parseFloat(tokens.shift()) || 10;
    var dotDia = parseFloat(tokens.shift()) || 11;
    var topFret = parseInt(tokens.shift(), 10) || 0;
    var fretQty = parseInt(tokens.shift(), 10) || 4;
    var strings = tokens.join(" ").split(/\s+/).filter(function(s) { return s !== ""; });
    if (strings.length !== 6) return null;
    return { name: chordName, width: width, height: height, labelSize: labelSize, dotDia: dotDia, topFret: topFret, fretQty: fretQty, strings: strings };
  } else if (tokens.length === 2) {
    var shortName = tokens.shift();
    var shortStrings = tokens.shift().split(/\s+/).filter(function(s) { return s !== ""; });
    if (shortStrings.length !== 6) return null;
    return { name: shortName, width: 68, height: 82, labelSize: 10, dotDia: 11, topFret: 0, fretQty: 4, strings: shortStrings };
  }
  return null;
}
function buildSingleChordSVG(def) {
  var w = def.width || 68;
  var h = def.height || 82;
  var labelSize = def.labelSize || 10;
  var dotDia = def.dotDia || 11;
  var topFret = def.topFret || 0;
  var fretQty = def.fretQty || 4;
  var strings = def.strings;

  var numStrings = 6;
  var stringDist = w / (numStrings - 1);
  var fretDist = h / fretQty;

  var padLeft = 14;
  var padRight = (topFret > 0) ? 34 : 14;
  var padTop = 34;
  var padBottom = 10;
  var totalW = w + padLeft + padRight;
  var totalH = h + padTop + padBottom;

  var svg = '<svg width="' + totalW + '" height="' + totalH + '" viewBox="0 0 ' + totalW + ' ' + totalH + '" xmlns="http://w3.org">';
  svg += '<g transform="translate(' + padLeft + ', ' + padTop + ')">';
  svg += '<text x="' + (w / 2) + '" y="-20" font-size="' + Math.round(labelSize * 1.45) + '" font-weight="bold" text-anchor="middle" fill="#ffffff" font-family="Arial, sans-serif">' + def.name + '</text>';

  for (var i = 0; i <= fretQty; i++) {
    var y = i * fretDist;
    var sw = (i === 0 && topFret === 0) ? 4 : 1.3;
    svg += '<line x1="0" y1="' + y + '" x2="' + w + '" y2="' + y + '" stroke="#cfcfcf" stroke-width="' + sw + '" stroke-linecap="square" />';
  }

  if (topFret > 0) {
    svg += '<text x="' + (w + 8) + '" y="' + ((fretDist / 2) + 4) + '" font-size="11" font-weight="bold" fill="#ffb74d" font-family="Arial, sans-serif">fr.' + topFret + '</text>';
  }

  for (var j = 0; j < numStrings; j++) {
    var sx = j * stringDist;
    svg += '<line x1="' + sx + '" y1="0" x2="' + sx + '" y2="' + h + '" stroke="#9e9e9e" stroke-width="1.3" />';
  }

  var parsed = strings.map(function(cfg) {
    var parts = cfg.split("-");
    var rawUp = cfg.toUpperCase().trim();
    var fret = parseInt(parts.shift(), 10);
    var finger = parts.length > 0 ? parts.shift().trim().toUpperCase() : null;
    var isNote = !isNaN(fret) && fret > 0 && rawUp !== "O" && rawUp !== "0";
    return { isNote: isNote, fret: fret, finger: finger, raw: rawUp };
  });

  var barreMap = {};
  parsed.forEach(function(st, idx) {
    if (st.isNote && st.finger) {
      var key = st.fret + "_" + st.finger;
      if (!barreMap[key]) barreMap[key] = [];
      barreMap[key].push(idx);
    }
  });

  var barres = [];
  Object.keys(barreMap).forEach(function(key) {
    var idxs = barreMap[key];
    if (idxs.length >= 2) {
      var firstIdx = idxs.shift();
      var lastIdx = idxs.pop();
      var fretNum = parseInt(key.split("_").shift(), 10);
      var fingerLbl = key.split("_").pop();
      var startX = firstIdx * stringDist;
      var endX = lastIdx * stringDist;
      var centerY = ((fretNum - 1) * fretDist) + (fretDist / 2);
      var capH = dotDia * 1.15;
      var capX = startX - (dotDia / 2);
      var capW = (endX - startX) + dotDia;

      svg += '<rect x="' + capX + '" y="' + (centerY - capH / 2) + '" width="' + capW + '" height="' + capH + '" rx="' + (capH / 2) + '" ry="' + (capH / 2) + '" fill="#4fc3f7" />';
      svg += '<text x="' + ((startX + endX) / 2) + '" y="' + (centerY + 3.5) + '" font-size="' + (labelSize * 0.95) + '" font-weight="bold" text-anchor="middle" fill="#121212" font-family="Arial, sans-serif">' + fingerLbl + '</text>';
      barres.push({ fret: fretNum, finger: fingerLbl, startIdx: firstIdx, endIdx: lastIdx });
    }
  });

  parsed.forEach(function(st, idx) {
    var sx = idx * stringDist;
    if (!st.isNote) {
      if (st.raw === "X" || st.raw === "O" || st.raw === "0") {
        var lbl = (st.raw === "0") ? "O" : st.raw;
        var col = (lbl === "X") ? "#ff5252" : "#81c784";
        svg += '<text x="' + sx + '" y="-7" font-size="' + labelSize + '" font-weight="bold" text-anchor="middle" fill="' + col + '" font-family="Arial, sans-serif">' + lbl + '</text>';
      }
      return;
    }

    var inBarre = barres.some(function(b) {
      return b.fret === st.fret && b.finger === st.finger && idx >= b.startIdx && idx <= b.endIdx;
    });
    if (inBarre) return;

    var cy = ((st.fret - 1) * fretDist) + (fretDist / 2);
    var r = dotDia / 2;
    svg += '<circle cx="' + sx + '" cy="' + cy + '" r="' + (r + 1) + '" fill="#4fc3f7" />';
    if (st.finger) {
      svg += '<text x="' + sx + '" y="' + (cy + 3.5) + '" font-size="' + (labelSize * 0.95) + '" font-weight="bold" text-anchor="middle" fill="#121212" font-family="Arial, sans-serif">' + st.finger + '</text>';
    }
  });

  svg += '</g></svg>';
  return '<div class="chord-diagram-card">' + svg + '</div>';
}

function renderSongChordDiagramsHTML(compLines, customChordDefs) {
  var seen = {};
  var orderedChords = [];
  var chordRegex = /\[([^\]]+)\]/g;

  compLines.forEach(function(ln) {
    var trimmed = ln.trim();
    if (!trimmed || (trimmed.startsWith("{") && trimmed.endsWith("}"))) return;
    var m;
    while ((m = chordRegex.exec(trimmed)) !== null) {
      m.shift();
      var rawChord = m.shift().trim();
      if (!rawChord || /^x\d+$/i.test(rawChord)) continue;
      var lookupName = rawChord;
      if (!customChordDefs[lookupName] && !DEFAULT_CHORD_DEFS[lookupName] && lookupName.indexOf("/") !== -1) {
        lookupName = lookupName.split("/").shift().trim();
      }
      if (!seen[lookupName]) {
        seen[lookupName] = true;
        orderedChords.push(lookupName);
      }
    }
  });

  if (orderedChords.length === 0) return "";

  var cardsHtml = "";
  orderedChords.forEach(function(chName) {
    var def = (customChordDefs && customChordDefs[chName]) || DEFAULT_CHORD_DEFS[chName];
    if (def) {
      cardsHtml += buildSingleChordSVG(def);
    }
  });

  return cardsHtml ? ('<div class="chord-diagrams-strip">' + cardsHtml + '</div>') : "";
}
function openAllChordsModal() {
  var bodyEl = document.getElementById('all-chords-modal-body');
  if (!bodyEl) return;

  var allDefs = Object.assign({}, DEFAULT_CHORD_DEFS);
  if (typeof activeSongName !== 'undefined' && activeSongName && loadedSongsMap[activeSongName]) {
    loadedSongsMap[activeSongName].split(/\r?\n/).forEach(function(ln) {
      var trimmed = ln.trim();
      var lower = trimmed.toLowerCase();
      if (lower.startsWith("{chorddef:") || lower.startsWith("{chord:")) {
        var inner = trimmed.slice(trimmed.indexOf(":") + 1, trimmed.lastIndexOf("}")).trim();
        var parsed = parseChordDefString(inner);
        if (parsed) allDefs[parsed.name] = parsed;
      }
    });
  }

  var names = Object.keys(allDefs);
  var cardsHtml = names.map(function(name) {
    return buildSingleChordSVG(allDefs[name]);
  }).join("");

  bodyEl.innerHTML = '<div style="font-size:12px; color:#aaa; margin-bottom:10px;">Showing ' + names.length + ' available chord diagrams (including any custom chords in the active song):</div>' +
    '<div class="chord-diagrams-strip" style="margin:0;">' + cardsHtml + '</div>';

  document.getElementById('all-chords-modal').classList.add('open');
}
