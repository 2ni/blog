import mongoose from "mongoose"

const sitemapsSchema = new mongoose.Schema({
  content: {
    type: Array,
  },
}, { timestamps: true })

const sitemap = mongoose.model("sitemaps", sitemapsSchema)
export default sitemap
