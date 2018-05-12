var express     = require("express"),
    router      = express.Router(),
    passport    = require("passport"),
    User        = require("../models/user"),
    Campground  = require("../models/campground"),
    async       = require("async"),
    nodemailer  = require("nodemailer"),
    crypto      = require("crypto");

router.get("/", function(req, res){
    res.render("landing");
});


router.get("/register", function(req, res){
    res.render("register", {page: "register"});
});

router.post("/register", function(req, res){
    if(!req.body.avatar) {
        req.body.avatar = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQE9sF6JTyxDiLTiKaeoOiGa13gmAeXlNJGFWhMxCLDmuvrTaS4";
    }
    var newUser = new User(
        {
            username: req.body.username,
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            avatar: req.body.avatar,
            email: req.body.email
        });
        
    if(req.body.admincode === "secretcode123") {
        newUser.isAdmin = true;
    }
    User.register(newUser, req.body.password, function(err, user){
      if(err){
          req.flash("error", err.message);
          return res.redirect("register");
      }
      passport.authenticate("local")(req, res, function(){
          req.flash("success", "Welcome to YelpCamp " + user.username);
          res.redirect("/campgrounds");
      });
   }); 
});

router.get("/login", function(req, res){
    res.render("login", {page: "login"});
});

router.post("/login", function (req, res, next) {
  passport.authenticate("local",
    {
      successRedirect: "/campgrounds",
      failureRedirect: "/login",
      failureFlash: true,
      successFlash: "Welcome to YelpCamp, " + req.body.username + "!"
    })(req, res);
});

router.get("/logout", function(req, res){
    req.logout();
    req.flash("success", "you logged out");
    res.redirect("/campgrounds");
});

router.get("/forgot", function(req, res){
    res.render("forgot");
});

router.post("/forgot", function(req, res, next) {
  async.waterfall([
      function(done){
          crypto.randomBytes(20, function(err, buf){
              var token = buf.toString("hex");
              done(err, token);
          });
      },
      function(token, done) {
          User.findOne({email: req.body.email}, function(err, user){
              if(!user) {
                  req.flash("error", "No account with that email address exists.");
                  return res.redirect("/forgot");
              }
               
              user.resetPasswordToken = token;
              user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
               
              user.save(function(err){
                  done(err, token, user);
              });
          });
      },
      function(token, user, done){
          var smtpTransport = nodemailer.createTransport({
              service: "Gmail",
              auth: {
                  user: "codealonewithcolt@gmail.com",
                  pass: "passwordzxcvb"
              }
          });
          var mailOptions = {
              to: user.email,
              from: "codealonewithcolt@gmail.com",
              subject: "Password Reset",
              text: 'http://' + req.headers.host + '/reset/' + token + '\n\n'
          };
          
          smtpTransport.sendMail(mailOptions, function(err){
              console.log("mail sent");
              req.flash("success", "eamil has been sent to " + user.email + " with futher info");
              done(err, "done");
          });
      }
  ], function(err){
      if(err) return next(err);
      res.redirect("/forgot");
  }); 
});

router.get("/reset/:token", function(req, res){
   User.findOne({resetPasswordToken: req.params.token, resetPasswordExpires: {$gt: Date.now() }}, function(err, user) {
       if(!user) {
           req.flash("error", "Password reset token is invalid or has expired");
           return res.redirect("/forgot");
       }
       res.render("reset", {token: req.params.token});
   }); 
});

router.post("/reset/:token", function(req, res){
    async.waterfall([
        function(done) {
            User.findOne({resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() }}, function(err, user) {
                if(!user) {
                    req.flash("error", "Password reset token is invalid or has expired");
                    res.redirect("back");
                }
                if(req.body.password === req.body.confirm){
                    user.setPassword(req.body.password, function(err){
                        user.resetPasswordToken = undefined;
                        user.resetPasswordExpires = undefined;
                        
                        user.save(function(err){
                            req.logIn(user, function(err){
                                done(err, user);
                            });
                        });
                    });
                } else {
                    req.flash("error", "Passwords do not match");
                    return res.redirect("back");
                }
            });
        },
        function(user, done) {
            var smtpTransport = nodemailer.createTransport({
                service: "Gmail",
                auth: {
                    user: "codealonewithcolt@gmail.com",
                    pass: process.env.PASSWORDFT
                }
            });
            var mailOptions = {
                to: user.email,
                from: "codealonewithcolt@gmail.com",
                subject: "Your password has been changed",
                text: "Hello\n\n" + 
                "Your password for your account " + user.email + " has been changed"
            };
            smtpTransport.sendMail(mailOptions, function(err){
                req.flash("success", "Success! Your password has been changed");
                done(err);
            });
        }
    ], function(err){
        res.redirect("/campgrounds");
    });
});

router.get("/users/:id", function(req, res){
    User.findById(req.params.id, function(err, foundUser){
        if(err){
            req.flash("error", "User not found");
            res.redirect("back");
        } else {
            Campground.find().where("author.id").equals(foundUser._id).exec(function(err, campgrounds){
                if(err) {
                    req.flash("error", "Something went wrong");
                    res.redirect("back");
                } else {
                    res.render("users/show", {user: foundUser, campgrounds: campgrounds});
                }
            });
        }
    });
});


module.exports = router;