// initialize the playlist lib and the "my playlists" object
SP.Models.Playlist = class {
  constructor(options) {
    Object.keys(options).forEach((key) => {
      this[key] = options[key];
    });
  }
};
