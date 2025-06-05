import express from "express";
import dotenv from "dotenv";

dotenv.config()

const app = express()

const PORT = process.env.PORT;

app.get("/",(req, res) => {
    res.send("It's working")
})

console.log("my port:", process.env.PORT);

app.listen(PORT, () => {
    console.log("Server is up and running on PORT:", PORT)
})