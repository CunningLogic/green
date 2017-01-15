# DJI-Official
## 环境
### 后端
node： v0.12.4

sails： v0.11.0

- sudo npm install -g sails （需要将sails装到全局环境，才能使用其命令工具）

supervisor： 用于开发环境的node应用自动重启

- supervisor -i .tmp,.git app.js (使用－i选项，指定不watch更改的目录，否则会引起循环启动)

or
nodemon(optional)

*鉴于supervisor不再维护，而且有许多奇怪的bug，可以切换到nodemon*

### 如何使用nodemon

install:

```bash
npm install nodemon -g

```
start:

```bash
npm start
```
or

```bash
npm run nodemon
```

*ignore 文件夹配置在`nodemon.json`文件中*

### Autoreload

<del>现在提供了Livereload机制，如需自动刷新，请转向 [Chrome WebStore](https://chrome.google.com/webstore/detail/livereload/jnihajbhpnppcggbcgedagnkighmdlei), 安装Livereload插件, 其他浏览器请自行搜索livereload插件.</del>

<del>安装完成后，点击toolbars 中的Livereload图标即可启用自动刷新，如需关闭则再点击一次。</del>

添加了Browsersync作为自动刷新工具，它将代理本地url：localhost:1337到localhost:3000.实现自动刷新。

功能比较强大，还可以实现移动端调试，具体请查看[BrowserSync文档](https://browsersync.io/)。

*NOTE：为了速度考虑，目前仅添加了stylus，css和JavaScript改变时的自动刷新,其他例如images，font，sprites等请手动刷新 *


*NOTE2*: 有时开发后端可能会频繁重启服务器，导致会打开许多tab，所以如果不想让gulp运行在sails中的话，打开`_application.js`，添加一句`integrate_gulp: false,`即可。
然后再开一个新的命令行窗口，运行`npm run gulp`即可。

#### *NOTES*

gulp-watch works on version 4.2.5, any later version will crash app.

### Start

代码下载完成后，执行 npm install（会自动安装以下项目依赖）

gulp： 用于处理自动化任务

jade： view层的模版引擎

stylus： 用于css的预处理，简化css编写

### 前端
UI 基于bootsrap，proto

JS 目前仅使用 Jquery库，考虑引入Vue框架


## 代码
git clone https://github.com/DJISZ/DJI-Official.git

将DJI-Official仓库，fork 为自己的仓库。在自己本地的分支完成开发后，应首先提交代码到自己的仓库，并发送pull request，经过代码审核后，合并到master。

### 目录结构

```

DJI-Official
  --api
    --controller
    --models
    ...
  --assets
    --images
    --js
      --bus     //处理业务逻辑
      --dui     //业务相关的组件
      --qui     //改进或者创建的jquery组件
      --libs    //基础库文件
      --plugins //jquery插件
    --styles
      --base     //基础样式库
      --fonts    //字体文件
      --layout   //布局相关样式
      --products //产品页面样式
      --vender   //外部样式文件
  --config
    --locale     //多语言
    --routes.js  //路由配置
    ...
  --home
  --node_moudles
  --tasks
  --views
    --products   //产品页面
    --share      //共享视图
    ...
  --app.js       //项目入口文件
  --package.json //npm包配置文件
  --readme.md
  ...

```


## 跑起-->Go:

### cd 到 fork 下来的文件夹

$ cd DJI-Official

### 开启服务
$ 创建配置文件

cp application-pub.js  application.js

然后修改文件里的  _application 为 application

$ 使用 supervisor（安装见上述） ，或者直接 npm start

提示：To see your app, visit http://localhost:1337
打开上述地址……


### 自动发布到CDN:

默认把CDN权限写到gulpfile.js有安全隐患，最合适是按照下面配置，将安全权限保存在开发客户端。


#### 安装配置

下载 get-pip.py 是为了后面安装pip

$ cd ~/

$ curl -o get-pip.py https://bootstrap.pypa.io/get-pip.py


##### 安装pip(要管理员权限)，是为了后面安装 awscli

$ sudo python get-pip.py


##### 安装awscli，是为了后面配置 aws-sdk

$ sudo pip install awscli

$ sudo pip install --upgrade awscli  //升级一小下


##### 配置CDN:

$ aws configure

 AWS Access Key ID [None]: 申请得到的id

 AWS Secret Access Key [None]: 申请得到的key

 Default region name [None]: 区域

 Default output format [None]:(留空)


更多配置参考：http://docs.aws.amazon.com/AWSJavaScriptSDK/guide/node-configuring.html


#### 为啥要这样搞？安全第一！

-------------------------

### 资源合并

如果需要合并页面上的资源，请加上build标记，编译阶段会进行合并

    <!--build:js  showcase/home.min.js-->

    script(src=javascript_path('libs/jquery.validate.min.js'))

    script(src=javascript_path('bus/showcase/validate.js'))

    <!--endbuild—->

语法

    <!—build:{type} {path} {attr}-->

    ＊＊＊＊

    <!--endbuild—->

type : 分为 js 和 css两种

path：合并后的文件路径

attr: 可以包含标记属性 像 async data-foo=“bar”
