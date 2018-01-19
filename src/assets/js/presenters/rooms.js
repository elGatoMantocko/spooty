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
        tracks: {items: tracks},
        uri,
      } = response;
      SP.rooms.push({name, owner_name, uri, start_time, tracks});
      // TODO: possibly consider sorting the rooms here
      $('.rooms').empty().append(
        Handlebars.templates['spooty/templates/rooms']({rooms: SP.rooms})
      );

      $('.room-btn').click(/* @this HTMLElement */function(e) {
        const {contextUri, startTime} = $(this).data();

        // build offset with startTime

        // begin playback
        $.ajax({
          url: 'https://api.spotify.com/v1/me/player/play?device_id=' + SP.device_id,
          method: 'PUT',
          data: JSON.stringify({contextUri}),
        }).then(() => console.log('playing ' + $(this).data('value')), (xhr, e) => SP.logger.error(e));
  });
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
