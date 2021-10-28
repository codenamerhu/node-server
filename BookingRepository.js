module.exports = function () {
  require('dotenv').config()
  const Knex = require('knex')
  const config = {
    client: 'mysql',
    connection: {
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME
    },
    pool: {
      min: Number(process.env.DB_POOL_MIN),
      max: Number(process.env.DB_POOL_MAX)
    }
  }

  const integrationSetting = 'IntegrationSetting'
  const orders = 'Orders'
  const deliveryStaff = 'DeliveryStaff'
  const blockOrderList = 'blockOrderList'
  const outlet = 'Outlets'

  this.getAppConfig = (fieldName) => {
    var response = {}
    return new Promise(function (resolve) {
      var knex = new Knex(config)
      knex(integrationSetting)
        .whereIn('key', fieldName)
        .then((result) => {
          if (result.length > 0) {
            response.error = false
            response.result = result[0]
          } else {
            response.error = true
          }
          resolve(response)
        })
        .catch((err) => {
          err.error = true
          resolve(response)
        })
        .finally(() => {
          knex.destroy()
        })
    })
  }

  this.fetchBookings = (status, manual) => {
    var response = {}
    return new Promise(function (resolve) {
      var knex = new Knex(config)
      var query = knex(orders)
        .select(`${orders}.id`, `${orders}.outletId`, `${outlet}.latitude`, `${outlet}.longitude`, `${outlet}.latitude`, `${outlet}.s2CellId`, `${outlet}.latitude`)
        .join(outlet, `${outlet}.id`, `${orders}.outletId`)
        .whereIn('orderStatus', status)
      if (manual) {
        query.whereNotNull('confirmedTime')
      }
      query.then((result) => {
        if (result.length > 0) {
          response.error = false
          response.result = result
        } else {
          response.error = true
        }
        resolve(response)
      })
        .catch((err) => {
          err.error = true
          resolve(response)
        })
        .finally(() => {
          knex.destroy()
        })
    })
  }

  this.fetchBookingsByInterval = (status, interval) => {
    var response = {}
    return new Promise(function (resolve) {
      var knex = new Knex(config)
      knex(orders)
        .whereIn('orderStatus', status)
        .where(knex.raw('TIME_TO_SEC(TIMEDIFF(?, assignedTime)) > ?', [knex.fn.now(), interval]))
        .then((result) => {
          if (result.length > 0) {
            response.error = false
            response.result = result
          } else {
            response.error = true
          }
          resolve(response)
        })
        .catch((err) => {
          err.error = true
          resolve(response)
        })
        .finally(() => {
          knex.destroy()
        })
    })
  }

  this.fetchProivder = (status, cellIds) => {
    var response = {}
    return new Promise(function (resolve) {
      var knex = new Knex(config)
      var query = knex(deliveryStaff)
        .select('id', 'latitude', 'longitude', 's2CellId', 'fcmtoken', 'os')
      if (cellIds.length > 0) {
        query.whereIn('s2CellId', cellIds).where(status)
      } else {
        query.whereIn('id', status)
      }
      query.then((result) => {
        if (result.length > 0) {
          response.error = false
          response.result = result
        } else {
          response.error = true
        }
        resolve(response)
      })
        .catch((err) => {
          err.error = true
          resolve(response)
        })
        .finally(() => {
          knex.destroy()
        })
    })
  }

  this.getBookingBlockList = (bookingIds) => {
    var response = {}
    return new Promise(function (resolve) {
      var knex = new Knex(config)
      knex(blockOrderList)
        .whereIn('orderId', bookingIds)
        .then((result) => {
          if (result.length > 0) {
            response.error = false
            response.result = result
          } else {
            response.error = true
          }
          resolve(response)
        })
        .catch((err) => {
          err.error = true
          resolve(response)
        })
        .finally(() => {
          knex.destroy()
        })
    })
  }

  this.updateBookingInfo = (data) => {
    var knex = new Knex(config)
    var response = {}
    return new Promise(function (resolve) {
      knex.transaction(trx => {
        const queries = []
        data.forEach(booking => {
          const query = knex(orders)
            .where('id', booking.id)
            .update({
              deliveryStaffId: booking.providerInfo.providerId,
              orderStatus: 'assigned',
              assignedTime: knex.fn.now()
            })
            .transacting(trx) // This makes every update be in the same transaction
          queries.push(query)
        })
        Promise.all(queries) // Once every query is written
          .then(trx.commit) // We try to execute all of them
          .catch(trx.rollback) // And rollback in case any of them goes wrong
          .finally(() => {
            knex.destroy()
            response.error = false
            resolve(response)
          })
      })
    })
  }

  this.reassignBooking = (data) => {
    var response = {}
    return new Promise(function (resolve) {
      var knex = new Knex(config)
      knex(orders)
        .whereIn('id', data)
        .update({
          deliveryStaffId: null,
          orderStatus: 'unassigned',
          assignedTime: null
        })
        .then((result) => {
          if (result.length > 0) {
            response.error = false
            response.result = result
          } else {
            response.error = true
          }
          resolve(response)
        })
        .catch((err) => {
          err.error = true
          resolve(response)
        })
        .finally(() => {
          knex.destroy()
        })
    })
  }

  this.updateProviderInfo = (data, tripStatus) => {
    var response = {}
    return new Promise(function (resolve) {
      var knex = new Knex(config)
      knex(deliveryStaff)
        .update('tripStatus', tripStatus)
        .whereIn('id', data)
        .then((result) => {
          if (result.length > 0) {
            response.error = false
            response.result = result
          } else {
            response.error = true
          }
          resolve(response)
        })
        .catch((err) => {
          err.error = true
          resolve(response)
        })
        .finally(() => {
          knex.destroy()
        })
    })
  }

  this.updateBlockList = (data) => {
    var response = {}
    return new Promise(function (resolve) {
      var knex = new Knex(config)
      knex(blockOrderList)
        .insert(data)
        .then((result) => {
          if (result.length > 0) {
            response.error = false
            response.result = result
          } else {
            response.error = true
          }
          resolve(response)
        })
        .catch((err) => {
          err.error = true
          resolve(response)
        })
        .finally(() => {
          knex.destroy()
        })
    })
  }
}
