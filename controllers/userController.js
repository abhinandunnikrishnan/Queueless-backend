const bcrypt=require("bcrypt")
const users=require('../models/userModel')
const jwt=require('jsonwebtoken')
// register
exports.registerController=async(req,res)=>{
    console.log("inside registerController");
    console.log(req.body);
    const{username,email,password}=req.body
    // check email is in db
    const existingUser=await users.findOne({email})
    if(existingUser){
        res.status(409).json("User already exist")
    }else{
        let encryptPassword=await bcrypt.hash(password,10)
        const newUser=await users.create({
            username,email,password:encryptPassword
        })
        res.status(201).json(newUser)
    }
    res.status(201).json("register request received")
    
}

// login
exports.loginController=async(req,res)=>{
    console.log("inside loginController");
    const{email,password}=req.body
    // check email is in db
    const existingUser=await users.findOne({email})
    if(existingUser){
        // check password
        const isPasswordMatch = await bcrypt.compare(password,existingUser.password)
        if(isPasswordMatch){
            const token=jwt.sign({userMail:email,role:existingUser.role},process.env.JWTSECRET)
            res.status(200).json({user:existingUser,token})
        }else{
            res.status(409).json("invalid password ")
        }
    }else{
        res.status(409).json("invalid email please register ")
    } 
}

// googlelogin
exports.googleLoginController=async(req,res)=>{
    console.log("inside googleLoginController");
    const{email,password,picture,username}=req.body
    // check email is in db
    const existingUser=await users.findOne({email})
    // console.log(email,password,picture,username);
    
    if(existingUser){
        // if present
        const token=jwt.sign({userMail:existingUser.email,role:existingUser.role},process.env.JWTSECRET)
        res.status(200).json({user:existingUser,token})
    }else{
        // if not present register user
        let encryptPassword=await bcrypt.hash(password,10)
        const newUser=await users.create({
            username,email,password:encryptPassword,picture
        })
        const token=jwt.sign({userMail:newUser.email,role:newUser.role},process.env.JWTSECRET)
        res.status(200).json({user:newUser,token})
    }
    
    
}

// user edit
exports.userEditController=async(req,res)=>{
    console.log("inside userEditController");
    const{id}=req.params
    const email=req.payload
    const{username,picture,role,phoneNo,address}=req.body
    const uploadedPicture=req.file?req.file.filename:picture
    const updatedUser=await users.findByIdAndUpdate({_id:id},{username,email,picture:uploadedPicture,phoneNo,address,role},{new:true})
    res.status(200).json(updatedUser) 
}