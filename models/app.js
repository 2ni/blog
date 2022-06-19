import mongoose from "mongoose"
import articles from "./articles.js"

const db = {}
db.mongoose = mongoose
db.articles = articles


export default db
