var isBeatRunning = false;
var beatSchedulerTimer = null;
var beatCurrentStep = 0;
var beatNextNoteTime = 0;
var savedBeatPresets = {};
var activeBeatTracks = [];
var beatTrackIdCounter = 1;
var beatMasterGain = null;

var NOTE_FREQS = {
  'C': 130.81, 'Cm': 130.81,
  'D': 146.83, 'Dm': 146.83,
  'E': 164.81, 'Em': 164.81,
  'F': 174.61,
  'G': 196.00,
  'A': 220.00, 'Am': 220.00,
  'B': 246.94, 'Bm': 246.94
};

var TRACK_CATALOG = {
  drums: {
    icon: '🥁', label: 'Drums', defaultVol: 80,
    styles: [
      { id: 'rock', label: 'Rock Straight' },
      { id: 'pop', label: 'Pop Groove' },
      { id: 'funk', label: 'Funk Syncopated' },
      { id: 'shuffle', label: 'Blues Shuffle' },
      { id: 'bossa', label: 'Bossa Nova' },
      { id: 'reggae', label: 'Reggae One-Drop' },
      { id: 'waltz', label: 'Waltz (3/4)' },
      { id: 'country', label: 'Country Train' }
    ]
  },
  bass: {
    icon: '🎸', label: 'Bass', defaultVol: 75,
    styles: [
      { id: 'root-fifth', label: 'Root - Fifth' },
      { id: 'rock-eighths', label: 'Rock 8th Pulse' },
      { id: 'walking', label: 'Walking Bass' },
      { id: 'funk-octave', label: 'Funk Octave Groove' },
      { id: 'reggae-dub', label: 'Reggae Dub' },
      { id: 'bossa-bass', label: 'Bossa Nova Bass' }
    ]
  },
  guitar: {
    icon: '🪕', label: 'Guitar', defaultVol: 65,
    styles: [
      { id: 'chord-strum', label: 'Chord: Folk Strum' },
      { id: 'chord-funk', label: 'Chord: Funk Chop' },
      { id: 'chord-reggae', label: 'Chord: Reggae Skank' },
      { id: 'riff-arp', label: 'Riff: Fingerpick Arp' },
      { id: 'riff-blues', label: 'Riff: Blues Shuffle' }
    ]
  },
  piano: {
    icon: '🎹', label: 'Piano', defaultVol: 65,
    styles: [
      { id: 'chord-comp', label: 'Chord: Pop Comping' },
      { id: 'chord-bossa', label: 'Chord: Bossa Syncopation' },
      { id: 'riff-arp', label: 'Riff: Ballad Arpeggio' },
      { id: 'riff-boogie', label: 'Riff: Boogie Woogie' }
    ]
  }
};

var DRUM_PATTERNS = {
  rock:    { steps: 16, kick: "1000100010001000".split("").map(Number), snare: "0000100000001000".split("").map(Number), hat: "1010101010101010".split("").map(Number) },
  pop:     { steps: 16, kick: "1000001010100000".split("").map(Number), snare: "0000100000001000".split("").map(Number), hat: "1111111111111111".split("").map(Number) },
  funk:    { steps: 16, kick: "1001001000100100".split("").map(Number), snare: "0000100100001010".split("").map(Number), hat: "1011101110111011".split("").map(Number) },
  shuffle: { steps: 12, kick: "100000100000".split("").map(Number),     snare: "000100000100".split("").map(Number),     hat: "101101101101".split("").map(Number) },
  bossa:   { steps: 16, kick: "1001100110011001".split("").map(Number), snare: "1001001000100100".split("").map(Number), hat: "1010101010101010".split("").map(Number) },
  reggae:  { steps: 16, kick: "0000100000001000".split("").map(Number), snare: "0000100000001000".split("").map(Number), hat: "1010101010101010".split("").map(Number) },
  waltz:   { steps: 12, kick: "100000000000".split("").map(Number),     snare: "000010001000".split("").map(Number),     hat: "100010001000".split("").map(Number) },
  country: { steps: 16, kick: "1000000010000000".split("").map(Number), snare: "0000101000001010".split("").map(Number), hat: "1111111111111111".split("").map(Number) }
};

var BASS_PATTERNS = {
  'root-fifth':   [0,null,null,null, null,null,null,null, 7,null,null,null, null,null,null,null],
  'rock-eighths': [0,null,0,null,    0,null,0,null,       5,null,5,null,    7,null,7,null],
  'walking':      [0,null,null,null, 4,null,null,null,    7,null,null,null, 9,null,null,null],
  'funk-octave':  [0,null,12,null,   null,0,null,7,       10,null,12,null,  0,null,null,null],
  'reggae-dub':   [0,null,null,0,    null,null,7,null,    0,null,null,null, null,null,null,null],
  'bossa-bass':   [0,null,null,7,    7,null,null,0,       0,null,null,7,    7,null,null,0]
};

var GUITAR_PATTERNS = {
  'chord-strum':  { mode: 'chord', steps: "1000101000101010".split("").map(Number) },
  'chord-funk':   { mode: 'chord', steps: "0010001001001010".split("").map(Number) },
  'chord-reggae': { mode: 'chord', steps: "0010001000100010".split("").map(Number) },
  'riff-arp':     { mode: 'riff',  notes: [0,null,7,null, 12,null,16,null, 19,null,16,null, 12,null,7,null] },
  'riff-blues':   { mode: 'riff',  notes: [0,null,null,4, null,null,7,null, 9,null,null,7, null,null,4,null] }
};

var PIANO_PATTERNS = {
  'chord-comp':   { mode: 'chord', steps: "1000001000100000".split("").map(Number) },
  'chord-bossa':  { mode: 'chord', steps: "1001001000100100".split("").map(Number) },
  'riff-arp':     { mode: 'riff',  notes: [0,null,4,null, 7,null,12,null, 16,null,12,null, 7,null,4,null] },
  'riff-boogie':  { mode: 'riff',  notes: [0,null,4,null, 7,null,9,null, 10,null,9,null, 7,null,4,null] }
};
window.addEventListener('DOMContentLoaded', function() {
  var rawPresets = localStorage.getItem('prompter_saved_beats');
  if (rawPresets) {
    try { savedBeatPresets = JSON.parse(rawPresets); } catch (e) { savedBeatPresets = {}; }
  }
  refreshSavedBeatsDropdown();
  if (activeBeatTracks.length === 0) {
    addBeatTrack('drums');
  }
});

function ensureBeatAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  if (!beatMasterGain) {
    beatMasterGain = audioCtx.createGain();
    beatMasterGain.gain.setValueAtTime(1.0, audioCtx.currentTime);
    beatMasterGain.connect(audioCtx.destination);
  }
}

function getBeatOutputNode() {
  ensureBeatAudioCtx();
  return beatMasterGain;
}

function addBeatTrack(type, style, vol, isOn) {
  var meta = TRACK_CATALOG[type];
  if (!meta) return;
  activeBeatTracks.push({
    id: beatTrackIdCounter++,
    type: type,
    on: (typeof isOn === 'boolean') ? isOn : true,
    style: style || meta.styles[0].id,
    vol: (typeof vol === 'number') ? vol : meta.defaultVol
  });
  renderBeatTracks();
}

function removeBeatTrack(trackId) {
  activeBeatTracks = activeBeatTracks.filter(function(t) { return t.id !== trackId; });
  renderBeatTracks();
}

function updateBeatTrackProp(trackId, prop, value) {
  for (var i = 0; i < activeBeatTracks.length; i++) {
    if (activeBeatTracks[i].id === trackId) {
      activeBeatTracks[i][prop] = value;
      break;
    }
  }
}

function renderBeatTracks() {
  var container = document.getElementById('beat-tracks-container');
  if (!container) return;
  container.innerHTML = '';

  if (activeBeatTracks.length === 0) {
    container.innerHTML = '<div style="color:#666; font-size:12px; text-align:center; padding:10px 0;">Click + above to add a track.</div>';
    return;
  }

  var counts = { drums: 0, bass: 0, guitar: 0, piano: 0 };

  activeBeatTracks.forEach(function(tr) {
    var meta = TRACK_CATALOG[tr.type];
    counts[tr.type] = (counts[tr.type] || 0) + 1;

    var card = document.createElement('div');
    card.className = 'beat-track-card';

    var header = document.createElement('div');
    header.className = 'beat-track-header';

    var toggleLbl = document.createElement('label');
    toggleLbl.className = 'beat-track-toggle';
    var chk = document.createElement('input');
    chk.type = 'checkbox';
    chk.checked = tr.on;
    chk.onchange = function() { updateBeatTrackProp(tr.id, 'on', chk.checked); };
    var titleSpan = document.createElement('span');
    titleSpan.innerText = meta.icon + ' ' + meta.label + ' #' + counts[tr.type];
    toggleLbl.appendChild(chk);
    toggleLbl.appendChild(titleSpan);

    var rightBox = document.createElement('div');
    rightBox.style.display = 'flex';
    rightBox.style.alignItems = 'center';
    rightBox.style.gap = '6px';

    var slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '0';
    slider.max = '100';
    slider.value = tr.vol;
    slider.className = 'beat-vol-slider';
    slider.style.width = '68px';
    slider.oninput = function() { updateBeatTrackProp(tr.id, 'vol', parseInt(slider.value, 10)); };

    var delBtn = document.createElement('button');
    delBtn.className = 'beat-remove-btn';
    delBtn.innerText = '✕';
    delBtn.title = 'Remove Track';
    delBtn.onclick = function() { removeBeatTrack(tr.id); };

    rightBox.appendChild(slider);
    rightBox.appendChild(delBtn);
    header.appendChild(toggleLbl);
    header.appendChild(rightBox);

    var sel = document.createElement('select');
    sel.className = 'beat-select full';
    meta.styles.forEach(function(st) {
      var opt = document.createElement('option');
      opt.value = st.id;
      opt.innerText = st.label;
      if (st.id === tr.style) opt.selected = true;
      sel.appendChild(opt);
    });
    sel.onchange = function() { updateBeatTrackProp(tr.id, 'style', sel.value); };

    card.appendChild(header);
    card.appendChild(sel);
    container.appendChild(card);
  });
}
function getBeatSettingsState() {
  return {
    key: document.getElementById('beat-key-select').value,
    tracks: activeBeatTracks.map(function(t) {
      return { type: t.type, on: t.on, style: t.style, vol: t.vol };
    })
  };
}

function applyBeatSettingsState(cfg) {
  if (!cfg) return;
  if (cfg.key) document.getElementById('beat-key-select').value = cfg.key;
  activeBeatTracks = [];
  if (Array.isArray(cfg.tracks)) {
    cfg.tracks.forEach(function(t) {
      addBeatTrack(t.type, t.style, t.vol, t.on);
    });
  } else {
    ['drums', 'bass', 'guitar', 'piano'].forEach(function(tr) {
      if (cfg[tr] && cfg[tr].on) {
        addBeatTrack(tr, cfg[tr].style, cfg[tr].vol, true);
      }
    });
  }
  renderBeatTracks();
}

function toggleBeatEngine() {
  var btn = document.getElementById('beat-play-btn');
  if (isBeatRunning) {
    clearInterval(beatSchedulerTimer);
    isBeatRunning = false;
    btn.innerText = "▶ Start Beat";
    btn.className = "btn play";
  } else {
    ensureBeatAudioCtx();
    isBeatRunning = true;
    beatCurrentStep = 0;
    beatNextNoteTime = audioCtx.currentTime + 0.05;
    btn.innerText = "⏹ Stop Beat";
    btn.className = "btn stop";
    beatSchedulerTimer = setInterval(scheduleBeatLookahead, 25);
  }
}

function scheduleBeatLookahead() {
  if (!isBeatRunning) return;
  var bpm = parseFloat(document.getElementById('metro-bpm').value) || 120;
  var totalSteps = 16;
  for (var i = 0; i < activeBeatTracks.length; i++) {
    var t = activeBeatTracks[i];
    if (t.on && t.type === 'drums' && DRUM_PATTERNS[t.style]) {
      totalSteps = DRUM_PATTERNS[t.style].steps;
      break;
    }
  }
  var stepDuration = (totalSteps === 12) ? (60 / bpm / 3) : (60 / bpm / 4);

  while (beatNextNoteTime < audioCtx.currentTime + 0.1) {
    triggerBeatStep(beatCurrentStep, beatNextNoteTime, stepDuration);
    beatNextNoteTime += stepDuration;
    beatCurrentStep = (beatCurrentStep + 1) % totalSteps;
  }
}

function triggerBeatStep(step, time, stepDur) {
  var keyVal = document.getElementById('beat-key-select').value;
  var rootFreq = NOTE_FREQS[keyVal] || 220.0;
  var isMinor = keyVal.indexOf('m') !== -1;
  var melStep = step % 16;

  activeBeatTracks.forEach(function(tr) {
    if (!tr.on || tr.vol <= 0) return;
    var vol = tr.vol / 100;

    if (tr.type === 'drums') {
      var dPat = DRUM_PATTERNS[tr.style] || DRUM_PATTERNS.rock;
      var dStep = step % dPat.steps;
      if (dPat.kick[dStep]) synthKick(time, vol);
      if (dPat.snare[dStep]) synthSnare(time, vol);
      if (dPat.hat[dStep]) synthHiHat(time, vol * 0.6);
    } else if (tr.type === 'bass') {
      var bArr = BASS_PATTERNS[tr.style] || BASS_PATTERNS['root-fifth'];
      var semi = bArr[melStep];
      if (semi !== null && semi !== undefined) {
        if (isMinor && semi === 4) semi = 3;
        if (isMinor && semi === 9) semi = 8;
        synthBassNote(time, (rootFreq / 2) * Math.pow(2, semi / 12), vol, stepDur * 1.8);
      }
    } else if (tr.type === 'guitar' || tr.type === 'piano') {
      var bank = (tr.type === 'guitar') ? GUITAR_PATTERNS : PIANO_PATTERNS;
      var pat = bank[tr.style];
      if (!pat) return;
      if (pat.mode === 'chord' && pat.steps[melStep]) {
        synthChord(time, rootFreq, isMinor, vol, tr.type, stepDur * (tr.type === 'guitar' ? 1.5 : 2.2));
      } else if (pat.mode === 'riff' && pat.notes[melStep] !== null && pat.notes[melStep] !== undefined) {
        var rSemi = pat.notes[melStep];
        if (isMinor && rSemi === 4) rSemi = 3;
        if (isMinor && rSemi === 16) rSemi = 15;
        synthPluckNote(time, rootFreq * Math.pow(2, rSemi / 12), vol, tr.type, stepDur * 1.8);
      }
    }
  });
}

function synthKick(time, vol) {
  var osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(140, time);
  osc.frequency.exponentialRampToValueAtTime(38, time + 0.12);
  gain.gain.setValueAtTime(vol * 0.9, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.25);
  osc.connect(gain); gain.connect(getBeatOutputNode());
  osc.start(time); osc.stop(time + 0.26);
}

function synthSnare(time, vol) {
  var len = audioCtx.sampleRate * 0.15, buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate), d = buf.getChannelData(0);
  for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  var noise = audioCtx.createBufferSource(), filter = audioCtx.createBiquadFilter(), gain = audioCtx.createGain();
  noise.buffer = buf; filter.type = 'highpass'; filter.frequency.setValueAtTime(900, time);
  gain.gain.setValueAtTime(vol * 0.55, time); gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
  noise.connect(filter); filter.connect(gain); gain.connect(getBeatOutputNode());
  noise.start(time); noise.stop(time + 0.16);
}

function synthHiHat(time, vol) {
  var len = audioCtx.sampleRate * 0.05, buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate), d = buf.getChannelData(0);
  for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  var noise = audioCtx.createBufferSource(), filter = audioCtx.createBiquadFilter(), gain = audioCtx.createGain();
  noise.buffer = buf; filter.type = 'highpass'; filter.frequency.setValueAtTime(6500, time);
  gain.gain.setValueAtTime(vol * 0.35, time); gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
  noise.connect(filter); filter.connect(gain); gain.connect(getBeatOutputNode());
  noise.start(time); noise.stop(time + 0.06);
}
function synthBassNote(time, freq, vol, dur) {
  var osc = audioCtx.createOscillator(), filter = audioCtx.createBiquadFilter(), gain = audioCtx.createGain();
  osc.type = 'triangle'; osc.frequency.setValueAtTime(freq, time);
  filter.type = 'lowpass'; filter.frequency.setValueAtTime(420, time);
  gain.gain.setValueAtTime(0.001, time);
  gain.gain.linearRampToValueAtTime(vol * 0.75, time + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
  osc.connect(filter); filter.connect(gain); gain.connect(getBeatOutputNode());
  osc.start(time); osc.stop(time + dur + 0.02);
}

function synthPluckNote(time, freq, vol, voiceType, dur) {
  var osc = audioCtx.createOscillator(), filter = audioCtx.createBiquadFilter(), gain = audioCtx.createGain();
  osc.type = (voiceType === 'guitar') ? 'sawtooth' : 'sine';
  osc.frequency.setValueAtTime(freq, time);
  filter.type = 'lowpass'; filter.frequency.setValueAtTime(voiceType === 'guitar' ? 1800 : 2400, time);
  filter.frequency.exponentialRampToValueAtTime(400, time + dur);
  gain.gain.setValueAtTime(0.001, time);
  gain.gain.linearRampToValueAtTime(vol * 0.25, time + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
  osc.connect(filter); filter.connect(gain); gain.connect(getBeatOutputNode());
  osc.start(time); osc.stop(time + dur + 0.02);
}

function synthChord(time, rootFreq, isMinor, vol, voiceType, dur) {
  var intervals = [0, isMinor ? 3 : 4, 7, 12];
  intervals.forEach(function(semi, idx) {
    var strumOffset = (voiceType === 'guitar') ? (idx * 0.012) : 0;
    synthPluckNote(time + strumOffset, rootFreq * Math.pow(2, semi / 12), vol * 0.55, voiceType, dur);
  });
}

function saveCurrentBeatPreset() {
  var presetName = prompt("Enter a name for this groove preset:");
  if (!presetName || !presetName.trim()) return;
  presetName = presetName.trim();
  savedBeatPresets[presetName] = getBeatSettingsState();
  localStorage.setItem('prompter_saved_beats', JSON.stringify(savedBeatPresets));
  refreshSavedBeatsDropdown(presetName);
}

function refreshSavedBeatsDropdown(selectedName) {
  var sel = document.getElementById('saved-beats-select');
  if (!sel) return;
  sel.innerHTML = '<option value="">-- Load Saved Preset --</option>';
  Object.keys(savedBeatPresets).sort().forEach(function(name) {
    var opt = document.createElement('option');
    opt.value = name; opt.innerText = name;
    if (name === selectedName) opt.selected = true;
    sel.appendChild(opt);
  });
}

function loadSelectedBeatPreset() {
  var sel = document.getElementById('saved-beats-select');
  var name = sel ? sel.value : "";
  if (name && savedBeatPresets[name]) applyBeatSettingsState(savedBeatPresets[name]);
}

function deleteSelectedBeatPreset() {
  var sel = document.getElementById('saved-beats-select');
  var name = sel ? sel.value : "";
  if (name && savedBeatPresets[name] && confirm("Delete saved preset '" + name + "'?")) {
    delete savedBeatPresets[name];
    localStorage.setItem('prompter_saved_beats', JSON.stringify(savedBeatPresets));
    refreshSavedBeatsDropdown();
  }
}

function formatBeatDirectiveString(cfg) {
  var parts = ["Key:" + cfg.key];
  (cfg.tracks || []).forEach(function(tr) {
    if (tr.on) parts.push(tr.type.charAt(0).toUpperCase() + tr.type.slice(1) + ":" + tr.style + "@" + tr.vol);
  });
  return "{BeatStyle: " + parts.join(" | ") + "}";
}

function applyBeatToCurrentSong() {
  if (!activeSongName || !loadedSongsMap[activeSongName]) {
    alert("Select a song in the Songs tab first before applying a BeatStyle directive.");
    return;
  }
  var directiveLine = formatBeatDirectiveString(getBeatSettingsState());
  var lines = loadedSongsMap[activeSongName].split(/\r?\n/);
  var replaced = false;
  for (var i = 0; i < lines.length; i++) {
    if (lines[i].trim().toLowerCase().startsWith("{beatstyle:")) {
      lines[i] = directiveLine; replaced = true; break;
    }
  }
  if (!replaced) {
    var insertAt = 0;
    for (var j = 0; j < lines.length; j++) {
      if (lines[j].trim().toLowerCase().startsWith("{title:")) { insertAt = j + 1; break; }
    }
    lines.splice(insertAt, 0, directiveLine);
  }
  loadedSongsMap[activeSongName] = lines.join("\n");
  modifiedSongsStatus[activeSongName] = true;
  renderPlaylist(); saveAppStateToCache();
  alert("Saved to '" + activeSongName + "':\n" + directiveLine + "\n\nRemember to click 💾 on the song to write it to disk.");
}

function loadBeatFromSongLines(rawLines) {
  var directive = null;
  for (var i = 0; i < rawLines.length; i++) {
    if (rawLines[i].toLowerCase().startsWith("{beatstyle:")) {
      directive = rawLines[i].replace(/\{beatstyle:\s*/i, "").replace(/\}/, "").trim(); break;
    }
  }
  if (!directive) return;
  var cfg = { key: "Am", tracks: [] };
  directive.split("|").forEach(function(token) {
    var t = token.trim(), cIdx = t.indexOf(":");
    if (cIdx === -1) return;
    var k = t.substring(0, cIdx).trim().toLowerCase(), v = t.substring(cIdx + 1).trim();
    if (k === "key") {
      cfg.key = v;
    } else if (TRACK_CATALOG[k]) {
      var atSplit = v.split("@");
      var styleId = atSplit.shift().trim();
      var volStr = atSplit.shift();
      var volNum = (volStr && !isNaN(parseInt(volStr, 10))) ? parseInt(volStr, 10) : TRACK_CATALOG[k].defaultVol;
      cfg.tracks.push({ type: k, on: true, style: styleId, vol: volNum });
    }
  });
  applyBeatSettingsState(cfg);
}
async function exportBeatPresetsToFile() {
  var names = Object.keys(savedBeatPresets);
  if (names.length === 0) {
    alert("No saved presets to export yet. Click '💾 Save Preset' first.");
    return;
  }

  var jsonStr = JSON.stringify(savedBeatPresets, null, 2);
  try {
    if (window.showSaveFilePicker) {
      var handle = await window.showSaveFilePicker({
        suggestedName: "my-beat-presets.json",
        types: [{
          description: "Beat Presets JSON",
          accept: { "application/json": [".json"] }
        }]
      });
      var stream = await handle.createWritable();
      await stream.write(jsonStr);
      await stream.close();
      alert("Exported " + names.length + " beat preset(s) to '" + handle.name + "'.");
    } else {
      var blob = new Blob([jsonStr], { type: "application/json" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = "my-beat-presets.json";
      a.click();
      URL.revokeObjectURL(url);
    }
  } catch (err) {
    if (err.name !== "AbortError") {
      alert("Error exporting beat presets: " + err.toString());
    }
  }
}

function importBeatPresetsFromFile(event) {
  if (!event || !event.target || !event.target.files || !event.target.files.length) return;
  var file = event.target.files.item(0);
  var reader = new FileReader();

  reader.onload = function(e) {
    try {
      var imported = JSON.parse(e.target.result);
      if (!imported || typeof imported !== "object" || Array.isArray(imported)) {
        alert("Invalid beat presets file format.");
        return;
      }

      var count = 0;
      var firstImportedName = null;
      Object.keys(imported).forEach(function(presetName) {
        savedBeatPresets[presetName] = imported[presetName];
        if (!firstImportedName) firstImportedName = presetName;
        count++;
      });

      if (count > 0) {
        localStorage.setItem("prompter_saved_beats", JSON.stringify(savedBeatPresets));
        refreshSavedBeatsDropdown(firstImportedName);
        applyBeatSettingsState(savedBeatPresets[firstImportedName]);
        alert("Imported " + count + " beat preset(s) from '" + file.name + "'!");
      }
    } catch (err) {
      alert("Error reading presets file: " + err.toString());
    }
  };

  reader.readAsText(file);
  event.target.value = "";
}
