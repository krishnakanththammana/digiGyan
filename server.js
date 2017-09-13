var express     = require('express');
var bodyParser  = require('body-parser');
const uuidv4    = require('uuid/v4');
var MongoClient = require('mongodb').MongoClient;
var app         = express();
var url         = "mongodb://localhost:27017/DigiGyan";

app.use(bodyParser.json())
app.use( (req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.get('/ping', (req, res) => res.send('pong'));

app.get('/allQuestions', (req, res) => {  
  
  MongoClient.connect(url, function(err, db) {
    if (err) throw err;
    db.collection("questions").find({}).toArray(function(err, result) {
      if (err) throw err;
      db.close();
      res.send(result);
    });
  });
});

app.get('/getQuestionByID', (req, res) => {
  var selectedID = req.query.questionID;
  var callback = function(data) {
    res.send(data);
  }

  MongoClient.connect(url, function(err, db) {
    if (err) throw err;
    db.collection("questions").findOne({questionID: selectedID}, function(err, result) {
      if (err) throw err;
      callback(result);
      db.close();
    });
  });
});

app.get('/postQuestion', (req, res) => {
  var question = JSON.parse(req.query.question);
  question.questionID = uuidv4();
  var callback = function() {
    res.send({msg: "ok"});
  }

  MongoClient.connect(url, function(err, db) {
    if (err) throw err;

    db.collection("questions").insertOne(question, function(err, res) {
      if (err) throw err;
      console.log("1 document inserted");
      db.close();
      callback();
    });
  });
});

app.get('/login', (req, res) => {
  var user = JSON.parse(req.query.user);
  var callback = function(data) {
    res.send({msg: data});
  }
  MongoClient.connect(url, function(err, db) {
    if (err) throw err;
    db.collection("users").findOne({username: user.username}, function(err, result) {
      if (err) throw err;
      if(result) {
        if(result.password == user.password) {
          callback("user authenticated");
        } else {
          callback("invalid credentials");
        } 
        db.close();
      } else {
        callback("user does not exist");
      }
    });
  });
});

app.get('/addUser', (req, res) => {
  var newUser  = JSON.parse(req.query.newUser);
  // console.log(newUser);
  var callback = function(success) {
    if(success) {
      res.send({msg: "user added"});
    } else {
      res.send({msg: "user exists"});
    }
  }
  MongoClient.connect(url, function(err, db) {
    if (err) throw err;
    db.collection("users").findOne({username: newUser.username}, function(err, result) {
      if (err) throw err;
      if(result) {
        callback(false);
        db.close();
      } else {
        db.collection("users").insertOne(newUser, function(err, res) {
          if (err) throw err;
          console.log("1 user inserted");
          db.close();
          callback(true);
        });
      }
    });
  });
});

app.get('/submitAnswer', (req, res) => {
  console.log(req.query.username);
  console.log(req.query.answer);
  console.log(req.query.questionID);
  var answerObject = {
    "questionID": req.query.questionID,
    "answer": req.query.answer,
    "username": req.query.username,
    likes: ""
  }
  answerObject.answerID = uuidv4();

  var callback = function(success) {
    if(success) {
      res.send({msg: "ok"});
    }
  }

  MongoClient.connect(url, function(err, db) {
    if (err) throw err;
    db.collection("answers").insertOne(answerObject, function(err, res) {
      if (err) throw err;
      console.log("1 answer inserted");
      db.close();
      callback(true);
    });
  });
});

app.get('/getAnswers', (req, res) => {
  var questionID = req.query.questionID;
  var callback = function(data) {
    res.send(data);
  }

  MongoClient.connect(url, function(err, db) {
    if (err) throw err;
    db.collection("answers").find({questionID: questionID}).toArray(function(err, result) {
      if (err) throw err;
      callback(result);
      db.close();
    });
  });
});

app.get('/likeQuestion', (req, res) => {
  var username = req.query.username;
  var questionID = req.query.questionID; 
  console.log(username, questionID);

  var callback = function() {
    res.send({msg: "ok"});
  }

  var foundUser = function(user) {
    
    user.likedQuestions.push(questionID);
    console.log(user);
    MongoClient.connect(url, function(err, db) {
      if (err) throw err;
      var myquery = { username: username };
      db.collection("users").updateOne(myquery, user, function(err, res) {
        if (err) throw err;
        console.log("1 question updated");
        callback();
        db.close();
      });
    });
  }

  var updateUser = function() {
    MongoClient.connect(url, function(err, db) {
      if (err) throw err;
      db.collection("users").findOne({username: username}, function(err, result) {
        if (err) throw err;
        foundUser(result);
        db.close();
      });
    }); 
  }

  var foundQuestions = function(data) {
    if(data) {
      
      if(data.likes == "") {
        data.likes = "1";
      } else {
        data.likes = (parseInt(data.likes)+1).toString();
      }
      MongoClient.connect(url, function(err, db) {
        if (err) throw err;
        var myquery = { questionID: questionID };
        db.collection("questions").updateOne(myquery, data, function(err, res) {
          if (err) throw err;
          console.log("1 question updated");
          updateUser();
          db.close();
        });
      });
    }
  }


  MongoClient.connect(url, function(err, db) {
    if (err) throw err;
    db.collection("questions").findOne({questionID: questionID}, function(err, result) {
      if (err) throw err;
      foundQuestions(result);
      db.close();
    });
  });
});

// MongoClient.connect(url, function(err, db) {
//   if (err) throw err;
//   console.log("Database created!");
//   db.close();
// });

const port = 2000;
app.listen(port, () => console.log('app listening on port: ', port));

var allQuestions = [];