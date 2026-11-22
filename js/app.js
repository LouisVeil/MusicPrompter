function renderPlaylist() {
  var listContainer = document.getElementById('song-list');
  listContainer.innerHTML = '';

  if (playlistOrder.length === 0) {
    listContainer.innerHTML = '<div style="color: #555; text-align: center; font-size: 13px; margin-top: 20px;">No songs loaded yet.</div>';
    return;
  }

  playlistOrder.forEach(function(songName, index) {
    var li = document.createElement('li');
    if (songName === activeSongName) li.className = 'active';

    var topRow = document.createElement('div');
    topRow.className = 'song-row-top';

    var textSpan = document.createElement('span');
    textSpan.className = 'song-item-text';
    textSpan.innerText = songName;
    textSpan.onclick = function() { selectSong(songName); };
    topRow.appendChild(textSpan);

    var controlsDiv = document.createElement('div');
    controlsDiv.className = 'song-controls';

    // 1. Move Up
    var upBtn = document.createElement('button');
    upBtn.className = 'control-btn';
    upBtn.innerText = '▲';
    upBtn.onclick = function() { moveSong(index, -1); };
    controlsDiv.appendChild(upBtn);

    // 2. Move Down
    var downBtn = document.createElement('button');
    downBtn.className = 'control-btn';
    downBtn.innerText = '▼';
    downBtn.onclick = function() { moveSong(index, 1); };
    controlsDiv.appendChild(downBtn);

    // 3. Edit Pencil
    var editBtn = document.createElement('button');
    editBtn.className = 'control-btn edit';
    editBtn.innerText = '✏️';
    editBtn.onclick = function() { toggleEditSongMode(songName); };
    controlsDiv.appendChild(editBtn);

    // 4. Save Disk
    var saveBtn = document.createElement('button');
    saveBtn.className = 'control-btn save-disk';
    saveBtn.innerText = '💾';

    if (modifiedSongsStatus[songName] === true) {
      saveBtn.className += ' active';
      saveBtn.onclick = function() {
        var origin = songSourcesMap[songName] || "txt";
        if (origin !== "txt") {
          alert(
            "'" + songName + "' belongs to the setlist '" + origin + "'.\n\n" +
            "Please use 'Save Current List as Set' or 'Save All Songs' in the Song List menu (⋮) to save changes to a .json setlist."
          );
          return;
        }
        exportAndOverrideLaptopFile(songName);
      };
    } else {
      saveBtn.onclick = function() { alert("No changes detected to write for: " + songName); };
    }
    controlsDiv.appendChild(saveBtn);

    // 5. Remove
    var delBtn = document.createElement('button');
    delBtn.className = 'control-btn del';
    delBtn.innerText = '✕';
    delBtn.onclick = function() { removeSong(index, songName); };
    controlsDiv.appendChild(delBtn);

    // 6. Duplicate
    var dupBtn = document.createElement('button');
    dupBtn.className = 'control-btn';
    dupBtn.innerText = '+';
    dupBtn.title = 'Duplicate Song';
    dupBtn.onclick = function() { duplicateSong(index, songName); };
    controlsDiv.appendChild(dupBtn);

    topRow.appendChild(controlsDiv);
    li.appendChild(topRow);

    var origin = songSourcesMap[songName] || "txt";
    var sourceDisplayName = (origin === "txt") ? (songName + ".txt") : origin;

    var sourceDiv = document.createElement('div');
    sourceDiv.className = 'song-source-line';
    sourceDiv.innerText = "source: " + sourceDisplayName;
    sourceDiv.onclick = function() { selectSong(songName); };
    li.appendChild(sourceDiv);

    listContainer.appendChild(li);
  });
}

function toggleEditSongMode(songName) {
  if (isScrolling) toggleScroll();
  activeSongName = songName;
  renderPlaylist();

  var currentRawText = loadedSongsMap[songName] || "";
  var stage = document.getElementById('prompter-stage');
  stage.innerHTML = "";

  var header = document.createElement("h2");
  header.style.marginTop = "0";
  header.innerText = "Editing: " + songName;
  stage.appendChild(header);

  var textarea = document.createElement("textarea");
  textarea.id = "edit-box";
  textarea.value = currentRawText;
  textarea.style.width = "100%";
  textarea.style.height = "350px";
  textarea.style.background = "#1a1a1a";
  textarea.style.color = "#fff";
  textarea.style.fontFamily = "monospace";
  textarea.style.padding = "15px";
  textarea.style.border = "1px solid #444";
  textarea.style.borderRadius = "4px";
  textarea.style.boxSizing = "border-box";
  textarea.style.marginBottom = "15px";
  stage.appendChild(textarea);
  stage.appendChild(document.createElement("br"));

  var updateBtn = document.createElement("button");
  updateBtn.className = "btn";
  updateBtn.style.background = "#1155cc";
  updateBtn.style.marginRight = "10px";
  updateBtn.innerText = "✏️ Update & Render View";
  updateBtn.onclick = function() { updateAndRenderViewOnly(songName); };
  stage.appendChild(updateBtn);

  var cancelBtn = document.createElement("button");
  cancelBtn.className = "btn";
  cancelBtn.style.background = "#444";
  cancelBtn.innerText = "Cancel";
  cancelBtn.onclick = function() { selectSong(songName); };
  stage.appendChild(cancelBtn);
}

function updateAndRenderViewOnly(songName) {
  var editedContent = document.getElementById('edit-box').value;
  loadedSongsMap[songName] = editedContent;
  modifiedSongsStatus[songName] = true;

  selectSong(songName);
  saveAppStateToCache();
}

function moveSong(index, direction) {
  var targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= playlistOrder.length) return;
  var temp = playlistOrder[index];
  playlistOrder[index] = playlistOrder[targetIndex];
  playlistOrder[targetIndex] = temp;
  renderPlaylist();
}

function removeSong(index, songName) {
  playlistOrder.splice(index, 1);
  delete modifiedSongsStatus[songName];
  delete songSourcesMap[songName];
  if (activeSongName === songName) {
    if (isScrolling) toggleScroll();
    activeSongName = null;
    document.getElementById('prompter-stage').innerHTML =
      "<div id='welcome-message'><h2>Ready to Jam?</h2><p>Select a song from your playlist sidebar to load it onto the stage view.</p></div>";
  }
  renderPlaylist();
}

function duplicateSong(index, songName) {
  var baseName = "Copy of " + songName;
  var newName = baseName;
  var counter = 2;

  while (newName in loadedSongsMap) {
    newName = baseName + " (" + counter + ")";
    counter++;
  }

  loadedSongsMap[newName] = loadedSongsMap[songName] || "";
  songSourcesMap[newName] = songSourcesMap[songName] || "txt";
  modifiedSongsStatus[newName] = true;

  playlistOrder.splice(index + 1, 0, newName);

  renderPlaylist();
  saveAppStateToCache();
}

function selectSong(songName) {
  if (isScrolling) toggleScroll();
  activeSongName = songName;
  renderPlaylist();

  var rawMarkupText = loadedSongsMap[songName];
  var rawLines = rawMarkupText.split(/\r?\n/).map(function(ln) { return ln.trim(); });

  document.getElementById('prompter-stage').innerHTML = compileMarkupToHTML(rawLines);
  syncLeftChordsColumnWidth();
  document.getElementById('viewport').scrollTo(0, 0);

  var foundTempo = 90;
  var firstMatchIdx = 0;

  rawLines.forEach(function(ln) {
    if (ln.toLowerCase().startsWith("{tempo:")) {
      var rawValue = ln.replace(/\{tempo:\s*/i, "").replace(/\}/, "").trim();
      var digitMatch = rawValue.match(/\d+/);
      if (digitMatch) {
        var extractedTempo = parseInt(digitMatch[firstMatchIdx], 10);
        if (!isNaN(extractedTempo)) foundTempo = extractedTempo;
      }
    }
  });
  document.getElementById('metro-bpm').value = foundTempo;
  updateMetronomeTempo();


  if (typeof loadBeatFromSongLines === 'function') {
    loadBeatFromSongLines(rawLines);
  }

  if (document.getElementById('auto-speed-toggle').checked) {
    toggleAutoSpeedState();
  } else {
    document.getElementById('scroll-speed').value = getManualSongScrollSpeed(rawMarkupText);
  }
  if (typeof appElapsedSeconds !== 'undefined') appElapsedSeconds = 0;
  if (typeof alignCursorToFirstLine === 'function') alignCursorToFirstLine();
  if (typeof bindLineClickHandlers === 'function') bindLineClickHandlers();
  if (typeof updateAppCursorPosition === 'function') updateAppCursorPosition();
}

function applyTempoToCurrentSong() {
  if (!activeSongName || !loadedSongsMap[activeSongName]) {
    alert("Select a song first before saving its BPM.");
    return;
  }

  var bpmVal = parseInt(document.getElementById('metro-bpm').value, 10);
  if (isNaN(bpmVal) || bpmVal < 30 || bpmVal > 300) {
    alert("Please enter a valid BPM between 30 and 300.");
    return;
  }

  var directiveLine = "{Tempo: " + bpmVal + "}";
  var lines = loadedSongsMap[activeSongName].split(/\r?\n/);
  var replaced = false;

  for (var i = 0; i < lines.length; i++) {
    if (lines[i].trim().toLowerCase().startsWith("{tempo:")) {
      lines[i] = directiveLine;
      replaced = true;
      break;
    }
  }

  if (!replaced) {
    var insertAt = 0;
    for (var j = 0; j < lines.length; j++) {
      if (lines[j].trim().toLowerCase().startsWith("{title:")) {
        insertAt = j + 1;
        break;
      }
    }
    lines.splice(insertAt, 0, directiveLine);
  }

  loadedSongsMap[activeSongName] = lines.join("\n");
  modifiedSongsStatus[activeSongName] = true;
  renderPlaylist();
  saveAppStateToCache();
  alert("Saved " + directiveLine + " to '" + activeSongName + "'.\n\nRemember to click 💾 on the song to write it to disk.");
}

function adjustTextSize(direction) {
  globalSizeModifier += direction;
  var activeRows = document.querySelectorAll('.chord-row, .lyrics-row, .para-cell, .left-chords-col, .left-lyrics-col');
  activeRows.forEach(function(row) {
    var currentSize = parseFloat(window.getComputedStyle(row).fontSize);
    row.style.fontSize = (currentSize + direction) + 'px';
  });
  syncLeftChordsColumnWidth();

  if (document.getElementById('auto-speed-toggle').checked) {
    toggleAutoSpeedState();
  }
}

function syncLeftChordsColumnWidth() {
  var chordCols = document.querySelectorAll('.left-chords-col');
  if (chordCols.length === 0) return;

  chordCols.forEach(function(col) {
    col.style.width = 'auto';
  });

  var maxWidth = 0;
  chordCols.forEach(function(col) {
    var w = col.getBoundingClientRect().width;
    if (w > maxWidth) maxWidth = w;
  });

  if (maxWidth > 0) {
    var unifiedWidth = Math.ceil(maxWidth) + 'px';
    chordCols.forEach(function(col) {
      col.style.width = unifiedWidth;
    });
  }
}

function clearEntirePlaylist() {
  if (playlistOrder.length === 0) return;

  if (confirm("Are you sure you want to clear your entire playlist?")) {
    if (isScrolling) toggleScroll();

    loadedSongsMap = {};
    playlistOrder = [];
    activeSongName = null;
    modifiedSongsStatus = {};
    songSourcesMap = {};
    activeSetlistHandleName = null;

    localStorage.clear();

    document.getElementById('prompter-stage').innerHTML =
      "<div id='welcome-message'>" +
        "<h2>Ready to Jam?</h2>" +
        "<p>Click \"Load Songs Directory\" at the top left, select one or multiple song text sheets from your laptop, and they will populate your playlist menu instantly.</p>" +
      "</div>";

    renderPlaylist();
  }
}

// Sidebar & Modal Controllers
function toggleSidebarView() {
  var sidebar = document.getElementById('sidebar');
  var toggleBtn = document.getElementById('sidebar-toggle-btn');
  sidebar.classList.toggle('hidden');

  if (sidebar.classList.contains('hidden')) {
    toggleBtn.innerText = '▶';
    toggleBtn.title = 'Show Song List';
  } else {
    toggleBtn.innerText = '◀';
    toggleBtn.title = 'Hide Song List';
  }
}

var currentSidebarTab = 'songs';

function switchSidebarTab(tabName) {
  currentSidebarTab = tabName;
  closeSidebarMenu();

  var songListEl = document.getElementById('song-list');
  var beatsPanelEl = document.getElementById('beats-panel');
  var recordPanelEl = document.getElementById('record-panel');
  var menuWrapper = document.getElementById('sidebar-menu-wrapper');

  var songsBtn = document.getElementById('tab-btn-songs');
  var beatsBtn = document.getElementById('tab-btn-beats');
  var recordBtn = document.getElementById('tab-btn-record');

  songListEl.style.display = (tabName === 'songs') ? 'block' : 'none';
  beatsPanelEl.style.display = (tabName === 'beats') ? 'flex' : 'none';
  if (recordPanelEl) recordPanelEl.style.display = (tabName === 'record') ? 'flex' : 'none';
  if (menuWrapper) menuWrapper.style.display = (tabName === 'record') ? 'none' : 'inline-block';

  songsBtn.classList.toggle('active', tabName === 'songs');
  beatsBtn.classList.toggle('active', tabName === 'beats');
  if (recordBtn) recordBtn.classList.toggle('active', tabName === 'record');
}

function toggleSidebarMenu(event) {
  event.stopPropagation();
  var activeMenuId = (currentSidebarTab === 'beats') ? 'beats-dropdown' : 'sidebar-dropdown';
  var otherMenuId = (currentSidebarTab === 'beats') ? 'sidebar-dropdown' : 'beats-dropdown';

  var activeMenu = document.getElementById(activeMenuId);
  var otherMenu = document.getElementById(otherMenuId);
  if (otherMenu) {
    otherMenu.classList.remove('open');
    otherMenu.style.display = 'none';
  }
  if (activeMenu) {
    var willOpen = !activeMenu.classList.contains('open');
    activeMenu.classList.toggle('open', willOpen);
    activeMenu.style.display = willOpen ? 'block' : 'none';
  }
}

function closeSidebarMenu() {
  ['sidebar-dropdown', 'beats-dropdown'].forEach(function(id) {
    var menu = document.getElementById(id);
    if (menu) {
      menu.classList.remove('open');
      menu.style.display = 'none';
    }
  });
}

window.addEventListener('click', function(event) {
  var wrapper = document.getElementById('sidebar-menu-wrapper');
  if (wrapper && !wrapper.contains(event.target)) {
    closeSidebarMenu();
  }
});

function openModal(modalId) {
  var modal = document.getElementById(modalId);
  if (modal) modal.classList.add('open');
}

function closeModal(modalId) {
  var modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('open');
}

function closeModalOnBackdrop(event, modalId) {
  if (event.target.id === modalId) {
    closeModal(modalId);
  }
}

function openSongInfoModal() {
  var titleEl = document.getElementById('info-modal-title');
  var bodyEl = document.getElementById('info-modal-body');

  if (!activeSongName) {
    titleEl.innerText = "ℹ Song Info";
    bodyEl.innerHTML = "<div style='color: #777;'>Select a song from your list first.</div>";
    openModal('info-modal');
    return;
  }

  titleEl.innerText = "ℹ " + activeSongName;

  if (currentSongHeaderInfo.length === 0) {
    bodyEl.innerHTML = "<div style='color: #777;'>No header info found before the first section of this song.</div>";
  } else {
    var infoHtml = "";
    currentSongHeaderInfo.forEach(function(item) {
      var colonIdx = item.indexOf(":");
      if (colonIdx !== -1) {
        var label = item.substring(0, colonIdx).trim();
        var val = item.substring(colonIdx + 1).trim();
        var formattedLabel = label.charAt(0).toUpperCase() + label.slice(1);
        infoHtml += "<div class='info-entry'><b>" + formattedLabel + ":</b> " + val + "</div>";
      } else {
        infoHtml += "<div class='info-entry'>" + item + "</div>";
      }
    });
    bodyEl.innerHTML = infoHtml;
  }

  openModal('info-modal');
}

function openSettingsModal() {
  var layoutContainer = document.getElementById('settings-layout-info');

  if (!activeSongName) {
    layoutContainer.innerHTML = "<div style='color: #666;'>No song selected.</div>";
  } else if (currentSongLayoutInfo.length === 0) {
    layoutContainer.innerHTML = "<div style='color: #666;'>Using default layout settings (no directives in song).</div>";
  } else {
    var html = "";
    currentSongLayoutInfo.forEach(function(item) {
      var colonIdx = item.indexOf(":");
      if (colonIdx !== -1) {
        var label = item.substring(0, colonIdx).trim();
        var val = item.substring(colonIdx + 1).trim();
        html += "<div><b style='color: var(--chord-color);'>" + label + ":</b> " + val + "</div>";
      } else {
        html += "<div>" + item + "</div>";
      }
    });
    layoutContainer.innerHTML = html;
  }

  openModal('settings-modal');
}

function applyDisplaySettings() {
  if (!activeSongName || !loadedSongsMap[activeSongName]) return;
  var rawLines = loadedSongsMap[activeSongName].split(/\r?\n/).map(function(ln) { return ln.trim(); });
  document.getElementById('prompter-stage').innerHTML = compileMarkupToHTML(rawLines);
  syncLeftChordsColumnWidth();

  if (document.getElementById('auto-speed-toggle').checked) {
    toggleAutoSpeedState();
  }
}

// Batch Edit Modal Controllers
function openBatchEditModal() {
  if (playlistOrder.length === 0) {
    alert("No songs loaded to edit.");
    return;
  }
  document.getElementById('batch-preview-status').innerText = "";
  openModal('batch-edit-modal');
}

function clearBatchScript() {
  var inputEl = document.getElementById('batch-script-input');
  var statusEl = document.getElementById('batch-preview-status');
  if (inputEl) {
    inputEl.value = "";
    inputEl.focus();
  }
  if (statusEl) {
    statusEl.innerText = "";
  }
}

function runBatchScript(isPreviewOnly) {
  var code = document.getElementById('batch-script-input').value.trim();
  var statusEl = document.getElementById('batch-preview-status');

  if (!code) {
    statusEl.style.color = "#ff5252";
    statusEl.innerText = "Please enter a script first.";
    return;
  }

  var transformFn;
  try {
    transformFn = new Function("text", "name", code);
  } catch (syntaxErr) {
    statusEl.style.color = "#ff5252";
    statusEl.innerText = "Script Syntax Error: " + syntaxErr.message;
    return;
  }

  var modifiedCount = 0;
  var updatedDrafts = {};

  try {
    for (var i = 0; i < playlistOrder.length; i++) {
      var songName = playlistOrder[i];
      var originalText = loadedSongsMap[songName] || "";
      var resultText = transformFn(originalText, songName);

      if (typeof resultText !== "string") {
        throw new Error("Script must return a string (failed on '" + songName + "').");
      }

      if (resultText !== originalText) {
        modifiedCount++;
        updatedDrafts[songName] = resultText;
      }
    }
  } catch (execErr) {
    statusEl.style.color = "#ff5252";
    statusEl.innerText = "Execution Error: " + execErr.message;
    return;
  }

  if (isPreviewOnly) {
    statusEl.style.color = "#ffb74d";
    statusEl.innerText = "Preview: " + modifiedCount + " of " + playlistOrder.length + " song(s) will be modified.";
    return;
  }

  if (modifiedCount === 0) {
    statusEl.style.color = "#aaa";
    statusEl.innerText = "No changes detected across any loaded songs.";
    return;
  }

  Object.keys(updatedDrafts).forEach(function(songName) {
    loadedSongsMap[songName] = updatedDrafts[songName];
    modifiedSongsStatus[songName] = true;
  });

  renderPlaylist();
  saveAppStateToCache();

  if (activeSongName && updatedDrafts[activeSongName]) {
    var rawLines = loadedSongsMap[activeSongName].split(/\r?\n/).map(function(ln) { return ln.trim(); });
    document.getElementById('prompter-stage').innerHTML = compileMarkupToHTML(rawLines);
    syncLeftChordsColumnWidth();
  }

  closeModal('batch-edit-modal');
  alert("Success! Updated " + modifiedCount + " song(s). Use 'Save All Songs' in the menu to write changes to disk.");
}

// Keyboard Shortcuts
window.addEventListener('keydown', function(event) {
  var activeTag = document.activeElement.tagName.toLowerCase();
  if (activeTag === 'input' || activeTag === 'textarea') return;

  var speedInput = document.getElementById('scroll-speed');
  var currentSpeed = parseFloat(speedInput.value) || 1;
  var viewport = document.getElementById('viewport');

  switch (event.code) {
    case 'Space':
      event.preventDefault();
      toggleScroll();
      break;

    case 'ArrowUp':
      event.preventDefault();
      var newSpeedUp = (currentSpeed + 0.2).toFixed(1);
      speedInput.value = newSpeedUp;
      if (isScrolling) {
        clearInterval(scrollInterval);
        scrollInterval = setInterval(function() { viewport.scrollBy(0, parseFloat(newSpeedUp)); }, 16.67);
      }
      break;

    case 'ArrowDown':
      event.preventDefault();
      var newSpeedDown = Math.max(0.1, currentSpeed - 0.2).toFixed(1);
      speedInput.value = newSpeedDown;
      if (isScrolling) {
        clearInterval(scrollInterval);
        scrollInterval = setInterval(function() { viewport.scrollBy(0, parseFloat(newSpeedDown)); }, 16.67);
      }
      break;

    case 'ArrowRight':
      event.preventDefault();
      viewport.scrollBy(0, 150);
      break;

    case 'ArrowLeft':
      event.preventDefault();
      viewport.scrollBy(0, -150);
      break;
  }
});
