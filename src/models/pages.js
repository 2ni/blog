import mongoose from "mongoose"
import path from "path"
import contentSchema from "./content.js"

const pageSchema = contentSchema.clone()
pageSchema.add({
  title: {
    type: String,
  },
})

const pages = mongoose.model("Pages", pageSchema)
export default pages
