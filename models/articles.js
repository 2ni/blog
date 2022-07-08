import mongoose from "mongoose"
import slugify from "slugify"
import contentSchema from "./content.js"
import path from "path"

const articleSchema = contentSchema.clone()
articleSchema.add({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
})

articleSchema.pre("validate", function(next) {
  if (this.title) {
    this.url = path.join("/articles", slugify(this.title, { lower: true, strict: true }))
  }
  next()
})

const articles = mongoose.model("Articles", articleSchema)
export default articles
