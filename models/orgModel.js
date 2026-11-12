const mongoose = require("mongoose")
const orgSchema= new mongoose.Schema({
    orgName:{
        type:String,
        required:true
    },
    orgEmail:{
        type:String,
        required:true
    },
    orgPassword:{
        type:String,
        required:true
    },
    role:{
        type:String,
        default:"org"
    },
    
    orgAddress:{
        type:String,
        default:""
    },
    orgPhoneNo:{
        type:String,
        default:""
    },
    orgDesc:{
        type:String,
        default:""
    },
    orgCategory:{
        type:String,
        default:"",
        enum: ["Hospital", "Service Center", "Salon", "Restaurant"]
    },
    orgTiming: {
        openingTime: {
            type: String,
            default: true
        },
        closingTime: {
            type: String,
            default: true
        }
    }
    
})

const orgs =mongoose.model('orgs',orgSchema)

module.exports=orgs