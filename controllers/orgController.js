const orgs = require("../models/orgModel");
const bcrypt=require("bcrypt")
const jwt=require('jsonwebtoken')

// register

// Register organisation
exports.orgRegisterController = async (req, res) => {
    try {
        const {
            orgName,
            orgEmail,
            orgPassword,
            orgAddress,
            orgPhoneNo,
            orgCategory,
            orgTiming,
            orgQueueCount,
            orgQueues
        } = req.body;

        // Check whether the organisation is already registered
        const existingOrg = await orgs.findOne({ orgEmail });

        if (existingOrg) {
            return res.status(409).json(
                "Organisation already registered. Please Login"
            );
        }

        // Validate queue count
        if (
            !Number.isInteger(Number(orgQueueCount)) ||
            Number(orgQueueCount) < 1 ||
            Number(orgQueueCount) > 3
        ) {
            return res.status(400).json(
                "Queue count must be between 1 and 3"
            );
        }

        // Validate queue names
        if (
            !Array.isArray(orgQueues) ||
            orgQueues.length !== Number(orgQueueCount)
        ) {
            return res.status(400).json(
                "Please provide the correct number of queue names"
            );
        }

        // Remove unnecessary spaces
        const cleanedQueues = orgQueues.map(queue =>
            typeof queue === "string" ? queue.trim() : ""
        );

        // Check for empty queue names
        if (cleanedQueues.some(queue => queue.length === 0)) {
            return res.status(400).json(
                "Queue names cannot be empty"
            );
        }

        // Check for duplicate queue names
        const uniqueQueues = new Set(
            cleanedQueues.map(queue => queue.toLowerCase())
        );

        if (uniqueQueues.size !== cleanedQueues.length) {
            return res.status(400).json(
                "Queue names must be unique"
            );
        }

        // Encrypt password
        const encryptPassword = await bcrypt.hash(orgPassword, 10);

        // Create organisation
        const newOrg = await orgs.create({
            orgName,
            orgEmail,
            orgPassword: encryptPassword,
            orgAddress,
            orgPhoneNo,
            orgCategory,
            orgTiming,
            orgQueueCount: Number(orgQueueCount),
            orgQueues: cleanedQueues
        });

        return res.status(201).json(newOrg);

    } catch (error) {
        return res.status(500).json(error);
    }
};


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
      .find({ approvalStatus: "approved" })
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


// Update organisation profile
exports.updateOrgProfileController = async (req, res) => {
    try {
        const {
            orgName,
            orgAddress,
            orgPhoneNo,
            orgDesc,
            orgCategory,
            orgTiming
        } = req.body;

        const updatedOrg = await orgs.findOneAndUpdate(
            { orgEmail: req.payload },
            {
                orgName,
                orgAddress,
                orgPhoneNo,
                orgDesc,
                orgCategory,
                orgTiming
            },
            {
                new: true,
                runValidators: true
            }
        ).select("-orgPassword");

        if (!updatedOrg) {
            return res.status(404).json({
                message: "Organisation not found"
            });
        }

        return res.status(200).json({
            message: "Profile updated successfully",
            organization: updatedOrg
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message
        });
    }
};