import localhost from "./environment/localhost.js"
import production from "./environment/production.js"

const env = process.env.ENV || "production"

let config = localhost
switch (env) {
  case "production":
    config = production
    break
  case "localhost":
    config = localhost
    break
}

export { env, config }
