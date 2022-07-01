import express from "express"
import multer from "multer"
import fs from "fs"
import stream from "stream"
import path from "path"
import crypto from "crypto"
import sharp from "sharp"
const router = express.Router()
import db from "../models/app.js"

const mime_map = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
}

const baseStoragePath = "attachments"

/*
 * c1cb20f5151f9482c7562a2c551f38b5-image.png -> c1/cb/c1cb20f5151f9482c7562a2c551f38b5-image.png
 */
const splitImagePath = (filename) => {
  return path.join(filename.match(/.{1,2}/g).slice(0, 2).join("/"))
}


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    return cb(null, baseStoragePath)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E4)
    const origFilename = file.originalname.toLowerCase().replace(/ /g, "-").replace(/\.[^.]+$/, "")
    const extension = mime_map[file.mimetype]
    const filename = crypto.createHash("md5").update(uniqueSuffix + "-" + origFilename + "." + extension).digest("hex") + "-" + origFilename + "." + extension

    const subdirImg = splitImagePath(filename)
    const dir = path.join(baseStoragePath, subdirImg)
    console.log("dir", dir)
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
      console.log("mime", file.mimetype)
      return cb(new Error(req.__("filetype not supported")))
    }
  },
}).array("files", 5)

/*
 * see https://stackoverflow.com/questions/17515699/node-express-sending-image-files-as-api-response#answer-56873042
 * http://localhost:3001/attachments/c1cb20f5151f9482c7562a2c551f38b5-image.png
 * http -bf get :3001/attachments/c1cb20f5151f9482c7562a2c551f38b5-image.png
 */
router.get("/:size?/:filename", (req, res) => {
  let fn = path.join(baseStoragePath, splitImagePath(req.params.filename))
  if (req.params.size === "thumbnail") {
    fn = path.join(fn, req.params.filename.replace(/(\.[^.]*)$/, ".thumbnail$1"))
  } else if (!req.params.size) {
    fn = path.join(fn, req.params.filename)
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
 * http -bf post :3001/attachments files@someimage.png files@someotherimage.jpg
 * see https://stackoverflow.com/questions/39350040/uploading-multiple-files-with-multer
 */
router.post("/", async (req, res) => {
  await upload(req, res, (err) => {
    // create thumbnails
    req.files.forEach((file) => {
      sharp(file.path, { failOnError: false })
        .resize(200, 200, { fit: "inside" })
        .toFile(file.path.replace(/(\.[^.]*)$/, ".thumbnail$1"), (err, info) => {
          console.log("res", err, info)
        })
    })
    if (err) return res.status(413).json({ "status": "error", "msg": err.message })
    return res.status(200).json({"status": "ok", "files": req.files.map((file) => { return file.path }) })
  })
})

export default router
