
module.exports = function () {
  require('dotenv').config()
  const googleMapsClient = require('@google/maps').createClient({
    key: process.env.GMAP_KEY,
    Promise: Promise
  })

  this.MapClient = function (origin, destination, callback) {
    googleMapsClient.distanceMatrix({
      origins: origin,
      destinations: destination
    },
    function (err, distance) {
      if (err) {
        callback(err)
      } else {
        callback(distance.json)
      }
    })
  }

  this.getDistanceInKM = function (origin, destination, callback) {
    var data = {}
    return new Promise(function (resolve) {
      googleMapsClient.distanceMatrix({
        origins: origin,
        destinations: [destination]
      }).asPromise()
        .then((distance) => {
          var result = distance.json
          var matrix = {}
          var km = ((result.rows[0].elements[0].distance.value) / 1000)
          matrix.distance = Math.round(km * 10) / 10
          matrix.distanceTxt = result.rows[0].elements[0].distance.text
          data.error = false
          data.msg = 'success'
          data.result = matrix
          resolve(data)
        })
        .catch((err) => {
          err.error = true
          err.msg = 'OOPS'
          resolve(err)
        })
    })
  }
}
