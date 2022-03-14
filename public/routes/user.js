const express = require('express');
const router = express.Router();
const ds = require('../datastore');
const KIND = ds.USERS;

const requiredUserAttributes = ['getEmail'];
router.use(express.json());
router.use(express.urlencoded({ extended: false }));

/* --------------------Functions-------------------- */
const f = require('../functions.js');
let getAllAttributesPassed = f.getAllAttributesPassed;

function sendError(res, status) {
    /** Sends error response. */
    let errMessage = { Error: "Error" };
    if (status == 404) {
        errMessage = { Error: 'No user with this id exists' };
    } else if (status == 400) {
        errMessage = { Error: 'Invalid request parameters' }
    }
    res.status(status).send(errMessage);
}

/* --------------------Routes-------------------- */
// Get a user from datastore
router.get('/:id', async (req, res) => {
    let id = req.params.id;

    // Retrieve entity from datastore
    let entity = await ds.getById(id, KIND);
    if (entity == undefined) {
        sendError(res, 404);
    } else {
        res.status(200).json(entity);
    }
});

// Partially edit an entity (values not passed are retained in updated entity)
router.patch('/:id', async (req, res) => {
    let attributes = getAllAttributesPassed(req);

    let id = req.params.id;
    let entity = await ds.getById(id, KIND);
    if (entity == undefined) {
        sendError(res, 404);
    } else {
        // Update new values in entity
        for (const [key, value] of Object.entries(attributes)) {
            entity[key] = value;
        }
        // Send to datastore
        await ds.putDS(id, KIND, entity);

        // Retrieve updated entity to return in response
        let updatedEntity = await ds.getById(id, KIND);

        // Return updated object
        res.status(200).send(updatedEntity);
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


// Get all users
router.get('/', async (req, res) => {
    const entities = await ds.getItems(req, KIND);
    res.status(200).json(entities);
});

// Partially edit an entity (values not passed are retained in updated entity)
router.patch('/:id', async (req, res) => {
    let attributes = getAllAttributesPassed(req);
    let id = req.params.id;
    let entity = await ds.getById(id, KIND);
    if (entity == undefined) {
        sendError(res, 404);
    } else {

        // Update new values in entity
        for (const [key, value] of Object.entries(attributes)) {
            entity[key] = value;
        }

        // Send to datastore
        await ds.putDS(id, KIND, entity);

        // Retrieve updated entity to return in response
        let updatedEntity = await ds.getById(id, KIND);

        // Append self url
        updatedEntity.self = req.protocol + '://' + req.get('host') + req.originalUrl;
        res.status(200).json(updatedEntity);

    }
});

// Other users routes -- NOT ALLOWED
router.all('/', (req, res) => {
    res.status(405).set('Allow', 'GET').end();
});


/* --------------------Exports-------------------- */

module.exports = router;