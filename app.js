var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var ejs=require('ejs');
var mongoose=require('mongoose');
var routes = require('./routes/index');
var app = express();
var stylus= require("stylus");
var combo=require('./helper/combo');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.engine('.html',ejs.__express);


// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(function(req,res,next){
  if(req.url.indexOf('??')>-1){
    var path=req.path,
        query=req.url.substring(req.url.indexOf('??'));
    var rest=[];
    rest=rest.concat(combo(query,'/javascripts/')).concat([path]);
    res.end('MUI.helper.loadScripts("'+rest.join(',')+'")');
  }else{
    next();
  }
});

//connect database
app.mongoose=mongoose;
//mongoose.connect('mongodb://admin:mongo158@localhost:27017/green');
mongoose.connect('mongodb://localhost/green');

app.use(stylus.middleware({
  src: path.join(__dirname, 'public'),
  compress: false
}));

app.use(express.static(path.join(__dirname, 'public')));

routes(app);//use routes

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});


// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;
