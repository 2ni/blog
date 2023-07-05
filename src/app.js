#!/usr/bin/env node

import express from "express"
import bodyParser from "body-parser"
import helmet from "helmet"
import compression from "compression"
import { engine } from "express-handlebars"
import i18n from "i18n"
import os from "os"
import path from "path"
import cookieParser from "cookie-parser"
import methodOverride from "method-override"
import jwt from "jsonwebtoken"
import * as dotenv from 'dotenv'
import { fileURLToPath } from "url"
import { dirname } from "path"
import { authorize } from "./middleware/auth.js"
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

import  config from  "./config/config.js"
import * as handlebarsHelpers from "./helpers/handlebars.js"

import ytRoutes from "./routes/yt.js"
import articleRoutes from "./routes/articles.js"
import pageRoutes from "./routes/pages.js"
import attachmentRoutes from "./routes/attachments.js"
import sitemapsRoutes from "./routes/sitemaps.js"
import categoriesRoutes from "./routes/categories.js"
import searchRoutes from "./routes/search.js"
import authRoutes from "./routes/auth.js"

dotenv.config()
import db from "./models/app.js"
process.stdout.write("waiting for DB...")
try {
  db.mongoose.connect(config.dbUrl, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
} catch (err) {
  console.error("\x1B[31;1mfailed\x1B[0m", err)
}

// db.mongoose.set("debug", { shell: true })
console.log("\x1B[32;1msuccess\x1B[0m")

db.mongoose.connection.once("open", async () => {
  if (db.sitemaps.countDocuments().exec() == 0) {
    console.log("sitemaps set up")
    // TODO
    // Promise.all([
    // ]).then(() => console.log("all done"))
  }
})

const app = express()
app.use(methodOverride("_method"))
/* caching, see https://simonhearne.com/2022/caching-header-best-practices/:
 *   versioned files: Cache-Control: max-age=31536000, immutable
 *   non versioned files: Cache-Control: max-age=604800, stale-while-revalidate=86400
 *                        ETag: "<file-hash-generated-by-server>"
 *   html files: Cache-Control: max-age:300, private
 */
app.use("/", express.static(path.join(__dirname, "public"), {
  setHeaders: (res, path) => {
    if (process.env.ENV === "production") {
      if (path.match(/\.css$/)) {
        res.set("Cache-Control", "public, max-age=604800, immutable")
      }
    }
    // res.set("x-check", "test")
  }
}))
app.use(cookieParser())
app.engine(".hbs", engine({
  extname: ".hbs",
  helpers: handlebarsHelpers,
  partialsDir: path.join(__dirname, "views/partials"),
  defaultLayout: "default"
}))
app.set("view engine", ".hbs")
app.set("views", path.join(__dirname, "./views"))
app.set("view options", { layout: "default" })

i18n.configure({
  locales: ["en", "de"],
  indent: "  ",
  syncFiles: true,
  // defaultLocale: "de",
  // cookie: "locale",
  directory: path.join(__dirname, "config", "locales")
})
app.use(i18n.init)

// middleware to set general things such as language depending on url
// https://stackoverflow.com/questions/19539332/localization-nodejs-i18n
app.use(async (req, res, next) => {

  // redirect urls with trailing slashes
  if (req.path.substr(-1) === "/" && req.path.length > 1) {
    const query = req.url.slice(req.path.length)
    const safepath = req.path.slice(0, -1).replace(/\/+/g, "/")
    return res.redirect(301, safepath + query)
  }

  res.setLocale("en")
  req.setLocale("en")

  res.locals.sitemaps = await db.sitemaps.findOne().lean()
  res.locals.env = process.env.ENV

  // set user if token is valid to make available everywhere
  const token = req.cookies.token
  if (token) {
    jwt.verify(token, process.env.TOKEN_SECRET, (err, user) => {
      if (err) return res.status(403).render("404")
      res.locals.user = user
    })
  }

  // res.set("x-check", "test")

  res.set("Cache-Control", "max-age:300, private")
  next()
})

app.use(helmet())
app.use(compression())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

app.use("/yt", ytRoutes)
app.use("/articles", articleRoutes)
app.use("/pages", pageRoutes)
app.use("/attachments", attachmentRoutes)
app.use("/sitemaps", sitemapsRoutes)
app.use("/categories", categoriesRoutes)
app.use("/search", searchRoutes)
app.use("/auth", authRoutes)

app.get("/", async (req, res) => {
  /*
  let sitemaps = new db.sitemaps()
  sitemaps.content = [{ name: "home", url: "/" }, { name: "articles", url: "/articles" }]
  await sitemaps.save()
  */
  const status = res.locals.user && res.locals.user.role === "admin" ? {} : { status: "published" }
  const page = await db.contents.findOne({ ...{ url: "/"}, ...status }).lean()
  if (page === null) {
    const pages = await db.contents.find({ status: "published", contentType: "page" }).lean()
    res.render("index", { pages: pages, title: "Home" + config.urlTitle, edit: "/edit" })
  }
  else res.render("pages/show", { content: page, title: page.title + config.urlTitle, edit: "/edit" })
})

app.get("*/edit$", async (req, res) => {
  if (req.params[0] === "") req.params[0] = "/"
  let page = await db.contents.findOne({ url: req.params[0] }).lean()
  let newpage = page ? false : true
  if (!page) {
    newpage = true
    page = { url: req.params[0] }
  }
  res.render(path.join("pages", newpage ? "new" : "edit"), { content: page, edit: path.join(req.params[0], "edit") })
})

app.get("*", async (req, res) => {
  // console.log(res.__("hello"), res.getLocale(), res.getLocales())
  const page = await db.contents.findOne({ url: req.params[0], status: "published" }).lean()
  if (page === null) {
    res.status(404).render("404", { edit: path.join(req.params[0], "edit") })
  } else {
    res.render("pages/show", { content: page, title: page.title + config.urlTitle, edit: path.join(req.params[0], "edit") })
  }
})

app.listen(config.port, (err) => {
  if (err) {
    return console.log("something bad happened", err)
  }

  const now = handlebarsHelpers.formatDate(new Date(), { showTime: true })
  console.log(`${now} server is listening on http://${os.hostname()}:${config.port} ${process.env.ENV}`)
})
