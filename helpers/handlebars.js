const formatDate = (timestamp) => {
  return new Date(timestamp).toISOString().split("T")[0]
}

export {
  formatDate,
}
