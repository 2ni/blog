import mongoose from "mongoose"
import contentSchema from "./content.js"

const articleSchema = contentSchema.clone()
articleSchema.add({
  description: {
    type: String,
  },
})

const articles = mongoose.model("Articles", articleSchema)
export default articles
