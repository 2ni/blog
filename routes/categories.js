import express from "express"
const router = express.Router()
import db from "../models/app.js"
import path from "path"
import { authorize } from "../middleware/auth.js"

router.get("/", authorize, async (req, res) => {
  const categories = await db.categories.find().sort({ name: "desc" }).lean()
  res.render("categories/index", { categories: categories })
})

router.get("/:categoryName", async (req, res) => {
  // check if category exists
  if ((await db.categories.find({ categoryName: req.params.categoryName })).length === 0) {
    return res.render("404")
  }

  const articles = await db.articles.find({ status: "published", categoryName: req.params.categoryName }).sort({ createdAt: "desc" }).lean()
  console.log("articles", articles)
  res.render("articles/index", { contents: articles })
})

router.get("/:slug/edit", authorize, async (req, res) => {
  const url = path.join("/categories", req.params.slug)
  const category = await db.categories.findOne({ url: url }).lean()
  res.render("categories/edit", { category: category, edit: path.join(url, "edit") })
})

router.get("/new", authorize, async (req, res) => {
  res.render("categories/new")
})

router.post("/", authorize, async (req, res, next) => {
  req.category = new db.categories()
  next()
}, saveAndRedirect("new"))

router.put("/:id", authorize, async (req, res, next) => {
  req.category =  await db.categories.findById(req.params.id)
  next()
}, saveAndRedirect())

router.delete("/:id", authorize, async (req, res) => {
  // TODO only delete if no articles connected to the category
  if (await db.articles.find({ categoryName: { $ne: null }})) {
    await db.categories.findByIdAndDelete(req.params.id)
    res.redirect("/categories")
  } else {
    res.render("404")
  }
})

router.put("/delete/:index", authorize, async (req, res, next) => {
  req.sitemaps = await db.sitemaps.findOne() || new db.sitemaps()
  next()
}, saveAndRedirect())

function saveAndRedirect() {
  return async (req, res) => {
    let category = req.category
    category.name = req.body.name

    try {
      category = await category.save()
      res.redirect("/categories")
    } catch (e) {
      console.log(e)
      res.render("/categories/edit", { category: category })
    }
  }
}

export default router
