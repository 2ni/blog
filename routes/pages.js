import express from "express"
const router = express.Router()
import db from "../models/app.js"

router.get("/", async (req, res) => {
  // console.log(res.__("hello"), res.getLocale(), res.getLocales())
  const pages = await db.pages.find({ status: "published" }).sort({ createdAt: "desc" }).lean()
  res.render("pages/index", {
    title: "Pages",
    pages: pages,
  })
})

router.get("/drafts", async (req, res) => {
  const pages = await db.pages.find({ status: "draft" }).sort({ createdAt: "desc" }).lean()
  res.render("pages/drafts", {
    title: "Pages",
    pages: pages,
  })
})

router.get("/new", (req, res) => {
  res.render("pages/new")
})

router.get("/edit/:id", async (req, res) => {
  const page = await db.pages.findById(req.params.id).lean()
  res.render("pages/edit", { page: page })
})

router.get("/:slug", async (req, res) => {
  const page = await db.pages.findOne({ slug: req.params.slug }).lean()
  if (page === null) res.redirect("/")
  res.render("pages/show", { page: page })
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

function saveAndRedirect(path) {
  return async (req, res) => {
    let page = req.page
    page.status = req.body.status
    page.title = req.body.title
    page.markdown = req.body.markdown

    try {
      page = await page.save()
      res.redirect(`/pages/${page.slug}`)
    } catch (e) {
      res.render(`pages/${path}`, { page: page })
    }
  }
}

export default router
