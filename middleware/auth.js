const allowedRoles = [ "admin" ]
const authorize = async (req, res, next) => {
  // console.log("ip", req.socket.address(), req.socket.remoteAddress)
  if (res.locals.role && res.locals.role === "admin") next()
  else res.status(401).render("404")
}

export {
  authorize,
}
