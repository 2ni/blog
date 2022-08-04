import path from "path"

/*
 * c1cb20f5151f9482c7562a2c551f38b5-image.png -> c1/cb/c1cb20f5151f9482c7562a2c551f38b5-image.png
 */
const splitImagePath = (filename) => {
  return path.join(filename.match(/.{1,2}/g).slice(0, 2).join("/"))
}

/*
 * getImageFn("foobar.png", "thumbnail") -> foobar.thumbnail.png
 */
const getImageFn = (filename, size) => {
  return filename.replace(/(\.[^.]*)$/, "." + size + "$1")
}

export {
  splitImagePath,
  getImageFn,
}
