const { Datastore } = require('@google-cloud/datastore');
const datastore = new Datastore();

const PETS = 'Pets';
const USERS = 'Users';
const REQUESTS = 'Requests';


/* --------------------Functions-------------------- */
const f = require('./functions.js');

async function appendId(item) {
    /* Returns the passed item with Datastore id value as an attribute */
    if (item[Datastore.KEY].id == undefined) {
        item.id = item[Datastore.KEY].name;
    } else {
        item.id = item[Datastore.KEY].id;
    }
    return item;
}

async function getItems(req, kind) {
    /* Returns results object containing count of items, items, and next. */
    let countQ = datastore.createQuery(kind);
    if(req.query.type){
        countQ = countQ.filter('Type', '=', req.query.type);
    }
    if(req.query.species){
        countQ = countQ.filter('Species', '=', req.query.species);
    }

    if(req.query.filters){
        let filters = req.query.filters.split('|');
        filters.forEach(filter=>{
            let [filterName, filterValue] = filter.split(':');
            countQ = countQ.filter(filterName, '=', filterValue);
        });
    }

    let allEntities = await datastore.runQuery(countQ);
    let count = allEntities[0].length;

    let limitNumber = req.query.limit ?? 9;
    let q = datastore.createQuery(kind).limit(limitNumber);
    if(req.query.type){
        q = q.filter('Type', '=', req.query.type);
    }
    if(req.query.species){
        q = q.filter('Species', '=', req.query.species);
    }
    if(req.query.filters){
        let filters = req.query.filters.split('|');
        filters.forEach(filter=>{
            let [filterName, filterValue] = filter.split(':');
            q = q.filter(filterName, '=', filterValue);
        });
    }


    const results = {};
    if (Object.keys(req.query).includes('cursor')) {
        q = q.start(req.query.cursor);
    }
    const entities = await datastore.runQuery(q);
    results.count = count;
    results.items = entities[0];
    results.items.forEach(item => {
        item = appendId(item);
    });

    if (entities[1].moreResults !== Datastore.NO_MORE_RESULTS) {
        results.next = req.protocol + '://' + req.get('host') + req.baseUrl + '?cursor=' + entities[1].endCursor;
        
        if (req.query.type){
            results.next = results.next + `&type=${req.query.type}`;
        }
        if (req.query.species){
            results.next = results.next + `&species=${req.query.species}`;
        }
    }
    results.cursor = entities[1].endCursor;
    return results;
}

async function getAllItems(kind) {
    /* Returns all items of a kind. */
   
    let q = datastore.createQuery(kind);
    const results = {};
    const entities = await datastore.runQuery(q);
    results.items = entities[0];
    results.items.forEach(item => {
        item = appendId(item);
    });
    return results;
}

async function postDS(item, kind) {
    /* Posts an item to datastore */
    var key = datastore.key(kind);
    await datastore.save({ 'key': key, 'data': item });
    return key;
}

async function datadump(body, kind) {
    let entities = [];
    body.forEach(entry => {
        let key = datastore.key(kind);
        let item = {
            key: key,
            data: entry
        }
        entities.push(item);

    });
    return datastore.save(entities);
}

async function postUser(user) {
    /* Posts a user to the datastore */
    const key = datastore.key([USERS, user.id]);
    const entity = {
        key: key,
        data: user
    };
    return datastore.save(entity);
}

async function makeKey(id, kind) {
    /* Returns a datastore key */
    if (kind == USERS) {
        return datastore.key([kind, id]);
    } else {
        return datastore.key([kind, parseInt(id, 10)]);
    }
}

async function getById(id, kind) {
    /* Returns the item from the datastore that matches the passed id and kind */
    const key = await makeKey(id, kind);
    const item = await getByKey(key);
    return item;
}

async function getByKey(key) {
    /* Returns the item from the datastore that matches the passed key */
    const entity = await datastore.get(key);
    if (entity[0] === undefined) {
        return undefined;
    }
    const item = await appendId(entity[0]);
    return item;
}

async function putDS(id, kind, item) {
    /* Updates the item in the datastore that matches the passed id and kind with the item's values */
    const key = await makeKey(id, kind);
    return datastore.save({ 'key': key, 'data': item });
}

async function deleteDS(key) {
    /* Deletes an item from the datastore that matches the passed key */
    await datastore.delete(key);
}

async function getFilterEntries(req, kind){
    let filterNames = req.query.filterNames.split('|');
    let filterEntries = {};
    for (filterName of filterNames){
        let filterQ = datastore.createQuery(kind).groupBy(filterName);

        if (req.query.species){
            filterQ = filterQ.filter('Species', '=', req.query.species);
        }

        if (req.query.type){
            filterQ = filterQ.filter('Type', '=', req.query.type);
        }
        
        let filterQRes = await datastore.runQuery(filterQ);
        let filterValues = [];
        filterQRes[0].forEach(filterEntry=>{
            filterValues.push(filterEntry[filterName]);
        });
        
        filterEntries[filterName] = filterValues;
    }

    return filterEntries;
}


/* --------------------Exports-------------------- */

module.exports = {
    Datastore: Datastore,
    datastore: datastore,
    PETS: PETS,
    USERS: USERS,
    REQUESTS: REQUESTS,
    fromDatastore: appendId,
    getItems: getItems,
    getAllItems: getAllItems,
    postDS: postDS,
    datadump: datadump,
    postUser: postUser,
    getByKey: getByKey,
    makeKey: makeKey,
    getById: getById,
    putDS: putDS,
    deleteDS: deleteDS,
    getFilterEntries: getFilterEntries,
}


/* --------------------Resources-------------------- */

// https://stackoverflow.com/questions/8595509/how-do-you-share-constants-in-nodejs-modules