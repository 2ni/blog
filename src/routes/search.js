import express from "express"
const router = express.Router()
import db from "../models/app.js"
import path from "path"

/*
 * TODO 2 collections don't work, eg next 10 articles could still have more score than first 10 pages
 */
router.get("/:page([0-9]+)?/:limit([0-9]+)?", async (req, res) => {
  let q = req.query.q
  const page = parseInt(req.params.page) || 1
  const limit = parseInt(req.params.limit) || 10
  const startIndex = (page - 1) * limit
  const endIndex = page * limit

  if (q && (req.params.page || req.params.limit)) {
    res.status(404)
    return res.render("404")
  }

  let contents = null
  if (q) {
    if (!q.match(/"/)) q = q.split(/\s+/).map(kw => `"${kw}"`).join(' ')
    contents = await db.contents.find({ status: "published", "$text": { "$search": q } }, { score: { $meta: "textScore" }}).limit(10).skip(startIndex).lean()
  }

  let next = {}
  let previous = {}
  if (startIndex) {
    previous = { previous: { page: page - 1, limit: limit}}
  }
  if (endIndex < await db.contents.count({ status: "published" }).exec()) {
    next = { next: { page: page + 1, limit: limit}}
  }
  // console.log({...next, ...previous})

  // merge collections, sort by score, createdAt
  res.render("search/index", {
    ...next,
    ...previous,
    ...{
      contents: contents.sort((a, b) => { return b.score - a.score || b.createdAt - a.createdAt }),
      q: req.query.q,
    }
  })
})

export default router
