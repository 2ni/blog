import mongoose from "mongoose"
import { marked } from "marked"
import path from "path"
import { getImageFn } from "../helpers/utils.js"
import  { config } from  "../config/app.js"

import createDomPurify from "dompurify"
import { JSDOM } from "jsdom"
const domPurify = createDomPurify(new JSDOM("").window)

const allowedAttributes = [ "width", "height", "alt", "title", "id" ]

/*
 * !dc58642af14354ad5eb8cfd41ef6f26a-1---mppt-board-schematic.png|width=200!
 * !7ba3f7f8d982ebaf52693b3127583df9-2ni-southpark-avatar-r.jpg|thumbnail,alt="some alt",title=some title!
 * TODO minify css, js -> minify html, js, css with https://github.com/srod/node-minify, rename js, css file with nanoid, replace in templates
 * parceljs.org
 * (https://stackoverflow.com/questions/70865639/how-to-install-nanoid-in-nodejs)
 * TODO search (see https://stackoverflow.com/questions/44833817/mongodb-full-and-partial-text-search)
 * TODO authorization
 * TODO indexes on mongodb
 */
const descriptionList = {
  name: "descriptionList",
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
        type: "descriptionList",
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
  if (this.markdown) this.sanitizedHtml = domPurify.sanitize(marked(this.markdown))

  next()
})

export default contentSchema
