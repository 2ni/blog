import express from "express"
import multer from "multer"
import fs from "fs"
import stream from "stream"
import path from "path"
import crypto from "crypto"
import sharp from "sharp"
const router = express.Router()
import db from "../models/app.js"
import { getImageFn, splitImagePath } from "../helpers/utils.js"
import  config from  "../config/config.js"

// first 3 are handled as image, see function resizeAttachments
const mime_map = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "application/pdf": "pdf",
}

import * as dotenv from 'dotenv'
dotenv.config()
const baseStoragePath = (process.env.ENV === "production" ? "../attachments" : "attachments")

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

    const subdir = splitImagePath(filename)
    const dir = path.join(baseStoragePath, subdir)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    cb(null, path.join(subdir, filename))
  }
})

const upload = multer({
  storage: storage,
  limits: { fileSize: 5*1024*1024 }, // 5MB
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

const resizeAttachments = async (req, res, next) => {
  if (!req.files) return next()

  await Promise.all(
    req.files.map((file) => {
      // if image
      if (Object.keys(mime_map).slice(0, 3).includes(file.mimetype)) {
        sharp(file.path, { failOnError: false })
          .resize(200, 200, { fit: "inside" })
          .toFile(getImageFn(file.path, "thumbnail"), (err, info) => {
            if (err) console.log("res", err)
          })
      }
    })
  )
  next()
}

const validateRequest = async (req, res, next) => {
  if (await !db.contents.findById(req.params.id)) {
    return res.status(413).json({ "status": "error", "msg": `${req.params.id} not found` })
  }
  next()
}

/*
 * webpage with the attachement
 */
router.get("/show/:filename", async (req, res) => {
  if (!fs.existsSync(path.join(baseStoragePath, splitImagePath(req.params.filename), req.params.filename))) {
    return res.render("404")
  }

  res.render("attachments/show", { data: { filename: req.params.filename, sizes: config.allowedImageSizes } })
})

/*
 * see https://stackoverflow.com/questions/17515699/node-express-sending-image-files-as-api-response#answer-56873042
 * http://localhost:3001/attachments/c1cb20f5151f9482c7562a2c551f38b5-image.png
 * http -bf get :3001/attachments/c1cb20f5151f9482c7562a2c551f38b5-image.png
 * http -bf get :3001/attachments/1024/7ba3f7f8d982ebaf52693b3127583df9-2ni-southpark-avatar-r.jpg
 *
 * get file/attachment
 */
router.get("/:size?/:filename", async (req, res) => {
  const sizeInt = Number(req.params.size)
  const sizeStr = req.params.size
  let fn = path.join(baseStoragePath, splitImagePath(req.params.filename))
  if (sizeStr === "thumbnail") {
    fn = path.join(fn, getImageFn(req.params.filename, "thumbnail"))
  } else if (!sizeStr) {
    fn = path.join(fn, req.params.filename)
  } else if (config.allowedImageSizes.indexOf(sizeInt) !== -1) {
    fn = path.join(fn, getImageFn(req.params.filename, sizeStr))
    if (!fs.existsSync(fn)) {
      const newfile = await sharp(fn.replace(/\.[^.]*\.([^.]*)$/, ".$1"), { failOnError: false })
      await newfile.resize(sizeInt, sizeInt, { fit: "inside", withoutEnlargement: true }) // no upscaling -> same image with different names can happen
      await newfile.toFile(fn)
    }
  } else {
    return res.sendStatus(400)
  }

  res.contentType(req.params.filename)
  res.set("Cache-Control", "public, max-age=604800, immutable")
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
 * http -bf post :3001/attachments/62b6ffac2fff4a4a4845ac5b[?format=json] files@someimage.png files@someotherimage.jpg
 *
 * mongoshell > db.pages.update({_id: ObjectId("62b6ffac2fff4a4a4845ac5b")}, { $set : {"attachments": [] }}, { multi: true})
 * mongoshell > db.articles.find({}, { "title": 1, "attachments": 1 })
 *
 * see https://stackoverflow.com/questions/39350040/uploading-multiple-files-with-multer
 *
 */
router.post("/:id", validateRequest, uploadAttachments, resizeAttachments, async (req, res) => {
  // TODO: remove file from req.files if error occurs, to not save it in attachments
  const docs = await db.contents.findByIdAndUpdate(
    req.params.id,
    { $push: { attachments : { $each: req.files.map((file) => {
      return { name: file.filenameNaked, mimeType: file.mimetype, createdAt: new Date().toISOString() }
    }) } } }
  )

  // respond with html or json
  if (req.query.format === "json") {
    if (docs === null) return res.status(413).json({ "status": "error", "msg": `${req.params.id} not found` })
    return res.status(200).json({"status": "ok", "files": req.files.map((file) => { return file.path }) })
  } else {
    res.redirect(path.join(docs.url, "edit"))
  }
})

export default router
