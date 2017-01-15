/**
 * HomeController.js
 *
 * @description :: Server-side logic for managing comments.
 */
var fs = require('fs');
var path = require('path');
var jade = require('jade');
var useref = require('node-useref');
var gulp = require('gulp');

module.exports = {
  index: async function (){
    let req = this.request,
        API = req.API;
    req.set_page('home');

    await this.render_view('homepage', {});
  },
  err: async function(){
    var req = this.request,
        num = req.url.slice(1,4);
    if (!num) num = 404;

    this.status = parseInt(num); //response 404 code
    await this.render_view('home/err', {num: num});
  },
  locale: async function (a,b) {
    //130722FOY-WMSLPI  010-51581581
    await this.render_view('locale');
  }
};
