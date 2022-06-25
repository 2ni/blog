const formatDate = (timestamp, options = {}) => {
  // return new Date(timestamp).toLocaleDateString()
  let dateString = new Date(timestamp).toISOString()
  if (options.showTime || options.hash.showTime) dateString = dateString.split(".")[0].replace(/T/, " ")
  else dateString = dateString.split("T")[0]

  return dateString
}

const json = (object) => {
  return JSON.stringify(object)
}

// https://stackoverflow.com/questions/13046401/how-to-set-selected-select-option-in-handlebars-template
const select = function (selected, options) {
  return options.fn(this).replace(
      new RegExp(' value=\"' + selected + '\"'),
      '$& selected="selected"');
}

export {
  formatDate,
  json,
  select,
}
