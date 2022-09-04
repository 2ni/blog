import mongoose from "mongoose"
import slugify from "slugify"
import contentSchema from "./content.js"
import path from "path"
import db from "./app.js"

const articleSchema = contentSchema.clone()
articleSchema.add({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  // avoid using real relations to avoid mongoose eg populating data in pre hooks
  category: {
    type: String,
    // type: mongoose.Schema.Types.ObjectId,
    // ref: "Categories",
    set: function (category) {
      this._previousCategory = this.category
      return category
    },
  },
  categoryName: String,
})

articleSchema.pre("validate", async function() {
  if (this.title) {
    this.url = path.join("/articles", slugify(this.title, { lower: true, strict: true }))
  }
  // update categoryName
  if (this.category) {
    const category = await db.categories.findById(this.category).lean()
    this.categoryName = category.name
  } else {
    this.categoryName = null
  }
})

articleSchema.pre("save", async function() {
  // update category article count
  if (this.isModified("category")) {
    await db.categories.findOneAndUpdate({ _id: this.category }, { $inc: { "count": 1 }})
    await db.categories.findOneAndUpdate({ _id: this._previousCategory }, { $inc: { "count": -1 }})
  }
})

articleSchema.index({ title: "text", markdown: "text" })

const articles = mongoose.model("Articles", articleSchema)
export default articles
