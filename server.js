
var app = require('express')()
var http = require('http').Server(app)
var io = require('socket.io')(http)
const cron = require('node-cron')
const bookingCtrl = new (require('./BookingController'))()

require('dotenv').config()
require('./geoDataMatrix')()

var bodyParser = require('body-parser')

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({
  extended: true
}))

cron.schedule('*/20 * * * * *', () => {
  bookingCtrl.bookingCtrl((response) => {
    console.log(JSON.stringify(response))
  })
})
cron.schedule('*/10 * * * * *', () => {
  bookingCtrl.reassignOrdersCtrl((response) => {
    // console.log('Reassign', JSON.stringify(response))
  })
})

// app.get('/', function(req, res) {
//    res.sendfile('index.html');
// });
var mysql = require('mysql')

var S2 = require('s2-geometry').S2

app.get('/', function (req, res) { // get,put,post,delete
  res.sendFile(__dirname + '/index.html')
})

var connection = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME
})

io.on('connection', function (socket) {
  var socketId = socket.id
  socket.on('updateLocation', function (data) {
    var latitude = parseFloat(data.latitude).toFixed(6)
    var longitude = parseFloat(data.longitude).toFixed(6)
    var id = data.staffId
    console.log(latitude);
    console.log(longitude);
    console.log(id);

    var level = process.env.S2_LEVEL
    var key = S2.latLngToKey(latitude, longitude, level)
    var cellId = S2.keyToId(key)
    console.log(cellId);
    console.log(key);

    // console.log('s2CellId', latitude, longitude, cellId)

    var update_location = 'UPDATE DeliveryStaff SET latitude=?,longitude=?,s2CellId=?, s2key=? where id=?'
    connection.query(update_location, [latitude, longitude, cellId, key, id], function (err, rows, fields) {
      if (err) {
        console.log(err)
      } else {
        // console.log('success')
        var updateSocketId = 'SELECT * FROM Orders where deliveryStaffId = ? and orderStatus != "delivered"'

        connection.query(updateSocketId, [id], function (err, rows) {
          if (err) {
            console.log(err)
            response.error = true
            response.message = 'failed'
          } else {
            var DeliveryStaffLength = rows.length
            rows.forEach(function (value, index) {
              // console.log(value.id)
              var response = {}

              response.error = false
              response.message = 'success'
              response.latitude = data.latitude
              response.longitude = data.longitude
              io.to(value.id).emit('providerLocation', response)
            })
          }
        })
      }
    })
  })

  socket.on('providerOnline', async function (data, ack) {
    // console.log('online', data)
    var response = {}

    var update_location = 'UPDATE DeliveryStaff SET socketId=? where id =?'
    connection.query(update_location, [socketId, data.id], function (err, rows, fields) {
      if (err) {
        console.log(err)
      } else {
        // console.log(rows,'updateSocketId');
      }
    })

    var updateSocketId = 'SELECT * FROM Orders where deliveryStaffId = ? and orderStatus != "delivered"'

    connection.query(updateSocketId, [data.id], function (err, rows) {
      if (err) {
        console.log(err)
        response.error = true
        response.message = 'failed'
      } else {
        var DeliveryStaffLength = rows.length
        rows.forEach(function (value, index) {
          socket.join(value.id)
          // console.log(value.id)

          if (--DeliveryStaffLength === 0) {
            response.error = false
            response.message = 'success'
            ack(response)
          }
        })
      }
    })
  })

  socket.on('userOnline', async function (data, ack) {
    // console.log('online', data)
    var response = {}
    var updateSocketId = 'SELECT * FROM Orders where userId = ? and  orderStatus != "delivered"'

    connection.query(updateSocketId, [data.id], function (err, rows) {
      if (err) {
        console.log(err)
        response.error = true
        response.message = 'failed'
      } else {
        var DeliveryStaffLength = rows.length
        rows.forEach(function (value, index) {
          // console.log(value.id)
          // socket.join(value.id);
          if (--DeliveryStaffLength === 0) {
            response.error = false
            response.message = 'success'
            ack(response)
          }
        })
      }
    })
  })

  socket.on('restaurantOnline', async function (data, ack) {
    // console.log('online', data)
    var response = {}

    var update_location = 'UPDATE Outlets SET socketId=? where id =?'
    connection.query(update_location, [socketId, data.id], function (err, rows, fields) {
      if (err) {
        console.log(err)
      } else {

      }
    })

    var updateSocketId = 'SELECT * FROM Orders where Outlets = ? and orderStatus != "delivered"'

    connection.query(updateSocketId, [data.id], function (err, rows) {
      if (err) {
        console.log(err)
        response.error = true
        response.message = 'failed'
      } else {
        var DeliveryStaffLength = rows.length
        rows.forEach(function (value, index) {
          socket.join(value.id)
          // console.log(value.id)

          if (--DeliveryStaffLength === 0) {
            response.error = false
            response.message = 'success'
            ack(response)
          }
        })
      }
    })
  })

  socket.on('tracking', function (data, ack) {
    // console.log(socket.rooms);
    // console.log(data,"****")
    var response = {}

    response.error = false
    response.message = 'success'
    response.orderId = data.orderId
    response.userId = data.userId
    response.latitude = data.latitude
    response.longitude = data.longitude
    response.orderStatus = data.orderStatus
    ack(response)
    // console.log(data.orderId);
    io.to(data.orderId).emit('receiveTracking', response)
  })
})

app.post('/reAssign', function (req, res) {
  var response = {}
  var data = {}
  var staffIds = req.body.blockStaffList
  staffIds.forEach(function (value, index) {
    var providerSocketId = 'SELECT * FROM DeliveryStaff where id = ?'

    connection.query(providerSocketId, [value.staffId], function (err, rows) {
      if (err) {
        console.log(err)
        response.error = true
        response.message = 'failed'
      } else {
        // console.log(rows[0].socketId,'*test*')
        response.error = false
        response.message = 'success'
        response.orderStatus = 'REMOVE'
        io.to(rows[0].socketId).emit('removeOrder', response)
      }
    })
  })

  res.send(data)
})

app.post('/restaurantNewOrder', function (req, res) {
  var response = {}
  var data = {}
  var outletId = req.body.outletId
  var outletSocketId = 'SELECT * FROM Outlets where id = ?'

  connection.query(outletSocketId, [outletId], function (err, rows) {
    if (err) {
      console.log(err)
      response.error = true
      response.message = 'failed'
    } else {
      response.error = false
      response.message = 'success'
      response.orderStatus = 'NEWORDER'
      io.to(rows[0].socketId).emit('newOrder', response)
    }
  })

  res.send(data)
})

app.post('/s2CellId', function (req, res) {
  var data = {}

  var latitude = req.body.latitude
  var longitude = req.body.longitude
  var level = process.env.S2_LEVEL

  // console.log(req.body)
  var key = S2.latLngToKey(latitude, longitude, level)

  var id = S2.keyToId(key)

  // console.log('outlet', latitude, longitude, id)

  data.id = id
  data.key = key
  // console.log(data,'#####')
  res.send(data)
})

app.post('/calculateDistance', function (req, res) {
  var destination = []
  var response = {}
  var result = []

  const body = req.body

  var origin = []

  var deliveryboy = JSON.parse(body.driverlocation)
  origin = JSON.parse(body.restaurant)

  // var origin = []
  // origin.push(body.restaurant)

  // console.log(origin)

  const distanceWeight = -5
  const durationWeight = -4

  var pick_drop_distance_value = 0 // distance value in terms of unit meters from pickup point and drop location
  var pick_drop_time_value = 0 // distance value in terms of unit second from pickup point and drop location

  deliveryboy.forEach(element => {
    var lat = element.lat
    var lng = element.lng

    destination.push(lat + ',' + lng)
  })

  MapClient(origin, destination, function (distance) {
    var count = 0
    var eta = distance

    deliveryboy.forEach(element => {
      element['distance'] = eta.rows[0].elements[count].distance.text
      element['distance_value'] = eta.rows[0].elements[count].distance.value + pick_drop_distance_value
      element['duration'] = eta.rows[0].elements[count].duration.text
      element['duration_value'] = eta.rows[0].elements[count].duration.value + pick_drop_time_value

      //      element['weight'] = weightCalculator(element['distance_value'], element['duration_value'], element['rating'])

      // console.log('weeee')
      result.push(element)
      count++
    })
    response.data = result

    res.send(response)
  })
})

// new distance calculation
app.post('/distanceCalculation', async function (req, res) {
  var response = {}

  var data = req.body
  var fromLocation = JSON.parse(data.origin)
  var toLocation = JSON.parse(data.destination)
  var origin = [fromLocation[0] + ',' + fromLocation[1]]
  var destination = [toLocation[0] + ',' + toLocation[1]]

  var resultdata = await this.getDistanceInKM(origin, destination)

  if (resultdata.error) {
    response.error = true
    response.message = 'failed'
  } else {
    response.error = false
    response.message = 'success'
    response.result = resultdata.result
  }
  res.send(response)
})

app.post('/weightCalculation', function (req, res) {
  const body = req.body

  var providers = JSON.parse(body.deliveryboy)
  const weight = JSON.parse(body.weight)

  // console.log(providers)

  var config = {}
  weight.forEach(element => {
    config[element.key] = element.value
  })

  var providerweight = providers.map(provider => {
    return weightCalculator(provider, config)
  })

  providerweight.sort((a, b) => a.total - b.total)

  // console.log(providerweight)

  function weightCalculator (data, config) {
    var key = Object.keys(config)
    var total = 0
    key.forEach(element => {
      if (data[element] && config[element]) {
        total += data[element] * config[element]
      } else {
        total += 0
      }
    })
    data['total'] = total

    console.log(total)
    return data
  }

  res.send(providerweight)
})

http.listen(process.env.PORT, function () {
  console.log('listening on localhost:3000')
})
