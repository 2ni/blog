import mongoose from "mongoose"
import { marked } from "marked"

import createDomPurify from "dompurify"
import { JSDOM } from "jsdom"
const domPurify = createDomPurify(new JSDOM("").window)

const allowedAttributes = [ "width", "height" ]

const descriptionList = {
  name: "descriptionList",
  level: "inline",
  start(src) { return src.match(/!\[[^\]]*\]\([^)]*\)/)?.index; }, // [anchor](url)
  tokenizer(src, tokens) {
    const rule = /^!\[([^\]]*)\]\(([^)|]*)\|?([^)]*)?\)/
    const match = rule.exec(src)
    if (match) {
      /*
      [...match[3].matchAll(/([^=,\s]*)\s*=\s*([^=,\s]*)/g)].forEach((attribute) => {
        console.log("key", attribute[1])
        console.log("value", attribute[2])
      })
      */

      const attributes = (match[3] || "").replace(/\s*/g, "").split(",")
      let attributesValid = []
      attributes.forEach((attribute) => {
        const [k, v] = attribute.split("=")
        if (allowedAttributes.indexOf(k) !== -1) {
          attributesValid.push(k + "=\"" + v + "\"")
        }
      })
      const token = {
        type: "descriptionList",
        raw: match[0],
        alt: match[1],
        src: match[2],
        attributesValid: attributesValid,
        thumbnail: attributes[0] === "thumbnail",
      };
      return token
    }
  },
  renderer(token) {
    if (token.thumbnail) {
      return `<a href="/attachments/${token.src}"><img ${token.attributesValid.join(" ")} alt="${token.alt}" src="/attachments/thumbnail/${token.src}"></a>`
    } else {
      return `<img ${token.attributesValid.join(" ")} alt="${token.alt}" src="/attachments/${token.src}">`
    }
  }
}
marked.use({ extensions: [descriptionList] })
console.log(marked.parse("some text ![alt](somepic.png|width  =200, height=300)."))
console.log(marked.parse("some text ![alt](somepic.png)."))
console.log(marked.parse("some text ![alt](somepic.png|thumbnail)."))


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
