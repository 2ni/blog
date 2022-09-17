import mongoose from "mongoose"
import { marked } from "marked"
import path from "path"
import { getImageFn } from "../helpers/utils.js"
import  { config } from  "../config/app.js"
import db from "./app.js"

import createDomPurify from "dompurify"
import { JSDOM } from "jsdom"
const domPurify = createDomPurify(new JSDOM("").window)

const allowedAttributes = [ "width", "height", "alt", "title", "id" ]

/*
 * Images
 * !dc58642af14354ad5eb8cfd41ef6f26a-1---mppt-board-schematic.png|alt="Hello\!,width=600!
 * !7ba3f7f8d982ebaf52693b3127583df9-2ni-southpark-avatar-r.jpg|size=thumbnail,alt=some alt!
 * !2b2bbc2165ea321cd9d9b2d1b32be321-pxl_20220716_094446980.jpg|size=medium,caption=Wandern\, macht Lust\!,alt=some alt!
 *
 * > -- <cite>Terry Pratchett, A Hat Full of Sky</cite>
 *
 * TODO logout/invalidate token
 * TODO update token automatically
 * TODO add indexes on mongodb
 */
const customParagraph = {
  name: "customParagraph",
  level: "inline",
  start(src) { return src.match(/^{[^}]*}.*$/s)?.index },
  tokenizer(src, tokens) {
    const rule = /^{([^}*]*)}(.*)\n\r?\s*--\s*(.*)$/s
    const match = rule.exec(src)
    if (match) {
      const token = {
        type: "customParagraph",
        raw: match[0],
        className: match[1],
        quote: match[2],
        author: match[3],
      };
      return token
    }
  },
  renderer(token) {
    return `<div class="${token.className}"><blockquote>${token.quote.replace(/\n/g, "<br>")}</blockquote><cite>${token.author}</cite></div>`
  }
}

const customImage = {
  name: "customImage",
  level: "inline",
  start(src) { return src.match(/!.*(?<!\\)!/)?.index }, // !filename! ignoring escaped exclamation marks
  tokenizer(src, tokens) {
    // negative lookbehind to ignore "\!"
    const rule = /^!([^|]*)\|?(.*)?(?<!\\)!/
    const match = rule.exec(src)
    if (match) {
      /*
      [...match[3].matchAll(/([^=,\s]*)\s*=\s*([^=,\s]*)/g)].forEach((attribute) => {
        console.log("key", attribute[1])
        console.log("value", attribute[2])
      })
      */

      // remove spaces before/after ,= if not escaped
      // negative lookbehind to ignore "\," and "\="
      const attributes = (match[2] || "").replace(/\s*((?<!\\)[,=])\s*/g, "$1").split(/(?<!\\),/).map(d=>d.replace(/\\/g, ""))
      let validatedAttributes = []
      attributes.forEach((attribute) => {
        const [k, v] = attribute.split("=")
        if (allowedAttributes.indexOf(k) !== -1) {
          validatedAttributes[k] = v
        }
      })
      if (!validatedAttributes["title"] && validatedAttributes["alt"]) validatedAttributes["title"] = validatedAttributes["alt"]
      const token = {
        type: "customImage",
        raw: match[0],
        src: match[1],
        validatedAttributes: validatedAttributes,
        attributes: attributes,
      };
      return token
    }
  },
  renderer(token) {
    const validatedAttributesStr = Object.keys(token.validatedAttributes).map(k => { return `${k}="${token.validatedAttributes[k]}"` }).join(" ")
    const attributes = token.attributes.reduce((ac,a) => (ac[a.split("=")[0]] = a.split("=")[1], ac), {})
    const img = `<img ${validatedAttributesStr} src="{src}">`
    const detailUrl = path.join("/attachments/show", token.src)
    let src = "/attachments"
    if (token.validatedAttributes.width) {
      const availableWidth = config.allowedImageSizes.filter((num) => { return num > token.validatedAttributes.width })[0]
      return `<a href="${detailUrl}">${img.replace("{src}", path.join(src, String(availableWidth), token.src))}</a>`
    }
    else if (attributes.size === "thumbnail") {
      src = path.join(src, "thumbnail", token.src)
      return `<a href="${detailUrl}">${img.replace("{src}", src)}</a>`
    } else {
      // 1rem = 16px
      // return `<img srcset="${path.join(src, '320', token.src)} 320w, ${path.join(src, '640', token.src)} 640w, ${path.join(src, '768', token.src)} 768w, ${path.join(src, '1024', token.src)} 1024w" src="${path.join(src, "thumbnail", token.src)}">`

      let sizes = config.allowedImageSizes
      let offset = 0
      if (attributes.size === "medium") {
        offset = 2
        sizes = config.allowedImageSizes.slice(offset)
      }
      let sources = ""
      const cssClass = attributes.size ? attributes.size : "large"
      for (const [i, width] of sizes.entries()) {
        sources += `<source media="(min-width:${config.allowedImageSizes[i+offset]/16}rem)" srcset="${path.join(src, String(width), token.src)}">`
      }
      const picture = `<a href="${detailUrl}"><picture class="${cssClass}">${sources}${img.replace("{src}", path.join(src, 'thumbnail', token.src))}</picture></a>`
      return attributes.caption ? `<figure class="${cssClass}">${picture}<figcaption>${attributes.caption}</figcaption></figure>` : picture
    }
  }
}
marked.use({ extensions: [ customImage, customParagraph ] })
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
  contentType: {
    type: String,
    enum: [ "article", "page" ],
  },
  title: {
    type: String,
  },
  markdown: {
    type: String,
  },
  sanitizedHtml: {
    type: String,
  },
  attachments: [String],
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
}, { timestamps: true })

contentSchema.pre("validate", async function(next) {
  marked.setOptions({ headerIds: true, breaks: true })
  if (this.markdown) this.sanitizedHtml = domPurify.sanitize(marked(this.markdown))

  // update categoryName
  if (this.category) {
    const category = await db.categories.findById(this.category).lean()
    this.categoryName = category.name
  } else {
    this.categoryName = null
  }

  next()
})

contentSchema.pre("save", async function() {
  // update category article count
  if (this.isModified("category")) {
    await db.categories.findOneAndUpdate({ _id: this.category }, { $inc: { "count": 1 }})
    await db.categories.findOneAndUpdate({ _id: this._previousCategory }, { $inc: { "count": -1 }})
  }
})

contentSchema.index({ title: "text", markdown: "text" })

const contents = mongoose.model("Contents", contentSchema)
export default contents
