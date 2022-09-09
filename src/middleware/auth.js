import jwt from "jsonwebtoken"

const authorize = (expectedRole) => {
  return async (req, res, next) => {
    if (!res.locals.user || res.locals.user.role !== expectedRole) {
      return res.status(401).render("404")
    }

    next()
    // console.log("ip", req.socket.address(), req.socket.remoteAddress)
  }
}

export {
  authorize,
}
