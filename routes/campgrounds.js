var express     = require("express"),
    router      = express.Router(),
    Campground  = require("../models/campground"),
    middleware  = require("../middleware"),
    request     = require("request"),
    multer      = require("multer"),
    storage     = multer.diskStorage({
        filename: function(req, file, callback) {
            callback(null, Date.now() + file.originalname);
        }
    });
    
var imageFilter = function(req, file, cb) {
    if(!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
        return cb(new Error('Only image files are allowed'), false);
    }
    cb(null, true);
};

var upload = multer({storage: storage, fileFilter: imageFilter});

var cloudinary = require('cloudinary');
cloudinary.config({
    cloud_name: 'wbear',
    api_key: "636277436715582",
    api_secret: process.env.CLOUDINARY_API_SECRET
});

var NodeGeocoder = require('node-geocoder');
 
var options = {
    provider: 'google',
    httpAdapter: 'https',
    apiKey: process.env.GEOCODER_API_KEY,
    formatter: null
};
 
var geocoder = NodeGeocoder(options);

router.get("/", function(req, res){
    var perPage = 8;
    var pageQuery = parseInt(req.query.page);
    var pageNumber = pageQuery ? pageQuery : 1;
    var noMatch = null;
    if(req.query.search) {
        var regex = new RegExp(escapeRegex(req.query.search), 'gi');
        Campground.find({name: regex}).skip((perPage * pageNumber) - perPage).limit(perPage).sort({"createdAt": -1}).exec(function(err, allCampgrounds){
           Campground.count({name: regex}).exec(function(err, count){
                if(err) {
                   console.log(err);
                   res.redirect("back");
                } else {
                    if(allCampgrounds.length < 1) {
                         noMatch = "No such campground found, please try again";
                    }
                    res.render("campgrounds/index", {
                        campgrounds: allCampgrounds,
                        page: "campgrounds",
                        noMatch: noMatch,
                        pages: Math.ceil(count/ perPage),
                        current: pageNumber,
                        search: req.query.search
                    });
                }
           });
       });
    } else {
        Campground.find({}).skip((perPage * pageNumber) - perPage).limit(perPage).sort({"createdAt": -1}).exec(function(err, allCampgrounds){
           Campground.count().exec(function(err, count){
                if(err) {
                    console.log(err);
                    res.redirect("back")
                } else {
                    res.render("campgrounds/index", {
                        campgrounds: allCampgrounds, 
                        page: "campgrounds", 
                        noMatch: noMatch,
                        current: pageNumber,
                        pages: Math.ceil(count / perPage),
                        search: false
                    });
                }
           });
           
       });
    }
});

//CREATE - add new campground to DB
router.post("/", middleware.isLoggedIn, upload.single('image'), function(req, res){
    geocoder.geocode(req.body.location, function (err, data) {
        if (err || data.status === 'ZERO_RESULTS' || data.status === 'INVALID_REQUEST') {
          req.flash('error', 'Invalid address, try typing a new address');
          return res.redirect('back');
        }
        
        if (err || data.status === 'REQUEST_DENIED') {
            req.flash('error', 'Something Is Wrong Your Request Was Denied');
            return res.redirect('back');
            
        }
        
        if (err || data.status === 'OVER_QUERY_LIMIT') {
            req.flash('error', 'All Requests Used Up');
            return res.redirect('back');
        }
        
        if(err || data.status === 'UNKNOWN_ERROR' || data.status === 'ERROR'){
            req.flash('error', "Error");
            return res.redirect("back");
        }
        req.body.campground.lat = data[0].latitude;
        req.body.campground.lng = data[0].longitude;
        req.body.campground.location = data[0].formattedAddress;
        // get data from form and add to campgrounds array
        cloudinary.v2.uploader.upload(req.file.path, function(err, result){
            if(err) {
                req.flash("error", err.message);
                return res.redirect("back");
            }
            req.body.campground.image = result.secure_url;
            req.body.campground.imageId = result.public_id;
            req.body.campground.author = {
                id: req.user._id,
                username: req.user.username
            };
            

        // Create a new campground and save to DB
        Campground.create(req.body.campground, function(err, newlyCreated){
            if(err){
                req.flash("error", err.message);
                return res.redirect("back");
            } else {
                //redirect back to campgrounds page
                res.redirect("/campgrounds/" + newlyCreated.id);
            }
        });
    });
  });
});

router.get("/new", middleware.isLoggedIn, function(req, res){
   res.render("campgrounds/new");
});

//show more info about one campground
router.get("/:id", function(req, res) {
    Campground.findById(req.params.id).populate("comments").exec(function(err, foundCampground){
        if(err || !foundCampground) {
            req.flash("error", "Campground not found");
            res.redirect("back");
        } else {
            res.render("campgrounds/show", {campground: foundCampground});
        }
    });
});

//edit 

router.get("/:id/edit", middleware.checkCampgroundOwnership, function(req, res){
    Campground.findById(req.params.id, function(err, foundCampground){
        if(err){
            req.flash("error", "Page not found");
            return res.redirect("back");
        } 
        res.render("campgrounds/edit", {campground: foundCampground});
    });
});

//update

// UPDATE CAMPGROUND ROUTE
router.put("/:id", middleware.checkCampgroundOwnership, upload.single('image'), function(req, res){
    geocoder.geocode(req.body.location, function (err, data) {
    if (err || data.status === 'ZERO_RESULTS' || data.status === 'INVALID_REQUEST') {
      req.flash('error', 'Invalid address, try typing a new address');
      return res.redirect('back');
    }
    
    if (err || data.status === 'REQUEST_DENIED') {
        req.flash('error', 'Something Is Wrong Your Request Was Denied');
        return res.redirect('back');
        
    }
    
    if (err || data.status === 'OVER_QUERY_LIMIT') {
        req.flash('error', 'All Requests Used Up');
        return res.redirect('back');
    }
    
    if(err || data.status === 'UNKNOWN_ERROR' || data.status === 'ERROR'){
        req.flash('error', "Error");
        return res.redirect("back");
    }
    req.body.campground.lat = data[0].latitude;
    req.body.campground.lng = data[0].longitude;
    req.body.campground.location = data[0].formattedAddress;
    Campground.findById(req.params.id, function(err, campground) {
        if(err) {
            req.flash('error', err.message);
            return res.redirect('back');
        } else {
            if(req.file) {
                cloudinary.v2.uploader.destroy(campground.imageId, function(err){
                    if(err) {
                        req.flash('error', err.message);
                        return res.redirect('back');
                    } 
                    cloudinary.v2.uploader.upload(req.file.path, function(err, result){
                        if(err) {
                        req.flash('error', err.message);
                        return res.redirect('back');
                        } 
                        req.body.campground.imageId = result.public_id;
                        req.body.campground.image = result.secure_url;
                        Campground.findByIdAndUpdate(req.params.id, req.body.campground, function(err, updatedCampground){
                            if (err) {
                                req.flash("error", err.message);
                                res.redirect("/campgrounds");
                              } else {
                                
                                req.flash("success","Successfully Updated!");
                                res.redirect("/campgrounds/" + req.params.id);
                             }
                        }); // end of find and update
                    }); // end of upload
                }); // end of destroy
            } else {
                req.body.campground.imageId = campground.imageId;
                req.body.campground.image = campground.image;
                Campground.findByIdAndUpdate(req.params.id, req.body.campground, function(err, updatedCampground){
                    if (err) {
                        req.flash("error", err.message);
                        res.redirect("/campgrounds");
                      } else {
                        
                        req.flash("success","Successfully Updated!");
                        res.redirect("/campgrounds/" + req.params.id);
                     }
                }); // end of find and update
            }
        }
    }); // end of find
    
  }); // end of geocoder
}); // end of put

//destroy

router.delete("/:id", middleware.checkCampgroundOwnership, upload.single('image'), function(req, res){
    Campground.findById(req.params.id, function(err, campground){
        if(err) {
            req.flash("error", err.message);
            res.redirect("back");
        } else {
            cloudinary.v2.uploader.destroy(campground.imageId, function(err){
                if(err) {
                    req.flash("error", err.message);
                    return res.redirect("back");
                }
                    Campground.findByIdAndRemove(req.params.id, function(err){
                    if(err){
                        res.redirect("/campgrounds");
                    } else {
                        res.redirect("/campgrounds");
                    }
                });
            });
        }
    });
});

function escapeRegex(text){
    return text.replace(/[-[\]{}()*+?.,\\^$!#\s]/g, "\\$&");
}

module.exports = router;