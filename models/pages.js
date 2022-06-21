import mongoose from "mongoose"
import contentSchema from "./content.js"

const pageSchema = contentSchema.clone()
pageSchema.add({
  description: {
    type: String,
  },
})

const pages = mongoose.model("Pages", pageSchema)
export default pages
