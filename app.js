const Koa = require('koa');
const app = new Koa();
const views = require('koa-views');
const onerror = require('koa-onerror');

const index = require('./routes');

// error handler
onerror(app);

app.use(require('koa-static')(__dirname + '/public'));

app.use(views(__dirname + '/views', {
    extension: 'ejs'
}));

// routes
app.use(index.routes(), index.allowedMethods());

module.exports = app;
