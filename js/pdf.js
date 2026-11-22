// Zero-Dependency Native PDF Generator (Vector Text + JPEG Diagrams + Clickable TOC Links)
function SimplePDFBuilder() {
  this.pageW = 612; // US Letter width in pt
  this.pageH = 792; // US Letter height in pt
  this.pages = [];  // Each item: { ops: [], links: [], images: [] }
  this.curPage = -1;
  this.allImages = []; // { name, width, height, bytes }
  this.addPage();
}

SimplePDFBuilder.prototype.addPage = function() {
  this.pages.push({ ops: [], links: [], images: [] });
  this.curPage = this.pages.length - 1;
  return this.curPage + 1;
};

SimplePDFBuilder.prototype.setPage = function(pageNum1Based) {
  if (pageNum1Based >= 1 && pageNum1Based <= this.pages.length) {
    this.curPage = pageNum1Based - 1;
  }
};

SimplePDFBuilder.prototype.getNumberOfPages = function() {
  return this.pages.length;
};

SimplePDFBuilder.prototype.escapePdfText = function(str) {
  return String(str || "")
    .replace(/[^\x20-\x7E]/g, function(ch) {
      var map = { "é": "e", "è": "e", "ê": "e", "ë": "e", "à": "a", "â": "a", "î": "i", "ï": "i", "ô": "o", "ù": "u", "û": "u", "ç": "c", "É": "E", "È": "E", "Ê": "E", "À": "A", "Ç": "C", "’": "'", "‘": "'", "“": "\"", "”": "\"", "–": "-", "—": "-", "•": "-" };
      return map[ch] || " ";
    })
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
};

SimplePDFBuilder.prototype.text = function(str, x, yTop, opts) {
  opts = opts || {};
  var fontKey = opts.font || "F1"; // F1=Helv, F2=Helv-Bold, F3=Courier, F4=Courier-Bold, F5=Helv-Oblique
  var size = opts.size || 11;
  var r = (opts.r !== undefined ? opts.r : 20) / 255;
  var g = (opts.g !== undefined ? opts.g : 20) / 255;
  var b = (opts.b !== undefined ? opts.b : 20) / 255;
  var txt = String(str || "");

  // Approximate character width for centering / right-alignment
  var charFactor = (fontKey === "F3" || fontKey === "F4") ? 0.60 : 0.50;
  var estW = txt.length * size * charFactor;
  var drawX = x;
  if (opts.align === "center") drawX = x - estW / 2;
  else if (opts.align === "right") drawX = x - estW;

  var pdfY = this.pageH - yTop;
  var safe = this.escapePdfText(txt);
  this.pages[this.curPage].ops.push(
    "BT /" + fontKey + " " + size + " Tf " +
    r.toFixed(3) + " " + g.toFixed(3) + " " + b.toFixed(3) + " rg " +
    drawX.toFixed(2) + " " + pdfY.toFixed(2) + " Td (" + safe + ") Tj ET"
  );
};

SimplePDFBuilder.prototype.line = function(x1, y1Top, x2, y2Top) {
  var y1 = this.pageH - y1Top;
  var y2 = this.pageH - y2Top;
  this.pages[this.curPage].ops.push(
    "0.78 0.78 0.78 RG 0.75 w " + x1.toFixed(2) + " " + y1.toFixed(2) + " m " + x2.toFixed(2) + " " + y2.toFixed(2) + " l S"
  );
};

SimplePDFBuilder.prototype.addLink = function(x, yTop, w, h, targetPage1Based) {
  var yBottom = this.pageH - (yTop + h);
  var yTopPdf = this.pageH - yTop;
  this.pages[this.curPage].links.push({
    rect: [x, yBottom, x + w, yTopPdf],
    targetPage: targetPage1Based
  });
};

SimplePDFBuilder.prototype.addJpegImage = function(jpegDataUrl, x, yTop, drawW, drawH, pxW, pxH) {
  var b64 = jpegDataUrl.split(",").at(1);var offsets = new Array(1);
  var bin = atob(b64);
  var bytes = new Uint8Array(bin.length);
  for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

  var imgName = "Im" + (this.allImages.length + 1);
  this.allImages.push({ name: imgName, width: pxW, height: pxH, bytes: bytes });
  this.pages[this.curPage].images.push(imgName);

  var yBottom = this.pageH - (yTop + drawH);
  this.pages[this.curPage].ops.push(
    "q " + drawW.toFixed(2) + " 0 0 " + drawH.toFixed(2) + " " + x.toFixed(2) + " " + yBottom.toFixed(2) + " cm /" + imgName + " Do Q"
  );
};
SimplePDFBuilder.prototype.toBlob = function() {
  var self = this;
  var chunks = [];
  var offsets = new Array(1);
  var byteLen = 0;

  function pushStr(s) {
    var arr = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) arr[i] = s.charCodeAt(i) & 0xff;
    chunks.push(arr);
    byteLen += arr.length;
  }

  function pushBytes(u8) {
    chunks.push(u8);
    byteLen += u8.length;
  }

  function startObj(objNum) {
    offsets[objNum] = byteLen;
    pushStr(objNum + " 0 obj\n");
  }

  function endObj() {
    pushStr("\nendobj\n");
  }

  pushStr("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");

  // Fixed font objects: 3=Helv, 4=Helv-Bold, 5=Courier, 6=Courier-Bold, 7=Helv-Oblique
  var fonts = [
    { num: 3, base: "Helvetica" },
    { num: 4, base: "Helvetica-Bold" },
    { num: 5, base: "Courier" },
    { num: 6, base: "Courier-Bold" },
    { num: 7, base: "Helvetica-Oblique" }
  ];

  // Assign object numbers dynamically
  var nextObjNum = 8;
  var pageObjNums = [];
  var contentObjNums = [];
  var pageAnnotObjNums = [];
  var imgObjNums = {};

  for (var im = 0; im < this.allImages.length; im++) {
    imgObjNums[this.allImages[im].name] = nextObjNum++;
  }

  for (var p = 0; p < this.pages.length; p++) {
    pageObjNums.push(nextObjNum++);
    contentObjNums.push(nextObjNum++);
    var annots = [];
    for (var lk = 0; lk < this.pages[p].links.length; lk++) {
      annots.push(nextObjNum++);
    }
    pageAnnotObjNums.push(annots);
  }

  // Object 1: Catalog
  startObj(1);
  pushStr("<< /Type /Catalog /Pages 2 0 R >>");
  endObj();

  // Object 2: Pages Tree
  var kidsStr = pageObjNums.map(function(n) { return n + " 0 R"; }).join(" ");
  startObj(2);
  pushStr("<< /Type /Pages /Kids [ " + kidsStr + " ] /Count " + this.pages.length + " >>");
  endObj();

  // Objects 3..7: Standard Type1 Fonts (WinAnsiEncoding supports French accents)
  for (var f = 0; f < fonts.length; f++) {
    startObj(fonts[f].num);
    pushStr("<< /Type /Font /Subtype /Type1 /BaseFont /" + fonts[f].base + " /Encoding /WinAnsiEncoding >>");
    endObj();
  }

  // Image XObjects (JPEG DCTDecode)
  for (var j = 0; j < this.allImages.length; j++) {
    var img = this.allImages[j];
    var objN = imgObjNums[img.name];
    startObj(objN);
    pushStr(
      "<< /Type /XObject /Subtype /Image /Width " + img.width + " /Height " + img.height +
      " /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length " + img.bytes.length + " >>\nstream\n"
    );
    pushBytes(img.bytes);
    pushStr("\nendstream");
    endObj();
  }

  // Page Objects, Content Streams, and Clickable Link Annotations
  for (var pg = 0; pg < this.pages.length; pg++) {
    var pageData = this.pages[pg];
    var pObj = pageObjNums[pg];
    var cObj = contentObjNums[pg];
    var aObjs = pageAnnotObjNums[pg];

    var xobjEntries = pageData.images.map(function(nm) {
      return "/" + nm + " " + imgObjNums[nm] + " 0 R";
    }).join(" ");
    var xobjDict = xobjEntries ? (" /XObject << " + xobjEntries + " >>") : "";
    var annotsEntry = aObjs.length > 0
      ? (" /Annots [ " + aObjs.map(function(n) { return n + " 0 R"; }).join(" ") + " ]")
      : "";

    startObj(pObj);
    pushStr(
      "<< /Type /Page /Parent 2 0 R /MediaBox [ 0 0 " + this.pageW + " " + this.pageH + " ]" +
      " /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R /F4 6 0 R /F5 7 0 R >>" + xobjDict + " >>" +
      " /Contents " + cObj + " 0 R" + annotsEntry + " >>"
    );
    endObj();

    var streamStr = pageData.ops.join("\n");
    startObj(cObj);
    pushStr("<< /Length " + streamStr.length + " >>\nstream\n" + streamStr + "\nendstream");
    endObj();

    for (var l = 0; l < pageData.links.length; l++) {
      var lnk = pageData.links[l];
      var targetPageObj = pageObjNums[lnk.targetPage - 1] || pageObjNums[0];
      var r = lnk.rect.map(function(v) { return v.toFixed(2); }).join(" ");
      startObj(aObjs[l]);
      pushStr(
        "<< /Type /Annot /Subtype /Link /Rect [ " + r + " ] /Border [ 0 0 0 ]" +
        " /Dest [ " + targetPageObj + " 0 R /Fit ] >>"
      );
      endObj();
    }
  }

  // Cross-Reference Table (xref)
  var xrefOffset = byteLen;
  pushStr("xref\n0 " + nextObjNum + "\n");
  pushStr("0000000000 65535 f \n");
  for (var o = 1; o < nextObjNum; o++) {
    var offStr = String(offsets[o] || 0);
    while (offStr.length < 10) offStr = "0" + offStr;
    pushStr(offStr + " 00000 n \n");
  }

  pushStr("trailer\n<< /Size " + nextObjNum + " /Root 1 0 R >>\nstartxref\n" + xrefOffset + "\n%%EOF");
  return new Blob(chunks, { type: "application/pdf" });
};

function openMakePdfModal() {
  if (!playlistOrder || playlistOrder.length === 0) {
    alert("Load at least one song into the list before creating a PDF.");
    return;
  }
  var statusEl = document.getElementById('pdf-gen-status');
  if (statusEl) statusEl.innerText = playlistOrder.length + " song(s) ready to export.";
  document.getElementById('make-pdf-modal').classList.add('open');
}

function svgElementToJpegDataUrl(svgEl, scale) {
  return new Promise(function(resolve) {
    try {
      var clone = svgEl.cloneNode(true);
      var rawSvg = new XMLSerializer().serializeToString(clone);
      rawSvg = rawSvg
        .replace(/#ffffff/gi, '#111111')
        .replace(/#e0e0e0/gi, '#111111')
        .replace(/#4fc3f7/gi, '#0b5394')
        .replace(/#ffb74d/gi, '#b45f06')
        .replace(/var\(--text-bright\)/gi, '#111111')
        .replace(/var\(--text-main\)/gi, '#111111')
        .replace(/var\(--chord-color\)/gi, '#0b5394');

      var w = parseFloat(svgEl.getAttribute('width')) || svgEl.getBoundingClientRect().width || 96;
      var h = parseFloat(svgEl.getAttribute('height')) || svgEl.getBoundingClientRect().height || 126;

      var img = new Image();
      var svgBlob = new Blob([rawSvg], { type: 'image/svg+xml;charset=utf-8' });
      var url = URL.createObjectURL(svgBlob);

      img.onload = function() {
        var canvas = document.createElement('canvas');
        canvas.width = Math.ceil(w * scale);
        canvas.height = Math.ceil(h * scale);
        var ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolve({ dataUrl: canvas.toDataURL('image/jpeg', 0.92), pxW: canvas.width, pxH: canvas.height });
      };
      img.onerror = function() {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      img.src = url;
    } catch (e) {
      resolve(null);
    }
  });
}

function compileSongForPdf(rawText, chordsLocMode, diagramPosMode) {
  var locEl = document.getElementById('opt-chords-location');
  var diagEl = document.getElementById('opt-show-chord-diagrams');

  var origLoc = locEl ? locEl.value : 'in-lyrics';
  var origDiag = diagEl ? diagEl.checked : true;

  if (locEl) locEl.value = chordsLocMode;
  if (diagEl) diagEl.checked = (diagramPosMode !== 'none');

  var lines = rawText.split(/\r?\n/).map(function(ln) { return ln.trim(); });
  lines = lines.filter(function(ln) { return !ln.toLowerCase().startsWith('{chordpos:'); });
  lines.unshift('{ChordPos: ' + diagramPosMode + '}');

  var html = compileMarkupToHTML(lines);

  if (locEl) locEl.value = origLoc;
  if (diagEl) diagEl.checked = origDiag;

  return html;
}
async function generateSongsPDF() {
  var formats = [];
  if (document.getElementById('pdf-fmt-in-lyrics').checked) {
    formats.push({ key: 'in-lyrics', label: 'Chords in Lyrics' });
  }
  if (document.getElementById('pdf-fmt-left').checked) {
    formats.push({ key: 'left-of-lyrics', label: 'Chords Left' });
  }
  if (document.getElementById('pdf-fmt-none').checked) {
    formats.push({ key: 'none', label: 'No Chords' });
  }

  if (formats.length === 0) {
    alert("Please select at least one format checkbox.");
    return;
  }

  var diagramPos = document.getElementById('pdf-chord-diagrams').value || 'none';
  var bookTitle = (document.getElementById('pdf-book-title').value || 'Songbook').trim();
  var statusEl = document.getElementById('pdf-gen-status');
  statusEl.innerText = "Building PDF pages & diagrams...";

  var fileHandle = null;
  var suggestedFileName = bookTitle.replace(/[^a-z0-9_\-\s]/gi, '').trim().replace(/\s+/g, '_') + '.pdf';
  if (window.showSaveFilePicker) {
    try {
      fileHandle = await window.showSaveFilePicker({
        suggestedName: suggestedFileName,
        types: [{
          description: 'PDF Document',
          accept: { 'application/pdf': ['.pdf'] }
        }]
      });
    } catch (err) {
      if (err && err.name === 'AbortError') {
        statusEl.innerText = "Export canceled.";
        return;
      }
    }
  }

  var doc = new SimplePDFBuilder();
  var pageW = doc.pageW;
  var pageH = doc.pageH;
  var marginX = 48;
  var marginTop = 50;
  var marginBottom = 48;
  var maxW = pageW - marginX * 2;

  var isMultiSong = playlistOrder.length > 1;
  var tocEntries = [];
  var tocPageNumbers = [];

  if (isMultiSong) {
    doc.text(bookTitle, pageW / 2, 230, { font: "F2", size: 28, align: "center", r: 20, g: 20, b: 20 });

    var formatSummary = formats.map(function(f) { return f.label; }).join('  -  ');
    doc.text(playlistOrder.length + " Songs  |  " + formatSummary, pageW / 2, 268, { font: "F1", size: 13, align: "center", r: 90, g: 90, b: 90 });

    var todayStr = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    doc.text(todayStr, pageW / 2, 294, { font: "F1", size: 11, align: "center", r: 110, g: 110, b: 110 });

    var totalEntries = playlistOrder.length * formats.length;
    var tocPagesNeeded = Math.max(1, Math.ceil(totalEntries / 32));
    for (var tp = 0; tp < tocPagesNeeded; tp++) {
      tocPageNumbers.push(doc.addPage());
    }
  }

  var sandbox = document.createElement('div');
  sandbox.style.position = 'fixed';
  sandbox.style.left = '-9999px';
  sandbox.style.top = '0';
  sandbox.style.width = '800px';
  document.body.appendChild(sandbox);

  var firstContentPageCreated = false;

  for (var sIdx = 0; sIdx < playlistOrder.length; sIdx++) {
    var songName = playlistOrder[sIdx];
    var rawText = loadedSongsMap[songName] || "";

    for (var fIdx = 0; fIdx < formats.length; fIdx++) {
      var fmt = formats[fIdx];

      if (isMultiSong || firstContentPageCreated) {
        doc.addPage();
      }
      firstContentPageCreated = true;

      var startPage = doc.getNumberOfPages();
      var entryTitle = formats.length > 1 ? (songName + " (" + fmt.label + ")") : songName;
      tocEntries.push({ title: entryTitle, page: startPage });

      sandbox.innerHTML = compileSongForPdf(rawText, fmt.key, diagramPos);
      var y = marginTop;

      var ensureSpace = function(neededH) {
        if (y + neededH > pageH - marginBottom) {
          doc.addPage();
          y = marginTop;
        }
      };

      var renderDiagramsStrip = async function(stripEl) {
        var svgs = stripEl.querySelectorAll('svg');
        if (!svgs.length) return;
        var cardW = 74;
        var cardH = 96;
        var gap = 10;
        var perRow = Math.max(1, Math.floor((maxW + gap) / (cardW + gap)));
        var rows = Math.ceil(svgs.length / perRow);
        ensureSpace(rows * (cardH + 8) + 8);

        var col = 0;
        for (var i = 0; i < svgs.length; i++) {
          var jpg = await svgElementToJpegDataUrl(svgs[i], 2.5);
          if (jpg) {
            var drawX = marginX + col * (cardW + gap);
            doc.addJpegImage(jpg.dataUrl, drawX, y, cardW, cardH, jpg.pxW, jpg.pxH);
          }
          col++;
          if (col >= perRow) {
            col = 0;
            y += cardH + 8;
          }
        }
        if (col > 0) y += cardH + 8;
        y += 6;
      };
      var children = Array.from(sandbox.children);
      for (var c = 0; c < children.length; c++) {
        var node = children[c];

        if (node.classList.contains('song-title')) {
          ensureSpace(30);
          doc.text(node.innerText.trim(), pageW / 2, y, { font: "F2", size: 20, align: "center", r: 15, g: 15, b: 15 });
          y += 24;
        } else if (node.classList.contains('song-subtitle')) {
          ensureSpace(22);
          doc.text(node.innerText.trim(), pageW / 2, y, { font: "F5", size: 13, align: "center", r: 80, g: 80, b: 80 });
          y += 18;
        } else if (node.classList.contains('meta-line')) {
          ensureSpace(16);
          doc.text(node.innerText.trim(), marginX, y, { font: "F1", size: 10, r: 60, g: 60, b: 60 });
          y += 14;
        } else if (node.classList.contains('chord-diagrams-strip')) {
          await renderDiagramsStrip(node);
        } else if (node.classList.contains('song-table')) {
          var rows = node.querySelectorAll('tr');
          for (var r = 0; r < rows.length; r++) {
            var paraCell = rows[r].querySelector('.para-cell');
            var contentCell = rows[r].querySelector('.content-cell');
            var paraLabel = paraCell ? paraCell.innerText.trim() : '';
            var leftOffset = paraLabel ? 68 : 0;

            if (paraLabel) {
              ensureSpace(20);
              doc.text(paraLabel, marginX, y + 10, { font: "F2", size: 10, r: 180, g: 95, b: 6 });
            }

            if (!contentCell) continue;
            var blocks = Array.from(contentCell.children);
            for (var b = 0; b < blocks.length; b++) {
              var blk = blocks[b];

              if (blk.classList.contains('line-container')) {
                var chordRow = blk.querySelector('.chord-row');
                var lyricRow = blk.querySelector('.lyrics-row');
                var chordTxt = chordRow ? chordRow.textContent.replace(/\u00a0/g, ' ') : '';
                var lyricTxt = lyricRow ? lyricRow.textContent.replace(/\u00a0/g, ' ') : '';

                var needed = (chordTxt.trim() ? 13 : 0) + 15;
                ensureSpace(needed);

                if (chordTxt.trim()) {
                  doc.text(chordTxt, marginX + leftOffset, y + 10, { font: "F4", size: 10.5, r: 11, g: 83, b: 148 });
                  y += 12;
                }
                if (lyricTxt.trim() || !chordTxt.trim()) {
                  doc.text(lyricTxt, marginX + leftOffset, y + 10, { font: "F3", size: 10.5, r: 20, g: 20, b: 20 });
                  y += 15;
                }
              } else if (blk.classList.contains('left-chords-row')) {
                var lChords = blk.querySelector('.left-chords-col');
                var lLyrics = blk.querySelector('.left-lyrics-col');
                var cStr = lChords ? lChords.textContent.replace(/\u00a0/g, ' ').trim() : '';
                var lStr = lLyrics ? lLyrics.textContent.replace(/\u00a0/g, ' ') : '';

                ensureSpace(16);
                doc.text(cStr, marginX + leftOffset, y + 10, { font: "F4", size: 10.5, r: 11, g: 83, b: 148 });
                doc.text(lStr, marginX + leftOffset + 115, y + 10, { font: "F3", size: 10.5, r: 20, g: 20, b: 20 });
                y += 15;
              } else {
                var plainLine = blk.textContent.replace(/\u00a0/g, ' ').trimRight();
                if (!plainLine) {
                  y += 8;
                } else {
                  ensureSpace(15);
                  doc.text(plainLine, marginX + leftOffset, y + 10, { font: "F4", size: 10.5, r: 11, g: 83, b: 148 });
                  y += 14;
                }
              }
            }
            y += 6;
          }
        } else {
          var rawBlockText = node.innerText || '';
          var tabLines = rawBlockText.split(/\r?\n/).filter(function(l) { return l.trim() !== ''; });
          if (tabLines.length > 0) {
            y += 4;
            for (var tl = 0; tl < tabLines.length; tl++) {
              ensureSpace(13);
              doc.text(tabLines[tl], marginX, y + 9, { font: "F3", size: 9.5, r: 35, g: 35, b: 35 });
              y += 12;
            }
            y += 6;
          }
        }
      }
    }
  }

  document.body.removeChild(sandbox);

  if (isMultiSong && tocPageNumbers.length > 0) {
    var entryIdx = 0;
    for (var p = 0; p < tocPageNumbers.length; p++) {
      doc.setPage(tocPageNumbers[p]);
      var tocY = 65;

      doc.text("Table of Contents", marginX, tocY, { font: "F2", size: 20, r: 20, g: 20, b: 20 });
      tocY += 28;
      doc.line(marginX, tocY - 12, pageW - marginX, tocY - 12);

      while (entryIdx < tocEntries.length && tocY < pageH - 60) {
        var item = tocEntries[entryIdx];
        var numLabel = (entryIdx + 1) + ". " + item.title;
        var pageLabel = "p. " + item.page;

        doc.text(numLabel, marginX, tocY, { font: "F1", size: 12, r: 17, g: 85, b: 204 });
        doc.text(pageLabel, pageW - marginX, tocY, { font: "F1", size: 12, align: "right", r: 90, g: 90, b: 90 });
        doc.addLink(marginX, tocY - 12, maxW, 18, item.page);

        tocY += 21;
        entryIdx++;
      }
    }
  }

  var totalPages = doc.getNumberOfPages();
  var firstBodyPage = isMultiSong ? (1 + tocPageNumbers.length + 1) : 1;
  for (var pg = firstBodyPage; pg <= totalPages; pg++) {
    doc.setPage(pg);
    doc.text("Page " + pg + " of " + totalPages, pageW / 2, pageH - 24, { font: "F1", size: 9, align: "center", r: 130, g: 130, b: 130 });
  }

  var pdfBlob = doc.toBlob();
  if (fileHandle) {
    var writable = await fileHandle.createWritable();
    await writable.write(pdfBlob);
    await writable.close();
  } else {
    var dlUrl = URL.createObjectURL(pdfBlob);
    var a = document.createElement('a');
    a.href = dlUrl;
    a.download = suggestedFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(dlUrl);
  }

  statusEl.innerText = "PDF saved successfully!";
  setTimeout(function() { closeModal('make-pdf-modal'); }, 700);
}
