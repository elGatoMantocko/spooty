let express = require('express');
let Handlebars = require('handlebars');
let fs = require('fs');
let app = express();

const APP_PORT = process.argv[process.argv.indexOf('--port') + 1]
  || process.argv[process.argv.indexOf('-p') + 1]
  || 3000;

// register the main partials that app templates use
Handlebars.registerPartial('layouts/default', fs.readFileSync('src/assets/views/layouts/default.hbs').toString());
Handlebars.registerPartial('header', fs.readFileSync('src/assets/views/layouts/header.hbs').toString());
Handlebars.registerPartial('footer', fs.readFileSync('src/assets/views/layouts/footer.hbs').toString());


app.engine('hbs', function(path, opts, cb) {
  fs.readFile(path, function(err, data) {
    if (err) return cb(err);
    let template = Handlebars.compile(data.toString());
    return cb(null, template(opts));
  });
});

app.set('views', 'src/assets/views');
app.set('view engine', 'hbs');

app.use('/resources', express.static('node_modules'));
app.use('/assets', express.static('src/assets/bundle'));

app.get('/', function(req, res) {
  // eslint-disable-next-line no-console
  console.log(`inbound request to '/' on port ${APP_PORT}`);

  // build the app model
  let model = {
    Startup: {
      Models: {},
      Presenters: {},
    },
  };

  res.cookie('data', JSON.stringify({test: 'Hello world!'}));

  res.render('startup/templates/app', {title: 'My app!', model: JSON.stringify(model)});
});

app.listen(APP_PORT);
