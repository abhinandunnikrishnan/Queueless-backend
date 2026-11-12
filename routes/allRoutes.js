const express=require("express")
const userController=require("../controllers/userController")
const authMiddleware = require("../middlewares/authMiddleware")
const multerMiddleware = require("../middlewares/multerMiddleware")
const orgController = require("../controllers/orgController")
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

module.exports=router