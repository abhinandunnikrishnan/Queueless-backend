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
    approvalStatus: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending"
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
    orgQueueCount: {
    type: Number,
    required: true,
    min: 1,
    max: 3,
    default: 1
    },
    orgQueues: {
        type: [String],
        required: true,
        default: ["General Consultation"],
        validate: {
            validator: function (queues) {
                return (
                    queues.length >= 1 &&
                    queues.length <= 3 &&
                    queues.every(queue => queue.trim().length > 0) &&
                    new Set(
                        queues.map(queue => queue.trim().toLowerCase())
                    ).size === queues.length
                );
            },
            message: "Please provide 1 to 3 unique queue names."
        }
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