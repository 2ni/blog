import mongoose from "mongoose"
import { marked } from "marked"
import path from "path"

import createDomPurify from "dompurify"
import { JSDOM } from "jsdom"
const domPurify = createDomPurify(new JSDOM("").window)

const allowedAttributes = [ "width", "height", "alt", "title" ]

/*
 * !dc58642af14354ad5eb8cfd41ef6f26a-1---mppt-board-schematic.png|width=200!
 * !7ba3f7f8d982ebaf52693b3127583df9-2ni-southpark-avatar-r.jpg|thumbnail,alt="some alt",title=some title!
 * TODO replace slug in article with url
 */
const descriptionList = {
  name: "descriptionList",
  level: "inline",
  start(src) { return src.match(/![^()|!]*!/)?.index; }, // !filename!
  tokenizer(src, tokens) {
    const rule = /^!([^|!]*)\|?([^!]*)?!/
    const match = rule.exec(src)
    if (match) {
      /*
      [...match[3].matchAll(/([^=,\s]*)\s*=\s*([^=,\s]*)/g)].forEach((attribute) => {
        console.log("key", attribute[1])
        console.log("value", attribute[2])
      })
      */

      const attributes = (match[2] || "").replace(/\s*([,=])\s*/g, "$1").split(",")
      let validatedAttributes = []
      attributes.forEach((attribute) => {
        const [k, v] = attribute.split("=")
        if (allowedAttributes.indexOf(k) !== -1) {
          validatedAttributes[k] = v
        }
      })
      if (!validatedAttributes["title"] && validatedAttributes["alt"]) validatedAttributes["title"] = validatedAttributes["alt"]
      const token = {
        type: "descriptionList",
        raw: match[0],
        src: match[1],
        validatedAttributes: validatedAttributes,
        thumbnail: attributes[0] === "thumbnail",
      };
      return token
    }
  },
  renderer(token) {
    const validatedAttributesStr = Object.keys(token.validatedAttributes).map(k => { return `${k}="${token.validatedAttributes[k]}"` }).join(" ")
    const img = `<img ${validatedAttributesStr} src="{src}">`
    let src = path.join("/attachments", token.src)
    if (token.thumbnail) {
      src = path.join("/attachments/thumbnail/", token.src)
      return `<a href="/attachments/${token.src}">${img.replace("{src}", src)}</a>`
    } else {
      return img.replace("{src}", src)
    }
  }
}
marked.use({ extensions: [descriptionList] })
/*
console.log(marked.parse("some text ![alt](somepic.png|width  =200, height=300)."))
console.log(marked.parse("some text ![alt](somepic.png)."))
console.log(marked.parse("some text ![alt](somepic.png|thumbnail)."))
*/


// TODO use validateSync() in routes to check
const contentSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: { values: [ "draft", "published" ], message: "{VALUE} is not supported" },
    default: "draft",
  },
  url: {
    type: String,
    required: true,
    unique: true,
  },
  markdown: {
    type: String,
  },
  sanitizedHtml: {
    type: String,
  },
  attachments: [String],
}, { timestamps: true })

contentSchema.pre("validate", function(next) {
  marked.setOptions({ headerIds: true })
  this.sanitizedHtml = domPurify.sanitize(marked(this.markdown))

  next()
})

export default contentSchema
