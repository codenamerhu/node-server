module.exports = function () {
  const bookingRepository = new (require('./BookingRepository'))()
  const bookingHandler = require('./BookingHandler')
  const common = new (require('./Common'))()
  const pushNotification = new (require('./PushNotification'))()
  this.bookingService = async (callback) => {
    var response = {}
    try {
      var status = ['unassigned']
      var config = ['ManualAssign']
      var s2CellIds = []
      var getConfig = await bookingRepository.getAppConfig(config)
      var manualAssign = getConfig.error ? 0 : parseInt(getConfig.result.status)
      var bookingList = await bookingRepository.fetchBookings(status, manualAssign)
      var bookingIds = bookingList.error ? [] : bookingList.result.map((element) => { return element.id })
      var getBlockList = bookingList.error ? bookingList : await bookingRepository.getBookingBlockList(bookingIds)
      var bookingArray = bookingList.error ? [] : bookingList.result.map((element) => {
        var data = {}
        data.id = element.id
        data.latitude = element.latitude
        data.longitude = element.longitude
        var s2NeighborIds = common.getS2NeighborKeys(data.latitude, data.longitude)
        data.S2CellId = s2NeighborIds.error ? [] : s2NeighborIds.data
        s2CellIds = [...new Set([...s2CellIds, ...data.S2CellId])]
        var blockList = getBlockList.error ? [] : getBlockList.result.filter(provider => provider.orderId === element.id)
        data.rejectList = blockList.map((element) => { return element.staffId })
        return data
      })
      var state = {}
      state.status = 1
      state.tripStatus = 0
      var providerList = await bookingRepository.fetchProivder(state, s2CellIds)
      response.error = false
      response.data = providerList.error ? [] : bookingHandler.BookingHandler(bookingArray, providerList.result)
      callback(response)
    } catch (err) {
      err.error = true
      callback(err)
    }
  }

  this.updateBookingInfoService = async (bookingInfo, callback) => {
    var response = {}
    var tripStatus = 1
    try {
      var bookingInfoUpdate = await bookingRepository.updateBookingInfo(bookingInfo)
      if (bookingInfoUpdate.error) {
        response.error = true
      } else {
        var blockList = []
        var providerIds = bookingInfo.map((element) => {
          var data = {}
          data.orderId = element.id
          data.staffId = element.providerInfo.providerId
          data.isPushSend = 1
          blockList.push(data)
          return element.providerInfo.providerId
        })
        bookingRepository.updateProviderInfo(providerIds, tripStatus)
        bookingRepository.updateBlockList(blockList)
        bookingInfo.map((element) => {
          var content = {}
          content.title = 'New booking alert'
          content.body = 'You have new order to be delivered'
          content.data = element.id.toString()
          var deviceToken = {}
          deviceToken.token = element.providerInfo.fcmtoken
          deviceToken.deviceType = element.providerInfo.os
          pushNotification.sendPushNotificationByDeviceType(deviceToken, content, 'default')
        })
        response.error = false
      }
      callback(response)
    } catch (err) {
      err.error = true
      callback(err)
    }
  }

  this.reassignOrders = async (callback) => {
    var response = {}
    try {
      const data = ['REASSIGN_PROVIDER']
      const status = ['assigned']
      var interval
      var reassignConfig = await bookingRepository.getAppConfig(data)
      if (reassignConfig.error) {
        interval = 60
      } else {
        var result = reassignConfig.result
        interval = result.value
      }
      var bookingList = await bookingRepository.fetchBookingsByInterval(status, interval)
      if (!bookingList.error) {
        var bookingId = []
        var providerId = []
        bookingList.result.map((element) => {
          bookingId.push(element.id)
          providerId.push(element.deliveryStaffId)
        })
        bookingRepository.updateProviderInfo(providerId, 0)
        bookingRepository.reassignBooking(bookingId)
        var providerInfo = await bookingRepository.fetchProivder(providerId, [])
        if (!providerInfo.error) {
          providerInfo.result.map((element) => {
            var content = {}
            content.title = 'Booking Cancelled'
            content.body = 'Due to longer waiting time your booking has been missed'
            content.data = 'BOOKING_CANCELLED'
            var deviceToken = {}
            deviceToken.token = element.fcmtoken
            deviceToken.deviceType = element.os
            pushNotification.sendPushNotificationByDeviceType(deviceToken, content, 'default')
          })
        }
      }
      response.error = false
      callback(response)
    } catch (err) {
      err.error = true
      callback(err)
    }
  }
}
