import express from "express"
const router = express.Router()
import db from "../models/app.js"
import path from "path"
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"
import { filterKeys } from "../helpers/utils.js"
import { authorizeFirewall } from "../middleware/auth.js"

router.get("/login", authorizeFirewall, async (req, res) => {
  const user = {}
  res.render("auth/login", { user: user })
})

router.post("/login", authorizeFirewall, async (req, res, next) => {
  const user = await db.users.findOne({ email: req.body.email })
  if (user === null) {
    return res.render("auth/login", { user: filterKeys(req.body, "email,password"), error: "invalid login" })
  }

  try {
    if (await bcrypt.compare(req.body.password, user.password)) {
      logUserIn(res, user)
      return res.redirect(req.query.r ? req.query.r : "/")
    } else {
      res.clearCookie("token")
      return res.render("auth/login", { user: filterKeys(req.body, "email,password"), error: "invalid login" })
    }
  } catch (e) {
    console.log(e)
    return res.status(500).render(404)
  }
})

router.get("/register", authorizeFirewall, async (req, res) => {
  res.render("auth/register")
})

router.post("/register", authorizeFirewall, async (req, res) => {
  const user = new db.users({
    email: req.body.email,
    password: await bcrypt.hash(req.body.password, 10), // hashed pw
  })

  try {
    await user.save()
    logUserIn(res, user)
    return res.redirect(req.query.r ? req.query.r : "/")

  } catch (e) {
    let msg = "an error occured"
    if (e.name === "MongoServerError" && e.code === 11000) {
      msg = "entry already exists"
    }
    res.render("auth/register", { user: filterKeys(req.body, "email,password"), error: msg })
  }
})

const logUserIn = (res, user) => {
  const duration = 3600*24*30 // 30 days
  const access_token = jwt.sign({ email: user.email,  role: user.role }, process.env.TOKEN_SECRET, { expiresIn: duration+"s" })
  res.cookie("token", access_token, {
    httpOnly: true,
    secure: process.env.ENV === "production",
    sameSite: true,
    maxAge: 1000*duration, // ms
  })
}

export default router
