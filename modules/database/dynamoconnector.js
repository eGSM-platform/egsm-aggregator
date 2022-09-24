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

function initArtifactTables() {
    //ARTIFACT_EVENT
    var params = {
        AttributeDefinitions: [
            {
                AttributeName: 'ARTIFACT_NAME',
                AttributeType: 'S'
            },
            {
                AttributeName: 'EVENT_ID',
                AttributeType: 'S'
            }
        ],
        KeySchema: [
            {
                AttributeName: 'ARTIFACT_NAME',
                KeyType: 'HASH'
            },
            {
                AttributeName: 'EVENT_ID',
                KeyType: 'RANGE'
            }
        ],
        ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5
        },
        TableName: 'ARTIFACT_EVENT',
        StreamSpecification: {
            StreamEnabled: false
        }
    };

    // Call DynamoDB to create the table
    DDB.createTable(params, function (err, data) {
        if (err) {
            console.log("Error", err);
        } else {
            console.log("Table Created");
        }
    });

    //ARTIFACT_USAGE
    var params1 = {
        AttributeDefinitions: [
            {
                AttributeName: 'ARTIFACT_NAME',
                AttributeType: 'S'
            },
            {
                AttributeName: 'CASE_ID',
                AttributeType: 'S'
            }
        ],
        KeySchema: [
            {
                AttributeName: 'ARTIFACT_NAME',
                KeyType: 'HASH'
            },
            {
                AttributeName: 'CASE_ID',
                KeyType: 'RANGE'
            }
        ],
        ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5
        },
        TableName: 'ARTIFACT_USAGE',
        StreamSpecification: {
            StreamEnabled: false
        }
    };

    // Call DynamoDB to create the table
    DDB.createTable(params1, function (err, data) {
        if (err) {
            console.log("Error", err);
        } else {
            console.log("Table Created");
        }
    });

    //ARTIFACT_DEFINITION
    var params2 = {
        AttributeDefinitions: [
            {
                AttributeName: 'ARTIFACT_TYPE',
                AttributeType: 'S'
            },
            {
                AttributeName: 'ARTIFACT_ID',
                AttributeType: 'S'
            }
        ],
        KeySchema: [
            {
                AttributeName: 'ARTIFACT_TYPE',
                KeyType: 'HASH'
            },
            {
                AttributeName: 'ARTIFACT_ID',
                KeyType: 'RANGE'
            }
        ],
        ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5
        },
        TableName: 'ARTIFACT_DEFINITION',
        StreamSpecification: {
            StreamEnabled: false
        }
    };

    // Call DynamoDB to create the table
    DDB.createTable(params2, function (err, data) {
        if (err) {
            console.log("Error", err);
        } else {
            console.log("Table Created");
        }
    });
}
function databaseInit() {
    //Artifact Definition Table
    var params = {
        AttributeDefinitions: [
            {
                AttributeName: 'TYPE',
                AttributeType: 'S'
            },
            {
                AttributeName: 'ID',
                AttributeType: 'S'
            }/*,
            {
                AttributeName: 'STAKEHOLDERS',
                AttributeType: 'S'
            },
            {
                AttributeName: 'ATTACHED_TO',
                AttributeType: 'S'
            }*/
        ],
        KeySchema: [
            {
                AttributeName: 'TYPE',
                KeyType: 'HASH'
            },
            {
                AttributeName: 'ID',
                KeyType: 'RANGE'
            }
        ],
        ProvisionedThroughput: {
            ReadCapacityUnits: 1,
            WriteCapacityUnits: 1
        },
        TableName: 'ARTIFACT_DEFINITION',
        StreamSpecification: {
            StreamEnabled: false
        }
    };

    // Call DynamoDB to create the table
    DDB.createTable(params, function (err, data) {
        if (err) {
            console.log("Error", err);
        } else {
            console.log("Table Created");
        }
    });

    //Process Definition Table
    params = {
        AttributeDefinitions: [
            {
                AttributeName: 'TYPE',
                AttributeType: 'S'
            },
            {
                AttributeName: 'ID',
                AttributeType: 'S'
            }/*,
            {
                AttributeName: 'STAKEHOLDERS',
                AttributeType: 'S'
            },
            {
                AttributeName: 'GROUPS',
                AttributeType: 'S'
            },
            {
                AttributeName: 'STATUS',
                AttributeType: 'S'
            }*/
        ],
        KeySchema: [
            {
                AttributeName: 'TYPE',
                KeyType: 'HASH'
            },
            {
                AttributeName: 'ID',
                KeyType: 'RANGE'
            }
        ],
        ProvisionedThroughput: {
            ReadCapacityUnits: 1,
            WriteCapacityUnits: 1
        },
        TableName: 'PROCESS_DEFINITION',
        StreamSpecification: {
            StreamEnabled: false
        }
    };
    // Call DynamoDB to create the table
    DDB.createTable(params, function (err, data) {
        if (err) {
            console.log("Error", err);
        } else {
            console.log("Table Created");
        }
    });

    //Process Group Definition Table
    params = {
        AttributeDefinitions: [
            {
                AttributeName: 'NAME',
                AttributeType: 'S'
            }/*,
            {
                AttributeName: 'MEMBERS',
                AttributeType: 'S'
            }*/
        ],
        KeySchema: [
            {
                AttributeName: 'NAME',
                KeyType: 'HASH'
            }
        ],
        ProvisionedThroughput: {
            ReadCapacityUnits: 1,
            WriteCapacityUnits: 1
        },
        TableName: 'PROCESS_GROUP_DEFINITION',
        StreamSpecification: {
            StreamEnabled: false
        }
    };
    // Call DynamoDB to create the table
    DDB.createTable(params, function (err, data) {
        if (err) {
            console.log("Error", err);
        } else {
            console.log("Table Created");
        }
    });

    //Artifact Event Table
    params = {
        AttributeDefinitions: [
            {
                AttributeName: 'PROCESS_NAME',
                AttributeType: 'S'
            },
            {
                AttributeName: 'EVENT_ID',
                AttributeType: 'S'
            }/*,
            {
                AttributeName: 'ARTIFACT_TYPE',
                AttributeType: 'S'
            },
            {
                AttributeName: 'ARTIFACT_ID',
                AttributeType: 'S'
            },
            ,
            {
                AttributeName: 'STATE',
                AttributeType: 'S'
            }*/
        ],
        KeySchema: [
            {
                AttributeName: 'PROCESS_NAME',
                KeyType: 'HASH'
            },
            {
                AttributeName: 'EVENT_ID',
                KeyType: 'RANGE'
            }
        ],
        ProvisionedThroughput: {
            ReadCapacityUnits: 1,
            WriteCapacityUnits: 1
        },
        TableName: 'ARTIFACT_EVENT',
        StreamSpecification: {
            StreamEnabled: false
        }
    };
    // Call DynamoDB to create the table
    DDB.createTable(params, function (err, data) {
        if (err) {
            console.log("Error", err);
        } else {
            console.log("Table Created");
        }
    });

    //Stage Event Table
    params = {
        AttributeDefinitions: [
            {
                AttributeName: 'PROCESS_NAME',
                AttributeType: 'S'
            },
            {
                AttributeName: 'EVENT_ID',
                AttributeType: 'S'
            }/*,
            {
                AttributeName: 'STAGE_NAME',
                AttributeType: 'S'
            },
            {
                AttributeName: 'STAGE_DETAILS',
                AttributeType: 'S'
            }*/
        ],
        KeySchema: [
            {
                AttributeName: 'PROCESS_NAME',
                KeyType: 'HASH'
            },
            {
                AttributeName: 'EVENT_ID',
                KeyType: 'RANGE'
            }
        ],
        ProvisionedThroughput: {
            ReadCapacityUnits: 1,
            WriteCapacityUnits: 1
        },
        TableName: 'STAGE_EVENT',
        StreamSpecification: {
            StreamEnabled: false
        }
    };
    // Call DynamoDB to create the table
    DDB.createTable(params, function (err, data) {
        if (err) {
            console.log("Error", err);
        } else {
            console.log("Table Created",);
        }
    });

}

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
    return DDB.putItem(params, function (err, data) {
        if (err) {
            LOG.logWorker('ERROR', `DDB writing to [${tablename}] ->[${pk.value}]:[${sk.value}] was not successfull`, module.id)
            console.log("Error", err);
        } else {
            LOG.logWorker('DEBUG', `DDB writing to [${tablename}] ->[${pk.value}]:[${sk.value}] finished`, module.id)
        }
    }).promise();
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

function updateItem(tablename, pk, sk, attr) {
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
    DDB.updateItem(params, function (err, data) {
        if (err) console.log(err, err.stack); // an error occurred
        else console.log(data);           // successful response
    });
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
    return DDB.updateItem(params, function (err, data) {
        if (err) console.log(err, err.stack); // an error occurred
        else console.log(data);           // successful response
    }).promise()
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
    return DDB.updateItem(params, function (err, data) {
        if (err) console.log(err, err.stack); // an error occurred
        else console.log(data);           // successful response
    }).promise();
}

function deleteItem(tablename, pk, sk, conditionexpression) {
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
    if (conditionexpression) {
        params['ConditionExpression'] = conditionexpression
    }

    // Call DynamoDB to delete the item from the table
    DDB.deleteItem(params, function (err, data) {
        if (err) {
            console.log("Error", err);
        } else {
            console.log("Success", data);
        }
    });
}

//keyconditionexpression: 'id = :hashKey and createdAt > :rangeKey'
/*ExpressionAttributeValues: {
                ':hashKey': '123',
                ':rangeKey': 20150101
            },*/
async function query(tablename, keyconditionexpression, expressionattributevalues, filterexpression) {

    let result, ExclusiveStartKey;
    var accumulated = []
    do {
        result = await DDB.query({
            TableName: tablename,
            ExclusiveStartKey,
            Limit: 1,
            KeyConditionExpression: keyconditionexpression,
            ExpressionAttributeValues: expressionattributevalues,
            FilterExpression: filterexpression
        }).promise();

        ExclusiveStartKey = result.LastEvaluatedKey;
        accumulated = [...accumulated, ...result.Items];
    } while (result.Items.length && result.LastEvaluatedKey);

    return accumulated;
}

//writeNewProcessGroup('group001')
//addProcessToProcessGroup('group001', 'process002')
//removeProcessFromProcessGroup('group001', 'process001')
//writeNewArtifactDefinition('truck','asd111',['good company'])
//databaseInit()
/*readItem('ARTIFACT_EVENT', { name: 'PROCESS_NAME', value: 'process1' }, { name: 'EVENT_ID', value: '1' })
    .then(function (data) {
        console.log(data.Item)
    }).catch(err => { console.log('error:' + err) })
*/
//deleteItem('ARTIFACT_DEFINITION', { name: 'TYPE', value: 'truck', }, { name: 'ID', value: 'asd111', })
//registerEngine('process1')
//writeArtifactEvent('process1', 'truck', '0001', 'attached')
//writeArtifactEvent('process1', 'truck', '0001', 'detached')
/*var params = { 
    TableName : 'ARTIFACT_EVENT'
};


DDB.deleteTable(params, function(err, data) {
    if (err) {
        console.error("Unable to delete table. Error JSON:", JSON.stringify(err, null, 2));
    } else {
        console.log("Deleted table. Table description JSON:", JSON.stringify(data, null, 2));
    }
});*/



module.exports = {
    writeItem: writeItem,
    readItem: readItem,
    updateItem: updateItem,
    initNestedList:initNestedList,
    appendNestedListItem: appendNestedListItem,
    deleteItem: deleteItem,
    query: query

}
/*
readItem('ARTIFACT_EVENT', { name: 'ARTIFACT_NAME', value: 'truck/0001' }, { name: 'EVENT_ID', value: '2' }).then((data) => {
    console.log(data)
})*/
/*query().then((data) => {
    console.log(data)
})*/

var expressionattributevalues = {
    ':hashKey': { S: 'truck/0001' },
    //':rangeKey': { N: '1' },
    ':b': { N: '1' }
}
//query('ARTIFACT_EVENT', 'ARTIFACT_NAME = :hashKey', expressionattributevalues, 'ENTRY_PROCESSED = :b').then((data) => {
//    console.log('ok')
//})

//initArtifactTables()

//var pk = { name: 'ARTIFACT_TYPE', value: 'truck' }
//var sk = { name: 'ARTIFACT_ID', value: '0003' }
//updateNestedListItem('ARTIFACT_DEFINITION', pk, sk)