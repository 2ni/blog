import express from "express"
import helmet from "helmet"
import compression from "compression"
import { engine } from "express-handlebars"
import i18n from "i18n"
import os from "os"
import path from "path"
import { fileURLToPath } from "url"
import { dirname } from "path"
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)


import  { config } from  "./config/app.js"
import * as handlebarsHelpers from "./helpers/handlebars.js"

import articleRoutes from "./routes/articles.js"


const app = express()
app.use("/", express.static("public"))
app.engine(".hbs", engine({ extname: ".hbs", helpers: handlebarsHelpers, partialsDir: "views/partials", defaultLayout: "default" }))
app.set("view engine", ".hbs")
app.set("views", "./views")
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

// middleware to set language depending on url
// https://stackoverflow.com/questions/19539332/localization-nodejs-i18n
app.use((req, res, next) => {
  res.setLocale("de")
  next()
})

app.use(helmet())
app.use(compression())

app.use("/articles", articleRoutes)


app.listen(config.port, (err) => {
  if (err) {
    return console.log("something bad happened", err)
  }

  console.log(`server is listening on http://${os.hostname()}:${config.port}`)
})


app.get("/", (req, res) => {
  console.log(res.__("hello"), res.getLocale(), res.getLocales())
  const articles = [{
    id: "5678",
    title: "Test article 1",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    description: "Test description 1",

  },
  {
    id: "1234",
    title: "Test article 2",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    description: "Test description 2",
  }]
  res.render("index", {
    title: "Articles",
    articles: articles,
  })
})
