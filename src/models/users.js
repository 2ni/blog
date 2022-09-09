import mongoose from "mongoose"
import path from "path"
import  { config } from  "../config/app.js"
import db from "./app.js"


const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: { values: [ "", "admin" ], message: "{VALUE} is not supported" },
    default: "",
  },
}, { timestamps: true })


const users = mongoose.model("Users", userSchema)
export default users
