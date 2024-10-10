import express from "express"
const router = express.Router()
import { authorize } from "../middleware/auth.js"
import fs from "fs"
import { spawn } from "child_process"
import multer from "multer"

const tmpFolder = "../tmp/"
// const tmpFolder = "tmp/" // for localhost
const upload = multer({ dest: tmpFolder })
let progressData = { percentComplete: 0, isComplete: false, eta: "", logs: [] } // TODO: object which is request or user specific

router.get("/health", (req, res) => {
  res.json({ "status": "ok" })
})

router.get("/", authorize("admin"), (req, res) => {
  // show existing files, eg in case download failed for some reasons
  const files = []
  fs.readdirSync(tmpFolder).forEach(file => {
    files.push(file)
  })
  res.render("yt/index", { files: files })
})

router.post("/download", authorize("admin"), upload.none(), (req, res) => {
  progressData = { percentComplete: 0, isComplete: false, eta: "", logs: [] }
  const url = req.body.url
  const resolution = req.body.resolution || 1440

  // const filename = `file-${Date.now()}.txt`
  // const filePath = `${tmpFolder}/${filename}`
  // fs.writeFileSync(filePath, url)

  // alias yt-dlp-web='yt-dlp -cf "bv*[ext=mp4][width<=1440]+ba/b"'
  // alias yt-dlp-audio='yt-dlp --extract-audio --audio-format mp3'
  let command
  if (req.body.info) {
    command = spawn("yt-dlp", [ "-F", "--no-cache-dir", url ])
  } else if (req.body.audio) {
    command = spawn("yt-dlp", [ "--newline", "--no-cache-dir", "--extract-audio", "--audio-format", "mp3", url ], { "cwd": tmpFolder })
  } else {
    command = spawn("yt-dlp", [ "--newline", "--no-cache-dir", url, "-cf", `b[ext=mp4][width<=${resolution}]/bv[ext=mp4][width<=${resolution}]+ba/b[width<${resolution}]` ], { "cwd": tmpFolder })
  }

  // const command = spawn("echo", ['[Merger] Merging formats into "test.mkv'])
  const outputs = []
  command.stdout.on("data", data => {
    const output = data.toString().trim()
    // console.log(output)
    outputs.push(output); // Destination line is not at the bottom anymore. outputs.length > 5 && outputs.splice(0, outputs.length - 5)
    let progress
    if (output.includes("[download]") && output.includes(" ETA ")) {
      progress = (output.match(/(\d{1,3}(?:\.\d{1,2})?)%/)||[])[1] // match 100.0% or 100%
      progressData.percentComplete = progress || 0
      // [download]  98.1% of ~  30.59MiB at  109.39KiB/s ETA 00:00 (frag 3/4)
      // [download]  95.3% of   30.59MiB at    1.64MiB/s ETA 00:00
      const [_, size, eta ] = output.match(/[^\d]*([^\s]*).*ETA\s([^\s]*)/) || ["", "", ""]
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

  command.on("error", err => {
    console.error(err)
    progressData.logs.unshift(err.toString())
  })

  command.on("close", code => {
    // console.log(">>>>> DONE")
    if (req.body.info) {
      return res.json({ "info": progressData.logs.reverse() })
    }

    // console.log("close", outputs)
    // [Merger] Merging formats into "The Biggest Mistake Gardeners Make in May [AT1lJkA5K1s].mkv"
    // [FixupM3u8] Fixing MPEG-TS in MP4 container of "À la Carte! – Freiheit geht durch den Magen [94652116].mp4"
    // [download] Destination: The Biggest Mistake Gardeners Make in May [AT1lJkA5K1s].f251.webm
    // [ExtractAudio] Destination: The Biggest Mistake Gardeners Make in May [AT1lJkA5K1s].mp3
    // [download] The Biggest Mistake Gardeners Make in May [AT1lJkA5K1s].mp3 has already been downloaded
    let filename
    for (const line of outputs.reverse()) {
      filename = line.match(/Destination: (.*)/)?.[1];
      if (!filename) {
        filename = line.match(/\[download\] (.*) has already been downloaded/)?.[1];
      }
      if (!filename) {
        filename = line.match(/\[(?:Merger|FixupM3u8)\][^"]*"([^"]*)/)?.[1];
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
  const filePath = `${tmpFolder}${filename}`

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
