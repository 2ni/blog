#!/usr/bin/env node
import mongoose from "mongoose"
import db from "./models/app.js"
import { config } from "./config/app.js"

process.stdout.write("waiting for DB...")
try {
  db.mongoose.connect(config.dbUrl, { useNewUrlParser: true, useUnifiedTopology: true })
} catch (err) {
  console.error("\x1B[31;1mfailed\x1B[0m", err)
}
console.log("\x1B[32;1msuccess\x1B[0m")

/*
const x = await db.articles.find({ categoryName: { $ne: null }}).count()
console.log("x", x)
process.exit(0)
*/

await db.articles.deleteOne({ "title": "XXX" })
await db.categories.deleteOne({ name: "electronics2" })
await db.categories.deleteOne({ name: "electronics3" })
let category = new db.categories({
  name: "electronics2",
})
await category.save()

category = await db.categories.findOne({ name: "electronics2" })
let article = new db.articles({
  title: "XXX",
  category: category._id,
})
await article.save()

article.category = "62ce8d22c4e1e1ccd0738d08"
await article.save()

// does not trigger middlewares of mongoose
// await db.categories.updateOne({}, { "name": "electronics2" })

category.name = "electronics3"
await category.save()

article = await db.articles.findOne({ "title": "XXX" })

console.log("*************************************\narticle", article)

db.mongoose.connection.close()
console.log("done.")
