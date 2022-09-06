import mongoose from "mongoose"
import contents from "./contents.js"
import sitemaps from "./sitemaps.js"
import categories from "./categories.js"

const db = {}
db.mongoose = mongoose
db.contents = contents
db.sitemaps = sitemaps
db.categories = categories

export default db
