//Biz module is your agnostic layer. It has no knowledge of ERP specific models.

const b1 = require("./erp/b1")
const byd = require("./erp/byd")
const erp = eval(process.env.ERP);

module.exports = {
    GetBusinessPartners: function (query, response) {
        return (GetBusinessPartners(query, response));
    },
    PostBusinessPartners: function (query, body, response) {
        return (PostBusinessPartners(query, body, response));
    },
    
    SetCache: function (inCache) {
        erp.SetCache(inCache)
    }
}

function GetBusinessPartners(query, callback) {
    erp.GetBusinessPartners(query, function (error, bps) {
        if (error) {
            bps = {};
            bps.error = error;
        }
        var output = bps;

        // if (bps.hasOwnProperty("odata.nextLink")) {
        //     output[origin]["odata.nextLink"] = items["odata.nextLink"];
        // }

       // resolve(normalize.Items(output))

       callback(null, output)
    })
}

function PostBusinessPartners(query, body, callback) {

    
}


function formatResponse(body) {

    if (body.hasOwnProperty("odata.metadata")) {
        delete body["odata.metadata"];
    }

    if (body.hasOwnProperty("odata.nextLink")) {
        var nextLink = body["odata.nextLink"]
        nextLink = nextLink.substr(nextLink.indexOf("?")+1,nextLink.lenght);
        body["odata.nextLink"] = nextLink
    }
    return body;
}