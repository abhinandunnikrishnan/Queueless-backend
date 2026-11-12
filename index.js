const express = require("express")
const cors = require("cors")
require("dotenv").config()
const routes = require('./routes/allRoutes')
require('./config/db')

const server=express()

server.use(cors())

server.use(express.json())

server.use(routes)

// handling static file/folder
server.use('/uploads',express.static('./uploads'))

const PORT =process.env.PORT

server.listen(PORT,()=>{
    console.log("Server Started");
    
})

// handling  global errors in server using application specific middleware
server.use((err,req,res,next)=>{
    res.status(500).json(err.message)
})

server.get('/',(req,res)=>{
    res.status(200).send("<h1>Server Started..</h1>")
})



