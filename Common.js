module.exports = function () {
  require('dotenv').config()
  const S2 = require('s2-geometry').S2
  const level = process.env.S2_LEVEL
  this.generateS2CellId = (latitude, longitude) => {
    var response = {}
    try {
      var key = S2.latLngToKey(latitude, longitude, level)
      var id = S2.keyToId(key)
      response.error = false
      response.data = id
      return response
    } catch (err) {
      response.error = true
      return response
    }
  }
  this.getS2NeighborKeys = (latitude, longitude) => {
    var response = {}
    try {
      var neighbor = []
      var key = S2.latLngToKey(latitude, longitude, level)
      var keys = S2.latLngToNeighborKeys(latitude, longitude, level)
      keys.push(key)
      keys.filter((x) => {
        var c = S2.keyToId(x)
        neighbor.push(c)
      })
      response.error = false
      response.data = neighbor
      return response
    } catch (err) {
      response.error = true
      return response
    }
  }
}
