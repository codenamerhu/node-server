module.exports = function () {
  var admin = require('firebase-admin')

  var serviceAccount = require('./firebase-admin.json')

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://godelivery-2f7dd.firebaseio.com'
  })

  this.sendPushNotificationByDeviceType = (deviceInfo, content, sound) => {
    var response = {}
    return new Promise(function (resolve) {
      try {
        var messages
        sound = typeof sound === 'undefined' ? 'default' : sound
        if (deviceInfo.deviceType.toLowerCase() === 'android') {
          messages = {
            'token': deviceInfo.token,
            'data': {
              'title': content.title,
              'body': content.body,
              'data': content.data
            },
            'android': {
              'priority': 'high'
            }
          }
        } else {
          messages = {
            'token': deviceInfo.token,
            'notification': {
              'title': content.title,
              'body': content.body
            },
            'data': {
              'title': content.title,
              'body': content.body,
              'data': content.data
            },
            'apns': {
              'headers': {
                'apns-priority': '5'
              },
              'payload': {
                'aps': {
                  'category': 'BOOKING_ALERT',
                  'sound': sound
                }
              }
            }
          }
        }
        admin.messaging().send(messages)
          .then((result) => {
            console.log('FCM Success', result)
            response.error = false
            resolve(messages)
          })
          .catch((err) => {
            console.log('FCM Error', err)
            err.error = true
            resolve(err)
          })
      } catch (err) {
        console.log('FCM Error', err)
        err.error = false
        resolve(err)
      }
    })
  }
}
