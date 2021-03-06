import express from "express"
import multer from "multer"
import fs from "fs"
import stream from "stream"
import path from "path"
import crypto from "crypto"
import sharp from "sharp"
const router = express.Router()
import db from "../models/app.js"
import { splitImagePath } from "../helpers/utils.js"

const mime_map = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
}

const allowedContent = [ "article", "page" ]

const baseStoragePath = "attachments"

/*
 * based on https://www.bezkoder.com/node-js-upload-resize-multiple-images/
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    return cb(null, baseStoragePath)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E4)
    const origFilename = file.originalname.toLowerCase().replace(/ /g, "-").replace(/\.[^.]+$/, "")
    const extension = mime_map[file.mimetype]
    const filename = crypto.createHash("md5").update(uniqueSuffix + "-" + origFilename + "." + extension).digest("hex") + "-" + origFilename + "." + extension
    file.filenameNaked = filename

    const subdirImg = splitImagePath(filename)
    const dir = path.join(baseStoragePath, subdirImg)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    cb(null, path.join(subdirImg, filename))
  }
})

const upload = multer({
  storage: storage,
  limits: { fileSize: 1*1024*1024 }, // 1MB
  fileFilter: (req, file, cb) => {
    if (mime_map[file.mimetype]) {
      cb(null, true)
    } else {
      return cb(new Error(req.__(`filetype ${file.memtype} not supported`)))
    }
  },
}).array("files", 5)

const uploadAttachments = async (req, res, next) => {
  await upload(req, res, (err) => {
    if (err) return res.status(413).json({ "status": "error", "msg": err.message })

    next()
  })
}

const getFnBySize = (filename, size) => {
  return filename.replace(/(\.[^.]*)$/, "." + size + "$1")
}

const resizeAttachments = async (req, res, next) => {
  if (!req.files) return next()

  await Promise.all(
    req.files.map((file) => {
      sharp(file.path, { failOnError: false })
        .resize(200, 200, { fit: "inside" })
        .toFile(getFnBySize(file.path, "thumbnail"), (err, info) => {
          if (err) console.log("res", err)
        })
    })
  )
  next()
}

const validateRequest = async (req, res, next) => {
  if (allowedContent.indexOf(req.params.content) === -1) {
    return res.status(400).json({ "status": "error", "msg": "content must be \"article\" or \"page\"" })
  }

  if (await !db[req.params.content + "s"].findById(req.params.id)) {
    return res.status(413).json({ "status": "error", "msg": `${req.params.content} ${req.params.id} not found` })
  }
  next()
}

/*
 * see https://stackoverflow.com/questions/17515699/node-express-sending-image-files-as-api-response#answer-56873042
 * http://localhost:3001/attachments/c1cb20f5151f9482c7562a2c551f38b5-image.png
 * http -bf get :3001/attachments/c1cb20f5151f9482c7562a2c551f38b5-image.png
 */
const allowedImageSizes = [ 640, 768, 1024, 1600, 1920 ]
router.get("/:size?/:filename", async (req, res) => {
  const sizeInt = Number(req.params.size)
  const sizeStr = req.params.size
  let fn = path.join(baseStoragePath, splitImagePath(req.params.filename))
  if (sizeStr === "thumbnail") {
    fn = path.join(fn, getFnBySize(req.params.filename, "thumbnail"))
  } else if (!sizeStr) {
    fn = path.join(fn, req.params.filename)
  } else if (allowedImageSizes.indexOf(sizeInt) !== -1) {
    fn = path.join(fn, getFnBySize(req.params.filename, sizeStr))
    if (!fs.existsSync(fn)) {
      // TODO avoid updscaling?
      const newfile = await sharp(fn.replace(/\.[^.]*\.([^.]*)$/, ".$1"), { failOnError: false })
      await newfile.resize(sizeInt, sizeInt, { fit: "inside" })
      await newfile.toFile(fn)
    }
  } else {
    return res.sendStatus(400)
  }

  res.contentType(req.params.filename)
  const r = fs.createReadStream(fn)
  const ps = new stream.PassThrough()
  stream.pipeline(r, ps, (err) => {
    if (err) {
      console.log(err)
      return res.sendStatus(400)
    }
  })
  ps.pipe(res)
})

/*
 * http -bf post :3001/attachments/page/62b6ffac2fff4a4a4845ac5b[?respond=[page|article]] files@someimage.png files@someotherimage.jpg
 *
 * mongoshell > db.pages.update({_id: ObjectId("62b6ffac2fff4a4a4845ac5b")}, { $set : {"attachments": [] }}, { multi: true})
 * mongoshell > db.articles.find({}, { "title": 1, "attachments": 1 })
 *
 * see https://stackoverflow.com/questions/39350040/uploading-multiple-files-with-multer
 *
 * :content: "page", "article"
 */
router.post("/:content/:id", validateRequest, uploadAttachments, resizeAttachments, async (req, res) => {
  const docs = await db[req.params.content + "s"].findByIdAndUpdate(
    req.params.id,
    { $push: { attachments : { $each: req.files.map((file) => { return file.filenameNaked }) } } }
  )

  // respond with html or json
  if (req.query.respond) {
    res.redirect(req.query.respond === "page" ? path.join("/edit", docs.url) : path.join("/articles/edit", docs.slug))
  } else {
    if (docs === null) return res.status(413).json({ "status": "error", "msg": `${req.params.content} ${req.params.id} not found` })
    return res.status(200).json({"status": "ok", "files": req.files.map((file) => { return file.path }) })
  }
})

export default router
