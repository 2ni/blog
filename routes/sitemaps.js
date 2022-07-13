import express from "express"
const router = express.Router()
import db from "../models/app.js"
import { authorize } from "../middleware/auth.js"

router.get("/", authorize, async (req, res) => {
  const sitemaps = await db.sitemaps.findOne().lean()
  res.render("sitemaps/edit", { sitemaps: sitemaps })
})

router.put("/", authorize, async (req, res, next) => {
  req.sitemaps = await db.sitemaps.findOne() || new db.sitemaps()
  next()
}, saveAndRedirect())

router.put("/delete/:index", authorize, async (req, res, next) => {
  req.sitemaps = await db.sitemaps.findOne() || new db.sitemaps()
  next()
}, saveAndRedirect())

function saveAndRedirect() {
  return async (req, res) => {
    let sitemaps = req.sitemaps
    sitemaps.content = []
    if (!Array.isArray(req.body["name[]"])) {
      req.body["name[]"] = [ req.body["name[]"] ]
      req.body["url[]"] = [ req.body["url[]"] ]
    }

    req.body["name[]"].forEach((name, index) => {
      if (name && (!req.params.index || index != req.params.index)) {
        let sitemap = { name: name, url: req.body["url[]"][index] }
        sitemaps.content.push(sitemap)
      }
    })

    try {
      sitemaps = await sitemaps.save()
      res.redirect("/sitemaps")
    } catch (e) {
      console.log(e)
      res.render("/sitemaps/edit", { sitemaps: sitemaps })
    }
  }
}

export default router
