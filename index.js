
const express = require("express")
const cors = require("cors")
require("dotenv").config()

const routes = require('./routes/allRoutes')
require('./config/db')

const {
    stripeWebhookController
} = require("./controllers/bookingController")

const server = express()

server.use(cors())

// Stripe webhook must be registered before express.json()
server.post(
    "/stripe-webhook",
    express.raw({ type: "application/json" }),
    stripeWebhookController
)

server.use(express.json())

server.use(routes)

// handling static file/folder
server.use('/uploads', express.static('./uploads'))

const PORT = process.env.PORT

server.listen(PORT, () => {
    console.log("Server Started")
})

// handling global errors
server.use((err, req, res, next) => {
    res.status(500).json(err.message)
})

server.get('/', (req, res) => {
    res.status(200).send("<h1>Server Started..</h1>")
})
