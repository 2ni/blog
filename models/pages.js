import mongoose from "mongoose"
import path from "path"
import contentSchema from "./content.js"

const pageSchema = contentSchema.clone()
pageSchema.add({
  title: {
    type: String,
  },
  url: {
    type: String,
    required: true,
    unique: true,
  },
})

const pages = mongoose.model("Pages", pageSchema)
export default pages
