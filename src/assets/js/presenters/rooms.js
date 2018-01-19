/* eslint no-console: 1 */
(() => {
  /**
   * @param {Object} roomId
   * @param {Object} roomData
   */
  function processRoom(roomId, roomData) {
    const {owner_id, start_time} = roomData;
    $.getJSON('https://api.spotify.com/v1/users/' + owner_id + '/playlists/' + roomId).then((response) => {
      const {
        name,
        owner: {display_name: owner_name},
        uri,
      } = response;
      SP.rooms.push({name, owner_name, uri, start_time});
      // TODO: possibly consider sorting the rooms here
      $('.rooms').empty().append(
        Handlebars.templates['spooty/templates/rooms']({rooms: SP.rooms})
      );
    });
  }

  SP.rooms = [];

  // initialize page with available rooms
  $.getJSON('/rooms').then((response) => {
    Object.keys(response).forEach((room) => {
      processRoom(room, response[room]);
    });
  });

  // whenever a new room is emitted from the server, update the rooms view
  const es = new EventSource('/roomstream');
  es.addEventListener('room_created', function(e) {
    const {playlist_id, start_time, owner_id} = JSON.parse(e.data);
    processRoom(playlist_id, {start_time, owner_id});
  });
})();
