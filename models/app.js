import mongoose from "mongoose"
import articles from "./articles.js"
import pages from "./pages.js"
import sitemaps from "./sitemaps.js"
import categories from "./categories.js"

const db = {}
db.mongoose = mongoose
db.articles = articles
db.pages = pages
db.sitemaps = sitemaps
db.categories = categories

export default db
