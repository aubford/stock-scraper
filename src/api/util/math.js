const getDiffPercent = (current, prior) => (current - prior) / Math.abs(prior)

module.exports = {
  getDiffPercent,
}
