import express from "express"
const router = express.Router()
import db from "../models/app.js"

router.get("/", async (req, res) => {
  const sitemaps = await db.sitemaps.findOne().lean()
  res.render("sitemaps/edit", { sitemaps: sitemaps, pagetype: "sitemapsedit" })
})

router.put("/", async (req, res, next) => {
  req.sitemaps = await db.sitemaps.findOne() || new db.sitemaps()
  next()
}, saveAndRedirect())

router.put("/delete/:index", async (req, res, next) => {
  req.sitemaps = await db.sitemaps.findOne() || new db.sitemaps()
  next()
}, saveAndRedirect())

function saveAndRedirect() {
  return async (req, res) => {
    let sitemaps = req.sitemaps
    sitemaps.content = []
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
