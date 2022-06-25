import mongoose from "mongoose"
import { marked } from "marked"

import createDomPurify from "dompurify"
import { JSDOM } from "jsdom"
const domPurify = createDomPurify(new JSDOM("").window)


// TODO use validateSync() in routes to check
const contentSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: { values: [ "draft", "published" ], message: "{VALUE} is not supported" },
    default: "draft",
  },
  markdown: {
    type: String,
  },
  sanitizedHtml: {
    type: String,
  },
}, { timestamps: true })

contentSchema.pre("validate", function(next) {
  marked.setOptions({ headerIds: true })
  this.sanitizedHtml = domPurify.sanitize(marked(this.markdown))

  next()
})

export default contentSchema
