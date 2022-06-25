import express from "express"
const router = express.Router()
import db from "../models/app.js"
import path from "path"

router.get("/drafts", async (req, res) => {
  const pages = await db.pages.find({ status: "draft" }).sort({ createdAt: "desc" }).lean()
  res.render("pages/drafts", {
    title: "Pages",
    pages: pages,
  })
})

router.get("/new", (req, res) => {
  res.render("pages/new", { pagetype: "pageedit" })
})

router.get("/edit/:id", async (req, res) => {
  const page = await db.pages.findById(req.params.id).lean()
  res.render("pages/edit", { page: page, pagetype: "pageedit" })
})

router.post("/", async (req, res, next) => {
  req.page = new db.pages()
  next()
}, saveAndRedirect("new"))

router.put("/:id", async (req, res, next) => {
  req.page = await db.pages.findById(req.params.id)
  next()
}, saveAndRedirect("edit"))

router.delete("/:id", async (req, res) => {
  await db.pages.findByIdAndDelete(req.params.id)
  res.redirect("/")
})

function saveAndRedirect(command) {
  return async (req, res) => {
    let page = req.page
    page.status = req.body.status
    page.title = req.body.title
    page.url = path.join("/", req.body.url.replace(/[^a-zA-Z0-9\/]/, ""))
    page.markdown = req.body.markdown.replace(/\n/g, "")
    console.log("page", page)

    try {
      page = await page.save()
      res.redirect(page.url)
    } catch (e) {
      console.log(e)
      res.render(`pages/${command}`, { page: page })
    }
  }
}

export default router
