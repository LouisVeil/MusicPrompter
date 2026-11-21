var loadedSongsMap = {};
var playlistOrder = [];
var activeSongName = null;
var scrollInterval = null;
var isScrolling = false;
var globalSizeModifier = 0;
var currentSongHeaderInfo = [];
var currentSongLayoutInfo = [];

// Status tracker for songs with unsaved edits
var modifiedSongsStatus = {};
// Tracks each song's origin: "txt" or the exact ".json" setlist filename
var songSourcesMap = {};
// Tracks if the current session was launched from a master .json setlist file
var activeSetlistHandleName = null;

// Metronome state tracking variables
var metroInterval = null;
var isMetroRunning = false;
var metroBeatCounter = 0;
var audioCtx = null;

// Automatic LocalStorage cache initialization
window.addEventListener('DOMContentLoaded', function() {
  var cachedOrder = localStorage.getItem('prompter_playlist_order');
  var cachedSongs = localStorage.getItem('prompter_songs_map');
  var cachedStatus = localStorage.getItem('prompter_modified_status');
  var cachedSetName = localStorage.getItem('prompter_active_setlist_name');

  if (cachedOrder && cachedSongs) {
    playlistOrder = JSON.parse(cachedOrder);
    loadedSongsMap = JSON.parse(cachedSongs);
    if (cachedStatus) modifiedSongsStatus = JSON.parse(cachedStatus);

    var cachedSources = localStorage.getItem('prompter_song_sources');
    if (cachedSources) songSourcesMap = JSON.parse(cachedSources);

    if (cachedSetName) activeSetlistHandleName = cachedSetName;

    renderPlaylist();
  }
});

// Master engine cache trigger
function saveAppStateToCache() {
  localStorage.setItem('prompter_playlist_order', JSON.stringify(playlistOrder));
  localStorage.setItem('prompter_songs_map', JSON.stringify(loadedSongsMap));
  localStorage.setItem('prompter_modified_status', JSON.stringify(modifiedSongsStatus));
  localStorage.setItem('prompter_song_sources', JSON.stringify(songSourcesMap));
  localStorage.setItem('prompter_active_setlist_name', activeSetlistHandleName || "");
}
