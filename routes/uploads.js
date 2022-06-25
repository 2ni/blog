import express from "express"
import multer from "multer"
const router = express.Router()
import db from "../models/app.js"

const mime_map = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    return cb(null, "public/uploads/")
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E4)
    const name = file.originalname.toLowerCase().replace(/ /g, "-").replace(/\.[^.]+$/, "")
    const extension = mime_map[file.mimetype]
    cb(null, name + "-" + uniqueSuffix + "." + extension)
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
 * http -bf post :3001/uploads uploads@someimage.png uploads@someotherimage.jpg
 * see https://stackoverflow.com/questions/39350040/uploading-multiple-files-with-multer
 */
router.post("/", (req, res) => {
  upload(req, res, (err) => {
    if (err) return res.status(413).json({ "status": "error", "msg": err.message })
    return res.status(200).json({"status": "ok"})
  })
})

export default router
