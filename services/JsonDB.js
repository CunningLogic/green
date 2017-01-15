/***
 * api.base
 * we will defined common method at here
 *
 * */
var db = require('diskdb');
var path = require('path');
var fs = require('fs');
var API = require('./API').Base;

class JsonDBServer {
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.JsonDB = db.connect(dbPath);
  }

  hasCollection(name) {
    return fs.existsSync(path.join(this.dbPath, name + ".json"));
  }

  find(collection) {
    var JsonDB = this.JsonDB;

    return JsonDBServer._queryDB(function () {
      JsonDB.loadCollections([collection]);
      return JsonDB[collection].find();//all
    }, {
      success: 'find data success.',
      error: `find db error with collection: ${collection}`
    });
  }

  save(collection, params, needEncode) {
    console.log(collection, params);

    var JsonDB = this.JsonDB;
    if(needEncode){
      JsonDBServer._encodeParams(params);
    }

    return JsonDBServer._queryDB(function () {
      JsonDB.loadCollections([collection]);


      if (!params._id) { // init data
        JsonDB[collection].save(params);
      } else if (params._id == -1) { //create neew doc
        JsonDB[collection].find();
      }
      else { //update data
        JsonDB[collection].update({_id: params._id}, params);
      }
    }, {
      success: 'save data success.',
      error: `save db error with collection: ${collection}`
    });
  }

  create(collection){
    var JsonDB = this.JsonDB;

    return JsonDBServer._queryDB(function () {
      JsonDB.loadCollections([collection]);
      JsonDB[collection].find();
    }, {
      success: 'create data success.',
      error: `create db error with collection: ${collection}`
    });
  }

  remove(collection, option) {
    var JsonDB = this.JsonDB;

    return JsonDBServer._queryDB(function () {
      JsonDB.loadCollections([collection]);
      if(option){
        JsonDB[collection].remove(option);
      }else{
        JsonDB[collection].remove();//all
      }
    }, {
      success: 'remove data success.',
      error: `remove db error with collection: ${collection}`
    });
  }

  static _queryDB(query, msg) {
    try {
      var data = query() || {}; //do db query

      return API.result(true, API.Status.SUCCESS, data, {msg: msg.success});
    } catch (ex) {
      Monitor.error(msg.error);
      console.log(ex);

      return API.result(false, API.Status.SERVER_ERROR, {}, {msg: msg.error});
    }
  }

  static _encodeParams(param){
    Object.keys(param).forEach(function(k){
      let item = param[k];
      param[k] = typeof item=== 'string'? encodeURIComponent(item) : item;
    });

    return param;
  }
}


module.exports = JsonDBServer;
