function loadFolderSongs(event) {
  if (!event || !event.target || !event.target.files) return;
  var files = Array.prototype.slice.call(event.target.files);
  if (!files.length) return;

  files.sort(function(a, b) {
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true });
  });

  var loadedBatch = new Array(files.length);
  var completedCount = 0;

  files.forEach(function(file, idx) {
    var reader = new FileReader();
    reader.onload = function(e) {
      loadedBatch[idx] = {
        name: file.name.replace(/\.txt$/i, ""),
        content: e.target.result
      };
      completedCount++;

      if (completedCount === files.length) {
        loadedBatch.forEach(function(item) {
          loadedSongsMap[item.name] = item.content;
          songSourcesMap[item.name] = "txt";

          if (!(item.name in modifiedSongsStatus)) {
            modifiedSongsStatus[item.name] = false;
          }
          if (playlistOrder.indexOf(item.name) === -1) {
            playlistOrder.push(item.name);
          }
        });

        renderPlaylist();
        saveAppStateToCache();
      }
    };
    reader.readAsText(file);
  });

  event.target.value = "";
}

async function exportAndOverrideLaptopFile(songName) {
  var fileContentToSave = loadedSongsMap[songName];
  if (!fileContentToSave) return;

  try {
    var options = {
      suggestedName: songName + '.txt',
      types: [{
        description: 'Plain Text File',
        accept: { 'text/plain': ['.txt'] }
      }]
    };

    var fileHandle = await window.showSaveFilePicker(options);
    var writableStream = await fileHandle.createWritable();

    await writableStream.write(fileContentToSave);
    await writableStream.close();

    modifiedSongsStatus[songName] = false;
    activeSongName = songName;
    renderPlaylist();

    var rawLines = fileContentToSave.split(/\r?\n/).map(function(ln) { return ln.trim(); });
    document.getElementById('prompter-stage').innerHTML = compileMarkupToHTML(rawLines);

    saveAppStateToCache();

    if (activeSetlistHandleName) {
      setTimeout(function() {
        alert(
          "Song saved! Your master setlist '" + activeSetlistHandleName +
          "' now has unsaved modifications. Remember to click '💾 Export Setlist' " +
          "in your sidebar before closing to lock in your additions permanently."
        );
      }, 200);
    }
  } catch (err) {
    if (err.name !== 'AbortError') {
      alert("Error overwriting hard drive file: " + err.toString());
    }
  }
}

async function exportPlaylistFile() {
  if (playlistOrder.length === 0) {
    alert("Your playlist is empty. Add some songs before saving a set.");
    return;
  }

  var setlistPackage = {
    playlistOrder: playlistOrder,
    loadedSongsMap: loadedSongsMap,
    modifiedSongsStatus: {}
  };

  var jsonString = JSON.stringify(setlistPackage, null, 2);
  var suggestedFileName = activeSetlistHandleName || "my-setlist.json";

  try {
    if (window.showSaveFilePicker) {
      var options = {
        suggestedName: suggestedFileName,
        types: [{
          description: 'JSON Setlist File',
          accept: { 'application/json': ['.json'] }
        }]
      };

      var fileHandle = await window.showSaveFilePicker(options);
      var writableStream = await fileHandle.createWritable();
      await writableStream.write(jsonString);
      await writableStream.close();

      var savedFileName = fileHandle.name;
      activeSetlistHandleName = savedFileName;

      playlistOrder.forEach(function(songName) {
        songSourcesMap[songName] = savedFileName;
        modifiedSongsStatus[songName] = false;
      });

      renderPlaylist();
      saveAppStateToCache();
      alert("Setlist '" + savedFileName + "' saved! All songs in the current list are now linked to this set.");
    } else {
      var blob = new Blob([jsonString], { type: "application/json" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = suggestedFileName;
      a.click();
      URL.revokeObjectURL(url);
    }
  } catch (err) {
    if (err.name !== 'AbortError') {
      alert("Error saving setlist file: " + err.toString());
    }
  }
}

function importPlaylistFile(event) {
  if (!event || !event.target || !event.target.files) return;
  var files = event.target.files;
  if (!files.length) return;

  var file = files[0];
  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      var parsedPackage = JSON.parse(e.target.result);

      if (parsedPackage.playlistOrder && parsedPackage.loadedSongsMap) {
        var importedStatus = parsedPackage.modifiedSongsStatus || {};

        parsedPackage.playlistOrder.forEach(function(songName) {
          loadedSongsMap[songName] = parsedPackage.loadedSongsMap[songName];
          songSourcesMap[songName] = file.name;

          if (!(songName in modifiedSongsStatus)) {
            modifiedSongsStatus[songName] = importedStatus[songName] || false;
          }
          if (playlistOrder.indexOf(songName) === -1) {
            playlistOrder.push(songName);
          }
        });

        activeSetlistHandleName = file.name;
        if (!activeSongName && playlistOrder.length > 0) {
          activeSongName = playlistOrder[0];
          selectSong(activeSongName);
        }

        renderPlaylist();
        saveAppStateToCache();
        alert("Setlist '" + file.name + "' loaded and added to your list!");
      } else {
        alert("Error: Missing structural configurations inside this setlist file format.");
      }
    } catch (err) {
      alert("Error decoding file contents: " + err.toString());
    }
  };
  reader.readAsText(file);
  event.target.value = "";
}

async function saveAllSongs() {
  if (playlistOrder.length === 0) {
    alert("No songs loaded to save.");
    return;
  }

  var modifiedSongs = playlistOrder.filter(function(songName) {
    return modifiedSongsStatus[songName] === true;
  });

  if (modifiedSongs.length === 0) {
    alert("All loaded songs are already up to date (no unsaved modifications).");
    return;
  }

  var txtSongsToSave = [];
  var jsonOriginsWithChanges = {};

  modifiedSongs.forEach(function(songName) {
    var origin = songSourcesMap[songName] || "txt";
    if (origin === "txt") {
      txtSongsToSave.push(songName);
    } else {
      jsonOriginsWithChanges[origin] = true;
    }
  });

  var summaryMessages = [];

  if (txtSongsToSave.length > 0) {
    try {
      if (!window.showDirectoryPicker) {
        alert("Your browser does not support folder batch-saving for .txt files. Please save .txt songs individually.");
      } else {
        alert("Select the folder where your " + txtSongsToSave.length + " modified .txt song(s) should be saved.");
        var dirHandle = await window.showDirectoryPicker({ mode: "readwrite" });

        for (var i = 0; i < txtSongsToSave.length; i++) {
          var sName = txtSongsToSave[i];
          var fileHandle = await dirHandle.getFileHandle(sName + ".txt", { create: true });
          var writable = await fileHandle.createWritable();
          await writable.write(loadedSongsMap[sName] || "");
          await writable.close();
          modifiedSongsStatus[sName] = false;
        }
        summaryMessages.push("Saved " + txtSongsToSave.length + " .txt file(s) to '" + dirHandle.name + "'.");
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        alert("Error saving .txt files: " + err.toString());
      }
    }
  }

  var jsonFileNames = Object.keys(jsonOriginsWithChanges);
  for (var j = 0; j < jsonFileNames.length; j++) {
    var targetJsonName = jsonFileNames[j];

    var setOrder = [];
    var setSongsMap = {};
    playlistOrder.forEach(function(songName) {
      if (songSourcesMap[songName] === targetJsonName) {
        setOrder.push(songName);
        setSongsMap[songName] = loadedSongsMap[songName];
      }
    });

    var packageToWrite = {
      playlistOrder: setOrder,
      loadedSongsMap: setSongsMap,
      modifiedSongsStatus: {}
    };

    try {
      if (window.showSaveFilePicker) {
        alert("Select '" + targetJsonName + "' to save updates for its " + setOrder.length + " song(s).");
        var handle = await window.showSaveFilePicker({
          suggestedName: targetJsonName,
          types: [{
            description: 'JSON Setlist File',
            accept: { 'application/json': ['.json'] }
          }]
        });
        var stream = await handle.createWritable();
        await stream.write(JSON.stringify(packageToWrite, null, 2));
        await stream.close();

        var finalName = handle.name;
        setOrder.forEach(function(songName) {
          songSourcesMap[songName] = finalName;
          modifiedSongsStatus[songName] = false;
        });
        summaryMessages.push("Updated setlist '" + finalName + "'.");
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        alert("Error saving setlist '" + targetJsonName + "': " + err.toString());
      }
    }
  }

  renderPlaylist();
  saveAppStateToCache();

  if (summaryMessages.length > 0) {
    alert("Save All Complete:\n• " + summaryMessages.join("\n• "));
  }
}
