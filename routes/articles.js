/**
 * Created by pan hong fei on 15/5/2.
 */

module.exports = function (app) {
  var mongoose = app.mongoose,
    Schema = new mongoose.Schema({
      slug: String,
      type: String,
      author: String,
      title: String,
      content: String,
      tags: String,
      date: String
    }),
    Article = mongoose.model('article', Schema),
    moment = require('moment');

  /****************
   * route for api
   * ***/
  app.route('/api/user/articles')
    .get(function (req, res) {
      Article.find({}, function (err, docs) {
        res.send(docs);
      });
    })
    .post(function (req, res) {
      var obj = req.body;
      for (var p in obj)
        obj[p] = decodeURIComponent(obj[p]);
      obj['date'] = moment(obj['date']).format('YYYY-MM-DD');

      var article = new Article(obj);
      article.save(function (err) {
        if (err) {
          console.log(err);
          res.json({success: false, status: '422'});
        }
        else {
          res.json({success: true, status: '200'});
        }
      });
    });

  app.route('/api/user/articles/:slug')
    .get(function (req, res) {
      var slug = req.params.slug;
      Article.find({slug: slug}, function (err, docs) {
        res.send(docs);
      });
    })
    .put(function (req, res) {
      var id = req.params.slug;
      Article.findOne({_id: id }, function (err, article) {
        if (err) {
          return res.send(err);
        }

        for (prop in req.body) {
          article[prop] = decodeURIComponent(req.body[prop]);
        }
        article['date'] = moment(article['date']).format('YYYY-MM-DD');
        // save the article
        article.save(function (err) {
          if (err) {
            return res.send(err);
          }
          res.json({success: true, status: '200'});
        });
      });
    });


  /****************
   * route to show article
   * ***/
  app.get("/articles", function (req, res) {
    Article.find({}, function (err, docs) {
      res.render('articles/index', {articles: docs});
    });
  });
  app.get('/articles/top', function (req, res) {
    res.render('articles/top', {});
  });
  app.get('/articles/new', function (req, res) {
    res.render('articles/editor', {});
  });
  app.get('/articles/remove/:id', function (req, res) {
    Article.find({_id: req.params.id}, function (err, docs) {
      if (docs.length > 0) docs[0].remove();
    });
    res.json({status: 200, success: true});
  });

  /** *
   * f2e articles
   * */
  app.get('/articles/f2e', function (req, res) {
    //========构建目录树
    var tree = {type: 'root', children: []},
      dir = [
        {type: 'dir', icon: 'fa-bars', data: [
          'javascript', '标准', '框架', '性能', '安全', '兼容性', '扩展', '工程化', '设计', '产品'
        ]},
        {type: 'node', icon: 'fa-paste', parent: 'javascript', data: [
          '基础语法', '原型链', '作用域链', '闭包', '设计模式', '高级javascript程序设计'
        ]},
        {type: 'node', icon: 'fa-paste', parent: '标准', data: [
          'html5', 'w3c', 'web component'
        ]},
        {type: 'node', icon: 'fa-paste', parent: '框架', data: [
          'jquery（框架）、ext、kissy、polymer', 'bootstrap、jm、angulr、sea.js、zepto、underscore、backbone'
        ]},
        {type: 'node', icon: 'fa-paste', parent: '性能', data: [
          '高性能javascript'
        ]},
        {type: 'node', icon: 'fa-paste', parent: '安全', data: [
          'web前端黑客技术揭秘'
        ]},
        {type: 'node', icon: 'fa-paste', parent: '兼容性', data: [
          '跨终端', 'css', 'js'
        ]},
        {type: 'node', icon: 'fa-paste', parent: '扩展', data: [
          '单页应用', 'nodejs', ' 终端（react）', 'http', 'seo'
        ]},
        {type: 'node', icon: 'fa-paste', parent: '工程化', data: [
          'git', '环境', ' 打包压缩（gulp，coffee、less）', '规范', '调试', '测试', '部署', '维护'
        ]},
        {type: 'node', icon: 'fa-paste', parent: '设计', data: [
          'css禅意花园'
        ]},
        {type: 'node', icon: 'fa-paste', parent: '产品', data: [
          '启示录', ' 结网'
        ]}
      ],
      articles = "";
    dir.forEach(function (item) {
      var parent = !item.parent ? tree : tree.children[tree[item.parent]];
      parent = parent || tree;
      parent.children = parent.children || [];
      item.data.forEach(function (name) {
        var node = {
          icon: item.icon,
          type: item.type,
          name: name,
          children: []
        };
        parent[name] = parent.children.length;
        parent.children.push(node);
      });
    });

    //========将文章添加到目录树
    Article.find({}, function (err, docs) {
      docs.forEach(function (article) {
        var type = article.type || '',
          parent = tree;
        type.split('/').forEach(function (key) {
          parent = parent.children[parent[key]] || {};
        });
        (parent.children || []).push({
          icon: 'fa-file',
          type: 'article',
          name: article.title,
          slug: article.slug,
          children: []
        });
      });

      res.render('articles/f2e', {tree: tree});
    });
  });
  app.get('/articles/f2e/:slug', function (req, res) {
    var slug = req.params.slug,
      from = req.query.from;
    if (from == '15ba') {
      var article = Article.findOne({slug: slug}, function (err, article) {
        if (err) {
          return res.send(err);
        }
        res.render('articles/show', article);
      });
    } else {
      res.redirect('/');//to home
    }
  });


  /**
   * Edit articles or get articles(not belong f2e)
   * */
  app.get("/articles/:slug", function (req, res) {
    var slug = req.params.slug,
      article = Article.findOne({slug: slug}, function (err, article) {
        if (err) {
          return res.send(err);
        }
        res.render('articles/show', article);
      });
  });
  app.get('/articles/edit/:slug', function (req, res) {
    var slug = req.params.slug,
      article = Article.findOne({slug: slug}, function (err, article) {
        if (err) {
          return res.send(err);
        }
        res.render('articles/editor', article);
      });
  });
};

