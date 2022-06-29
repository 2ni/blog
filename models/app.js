import mongoose from "mongoose"
import articles from "./articles.js"
import pages from "./pages.js"
import sitemaps from "./sitemaps.js"

const db = {}
db.mongoose = mongoose
db.articles = articles
db.pages = pages
db.sitemaps = sitemaps

export default db
