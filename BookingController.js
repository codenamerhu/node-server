module.exports = function () {
  const bookingService = new (require('./BookingService'))()
  this.bookingCtrl = (callback) => {
    var response = {}
    bookingService.bookingService((result) => {
      if (result.error) {
        response.error = true
        callback(response)
      } else {
        bookingService.updateBookingInfoService(result.data, (output) => {
          response.error = false
          callback(response)
        })
      }
    })
  }

  this.reassignOrdersCtrl = (callback) => {
    bookingService.reassignOrders((result) => {
      callback(result)
    })
  }
}
