const formatDate = (timestamp, options = {}) => {
  // return new Date(timestamp).toLocaleDateString()
  let dateString = new Date(timestamp).toISOString()
  if (options.showTime) dateString = dateString.split(".")[0].replace(/T/, " ")
  else dateString = dateString.split("T")[0]

  return dateString
}

const json = (object) => {
  return JSON.stringify(object)
}

export {
  formatDate,
  json,
}
