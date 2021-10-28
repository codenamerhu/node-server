module.exports.BookingHandler = function (bookingList, providerList) {
  function deliveryAssign (bookingList, providerList) {
    var bList = bookingList
    var pList = providerList
    var list = bList.map((booking) => {
      var filterS2CellId = pList.filter(element => booking.S2CellId.includes(element.s2CellId))
      var rejectedList = booking.rejectList
      var assignList = filterS2CellId.map((provider) => {
        var data = {}
        data.providerId = provider.id
        data.distance = getDistanceFromLatLonInKm(booking.latitude, booking.longitude, provider.latitude, provider.longitude)
        data.s2CellId = provider.s2CellId
        data.fcmtoken = provider.fcmtoken
        data.os = provider.os
        return data
      })
      var assign = assignList.filter((provider) => { return !rejectedList.includes(provider.providerId) })
      var sortList = assign.sort((a, b) => { return a.distance - b.distance })
      booking.data = sortList
      return booking
    })
    var filterbookingList = list.filter(element => element.data.length > 0)
    var bookingMatch = filterbookingList.sort((a, b) => a.data[0].distance - b.data[0].distance)
    return bookingMatch
  }

  function getDistanceFromLatLonInKm (latitude1, longitude1, latitude2, longitude2) {
    var earthRadius = 6371 // Radius of the earth in km
    var dLat = deg2rad(latitude2 - latitude1) // deg2rad below
    var dLon = deg2rad(longitude2 - longitude1)
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(deg2rad(latitude1)) * Math.cos(deg2rad(latitude2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    var d = earthRadius * c
    // var miles = d / 1.609344;
    return d
  }

  function deg2rad (degrees) {
    var pi = Math.PI
    return degrees * (pi / 180)
  }

  var bookingAssignList = deliveryAssign(bookingList, providerList)
  var matchList = []
  var final = bookingAssignList.map((element) => {
    var provider = element.data.shift()
    var providerId = provider.providerId
    if (matchList.includes(providerId)) {
      var providerFilter = element.data.filter(element1 => matchList.includes(element1.providerId) === false)
      if (providerFilter.length === 0) {
        element.providerInfo = null
      } else {
        element.providerInfo = providerFilter.shift()
        matchList.push(element.providerInfo.providerId)
      }
    } else {
      element.providerInfo = provider
      matchList.push(providerId)
    }
    delete element.S2CellId
    return element
  })
  var result = final.filter(element => element.providerInfo != null)
  return result
}
