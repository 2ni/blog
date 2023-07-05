import express from "express"
const router = express.Router()
import { authorize } from "../middleware/auth.js"
import fs from "fs"
import { spawn } from "child_process"
import multer from "multer"

const upload = multer({ dest: "tmp/" })
let progressData = { percentComplete: 0, isComplete: false, eta: "", logs: [] } // TODO: object which is request or user specific

router.get("/health", (req, res) => {
  res.json({ "status": "ok" })
})

router.get("/", authorize("admin"), (req, res) => {
  res.render("yt/index", { "jsfile": "/js/yt.js" })
})

router.post("/download", authorize("admin"), upload.none(), (req, res) => {
  progressData = { percentComplete: 0, isComplete: false, eta: "", logs: [] }
  const url = req.body.url
  const resolution = req.body.resolution || 1440

  // const filename = `file-${Date.now()}.txt`
  // const filePath = `tmp/${filename}`
  // fs.writeFileSync(filePath, url)

  // alias yt-dlp-web='yt-dlp -cf "bv*[ext=mp4][width<=1440]+ba/b"'
  // alias yt-dlp-audio='yt-dlp --extract-audio --audio-format mp3'
  let command
  if (req.body.info) {
    command = spawn("yt-dlp", [ "-F", url ])
  } else if (req.body.audio) {
    command = spawn("yt-dlp", [ "--newline", "--extract-audio", "--audio-format", "mp3", url ], { "cwd": "tmp" })
  } else {
    command = spawn("yt-dlp", [ "--newline", url, "-cf", `bv*[ext=mp4][width<=${resolution}]+ba/b` ], { "cwd": "tmp" })
  }

  // const command = spawn("echo", ['[Merger] Merging formats into "test.mkv'])
  const outputs = []
  command.stdout.on("data", data => {
    const output = data.toString().trim()
    // console.log(output)
    outputs.push(output); outputs.length > 5 && outputs.splice(0, outputs.length - 5)
    let progress
    if (output.includes("[download]") && output.includes(" ETA ")) {
      progress = (output.match(/(\d{1,3}(?:\.\d{1,2})?)%/)||[])[1] // match 100.0% or 100%
      progressData.percentComplete = progress || 0
      const [_, size, eta ] = output.match(/~\s*([^\s]*).*ETA\s([^\s]*)/) || ["", "", ""]
      progressData.eta = `${progress}% of ${size}. ETA ${eta}`
      // console.log(">>>", progressData.eta)
    }
    if (!progress) {
      progressData.logs.unshift(output)
    }
  })
  command.stderr.on("data", data => {
    console.error("error", data.toString())
    progressData.logs.unshift(data.toString())
  })

  command.on("close", code => {
    if (req.body.info) {
      return res.json({ "info": progressData.logs.reverse() })
    }

    // console.log("close", outputs)
    // [Merger] Merging formats into "The Biggest Mistake Gardeners Make in May [AT1lJkA5K1s].mkv"
    // [download] Destination: The Biggest Mistake Gardeners Make in May [AT1lJkA5K1s].f251.webm
    // [ExtractAudio] Destination: The Biggest Mistake Gardeners Make in May [AT1lJkA5K1s].mp3
    // [download] The Biggest Mistake Gardeners Make in May [AT1lJkA5K1s].mp3 has already been downloaded
    let filename
    for (const line of outputs.reverse()) {
      filename = (line.match(/Destination: (.*)/) || [])[1]
      if (!filename) {
        filename = (line.match(/\[download\] (.*) has already been downloaded/) || [])[1]
      }
      if (!filename) {
        filename = (line.match(/\[Merger\][^"]*"([^"]*)/) || [])[1]
      }
      if (!filename) {
        filename = (line.match(/\[download\][^:]* (.*)/) || [])[1]
      }

      if (filename) {
        break
      }
    }

    progressData.percentComplete = "100"
    progressData.logs.unshift("job done.")
    progressData.isComplete = true
    if (code === 0 && filename) {
      res.json({ ...{"filename": filename}, ...progressData })
    } else {
      res.status(500).json({ ...{ "msg": "error downloading"}, ...progressData })
    }
  })

  /*
  command.on("close", code => {
    if (code === 0) {
      res.send(filename)
    } else {
      res.status(500).send("error while downloading")
    }
  })
  */

  // fs.writeFileSync(filePath, url)
  // return res.send(filename)
})

router.get("/file/:filename", authorize("admin"), (req, res) => {
  res.setHeader("Cache-Control", "public, max-age=0") // to ensure we call the endpoint and delete the file

  const filename = req.params.filename
  const filePath = `tmp/${filename}`

  res.download(filePath, err => {
    if (err) {
      console.error(err)
      res.status(500).send("error while downloading file")
    }

    // delete file after it was downloaded
    fs.unlink(filePath, err => {
      if (err) {
        console.error(err)
      }
    })
  })
})

router.get("/progress", (req, res) => {
  return res.json(progressData)
})

export default router
