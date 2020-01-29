var express = require('express');
var logger = require('express-logger');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var inspect = require('util-inspect');
var oauth = require('oauth');
const bodyParser = require('body-parser');
var app = express();
const cors = require('cors');

var corsOptions = {
  origin: 'http://127.0.0.1:8080',
  optionsSuccessStatus: 200 
}

app.use(cors(corsOptions))

app.use(express.static(__dirname + '/'));
app.use(bodyParser.urlencoded({ extend: true }));
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'ejs');
app.set('views', __dirname);

var _twitterConsumerKey = "oS5D6NtOiukMuy9eaytYwVinY";
var _twitterConsumerSecret = "zOtFIzMHhT6dh1g9w5hkQzidFK5d7g3SNkionv89rYcHg1bR10";

var consumer = new oauth.OAuth(
  "https://twitter.com/oauth/request_token", "https://twitter.com/oauth/access_token",
  _twitterConsumerKey, _twitterConsumerSecret, "1.0A", "http://127.0.0.1:8080/sessions/callback", "HMAC-SHA1");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(logger({ path: "log/express.log" }));
app.use(cookieParser());
app.use(session({ secret: "very secret", resave: false, saveUninitialized: true }));

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.use(function (req, res, next) {
  req.query.first = req.query.first||'mamta_rathore_';
  req.query.second = req.query.second||'gulshan96769603';
  res.locals.session = req.session;
  next();
});

app.get('/sessions/connect', function (req, res) {
  try {
    consumer.getOAuthRequestToken(function (error, oauthToken, oauthTokenSecret, results) {
      if (error) {
        res.send("Error getting OAuth request token : " + inspect(error), 500);
      } else {
        req.session.oauthRequestToken = oauthToken;
        req.session.oauthRequestTokenSecret = oauthTokenSecret;
        console.log("Double check on 2nd step");
        console.log("------------------------");
        console.log("<<" + req.session.oauthRequestToken);
        console.log("<<" + req.session.oauthRequestTokenSecret);
        // res.writeHead(301,
        //   {Location: "https://twitter.com/oauth/authorize?oauth_token="+req.session.oauthRequestToken}
        // );
        return res.send("https://twitter.com/oauth/authorize?oauth_token=" + req.session.oauthRequestToken);
      }
    });
  } catch (e) {
    console.log(e);
  }

});

app.get('/sessions/callback', function (req, res) {
  console.log("------------------------");
  console.log(">>" + req.session.oauthRequestToken);
  console.log(">>" + req.session.oauthRequestTokenSecret);
  console.log(">>" + req.query.oauth_verifier);
  consumer.getOAuthAccessToken(req.session.oauthRequestToken, req.session.oauthRequestTokenSecret, req.query.oauth_verifier, function (error, oauthAccessToken, oauthAccessTokenSecret, results) {
    if (error) {
      res.send("Error getting OAuth access token : " + inspect(error) + "[" + oauthAccessToken + "]" + "[" + oauthAccessTokenSecret + "]" + "[" + inspect(result) + "]", 500);
    } else {
      req.session.oauthAccessToken = oauthAccessToken;
      req.session.oauthAccessTokenSecret = oauthAccessTokenSecret;
      res.redirect('/friendlist');
    }
  });
});

app.get('/friendlist', function (req, res) {
  consumer.get("https://api.twitter.com/1.1/friends/list.json?count=200&screen_name=" + req.query.first, req.session.oauthAccessToken, req.session.oauthAccessTokenSecret, function (error, first, response) {
    if (error) {
      res.redirect('/sessions/connect');
    } else {
      let parsedFirst = JSON.parse(first);
    consumer.get("https://api.twitter.com/1.1/friends/list.json?count=200&screen_name=" + req.query.second, req.session.oauthAccessToken, req.session.oauthAccessTokenSecret,
        function (error, second, response) {
          let parsedSecond = JSON.parse(second);
          let commonfriend = parsedFirst.users.filter(function(user) {
            for(var i=0; i < parsedSecond.users.length; i++){
              if(user.screen_name == parsedSecond.users[i].screen_name){
                return parsedSecond.users[i];
              }
            }
            return;
        });
          res.send('CommonFriend:  Detail ' + inspect(commonfriend));
        });

    }
  });
});



app.get('*', function (req, res) {
  res.send("index.html")
});

app.listen(8080, function () {
  console.log('App runining on port 8080!');
});