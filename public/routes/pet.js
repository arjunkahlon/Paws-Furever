const express = require('express');
const router = express.Router();
const ds = require('../datastore.js');
const cs = require('../cloudstorage.js');

const KIND = ds.PETS;
const requiredPetAttributes = ['Name', 'Type', 'Species', 'Location_City', 'Location_State', 'Availability'];
const fileUpload = require('express-fileupload');

router.use(fileUpload());
router.use(express.json());
router.use(express.urlencoded({ extended: false }));


/* --------------------Functions-------------------- */

const f = require('../functions.js');
let valuesAreDefined = f.valuesAreDefined;
let getAllAttributesPassed = f.getAllAttributesPassed;
let sendError = f.sendError;

function extractRequiredAttributeValues(body) {
    let item = {};
    for (const [key, value] of Object.entries(body)) {
        if (requiredPetAttributes.includes(key)) {
            item[key] = value;
        }
    }
    return item;
}

function logResults(result) {
    /** Logs the results of a data dump to datastore */
    console.log('Items added to datastore were created with these ids:');
    result[0].mutationResults.forEach(item => {
        console.log(item.key.path[0].id);
    });
}
/* --------------------Routes-------------------- */

// Add an entity to datastore
router.post('/', async (req, res) => {

    let item = extractRequiredAttributeValues(req.body);

    // Validate required attributes exist
    if (!valuesAreDefined(item)) {
        sendError(res, 400);
    } else {
        // Get all attributes, including non-required
        let attributes = getAllAttributesPassed(req);

        // Upload file to Cloud Storage and recieve public URL back
        let [picture1_URL_Primary, picture2_URL, picture3_URL] = await cs.postCS(req.files);
        attributes.Picture1_URL_Primary = picture1_URL_Primary || '';
        attributes.Picture2_URL = picture2_URL || '';
        attributes.Picture3_URL = picture3_URL || '';


        // Create datastore key and post entity to datastore
        let key = await ds.postDS(attributes, KIND);

        // Get entity from datastore to return
        let entity = await ds.getByKey(key);

        // Create a url to access entity directly
        entity.self = req.protocol + '://' + req.get('host') + req.originalUrl + '/' + entity.id;
        res.status(201).json(entity);
    }
});

// Add JSON entites to datastore in batch
router.post('/all', async (req, res) => {
    let result = await ds.datadump(req.body, KIND);
    logResults(result);
    res.status(201).send('SUCCESS!');
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
        entity.self = req.protocol + '://' + req.get('host') + '/pets/' + entity.id;
    });
    //get filter data if needed
    if (req.query.filterNames) {
        // const filterNames = req.query.filterNames.split('|');
        const filterEntries = await ds.getFilterEntries(req, KIND);
        entities.filterEntries = filterEntries;
    }
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

// Patch all -- NOT ALLOWED
router.patch('/', (req, res) => {
    res.status(405).set('Allow', 'GET, POST').end();
});

// Reset all attributes for a pet
router.put('/:id', async (req, res) => {
    let attributes = getAllAttributesPassed(req);
    let id = req.params.id;
    let entity = await ds.getById(id, KIND);
    if (entity == undefined) {
        sendError(res, 404);
    } else {

        // Removes all non-passed, non-required attributes
        console.log('Resetting the following values to default:');
        for (const key of Object.keys(entity)) {
            if (!requiredPetAttributes.includes(key)) {
                console.log(key);
                delete entity[key];
            }
        }

        // Removes all non-passed, non-required attributes
        console.log('Resetting the following values to default:');
        for (const key of Object.keys(entity)) {
            if (!requiredPetAttributes.includes(key)) {
                console.log(key);
                delete entity[key];
            }
        }

        // Edits passed attributes
        for (const [key, value] of Object.entries(attributes)) {
            entity[key] = value;
        }
    }
});

// Put all -- NOT ALLOWED
router.put('/', (req, res) => {
    res.status(405).set('Allow', 'GET, POST').end();
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

// Delete all -- NOT ALLOWED
router.delete('/', (req, res) => {
    res.status(405).set('Allow', 'GET, POST').end();
});

/* --------------------Exports-------------------- */

module.exports = router;


/* --------------------Resources-------------------- */

// https://www.oreilly.com/library/view/full-stack-react-projects/9781788835534/e75534d3-6d96-4628-8b7f-b84c5ddb8f0d.xhtml
// https://stackoverflow.com/questions/40970329/how-to-handle-errors-with-express-jwt
// https://github.com/auth0/express-jwt/issues/189 
// https://flaviocopes.com/how-to-check-value-is-number-javascript/