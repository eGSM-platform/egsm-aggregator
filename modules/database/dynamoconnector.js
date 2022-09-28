// Load the AWS SDK for Node.js
var AWS = require('aws-sdk');
var LOG = require('../auxiliary/LogManager');

module.id = 'DDB'
SUPPRESS_NO_CONFIG_WARNING = 1

const accessKeyId = 'fakeMyKeyId';
const secretAccessKey = 'fakeSecretAccessKey';
// Create the DynamoDB service object
// Set the region 
AWS.config.update({
    region: "local",
    endpoint: "http://localhost:8000",
    accessKeyId,
    secretAccessKey,
});
var DDB = new AWS.DynamoDB({ apiVersion: '2012-08-10' });

//Writes one item into a table, attributes arguments
//should be a list containing {name, data, type} elements
function writeItem(tablename, pk, sk, attr) {
    if (!sk) {
        var sk = { value: '' }
    }
    LOG.logWorker('DEBUG', `DDB writing: [${tablename}] ->[${pk.value}]:[${sk.value} ]`, module.id)
    var item = {}
    item[pk.name] = { 'S': pk.value }
    if (sk && sk.value != '') {
        item[sk.name] = { 'S': sk.value }
    }
    for (var i in attr) {
        //If the type is specified
        if (attr[i].type) {
            var buff = {}
            buff[attr[i].type] = attr[i].value
            item[attr[i].name] = buff
        }
        //Otherwise assuming string
        else {
            item[attr[i].name] = { 'S': attr[i].value }
        }
    }
    var params = {
        TableName: tablename,
        Item: item
    }

    // Call DynamoDB to add the item to the table
    return new Promise((resolve, reject) => {
        DDB.putItem(params, function (err, data) {
            if (err) {
                LOG.logWorker('ERROR', `DDB writing to [${tablename}] ->[${pk.value}]:[${sk.value}] was not successfull`, module.id)
                reject(err)
            } else {
                LOG.logWorker('DEBUG', `DDB writing to [${tablename}] ->[${pk.value}]:[${sk.value}] finished`, module.id)
                resolve(data)
            }
        })
    });
}

async function readItem(tablename, pk, sk, requestedfields) {
    if (!sk) {
        var sk = { value: '' }
    }
    LOG.logWorker('DEBUG', `DDB reading: [${tablename}] ->[${pk.value}]:[${sk.value}]`, module.id)
    var key = {}
    key[pk.name] = { 'S': pk.value }
    if (sk && sk.value != '') {
        key[sk.name] = { 'S': sk.value }
    }
    var params = {
        TableName: tablename,
        Key: key
    };
    if (requestedfields) {
        params['ProjectionExpression'] = requestedfields
    }


    // Call DynamoDB to read the item from the table
    return new Promise((resolve, reject) => {
        DDB.getItem(params, function (err, data) {
            if (err) {
                LOG.logWorker('ERROR', `DDB reading: [${tablename}] ->[${pk.value}]:[${sk.value}] was not successful`, module.id)
                reject(err)
            } else {
                LOG.logWorker('DEBUG', `[${tablename}] ->[${pk.value}]:[${sk.value}] data retrieved`, module.id)
                resolve(data)
            }
        });
    });
}

async function updateItem(tablename, pk, sk, attr) {
    if (!sk) {
        var sk = { value: '' }
    }
    var key = {}
    key[pk.name] = { 'S': pk.value }
    if (sk && sk.value != '') {
        key[sk.name] = { 'S': sk.value }
    }
    var expressionattributenames = {}
    var expressionattributevalues = {}
    var updateexpression = 'SET '
    for (var i in attr) {
        if (i != 0) {
            updateexpression += ','
        }
        //If the type is specified
        expressionattributenames['#' + i.toString()] = attr[i].name
        if (attr[i].type) {
            var buff = {}
            buff[attr[i].type] = attr[i].value
            expressionattributevalues[':' + i.toString()] = buff
        }
        //Otherwise assuming string
        else {
            expressionattributevalues[':' + i.toString()] = { 'S': attr[i].value }
        }
        updateexpression += '#' + i.toString() + ' = ' + ':' + i.toString()
    }
    var params = {
        ExpressionAttributeNames: expressionattributenames,
        ExpressionAttributeValues: expressionattributevalues,
        Key: key,
        ReturnValues: "ALL_NEW",
        TableName: tablename,
        UpdateExpression: updateexpression//"SET #0 = :0"
    };
    return new Promise((resolve, reject) => {
        DDB.updateItem(params, function (err, data) {
            if (err) {
                reject(err)
            }
            else {
                resolve(data)
            }
        })
    })
}

async function initNestedList(tablename, pk, sk, listattribute) {
    if (!sk) {
        var sk = { value: '' }
    }
    var key = {}
    key[pk.name] = { 'S': pk.value }
    if (sk && sk.value != '') {
        key[sk.name] = { 'S': sk.value }
    }

    var updateexpression = `SET ${listattribute} = :newlist`
    var expressionattributevalues = { ":newlist": { L: [] } }

    var params = {
        ExpressionAttributeValues: expressionattributevalues,
        Key: key,
        ReturnValues: "ALL_NEW",
        TableName: tablename,
        UpdateExpression: updateexpression//"SET #0 = :0"
    };
    return new Promise((resolve, reject) => {
        DDB.updateItem(params, function (err, data) {
            if (err) { reject(err) }
            else {
                resolve(data)
            }
        })
    })
}

async function appendNestedListItem(tablename, pk, sk, listattribute, newelements, attr) {
    if (!sk) {
        var sk = { value: '' }
    }
    var key = {}
    key[pk.name] = { 'S': pk.value }
    if (sk && sk.value != '') {
        key[sk.name] = { 'S': sk.value }
    }
    var updateexpression = `SET ${listattribute} = list_append(${listattribute}, :newdata)`
    var expressionattributevalues = { ":newdata": { L: [] } }
    for (i in newelements) {
        var buff = {}
        buff[newelements[i].type] = newelements[i].value
        expressionattributevalues[':newdata']['L'].push(buff)
    }

    var params = {
        ExpressionAttributeValues: expressionattributevalues,
        Key: key,
        ReturnValues: "ALL_NEW",
        TableName: tablename,
        UpdateExpression: updateexpression//"SET #0 = :0"
    };
    return new Promise((resolve, reject) => {
        DDB.updateItem(params, function (err, data) {
            if (err) {
                reject(err)
            }
            else {
                resolve(data)
            }
        })
    })
}

function deleteItem(tablename, pk, sk, expressionattributevalues, conditionexpression) {
    if (!sk) {
        var sk = { value: '' }
    }
    var key = {}
    key[pk.name] = { 'S': pk.value }
    if (sk && sk.value != '') {
        key[sk.name] = { 'S': sk.value }
    }
    var params = {
        TableName: tablename,
        Key: key
    };
    if (expressionattributevalues) {
        params['ExpressionAttributeValues'] = expressionattributevalues
    }
    if (conditionexpression) {
        params['ConditionExpression'] = conditionexpression
    }

    // Call DynamoDB to delete the item from the table
    return new Promise((resolve, reject) => {
        DDB.deleteItem(params, function (err, data) {
            if (err) {
                reject(err)
            } else {
                resolve(data)
            }
        })
    })
}

async function query(tablename, keyconditionexpression, expressionattributevalues, filterexpression, projectionexpression) {

    let result, ExclusiveStartKey;
    var accumulated = []
    do {
        result = await DDB.query({
            TableName: tablename,
            ExclusiveStartKey,
            Limit: 1,
            KeyConditionExpression: keyconditionexpression,
            ExpressionAttributeValues: expressionattributevalues,
            FilterExpression: filterexpression,
            ProjectionExpression: projectionexpression
        }).promise();

        ExclusiveStartKey = result.LastEvaluatedKey;
        accumulated = [...accumulated, ...result.Items];
    } while (result.LastEvaluatedKey);

    return accumulated;
}
module.exports = {
    writeItem: writeItem,
    readItem: readItem,
    updateItem: updateItem,
    initNestedList: initNestedList,
    appendNestedListItem: appendNestedListItem,
    deleteItem: deleteItem,
    query: query

}