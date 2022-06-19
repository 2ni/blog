import mongoose from "mongoose"
import { marked } from "marked"
import slugify from "slugify"

import createDomPurify from "dompurify"
import { JSDOM } from "jsdom"
const domPurify = createDomPurify(new JSDOM("").window)


// TODO use validateSync() in routes to check
const articleSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: { values: [ "draft", "published" ], message: "{VALUE} is not supported" },
    default: "draft",
  },
  type: {
    type: String,
    enum: { values: [ "article", "page" ], message: "{VALUE} is not supported" },
    default: "blog",
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  markdown: {
    type: String,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
  },
  sanitizedHtml: {
    type: String,
    required: true,
  },
}, { timestamps: true })

articleSchema.pre("validate", function(next) {
  if (this.title) {
    this.slug = slugify(this.title, { lower: true, strict: true })
  }

  if (this.markdown) {
    this.sanitizedHtml = domPurify.sanitize(marked(this.markdown))
  }

  next()
})

const articles = mongoose.model("Articles", articleSchema)
export default articles
