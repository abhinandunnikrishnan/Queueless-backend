const orgs = require("../models/orgModel");
const bcrypt=require("bcrypt")
const jwt=require('jsonwebtoken')

// register
exports.orgRegisterController=async(req,res)=>{
    console.log("inside orgRegisterController");
    console.log(req.body);
    const{orgName,orgEmail,orgPassword,orgAddress,orgPhoneNo,orgCategory,orgTiming}=req.body
    // check email is in db
    const existingOrg=await orgs.findOne({orgEmail})
    if(existingOrg){
        res.status(409).json("Organisation already registered Please Login")
    }else{
        let encryptPassword=await bcrypt.hash(orgPassword,10)
        const newOrg=await orgs.create({
            orgName,orgEmail,orgPassword:encryptPassword,orgAddress,orgPhoneNo,orgCategory,orgTiming
        })
        res.status(201).json(newOrg)
    }
    res.status(201).json("register request received")
    
}

// login
exports.orgLoginController=async(req,res)=>{
    console.log("inside orgLoginController");
    const{orgEmail,orgPassword}=req.body
    // check email is in db
    const existingOrg=await orgs.findOne({orgEmail})
    if(existingOrg){
        // check password
        const isPasswordMatch = await bcrypt.compare(orgPassword,existingOrg.orgPassword)
        if(isPasswordMatch){
            const token=jwt.sign({userMail:orgEmail,role:existingOrg.role},process.env.JWTSECRET)
            res.status(200).json({user:existingOrg,token})
        }else{
            res.status(409).json("invalid password ")
        }
    }else{
        res.status(409).json("invalid email please register ")
    } 
}

// Get all registered organizations
exports.getAllOrganizationsController = async (req, res) => {
  console.log("Inside getAllOrganizationsController");

  try {
    const allOrganizations = await orgs
      .find()
      .select("-orgPassword");

    if (allOrganizations.length === 0) {
      return res.status(200).json([]);
    }

    res.status(200).json(allOrganizations);

  } catch (error) {
    res.status(500).json(error);
  }
};

// get a single organisation to view 
exports.viewSingleOrganisationController=async(req,res)=>{
    console.log("inside viewSingleOrganisationController");
    const {id}=req.params
    const orgDetails= await orgs.findById({_id:id})
    res.status(200).json(orgDetails)
    
}