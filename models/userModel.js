const mongoose = require("mongoose")
const userSchema= new mongoose.Schema({
    username:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true
    },
    password:{
        type:String,
        required:true
    },
    role:{
        type:String,
        default:"user"
    },
    picture:{
        type:String,
        default:""
    },
    address:{
        type:String,
        default:""
    },
    phoneNo:{
        type:String,
        default:""
    }
})

const users =mongoose.model('users',userSchema)

module.exports=users