import express from "express"
const router = express.Router()
import db from "../models/app.js"
import path from "path"
import { authorize } from "../middleware/auth.js"

router.get("/:page([0-9]+)?/:limit([0-9]+)?", async (req, res) => {
  // console.log(res.__("hello"), res.getLocale(), res.getLocales())
  // const page = parseInt(req.query.page) || 1
  // const limit = parseInt(req.query.limit) || 10
  const page = parseInt(req.params.page) || 1
  const limit = parseInt(req.params.limit) || 10
  const startIndex = (page - 1) * limit
  const endIndex = page * limit

  const articles = await db.articles.find({ status: "published" }).limit(limit).skip(startIndex).sort({ createdAt: "desc" }).lean()
  if (!articles.length) {
    res.status(404)
    return res.render("404")
  }
  let next = {}
  let previous = {}
  if (startIndex) {
    previous = { previous: { page: page - 1, limit: limit}}
  }
  if (endIndex < await db.articles.count({ status: "published" }).exec()) {
    next = { next: { page: page + 1, limit: limit}}
  }
  // console.log({...next, ...previous})

  res.render("articles/index", {
    ...next,
    ...previous,
    ...{
      contents: articles,
    }
  })
})

router.get("/drafts", authorize, async (req, res) => {
  const articles = await db.articles.find({ status: "draft" }).sort({ createdAt: "desc" }).lean()
  res.render("articles/drafts", {
    title: "Articles",
    contents: articles,
  })
})

router.get("/new", authorize, async (req, res) => {
  const categories = await db.categories.find().sort({ name: "asc" }).lean()
  res.render("articles/new", { categories: categories })
})

router.get("/:slug/edit", authorize, async (req, res) => {
  const url = path.join("/articles", req.params.slug)
  const article = await db.articles.findOne({ url: url }).lean()
  const categories = await db.categories.find().sort({ name: "asc" }).lean()
  res.render("articles/edit", { content: article, categories: categories, edit: path.join(url, "edit") })
})

router.get("/:slug", async (req, res) => {
  const url = path.join("/articles", req.params.slug)
  const article = await db.articles.findOne({ url: url, status: "published" }).lean()
  if (article === null) {
    res.status(404).render("404")
  } else {
    res.render("articles/show", { content: article, edit: path.join(url, "edit") })
  }
})

router.post("/", authorize, async (req, res, next) => {
  req.article = new db.articles()
  next()
}, saveAndRedirect("new"))

router.put("/:id", authorize, async (req, res, next) => {
  req.article = await db.articles.findById(req.params.id)
  next()
}, saveAndRedirect("edit"))

router.delete("/:id", authorize, async (req, res) => {
  await db.articles.findByIdAndDelete(req.params.id)
  res.redirect("/")
})

function saveAndRedirect(path) {
  return async (req, res) => {
    let article = req.article
    article.status = req.body.status
    article.title = req.body.title
    article.description = req.body.description
    article.markdown = req.body.markdown.replace(/\n/g, "")
    article.category = req.body.category || null

    try {
      article = await article.save()
      res.redirect(article.url)
    } catch (e) {
      console.log(e)
      res.render(`articles/${path}`, { content: article })
    }
  }
}

export default router
