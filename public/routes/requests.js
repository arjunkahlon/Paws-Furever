const express = require('express');
const router = express.Router();
const ds = require('../datastore.js');

const KIND = ds.REQUESTS;

router.use(express.json());
router.use(express.urlencoded({ extended: false }));

/* --------------------Functions-------------------- */

const f = require('../functions.js');
let valuesAreDefined = f.valuesAreDefined;
let getAllAttributesPassed = f.getAllAttributesPassed;
let sendError = f.sendError;

/* --------------------Routes-------------------- */

// Add an entity to datastore
router.post('/', async (req, res) => {
    let item = req.body;

    // Validate required attributes exist
    if (!valuesAreDefined(item)) {
        sendError(res, 400);
    } else {
        // Get all attributes, including non-required
        let attributes = getAllAttributesPassed(req);

        // Create datastore key and post entity to datastore
        let key;
        try {
            key = await ds.postDS(attributes, KIND);
        } catch (error) {
            console.log('Problem posting to datastore');
            res.sendStatus(500);
        } 

        // Get entity from datastore to return
        let entity = await ds.getByKey(key);

        // Create a url to access entity directly
        entity.self = req.protocol + '://' + req.get('host') + req.originalUrl + '/' + entity.id;
        res.status(201).json(entity);
    }
});

// Get an entity from datastore
router.get('/:id', async (req, res) => {
    let id = req.params.id;

    // Retrieve entity from datastore
    let entity = await ds.getById(id, KIND);
    if (entity == undefined) {
        sendError(res, 404);
    } else {
        // append self url
        entity.self = req.protocol + '://' + req.get('host') + req.originalUrl;
        res.status(200).json(entity);
    }
});

// Get all entities from datastore of this kind
router.get('/', async (req, res) => {
    const entities = await ds.getItems(req, KIND);
    // add self url to each item returned
    entities.items.forEach(entity => {
        entity.self = req.protocol + '://' + req.get('host') + '/requests/' + entity.id;
    });
    res.status(200).json(entities);
});

// Delete an entity from datastore
router.delete('/:id', async (req, res) => {
    let id = req.params.id;
    let key = await ds.makeKey(id, KIND);
    let entity = await ds.getByKey(key);
    if (entity == undefined) {
        sendError(res, 404);
    } else {
        await ds.deleteDS(key);
        res.sendStatus(204).end();
    }
});

/* --------------------Exports-------------------- */

module.exports = router;
