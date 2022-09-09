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

/*
 * filterKeys(object, "key1,key2")
 */
const filterKeys = (object, exposedKeys) => {
  if (typeof(exposedKeys) === "string") exposedKeys = exposedKeys.replace(/, /, ",").split(",")
  return Object.fromEntries(Object.entries(object).filter(([k,v]) => exposedKeys.includes(k)))
}

const excludeKeys = (object, excludeKeys) => {
  if (typeof(excludeKeys) === "string") excludeKeys = excludeKeys.replace(/, /, ",").split(",")
  return Object.fromEntries(Object.entries(object).filter(([k,v]) => !excludeKeys.includes(k)))
}

export {
  splitImagePath,
  getImageFn,
  filterKeys,
  excludeKeys,
}
