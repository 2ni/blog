import fs from "fs"
import path from "path"
import crypto from "crypto"
import minify from "@node-minify/core"
import cssMinify from "@node-minify/clean-css"

import * as handlebarsHelpers from "./src/helpers/handlebars.js"

const copyRecursiveSync = (src, dest) => {
  const exists = fs.existsSync(src)
  const stats = exists && fs.statSync(src)
  const isDirectory = exists && stats.isDirectory()
  if (isDirectory) {
    fs.mkdirSync(dest)
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName))
    })
  } else {
    fs.copyFileSync(src, dest)
  }
}

;(async () => {
  const FILES = [
    "public/css/default.css",
    "public/css/fonts/fonts.css",
  ]

  try {
    fs.rmSync("dist-new", { recursive: true })
  } catch (e) {}

  try {
    copyRecursiveSync("src", "dist-new")
  } catch (e) {
    if (e.code === "EEXIST") {
      console.log("dist is up-to-date. Nonthing to do.")
      process.exit(0)
    } else {
      throw(e)
    }
  }

  // do replacements in  dist-new
  for (const fn of FILES) {
    const fnAbs = path.join("dist-new", fn)
    const id = crypto.createHash("sha256").update(fs.readFileSync(fnAbs)).digest("hex").substr(0, 10)
    const target = fn.replace(/(.[^.]*)$/, `-${id}$1`)
    const targetAbs = path.join("dist-new", target)
    console.log(fn + " -> " + target)
    minify({
      compressor: cssMinify,
      input: fnAbs,
      output: targetAbs,
      callback: ((err, min) => {})
    })

    // replace filename within html file
    // we replace the ID which is defined as <filename>-ID
    // eg for public/css/default.css -> DEFAULT-ID
    const targetFn = path.join("dist-new", "/views/layouts/default.hbs")
    const data = fs.readFileSync(targetFn).toString()
    const placeholder = "{{" + fn.match(/([^./]+).[^.]+$/)[1].toUpperCase() + "-ID}}"
    console.log(targetAbs + ": " + placeholder + " -> " + id)
    fs.writeFileSync(targetFn, data.replace(new RegExp(placeholder), "-" + id))
  }

  // move current dir to dist-<date>
  // const seconds = String(Math.round(fs.lstatSync("./src").mtimeMs/1000%86400))
  const seconds = String(Math.round((new Date().getTime()/1000) % 86400))
  const now = handlebarsHelpers.formatDate(new Date()).replace(/-/g, "") + seconds
  try {
    fs.renameSync("dist", "dist-" + now)
  } catch (e) {}
  try {
    fs.renameSync("dist-new", "dist")
  } catch (e) {
    console.error("Build failed.")
    throw(e)
  }

  // remove older dirs
  const dirs = []
  for (const dir of fs.readdirSync(".")) {
    if (dir.startsWith("dist-") && fs.lstatSync(dir).isDirectory()) {
      dirs.push(dir)
    }
  }
  for (const dir of dirs.sort().slice(0, -2)) {
    fs.rmSync(dir, { recursive: true }, (err) => {
      throw(err)
    })
    console.log("deleted " + dir)
  }

  console.log("Buid successful.")
})()
