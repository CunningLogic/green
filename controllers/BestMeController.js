/**
 * best me controller
 * */

module.exports = {
  index: async function () {
    let req = this.request,
        API = req.API;
    req.set_page('bestme');

    await this.render_view('bestme/index', {});
  },
  pages: async function (pageId) {
    let req = this.request,
        res = this.response,
        query = req.query,
        util = req.helper,
        key = settings.keys['app_key'],
        invite_code = this.cookies.get('sign_code'),
        userId = '';

    try{
      userId = util.RC4.unlock(key, pageId);
    }catch(ex){
      return res.redirect_404();
    }


    if(pageId && JsonDB.hasCollection(`Bestme:${userId}`)){
      userId = util.RC4.unlock(key, pageId);

      let userData = await JsonDB.find(`Bestme:${userId}`).data[0] || {},
          data = Object.assign(userData, {
            title: '谁是我的年度最佳？',
            userId: userId,
            userPageId: pageId,
            canEdit: ('edit' in query) && userId === invite_code
          });
      Object.keys(data).forEach(function (key) {
        if(key.has('picture') && !userData[key].has('cdn.15ba.cn')){
          data[key] = req.helper.qbox_cdn(data[key]);
        }
      });

      await this.render_view('bestme/index', data);
    }else{
      return res.redirect_404();
    }
  },
  //======= 数据管理, 编辑
  admin: async function (page) {
    let req = this.request,
        res = this.response,
        util = req.helper,
        data = {};
    req.set_page('bestme:' + page);

    if(page === 'users'){
      data = await JsonDB.find('Bestme:Users');
    }else if(page === 'editor'){
      let userId = this.cookies.get('sign_code'),
          key = settings.keys['app_key'];
      if(!userId){
        return res.redirect('/bestme/login');
      }

      let userData = await JsonDB.find(`Bestme:${userId}`).data[0] || {};
      Object.keys(userData).forEach(function (key) {
        if(key.has('picture') && !userData[key].has('cdn.15ba.cn')){
          userData[key] = req.helper.qbox_cdn(userData[key]);
        }
      });

      data = Object.assign(userData, {
        userPageId: util.RC4.lock(key, userId)
      });
    }else if(page === 'login'){
      let users = await JsonDB.find('Bestme:Users'),
          usersCount = 50;
      if(users && users.data){
         usersCount = (users.data[0] || {}).count;
      }

      data.totalInvite = 50;
      data.availabeInvite = 50 - usersCount;
    }

    data.userId = this.cookies.get('sign_code');
    data.cache = 'no'; //不要缓存页面

    await this.render_view('bestme/' + page, data);
  },
  login: async function () {
    let req = this.request,
        res = this.response,
        params = req.body,
        invite_code = params.invite_code,
        users = await JsonDB.find('Bestme:Users').data[0] || {};
    let is_valid_user = !!users[invite_code];

    if(!is_valid_user){
      await this.render_view('bestme/login', {
        invite_code: invite_code,
        is_invalid_user: !is_valid_user
      });
    }else{
      let domain = req.cookie_domain,
          //one week 604800000 ms
          cookie_options = {expires: new Date(Date.now() + 604800000) , path: '/' , domain: domain, httpOnly: true};
      this.cookies.set('sign_code', invite_code, cookie_options);

      var util = req.helper,
          key = settings.keys['app_key'],
          userPageId = util.RC4.lock(key, invite_code);
      res.redirect('/bestme/pages/' + userPageId +'?edit');
    }
  },
  //====== 创建或者更新用户数据
  save: async function () {
    let req = this.request,
        params = req.body,
        userId = req.cookies.get('sign_code');
    if(!userId){
      return res.redirect('/bestme/login');
    }

    let util = req.helper,
        key = settings.keys['app_key'],
        userPageId = util.RC4.lock(key, userId);

    //====== 清除对应的用户页面缓存
    Cache.keys(`*${userPageId}*`, function (err, keys) {
      if(!err && keys){
        keys.forEach(function(key){
          Monitor.green('已经删除缓存， key:', key);
          Cache.del(key); //remove key
        });
      }
    });

    this.status = 200;
    this.body = await JsonDB.save(`Bestme:${userId}`, params);
  },
  //====== 创建用户
  createUser: async function () {
    let req = this.request,
        res = this.response,
        params = req.body,
        date = new Date(),
        seed = req.ip_from + date,
        userId = req.helper.md5(seed),
        collection = 'Bestme:Users';

    let users = await JsonDB.find(collection).data[0];

    if(!users){
      users = { count: 0 };
    }
    if(users.count > 50){
      return res.success(400, {}, {msg: '邀请人数已经超过限制.'});
    }

    users.count += 1;
    users[userId] = {
      user_ip: req.ip_from,
      create_by: params.from || req.query.from ||  'user',
      create_at: date,
      update_at: date,
      number: users.count,
      user_id: userId
    };

    await JsonDB.save(collection, users);
    await JsonDB.find(`Bestme:${userId}`); //同时,创建用户数据文档

    if(params.respType === 'json'){
      res.success(200, {userId}, {msg: 'generate user id success.'});
    }else{
      res.redirect('/bestme/users');
    }
  },
  //====== 更新用户数据
  updateUser: async function () {
    let req = this.request,
        params = req.body || {}, //user list
        collection = 'Bestme:Users';

    this.status = 200;
    this.body = await JsonDB.save(collection, params);
  }
};