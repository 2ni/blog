import mongoose from "mongoose"
import articles from "./articles.js"
import pages from "./pages.js"

const db = {}
db.mongoose = mongoose
db.articles = articles
db.pages = pages

export default db
