import mongoose from "mongoose"
import slugify from "slugify"
import path from "path"
import contentSchema from "./content.js"

const pageSchema = contentSchema.clone()
pageSchema.add({
  title: {
    type: String,
  },
  slug: {
    type: String,
  },
  path: {
    type: String,
  },
  url: {
    type: String,
    required: true,
    unique: true,
  },
})

pageSchema.pre("validate", function(next) {
  this.slug = slugify(this.title, { lower: true, strict: true })
  this.url = path.join("/", (this.path.replace(/[^a-zA-Z0-9\/]/, "") || ""), (this.slug || ""))

  next()
})

const pages = mongoose.model("Pages", pageSchema)
export default pages
