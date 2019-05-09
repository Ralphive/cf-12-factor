module.exports = {
    GetBusinessPartners: function (query, response) {
        return (GetBusinessPartners(query, response));
    },
    PostBusinessPartners: function (query, body, response) {
        return (PostBusinessPartners(query, body, response));
    },
    SetCache: function (inCache) { cache = inCache; }
}

const SLServer = process.env.B1_SL_HOST

const request = require('request')  // HTTP Client
const moment = require('moment') // Date Time manipulation


//Hash Keys for Redis DB
const hash_Session = "b1_SessionID"
const hash_Timeout = "b1_Timeout"
const timout_exp = "b1_Expire"

function serviceLayerRequest(options, callback) {

    console.log("Preparing Service Layer Request:" +JSON.stringify(options.method) +" - "+JSON.stringify(options.url))

    getCookiesCache().then(function (cookies) {
        options.headers = { 'Cookie': cookies };

        request(options, function (error, response, body) {
            if (error) {
                console.error(error.message)
            } else {
                if (response.statusCode == 401) {
                    //Invalid Session
                    slConnect().then(function () {
                        serviceLayerRequest(options, callback)
                    }).catch(function (error, response) {
                        callback(error, response)
                    })
                    console.log("Request response with status: " + response.statusCode +
                        "\nRequest headers: " + JSON.stringify(response.headers))
                }
            }
            callback(error, response, body);
        });
    })
        .catch(function () {
            slConnect().then(function () {
                serviceLayerRequest(options, callback)
            }).catch(function (error, response) {
                callback(error, response)
            })
        })
}

let slConnect = function () {
    return new Promise(function (resolve, reject) {
        var uri = SLServer + "/Login"
        var resp = {}

        //B1 Login Credentials
        var data = {
            UserName: process.env.ERP_USER,
            Password: process.env.ERP_PASSWORD,
            CompanyDB: process.env.ERP_TENANT
        };

        //Set HTTP Request Options
        options = { uri: uri, body: JSON.stringify(data), timeout: 10000 }
        console.log("Connecting to SL on " + uri);

        //Make Request
        request.post(options, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                console.log("Connected to SL Succeeded!")
                body = JSON.parse(body)
                setCookiesCache(response.headers['set-cookie'], function () {
                    setSLSessionTimeout(body.SessionTimeout)
                    resolve();
                });

            } else {
                console.error("Connection to Service Layer failed. \n" + error)
                reject(error, response);
            }
        });

    })

}

function GetBusinessPartners(query, callback) {
    var options = {}
    var select = "$select=CardCode,CardName,CardType,CurrentAccountBalance"
    options.url = SLServer + "/BusinessPartners?"+select
    options.method = "GET"

    serviceLayerRequest(options, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            callback(null, JSON.parse(body));
        } else {
            callback(error);
        }
});
}

function PostBusinessPartners(query, body, callback) {

    
}

let getCookiesCache = function () {
    return new Promise(function (resolve, reject) {

        cache.hget(hash_Timeout, timout_exp, function (error, expire) {
            if (moment().isAfter(expire)) {
                //SessionID cached is expired or Doesn't Exist
                console.log("Cached SL Session ID Expired")
                reject()
            } else {
                cache.lrange(hash_Session, 0, -1, function (err, cookies) {
                    if (cookies.length > 0) {
                        console.log("Cached SL Session Retrieved")
                        resolve(cookies)
                    } else {
                        console.log("Cached SL not found")
                        reject();
                    }
                });
            }
        })
    })
}

function setCookiesCache(cookies, callback) {
    // Dump Previous SL Session ID Cache and creates a new one
    cache.hdel(hash_Session, function () {
        cache.rpush(hash_Session, cookies, function () {
            console.log("Storing SL Session ID in cache")
            callback();
        });
    })
}

function setSLSessionTimeout(timeout) {
    //Store the Session Timeout
    cache.hset(hash_Timeout, hash_Timeout, timeout)

    //Calculates and store when session will be expired
    var expire = moment(moment.now()).add(timeout, 'minutes')
    cache.hset(hash_Timeout, timout_exp, expire.format())

}

function updateSLSessionTimeout() {
    //Calculates and store when session will be expired
    console.log("Updating SL Session Expiration date in cache")
    cache.hget(hash_Timeout, hash_Timeout, function (error, reply) {
        if (error) {
            console.error("Can't Update Session Timeout in cache " + error)
        } else {
            var expire = moment(moment.now()).add(reply, 'minutes')
            cache.hset(hash_Timeout, timout_exp, expire.format())
        }
    })
}

// //First Thing, coonect to SL and store a SessionID
// if (!process.env.APIHUB) {
//     sl.Connect(function (error, resp) {
//       if (error) {
//         console.error("Can't Connect to Service Layer");
//         console.error(error);
//         return; // Abort Execution
//       } else {
//         slOptions.headers["Cookie"] = resp.cookie;
//       }
//     });
//   } else {
//     slOptions.headers["demoDB"] = process.env.B1_COMP_ENV
//     slOptions.headers["APIKey"] = process.env.APIKey
//   }
  