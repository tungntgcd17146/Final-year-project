const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const https = require('https');
const ejs = require('ejs');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const LocalStrategy = require('passport-local').Strategy;

const app = express();

app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

// Parse JSON bodies (as sent by API clients)
app.use(express.json());

app.use(session({
  secret: "This is a key.",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect('mongodb://localhost:27017/bookDB', {useNewUrlParser: true, useUnifiedTopology:true,useFindAndModify: false});
mongoose.set('useCreateIndex', true);

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  name: String,
  phone: Number
});

userSchema.plugin(passportLocalMongoose);

const User = new mongoose.model('User', userSchema);

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

const infoSchema = new mongoose.Schema({
  checkIn: {
    type: Date,
    default: Date.now
  },
  checkOut: Date,
  totalPerson: [{
    adults: Number,
    childrens: Number
  }],
  totalNight: Number,
  name: String,
  email: String,
  cmnd: Number,
  status: String,
  phone: Number,
  room: [{
    Presidential: Number,
    Excutive: Number,
    Deluxe: Number,
    price: Number,
  }],
});

const couponSchema = new mongoose.Schema({
  date: {
    type: Date,
    default: Date.now
  },
  coupon: String,
  status: {
    type: String,
    default: "Available"
  }
});

const Info = mongoose.model('Info', infoSchema);
const Coupon = mongoose.model('Coupon', couponSchema);


app.get('/', function(req,res){
  res.render('home');
});

app.get('/about', function(req,res){
  res.render('about');
});

app.get('/rooms', function(req,res){
  res.render('rooms');
});

app.get('/services', function(req,res){
  res.render('services');
});

app.get('/contact', function(req,res){
  res.render('contact');
});

app.get('/restaurant-bar',function(req,res){
  res.render('restaurant-bar');
});

app.get('/sign-in', function(req,res){
  res.render('sign-in');
});

app.get('/register', function(req,res){
  res.render('register');
});

app.get('/services-other', function(req,res){
  res.render('services-other');
});

app.get('/logout', function(req,res){
  req.logout();
  res.redirect('/sign-in');
});


app.get('/dashboard', function(req,res){
  if (req.isAuthenticated()){
    if (req.user.username === 'admin@admin') {
      Info.find({}, function(err, InfoFound){
        if (!err) {
          res.render('admin', { listInfo: InfoFound });
        } else console.log(err);
      });
    } else {
      Info.findOne({email: req.user.username}, function(err, InfoFound){
        if (!err) {
          if (InfoFound) {
            res.render('profile', {email: req.user.username, name: req.user.name, phone: req.user.phone, info: InfoFound});
          } else {
            res.render('profile', {email: req.user.username, name: req.user.name, phone: req.user.phone, info: ""});
          }
        } else console.log(err);
      });
    }
  } else {
    res.redirect('/sign-in');
  }
});

app.post('/', function(req,res) {

  const check_in = req.body.check_in;
  const check_out = req.body.check_out;
  const night_stay = Math.abs( new Date(check_out) - new Date(check_in))/86400000;
  const total_person = req.body.person;
  const total_children = req.body.children;

  res.render('booking', {checkIn: check_in, checkOut: check_out,stayNight: night_stay ,totalPerson: total_person, totalChildren: total_children});
});

app.post('/book', function(req,res){

  const check_in = req.body.check_in;
  const check_out = req.body.check_out;
  const night_stay = Math.abs( new Date(check_out) - new Date(check_in))/86400000;
  const total_person = req.body.total_person;
  const total_children = req.body.total_children;
  const total_price = req.body.total_price;
  const presidential = req.body.Presidential;
  const excutive = req.body.Excutive;
  const deluxe = req.body.Deluxe;

  var fullname = '';
  var email = '';
  var phone = '';

  if (req.isAuthenticated()){
    var fullname = req.user.name;
    var email = req.user.username;
    var phone = req.user.phone;
  }

  var coupon = '';
  Coupon.findOne({status: 'Available'}, function(err,couponFound){
    if (!err) {
      if (couponFound) {
        coupon = couponFound.coupon;
      }
      var passObject = {
        checkIn: check_in,
        checkOut: check_out,
        stayNight: night_stay,
        totalPerson: total_person,
        totalChildren: total_children,
        totalPrice: total_price,
        Presidential: presidential,
        Excutive: excutive,
        Deluxe: deluxe,
        fullName: fullname,
        Email: email,
        Phone: phone,
        Coupon: coupon
      }

      // console.log(passObject);
      return res.render('customer-info', passObject);
    } else {
      var passObject = {
        checkIn: check_in,
        checkOut: check_out,
        stayNight: night_stay,
        totalPerson: total_person,
        totalChildren: total_children,
        totalPrice: total_price,
        Presidential: presidential,
        Excutive: excutive,
        Deluxe: deluxe,
        fullName: fullname,
        Email: email,
        Phone: phone,
        Coupon: coupon
      }

      // console.log(passObject);
      return res.render('customer-info', passObject);
    }
  });

});

app.post('/payment-info', function(req,res){
  const Room = [{
    Presidential: req.body.Presidential,
    Excutive: req.body.Excutive,
    Deluxe: req.body.Deluxe,
    price: req.body.total_price
  }];

  const totalPerson = [{
    adults: req.body.total_person,
    childrens: req.body.total_children
  }]

  const bookItem = new Info({
    checkIn: req.body.check_in,
    checkOut: req.body.check_out,
    totalPerson: totalPerson,
    totalNight: req.body.total_night,
    name: req.body.fisrtName + " " + req.body.lastName,
    email: req.body.email,
    status: req.body.status,
    phone: req.body.phone,
    cmnd: req.body.cmnd,
    room: Room,
    status: "onPay"
  });

    bookItem.save();
    res.render('done',{'name': req.body.fisrtName + " " + req.body.lastName, 'email':req.body.email,'cmnd': req.body.cmnd ,'checkIn': req.body.check_in, 'checkOut':req.body.check_out,'totalNight':req.body.total_night, 'totalPerson': totalPerson, 'room': Room, 'status': "onPay"});

});

app.post('/register', function(req,res, next){

  User.register({username: req.body.email, name: req.body.name, phone: req.body.phone}, req.body.password, function(err,user){
    if (err) {
      console.log(err);
      res.redirect('/register');
    }

    next();
  });
}, passport.authenticate('local', {
  successRedirect: '/dashboard',
  failureRedirect: '/sign-in'
}));

app.post('/sign-in', function(req,res, next) {

  if (req.body) {
    const user = new User({
      username: req.body.username,
      password: req.body.password,
    });

    req.login(user, function(err){
      if (err) {
        console.log(err);
        res.redirect('/sign-in');
      } else {
        next();
      }
    });
  }}, passport.authenticate('local', {
    successRedirect: '/dashboard',
    failureRedirect: '/sign-in'
}));

app.post('/add-coupon', function(req,res){
  const couponItem = new Coupon({
    coupon: req.body.coupon
  });

  couponItem.save();
  res.redirect('/dashboard');
});

app.post('/update-status', function(req,res) {

  var status = req.body.status;
  var info_name = req.body.info_name;
  if (status === 'paid') {
    Info.updateOne(
      {email: info_name},
      {status: status},
      function(err){
        if(!err) {
          res.send(200);
        } else {
          res.send(err);
        }
      }
    )
  } else if (status === 'remove') {
    Info.deleteOne(
      {email: info_name},
      function(err) {
        if (!err) {
          res.sendStatus(200);
        } else {
          res.send(err);
        }
      }
    )
  }

});

app.post('/mailchimp', function(req,res){
  const email = {
    members: [{
      email_address: req.body.email,
      status: 'subscribed'
    }]
  };

  const jsonData = JSON.stringify(email);
  const url = "https://us10.api.mailchimp.com/3.0/lists/055380a9c1";

  const options = {
    method: "POST",
    auth: "tung:7a1b6f6a9dc71ad9c064d4ebc40504b7-us10"
  }

  const request = https.request(url, options, function(response){
    if (response.statusCode === 200) {
      res.redirect('/');
    }
    else res.send('There was an error while register email!');
  });

  request.write(jsonData);
  request.end();
});

// let port = process.env.PORT;
// if (port === null || port === ""){
//   port = 3000;
// }

app.listen(3000, function(){
  console.log("Server has started on server successfully!");
});
