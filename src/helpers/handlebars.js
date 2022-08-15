import { splitImagePath } from "../helpers/utils.js"

const formatDate = (timestamp, options = {}) => {
  // return new Date(timestamp).toLocaleDateString()
  let dateString = new Date(timestamp).toISOString()
  if (options.showTime || options.hash.showTime) dateString = dateString.split(".")[0].replace(/T/, " ")
  else dateString = dateString.split("T")[0]

  return dateString
}

const json = (object) => {
  return JSON.stringify(object, null, "  ")
}

// https://stackoverflow.com/questions/13046401/how-to-set-selected-select-option-in-handlebars-template
const select = function (selected, options) {
  return options.fn(this).replace(
      new RegExp(' value=\"' + selected + '\"'),
      '$& selected="selected"');
}

/*
 * https://github.com/jmurphyau/ember-truth-helpers
 * {{#if (eq @index 0)}}
 *   WORKS
 * {{/if}}
 */
const eq = function (a, b) {
  return a === b
}

const getAttachmentUrl = (filename) => {
  return splitImagePath(filename)
}

export {
  formatDate,
  json,
  select,
  eq,
  getAttachmentUrl,
}
