var isRecordingSession = false;
var mediaRecorder = null;
var recordedChunks = [];
var recordedTakesList = [];
var takeIdCounter = 1;

var backingMediaEl = null;
var backingSourceNode = null;
var backingGainNode = null;
var micStream = null;
var micSourceNode = null;
var mixDestinationNode = null;
var recTimerInterval = null;
var recSecondsElapsed = 0;

function loadExternalBackingTrack(event) {
  if (!event || !event.target || !event.target.files || !event.target.files.length) return;
  var file = event.target.files.item(0);

  if (backingMediaEl) {
    backingMediaEl.pause();
    if (backingMediaEl.src) URL.revokeObjectURL(backingMediaEl.src);
  }

  backingMediaEl = document.createElement('video');
  backingMediaEl.src = URL.createObjectURL(file);
  backingMediaEl.preload = 'auto';
  backingMediaEl.crossOrigin = 'anonymous';

  ensureBeatAudioCtx();
  backingSourceNode = audioCtx.createMediaElementSource(backingMediaEl);
  backingGainNode = audioCtx.createGain();
  var vol = parseInt(document.getElementById('backing-vol-slider').value, 10) / 100;
  backingGainNode.gain.setValueAtTime(vol, audioCtx.currentTime);

  backingSourceNode.connect(backingGainNode);
  backingGainNode.connect(audioCtx.destination);

  backingMediaEl.onended = function() {
    document.getElementById('backing-play-btn').innerText = '▶ Play';
  };

  document.getElementById('backing-file-name').innerText = file.name;
  document.getElementById('backing-play-btn').disabled = false;
  document.getElementById('backing-play-btn').innerText = '▶ Play';
  document.getElementById('backing-restart-btn').disabled = false;
  event.target.value = '';
}

function toggleExternalBackingPlay() {
  if (!backingMediaEl) return;
  ensureBeatAudioCtx();
  var btn = document.getElementById('backing-play-btn');
  if (backingMediaEl.paused) {
    backingMediaEl.play();
    btn.innerText = '❚❚ Pause';
  } else {
    backingMediaEl.pause();
    btn.innerText = '▶ Play';
  }
}

function restartExternalBacking() {
  if (!backingMediaEl) return;
  backingMediaEl.currentTime = 0;
}

function updateExternalBackingVolume() {
  if (!backingGainNode || !audioCtx) return;
  var vol = parseInt(document.getElementById('backing-vol-slider').value, 10) / 100;
  backingGainNode.gain.setValueAtTime(vol, audioCtx.currentTime);
}

function runFourBeatCountIn(callback) {
  ensureBeatAudioCtx();
  var bpm = parseFloat(document.getElementById('metro-bpm').value) || 120;
  var stepMs = (60 / bpm) * 1000;
  var statusEl = document.getElementById('rec-status-bar');
  var beat = 1;

  function tick() {
    if (beat > 4) {
      callback();
      return;
    }
    statusEl.innerText = 'Count-in: ' + beat + ' / 4';
    var osc = audioCtx.createOscillator(), g = audioCtx.createGain();
    osc.frequency.setValueAtTime(beat === 1 ? 1000 : 650, audioCtx.currentTime);
    g.gain.setValueAtTime(0.25, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.06);
    osc.connect(g); g.connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + 0.07);
    beat++;
    setTimeout(tick, stepMs);
  }
  tick();
}
async function toggleRecordingSession() {
  if (isRecordingSession) {
    stopRecordingSession();
    return;
  }

  try {
    ensureBeatAudioCtx();
    if (!micStream) {
      micStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
      });
    }
  } catch (err) {
    alert('Microphone access is required to record: ' + err.message);
    return;
  }

  var useCountIn = document.getElementById('rec-count-in').checked;
  if (useCountIn) {
    runFourBeatCountIn(startActualMediaRecording);
  } else {
    startActualMediaRecording();
  }
}

function startActualMediaRecording() {
  var mode = document.getElementById('rec-source-mode').value;
  var recordStream;

  if (mode === 'mix') {
    mixDestinationNode = audioCtx.createMediaStreamDestination();
    micSourceNode = audioCtx.createMediaStreamSource(micStream);
    micSourceNode.connect(mixDestinationNode);
    if (beatMasterGain) beatMasterGain.connect(mixDestinationNode);
    if (backingGainNode) backingGainNode.connect(mixDestinationNode);
    recordStream = mixDestinationNode.stream;
  } else {
    recordStream = micStream;
  }

  recordedChunks = [];
  mediaRecorder = new MediaRecorder(recordStream);
  mediaRecorder.ondataavailable = function(e) {
    if (e.data && e.data.size > 0) recordedChunks.push(e.data);
  };
  mediaRecorder.onstop = function() {
    var blob = new Blob(recordedChunks, { type: mediaRecorder.mimeType || 'audio/webm' });
    var url = URL.createObjectURL(blob);
    var label = (activeSongName ? activeSongName + ' - ' : '') + 'Take #' + takeIdCounter++;
    recordedTakesList.unshift({ id: Date.now(), name: label, url: url, blob: blob, mode: mode });
    renderRecordedTakes();
  };

  mediaRecorder.start();
  isRecordingSession = true;

  var btn = document.getElementById('rec-toggle-btn');
  btn.innerText = '⏹ Stop Rec';
  btn.className = 'btn stop';

  var statusEl = document.getElementById('rec-status-bar');
  statusEl.className = 'rec-status-bar recording';
  recSecondsElapsed = 0;
  statusEl.innerText = '● REC 00:00 (' + (mode === 'mix' ? 'Mix' : 'Mic') + ')';

  recTimerInterval = setInterval(function() {
    recSecondsElapsed++;
    var mins = String(Math.floor(recSecondsElapsed / 60)).padStart(2, '0');
    var secs = String(recSecondsElapsed % 60).padStart(2, '0');
    statusEl.innerText = '● REC ' + mins + ':' + secs + ' (' + (mode === 'mix' ? 'Mix' : 'Mic') + ')';
  }, 1000);

  if (backingMediaEl && backingMediaEl.paused) {
    toggleExternalBackingPlay();
  }
  if (document.getElementById('rec-auto-scroll').checked && !isScrolling) {
    toggleScroll();
  }
}

function stopRecordingSession() {
  if (!isRecordingSession) return;
  isRecordingSession = false;
  clearInterval(recTimerInterval);

  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }

  if (micSourceNode) { try { micSourceNode.disconnect(); } catch (e) {} micSourceNode = null; }
  if (beatMasterGain && mixDestinationNode) { try { beatMasterGain.disconnect(mixDestinationNode); } catch (e) {} }
  if (backingGainNode && mixDestinationNode) { try { backingGainNode.disconnect(mixDestinationNode); } catch (e) {} }
  mixDestinationNode = null;

  var btn = document.getElementById('rec-toggle-btn');
  btn.innerText = '⏺ Record';
  btn.className = 'btn play';

  var statusEl = document.getElementById('rec-status-bar');
  statusEl.className = 'rec-status-bar';
  statusEl.innerText = 'Take saved! Ready to record';

  if (backingMediaEl && !backingMediaEl.paused) {
    toggleExternalBackingPlay();
  }
  if (document.getElementById('rec-auto-scroll').checked && isScrolling) {
    toggleScroll();
  }
}

function renderRecordedTakes() {
  var listEl = document.getElementById('recorded-takes-list');
  if (!listEl) return;
  if (recordedTakesList.length === 0) {
    listEl.innerHTML = '<div style="color: #666; font-size: 12px; text-align: center; padding: 8px 0;">No recordings yet.</div>';
    return;
  }

  listEl.innerHTML = '';
  recordedTakesList.forEach(function(take) {
    var card = document.createElement('div');
    card.className = 'rec-take-card';

    var top = document.createElement('div');
    top.style.display = 'flex';
    top.style.justifyContent = 'space-between';
    top.style.alignItems = 'center';
    top.innerHTML = '<span style="font-size:12px; font-weight:bold; color:#fff; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + take.name + '</span>';

    var actions = document.createElement('div');
    actions.style.display = 'flex';
    actions.style.gap = '4px';

    var dlBtn = document.createElement('a');
    dlBtn.href = take.url;
    dlBtn.download = take.name.replace(/[^a-z0-9_\- ]/gi, '_') + '.webm';
    dlBtn.className = 'control-btn';
    dlBtn.style.textDecoration = 'none';
    dlBtn.innerText = '💾';
    dlBtn.title = 'Download Recording';

    var delBtn = document.createElement('button');
    delBtn.className = 'control-btn del';
    delBtn.innerText = '✕';
    delBtn.onclick = function() {
      URL.revokeObjectURL(take.url);
      recordedTakesList = recordedTakesList.filter(function(t) { return t.id !== take.id; });
      renderRecordedTakes();
    };

    actions.appendChild(dlBtn);
    actions.appendChild(delBtn);
    top.appendChild(actions);

    var audioEl = document.createElement('audio');
    audioEl.controls = true;
    audioEl.loop = false;
    audioEl.src = take.url;
    audioEl.style.width = '100%';
    audioEl.style.height = '28px';

    card.appendChild(top);
    card.appendChild(audioEl);
    listEl.appendChild(card);
  });
}
