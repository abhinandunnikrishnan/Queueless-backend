const mongoose = require("mongoose")

const dns = require("dns");

dns.setServers([
    "8.8.8.8",
    "8.8.4.4",
    "1.1.1.1"
]);

const connectionString=process.env.DBCONNECTIONSTRING

mongoose.connect(connectionString).then(res=>{
    console.log("database connection successfull");
    
}).catch(error=>{
    console.log("database connection failed");
    console.log(error);
    
})