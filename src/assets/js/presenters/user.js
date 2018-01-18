(() => {
  // get user info to display
  $.when(
    $.getJSON('https://api.spotify.com/v1/me'),
    $.getJSON('https://api.spotify.com/v1/me/playlists'),
  ).then((me, playlists) => {
    // read the user response object
    const [{
      display_name: name,
      email,
      product,
      external_urls: {spotify: profilePage},
      images: [{url: profilePicture}],
    }] = me;

    // initialize user playlists
    const [{items}] = playlists;
    SP.user.playlists = items.map((item) => new SP.Models.Playlist(item));

    // fill in the remainder of the user object and render
    $('.user-info').append(
      Handlebars.templates['spooty/templates/user'](
        $.extend(SP.user, {name, email, product, profilePage, profilePicture})
      )
    );
  });
})();

