const express=require("express")
const userController=require("../controllers/userController")
const authMiddleware = require("../middlewares/authMiddleware")
const multerMiddleware = require("../middlewares/multerMiddleware")
const orgController = require("../controllers/orgController")
const bookingController = require("../controllers/bookingController");
const roleMiddleware = require("../middlewares/roleMiddleware");
const router = new express.Router()
// ------------------------------user-------------------------------------

// register
router.post("/register",userController.registerController)

// login
router.post("/login",userController.loginController)

// google-login
router.post("/google-login",userController.googleLoginController)

// user edit
router.put("/user/:id",authMiddleware,multerMiddleware.single('picture'),userController.userEditController)

// ------------------------------Organisation-------------------------------------

// register
router.post("/register-org",orgController.orgRegisterController)

// login
router.post("/login-org",orgController.orgLoginController)

// get all organisation
router.get("/organizations",orgController.getAllOrganizationsController)

// get single organisation
router.get("/organizations/:id",orgController.viewSingleOrganisationController)



// ================= BOOKING ROUTES =================

// User books a token
router.post(
  "/bookings",
  authMiddleware,
  roleMiddleware("user"),
  bookingController.createBookingController
);

// Get logged-in user's bookings
router.get(
  "/bookings/user",
  authMiddleware,
  roleMiddleware("user"),
  bookingController.getUserBookingsController
);

// Get organization's queue
router.get(
  "/bookings/organization",
  authMiddleware,
  roleMiddleware("org"),
  bookingController.getOrganizationQueueController
);

// Organization serves next token
router.patch(
  "/bookings/organization/next",
  authMiddleware,
  roleMiddleware("org"),
  bookingController.serveNextController
);

// User cancels booking
router.patch(
  "/bookings/:id/cancel",
  authMiddleware,
  roleMiddleware("user"),
  bookingController.cancelBookingController
);


// Get public queue availability
router.get(
  "/organizations/:id/queue-availability",
  bookingController.getQueueAvailabilityController
);



module.exports=router
