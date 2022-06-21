import mongoose from "mongoose"
import contentSchema from "./content.js"

const articleSchema = contentSchema.clone()
articleSchema.add({
  title: {
    type: String,
    required: true,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
  },
  description: {
    type: String,
  },
})

articleSchema.pre("validate", function(next) {
  if (this.title) {
    this.slug = slugify(this.title, { lower: true, strict: true })
  }
})

const articles = mongoose.model("Articles", articleSchema)
export default articles
