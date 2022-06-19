import express from "express"
import bodyParser from "body-parser"
import helmet from "helmet"
import compression from "compression"
import { engine } from "express-handlebars"
import i18n from "i18n"
import os from "os"
import path from "path"
import { fileURLToPath } from "url"
import { dirname } from "path"
import methodOverride from "method-override"
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

import  { config } from  "./config/app.js"
import * as handlebarsHelpers from "./helpers/handlebars.js"

import articleRoutes from "./routes/articles.js"

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

const app = express()
app.use(methodOverride("_method"))
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
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

app.use("/articles", articleRoutes)


app.listen(config.port, (err) => {
  if (err) {
    return console.log("something bad happened", err)
  }

  const now = handlebarsHelpers.formatDate(new Date(), { showTime: true })
  console.log(`${now} server is listening on http://${os.hostname()}:${config.port}`)
})


app.get("/", async (req, res) => {
  // console.log(res.__("hello"), res.getLocale(), res.getLocales())
  res.render("index")
})
