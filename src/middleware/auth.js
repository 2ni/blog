import jwt from "jsonwebtoken"

const authorize = (expectedRole) => {
  return async (req, res, next) => {
    if (!res.locals.user || res.locals.user.role !== expectedRole) {
      return res.status(401).render("404")
    }

    next()
  }
}

/*
 * allow from internal network only (ie vpn)
 * needs the follwing in nginx:
 * proxy_set_header   X-Real-IP        $remote_addr
 */
const authorizeFirewall = (req, res, next) => {
  if (process.env.ENV === "production" && !req.headers["x-real-ip"].match(/^10\.6\.0|192\.168\.1\.1/)) {
    return res.status(401).render("404")
  }
  next()
}

export {
  authorize,
  authorizeFirewall,
}
