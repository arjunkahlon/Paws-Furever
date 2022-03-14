const express = require('express');
const app = express();
require('dotenv').config();
const hb = require("express-handlebars").create({ defaultLayout: "main" });
app.engine("handlebars", hb.engine);
app.use('/', express.static('public'));
app.use('/js', express.static('./views/js/'));
app.set("view engine", "handlebars");
app.enable('trust proxy');

// Handlebars helpers citations
// adapted from https://stackoverflow.com/questions/13046401/how-to-set-selected-select-option-in-handlebars-template
// adapted from https://stackoverflow.com/questions/41764373/how-to-register-custom-handlebars-helpers
// adapted from https://www.youtube.com/watch?v=2BoSBaWvFhM

app.engine('handlebars', hb.engine);
hb.handlebars.registerHelper('select', function(selected, option) {
    return (selected == option) ? 'selected="selected"' : '';
});

app.use('/', require('./public/index'));


// Listen to the App Engine-specified port, or 8080 otherwise
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}...`);
});