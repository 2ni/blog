import express from "express"
const router = express.Router()
import db from "../models/app.js"
import path from "path"
import { authorize } from "../middleware/auth.js"

router.get("/drafts", async (req, res) => {
  const pages = await db.pages.find({ status: "draft" }).sort({ createdAt: "desc" }).lean()
  res.render("pages/drafts", {
    title: "Pages",
    contents: pages,
  })
})

router.get("/new", authorize, (req, res) => {
  res.render("pages/new")
})

router.post("/", authorize, async (req, res, next) => {
  req.page = new db.pages()
  next()
}, saveAndRedirect("new"))

router.put("/:id", authorize, async (req, res, next) => {
  req.page = await db.pages.findById(req.params.id)
  next()
}, saveAndRedirect("edit"))

router.delete("/:id", authorize, async (req, res) => {
  await db.pages.findByIdAndDelete(req.params.id)
  res.redirect("/")
})

function saveAndRedirect(command) {
  return async (req, res) => {
    let page = req.page
    page.status = req.body.status
    page.title = req.body.title
    page.url = path.join("/", req.body.url.replace(/[^a-zA-Z0-9\/]/, ""))
    // do not allow certian urls, eg /articles/*, */edit
    if (page.url.match(/^\/(articles|sitemaps|categories)\//) || page.url.match(/\/edit$/)) {
      return res.render(`pages/${command}`, { content: page })
    }

    page.markdown = req.body.markdown.replace(/\n/g, "")

    try {
      page = await page.save()
      res.redirect(page.url)
    } catch (e) {
      console.log(e)
      res.render(`pages/${command}`, { content: page })
    }
  }
}

export default router
