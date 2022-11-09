import express from "express"
import slugify from "slugify"
const router = express.Router()
import db from "../models/app.js"
import path from "path"
import config from "../config/config.js"
import { authorize } from "../middleware/auth.js"

router.get("/:page([0-9]+)?/:limit([0-9]+)?", async (req, res) => {
  // console.log(res.__("hello"), res.getLocale(), res.getLocales())
  // const page = parseInt(req.query.page) || 1
  // const limit = parseInt(req.query.limit) || 10
  let q = req.query.q
  const page = parseInt(req.params.page) || 1
  const limit = parseInt(req.params.limit) || 10
  const startIndex = (page - 1) * limit
  const endIndex = page * limit

  if (q && (req.params.page || req.params.limit)) {
    res.status(404)
    return res.render("404")
  }

  let articles = null
  if (q) {
    if (!q.match(/"/)) q = q.split(/\s+/).map(kw => `"${kw}"`).join(' ')
    articles = await db.contents.find({ status: "published", contentType: "article", "$text": { "$search": q } }).limit(10).skip(startIndex).lean()
  } else {
    articles = await db.contents.find({ status: "published", contentType: "article" }).limit(limit).skip(startIndex).sort({ createdAt: "desc" }).lean()
  }

  if (!articles.length && !q) {
    res.status(404)
    return res.render("404")
  }
  let next = {}
  let previous = {}
  if (startIndex) {
    previous = { previous: { page: page - 1, limit: limit}}
  }
  if (endIndex < await db.contents.count({ status: "published", contentType: "article" }).exec()) {
    next = { next: { page: page + 1, limit: limit}}
  }
  // console.log({...next, ...previous})

  res.render("articles/index", {
    ...next,
    ...previous,
    ...{
      contents: articles,
      title: res.__("title all articles") + config.urlTitle,
    }
  })
})

router.get("/drafts", authorize("admin"), async (req, res) => {
  const articles = await db.contents.find({ status: "draft", contentType: "article" }).sort({ createdAt: "desc" }).lean()
  res.render("articles/drafts", {
    title: "Articles",
    contents: articles,
  })
})

router.get("/new", authorize("admin"), async (req, res) => {
  const categories = await db.categories.find().sort({ name: "asc" }).lean()
  res.render("articles/new", { categories: categories })
})

router.get("/:slug/edit", authorize("admin"), async (req, res) => {
  const url = path.join("/articles", req.params.slug)
  const article = await db.contents.findOne({ url: url }).lean()
  const categories = await db.categories.find().sort({ name: "asc" }).lean()
  res.render("articles/edit", { content: article, categories: categories, edit: path.join(url, "edit") })
})

router.get("/:slug", async (req, res) => {
  const url = path.join("/articles", req.params.slug)
  const status = res.locals.user && res.locals.user.role === "admin" ? {} : { status: "published" }
  const article = await db.contents.findOne({...{ url: url }, ...status }).lean()
  if (article === null) {
    res.status(404).render("404")
  } else {
    res.render("articles/show", { content: article, title: article.title + config.urlTitle, edit: path.join(url, "edit") })
  }
})

router.post("/", authorize("admin"), async (req, res, next) => {
  req.article = new db.contents()
  next()
}, saveAndRedirect("new"))

router.put("/:id", authorize("admin"), async (req, res, next) => {
  req.article = await db.contents.findById(req.params.id)
  next()
}, saveAndRedirect("edit"))

router.delete("/:id", authorize("admin"), async (req, res) => {
  await db.contents.findByIdAndDelete(req.params.id)
  res.redirect("/")
})

function saveAndRedirect(origin) {
  return async (req, res) => {
    let article = req.article
    article.status = req.body.status
    article.title = req.body.title
    article.markdown = req.body.markdown.replace(/\n/g, "")
    article.category = req.body.category || null
    article.contentType = "article"
    article.url = path.join("/articles", slugify(article.title, { lower: true, strict: true }))

    try {
      article = await article.save()
      if (article.status === "published") {
        res.redirect(article.url)
      } else {
        res.redirect(path.join(article.url, "edit"))
      }
    } catch (e) {
      console.log(e)
      res.render(`articles/${origin}`, { content: article })
    }
  }
}

export default router
