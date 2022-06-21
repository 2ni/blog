import express from "express"
const router = express.Router()
import db from "../models/app.js"

router.get("/", async (req, res) => {
  // console.log(res.__("hello"), res.getLocale(), res.getLocales())
  const articles = await db.articles.find({ status: "published" }).sort({ createdAt: "desc" }).lean()
  res.render("articles/index", {
    title: "Articles",
    articles: articles,
  })
})

router.get("/drafts", async (req, res) => {
  const articles = await db.articles.find({ status: "draft" }).sort({ createdAt: "desc" }).lean()
  res.render("articles/drafts", {
    title: "Articles",
    articles: articles,
  })
})

router.get("/new", (req, res) => {
  res.render("articles/new")
})

router.get("/edit/:id", async (req, res) => {
  const article = await db.articles.findById(req.params.id).lean()
  res.render("articles/edit", { article: article })
})

router.get("/:slug", async (req, res) => {
  const article = await db.articles.findOne({ slug: req.params.slug }).lean()
  if (article === null) res.redirect("/")
  res.render("articles/show", { article: article })
})

router.post("/", async (req, res, next) => {
  req.article = new db.articles()
  next()
}, saveAndRedirect("new"))

router.put("/:id", async (req, res, next) => {
  req.article = await db.articles.findById(req.params.id)
  next()
}, saveAndRedirect("edit"))

router.delete("/:id", async (req, res) => {
  await db.articles.findByIdAndDelete(req.params.id)
  res.redirect("/")
})

function saveAndRedirect(path) {
  return async (req, res) => {
    let article = req.article
    article.status = req.body.status
    article.title = req.body.title
    article.description = req.body.description
    article.markdown = req.body.markdown

    try {
      article = await article.save()
      res.redirect(`/articles/${article.slug}`)
    } catch (e) {
      res.render(`articles/${path}`, { article: article })
    }
  }
}

export default router
