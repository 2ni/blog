import mongoose from "mongoose"
import db from "./app.js"
import slugify from "slugify"
import path from "path"

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  parents: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Categories" }],
  },
  url: {
    type: String,
    required: true,
    unique: true,
  },
  count: {
    type: Number,
    required: true,
    default: 0,
  },
}, { timestamps: true })

categorySchema.pre("validate", async function() {
  const slugifiedName = slugify(this.name, { lower: true, strict: true })
  this.url = path.join("/categories", slugifiedName)
  this.name = slugifiedName
})

categorySchema.pre("save", async function() {
  if (this.isModified("name")) {
    await db.contents.updateMany({ category: this._id }, { categoryName: this.name })
  }
})

const categories = mongoose.model("Categories", categorySchema)
export default categories
