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
import { fileURLToPath } from "url"
import { dirname } from "path"
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

import  { env, config } from  "./config/app.js"
import * as handlebarsHelpers from "./helpers/handlebars.js"

import articleRoutes from "./routes/articles.js"
import pageRoutes from "./routes/pages.js"
import attachmentRoutes from "./routes/attachments.js"
import sitemapsRoutes from "./routes/sitemaps.js"
import categoriesRoutes from "./routes/categories.js"

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
    if (env === "production") {
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
const allowedRoles = [ "admin" ]
app.use(async (req, res, next) => {
  res.setLocale("de")
  req.setLocale("de")

  res.locals.sitemaps = await db.sitemaps.findOne().lean()

  if (req.cookies.role && allowedRoles.indexOf(req.cookies.role) !== -1) {
    res.locals.role = req.cookies.role
  }
  // res.set("x-check", "test")

  res.set("Cache-Control", "max-age:300, private")
  next()
})

app.use(helmet())
app.use(compression())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

app.use("/articles", articleRoutes)
app.use("/pages", pageRoutes)
app.use("/attachments", attachmentRoutes)
app.use("/sitemaps", sitemapsRoutes)
app.use("/categories", categoriesRoutes)

app.get("/", async (req, res) => {
  /*
  let sitemaps = new db.sitemaps()
  sitemaps.content = [{ name: "home", url: "/" }, { name: "articles", url: "/articles" }]
  await sitemaps.save()
  */
  const page = await db.pages.findOne({ url: "/", status: "published" }).lean()
  if (page === null) {
    const pages = await db.pages.find({ status: "published" }).lean()
    res.render("index", { pages: pages, edit: "/edit" })
  }
  else res.render("pages/show", { content: page, edit: "/edit" })
})

app.get("*/edit$", async (req, res) => {
  if (req.params[0] === "") req.params[0] = "/"
  const page = await db.pages.findOne({ url: req.params[0] }).lean()
  res.render(path.join("pages", page ? "edit" : "new"), { content: page, edit: path.join(req.params[0], "edit") })
})

app.get("*", async (req, res) => {
  // console.log(res.__("hello"), res.getLocale(), res.getLocales())
  const page = await db.pages.findOne({ url: req.params[0], status: "published" }).lean()
  if (page === null) {
    res.status(404)
    res.render("404")
  } else {
    res.render("pages/show", { content: page, edit: path.join(req.params[0], "edit") })
  }
})

app.listen(config.port, (err) => {
  if (err) {
    return console.log("something bad happened", err)
  }

  const now = handlebarsHelpers.formatDate(new Date(), { showTime: true })
  console.log(`${now} server is listening on http://${os.hostname()}:${config.port} ${env}`)
})
