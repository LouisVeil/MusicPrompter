function parseLyricsLine(line, lSize, cSize, fontName) {
  var chordsLocEl = document.getElementById('opt-chords-location');
  var chordsLocation = chordsLocEl ? chordsLocEl.value : "in-lyrics";
  var showBeatCountEl = document.getElementById('opt-show-beat-count');
  var showBeatCount = showBeatCountEl ? showBeatCountEl.checked : false;

  var chordIdx = 1;
  var beatIdx = 2;
  var repeatIdx = 3;

  function buildChordHtml(chordText, beatNum) {
    var html = chordText;
    if (showBeatCount && beatNum && beatNum.length > 0) {
      html += "<span class='beat-count'>(" + beatNum + ")</span>";
    }
    return html;
  }

  // Matches either [Chord]{optionalBeat} OR {Repeat: n} anywhere on the line
  var tokenReg = /\[([^\]]+)\](?:\s*\{([^}:]*)\})?|\{repeat\s*:\s*(\d+)\s*\}/gi;
  var strippedLine = line.replace(tokenReg, '');
  var hasTxt = strippedLine.trim().length > 0;

  // Chord-only lines (e.g., Intro / Instrumental / Solo)
  if (!hasTxt) {
    var chordOnlyHtml = line.replace(tokenReg, function(_, ch, beat, rep) {
      if (rep) {
        return "<span class='repeat-badge'>(x" + rep + ")</span>";
      }
      return buildChordHtml(ch, beat);
    });
    chordOnlyHtml = chordOnlyHtml.replace(/ (?![^<]*>)/g, '&nbsp;');

    return "<div style='font-family:\"" + fontName + "\",monospace; font-size:" + (cSize + globalSizeModifier) + "pt; font-weight:bold; color:var(--chord-color);'>" + chordOnlyHtml + "</div>";
  }

  var m, idx = 0, lLine = "";
  var events = [];

  while ((m = tokenReg.exec(line)) !== null) {
    lLine += line.substring(idx, m.index);

    if (m[repeatIdx]) {
      events.push({
        type: "repeat",
        pos: lLine.length,
        repeat: m[repeatIdx]
      });
    } else {
      events.push({
        type: "chord",
        pos: lLine.length,
        chord: m[chordIdx],
        beat: m[beatIdx] || ""
      });
    }

    idx = tokenReg.lastIndex;
  }
  lLine += line.substring(idx);

  var fixedLyricsHtml = lLine;

  // MODE 3: None (hide lyric chords, beat counts, and repeat badges)
  if (chordsLocation === "none") {
    return "<div class='line-container'>" +
           "<div class='lyrics-row' style='font-family:\"" + fontName + "\",monospace; font-size:" + (lSize + globalSizeModifier) + "pt; min-height:" + (lSize * 1.2) + "px;'>" + fixedLyricsHtml + "</div></div>";
  }

  // MODE 2: Left of Lyrics (Column 2 = chords + badges, Column 3 = lyrics)
  if (chordsLocation === "left-of-lyrics") {
    var leftParts = [];
    events.forEach(function(ev) {
      if (ev.type === "repeat") {
        var repBadge = "<span class='repeat-badge'>(x" + ev.repeat + ")</span>";
        if (leftParts.length > 0) {
          leftParts[leftParts.length - 1] += repBadge;
        } else {
          leftParts.push(repBadge);
        }
      } else {
        leftParts.push(buildChordHtml(ev.chord, ev.beat));
      }
    });

    return "<div class='left-chords-row'>" +
           "<div class='left-chords-col' style='font-family:\"" + fontName + "\",monospace; font-size:" + (cSize + globalSizeModifier) + "pt;'>" + leftParts.join("&nbsp;&nbsp;&nbsp;") + "</div>" +
           "<div class='left-lyrics-col' style='font-family:\"" + fontName + "\",monospace; font-size:" + (lSize + globalSizeModifier) + "pt;'>" + fixedLyricsHtml + "</div>" +
           "</div>";
  }

  // MODE 1: In Lyrics (stacked chords above lyrics with "(x2)" placed at its exact character column)
  var fixedChordHtml = "";
  var cursorPos = 0;

  events.forEach(function(ev) {
    while (cursorPos < ev.pos) {
      fixedChordHtml += "&nbsp;";
      cursorPos++;
    }

    if (ev.type === "repeat") {
      var badgePlain = "(x" + ev.repeat + ")";
      fixedChordHtml += "<span style='font-size:" + (cSize + globalSizeModifier) + "pt;' class='repeat-badge'>" + badgePlain + "</span>";
      cursorPos += badgePlain.length;
    } else {
      var labelPlain = (showBeatCount && ev.beat.length > 0)
        ? (ev.chord + "(" + ev.beat + ")")
        : ev.chord;

      fixedChordHtml += "<span style='font-size:" + (cSize + globalSizeModifier) + "pt; font-weight:bold; color:var(--chord-color);'>" +
                        buildChordHtml(ev.chord, ev.beat) +
                        "</span>";
      cursorPos += labelPlain.length;
    }
  });

  return "<div class='line-container'>" +
         "<div class='chord-row' style='font-family:\"" + fontName + "\",monospace; font-size:" + (lSize + globalSizeModifier) + "pt; min-height:" + (cSize * 1.2) + "px;'>" + fixedChordHtml + "</div>" +
         "<div class='lyrics-row' style='font-family:\"" + fontName + "\",monospace; font-size:" + (lSize + globalSizeModifier) + "pt; min-height:" + (lSize * 1.2) + "px;'>" + fixedLyricsHtml + "</div></div>";
}

function compileMarkupToHTML(lines) {
  var showSongInfo = document.getElementById('opt-show-song-info') ? document.getElementById('opt-show-song-info').checked : false;
  var showStrumInfo = document.getElementById('opt-show-strum-info') ? document.getElementById('opt-show-strum-info').checked : true;
  var showParaName = document.getElementById('opt-show-para-name') ? document.getElementById('opt-show-para-name').checked : true;
  var mergeLinesEl = document.getElementById('opt-merge-lines');
  var shouldMergeLines = mergeLinesEl ? mergeLinesEl.checked : true;
  var chordsLocEl = document.getElementById('opt-chords-location');
  var isLeftChords = chordsLocEl && chordsLocEl.value === "left-of-lyrics";
  var cellClass = isLeftChords ? "content-cell left-chords-mode" : "content-cell";

  var showChordDiagramsEl = document.getElementById('opt-show-chord-diagrams');
  var showChordDiagrams = showChordDiagramsEl ? showChordDiagramsEl.checked : true;
  var customChordDefs = {};
  var chordPosSetting = "top";

  var lSz = 18, cSz = 14, lp = 12, rp = 88;
  var fontFm = "Roboto Mono";
  var inSongTable = false, inGuitarTab = false, seenFirstPara = false;
  var guitarTabHeader = "", guitarTabLines = [];
  var html = "", comp = [];
  currentSongHeaderInfo = [];
  currentSongLayoutInfo = [];

  for (var i = 0; i < lines.length; i++) {
    var cur = lines.at(i);
    if (shouldMergeLines && cur.toLowerCase().startsWith("{merge}") && comp.length > 0) {
      var textToAppend = cur.substring(7).trim();
      comp[comp.length - 1] = comp.at(comp.length - 1) + " " + textToAppend;
      continue;
    }
    comp.push(cur);
  }

  comp.forEach(function(ln) {
    var trimmedLn = ln.trim();

    if (inGuitarTab) {
      if (trimmedLn.toLowerCase() === "{endtab}") {
        inGuitarTab = false;
        if (typeof parseTabBlock === "function" && typeof registerAndRenderTabHTML === "function") {
          html += registerAndRenderTabHTML(parseTabBlock(guitarTabHeader, guitarTabLines));
        }
        guitarTabHeader = "";
        guitarTabLines = [];
      } else {
        guitarTabLines.push(ln);
      }
      return;
    }

    if (trimmedLn.startsWith("{") && trimmedLn.endsWith("}")) {
      var d = trimmedLn.substring(1, trimmedLn.length - 1).trim();
      var cIdx = d.indexOf(":");
      var k = cIdx !== -1 ? d.substring(0, cIdx).trim().toLowerCase() : d.toLowerCase();
      var v = cIdx !== -1 ? d.substring(cIdx + 1).trim() : "";

      if (k === "tab") {
        if (inSongTable) { html += "</td></tr></table>"; inSongTable = false; }
        inGuitarTab = true;
        guitarTabHeader = v;
        guitarTabLines = [];
        return;
      }

      if (k === "tabpick") {
        if (inSongTable) { html += "</td></tr></table>"; inSongTable = false; }
        if (typeof parseTabPickLine === "function" && typeof registerAndRenderTabHTML === "function") {
          html += registerAndRenderTabHTML(parseTabPickLine(v));
        }
        return;
      }

      if (k === "para") {
        seenFirstPara = true;
        if (inSongTable) { html += "</td></tr>"; } else { html += "<table class='song-table'>"; inSongTable = true; }
        if (showParaName) {
          html += "<tr><td class='para-cell'>" + v + "</td><td class='" + cellClass + "'>";
        } else {
          html += "<tr><td class='" + cellClass + "'>";
        }
        return;
      }

      if (!seenFirstPara && trimmedLn !== "") {
        var displayLayoutKeys = ["lyricssize", "chordssize", "lyricschordsfont", "parasplit", "chorddef", "chordpos"];
        var skipKeys = ["empty", "split", "beatstyle"];
        if (displayLayoutKeys.indexOf(k) !== -1) {
          currentSongLayoutInfo.push(d);
        } else if (skipKeys.indexOf(k) === -1) {
          currentSongHeaderInfo.push(d);
        }
      }

      if (k === "title") {
        html += "<div class='song-title'>" + v + "</div>";
      } else if (k === "subtitle") {
        html += "<div class='song-subtitle'>" + v + "</div>";
      } else if (k === "lyricssize") {
        lSz = parseFloat(v) || 18;
      } else if (k === "chordssize") {
        cSz = parseFloat(v) || 14;
      } else if (k === "lyricschordsfont") {
        fontFm = v || "Roboto Mono";
      } else if (k === "parasplit") {
        var sp = v.split(/\s+/).map(Number);
        if (sp.length === 2 && !isNaN(sp.at(0)) && !isNaN(sp.at(1))) { lp = sp.at(0); rp = sp.at(1); }
      } else if (k === "empty") {
        html += "<div class='empty-space' style='height:" + (lSz * 1.5) + "px;'></div>";
      } else if (k === "split") {
        html += "<div style='clear:both;'></div>";
      } else if (k === "chorddef" || k === "chord") {
        if (typeof parseChordDefString === "function") {
          var parsedDef = parseChordDefString(v);
          if (parsedDef) customChordDefs[parsedDef.name] = parsedDef;
        }
      } else if (k === "chordpos") {
        chordPosSetting = v.toLowerCase();
      } else if (k !== "chorddef" && k !== "chordpos" && k !== "beatstyle") {
        var isStrumTag = (k.indexOf("strum") !== -1 || k.indexOf("pick") !== -1);
        if (isStrumTag && !showStrumInfo) return;
        if (!seenFirstPara && !isStrumTag && !showSongInfo) return;
        html += "<div class='meta-line'><b>" + (k.charAt(0).toUpperCase() + k.slice(1)) + ":</b> " + v + "</div>";
      }
      return;
    }

    if (!seenFirstPara && trimmedLn !== "") {
      seenFirstPara = true;
      if (!inSongTable) {
        html += "<table class='song-table'><tr>" + (showParaName ? "<td class='para-cell'></td>" : "") + "<td class='" + cellClass + "'>";
        inSongTable = true;
      }
    }

    if (trimmedLn === "") {
      html += "<div style='height:" + (lSz * 0.7) + "px;'></div>";
    } else {
      html += parseLyricsLine(ln, lSz, cSz, fontFm);
    }
  });

  if (inGuitarTab && guitarTabLines.length > 0 && typeof parseTabBlock === "function") {
    html += registerAndRenderTabHTML(parseTabBlock(guitarTabHeader, guitarTabLines));
  }

  if (inSongTable) html += "</td></tr></table>";

  if (showChordDiagrams && chordPosSetting !== "none" && typeof renderSongChordDiagramsHTML === "function") {
    var diagramsHtml = renderSongChordDiagramsHTML(comp, customChordDefs);
    if (diagramsHtml) {
      if (chordPosSetting === "bottom") {
        html += diagramsHtml;
      } else {
        var firstTableIdx = html.indexOf("<table class='song-table'>");
        if (firstTableIdx !== -1) {
          html = html.slice(0, firstTableIdx) + diagramsHtml + html.slice(firstTableIdx);
        } else {
          html = diagramsHtml + html;
        }
      }
    }
  }

  return html;
}
