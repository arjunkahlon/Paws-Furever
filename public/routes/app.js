const express = require('express');
const https = require('https');
const router = express.Router();
const FormData = require('form-data');
const fileUpload = require('express-fileupload');
const session = require('express-session');

const ds = require('../datastore.js');
const auth = require('../auth.js');
const { request } = require('express');
const KIND_USERS = ds.USERS;
const KIND_PETS = ds.PETS;
const KIND_REQUESTS = ds.REQUESTS;

router.use(fileUpload());
router.use(express.json());
router.use(express.urlencoded({ extended: false }));
router.use(session({
    secret: 'this is a secret',
    saveUninitialized: true,
    resave: false,
    cookie: { secure: 'auto' }
}));

/*-- Prod/Dev Env Settings --*/
const useDevEnv = false; // true for dev environment, false for production

const productionOptions = new URL('https://paws-furever.wl.r.appspot.com/');
appURL = productionOptions;
protocol = https;

if (useDevEnv) {
    const http = require('http');
    const devOptions = new URL('http://localhost:8080')
    appURL = devOptions;
    protocol = http;
}

/* --------------------Functions-------------------- */

function createUser(payload) {
    let user = {
        firstName: payload.given_name,
        lastName: payload.family_name,
        name: payload.name,
        email: payload.email,
        id: payload.sub,
        isAdmin: true // initialize to true by default
    }
    return user;
}

async function isNewUser(user) {
    return await ds.getById(user.id, KIND_USERS) == undefined;
}

async function isAdmin(user) {
    let retrievedUser = await ds.getById(user.id, KIND_USERS);
    return retrievedUser.isAdmin;
}

async function createGallery(req, res, next, dbURL) {
    /** Retrieves paginated results from db and renders testHome page.  More results retrieves next results */
    let dbResponse = '';

    // Call db for paginated pet results
    const dbreq = protocol.get(dbURL, (dbres) => {
        dbres.on('data', (d) => {
            dbResponse += d;
        });
        dbres.on('end', async () => {
            let parsedResponse;
            try {
                parsedResponse = JSON.parse(dbResponse);
            } catch (error) {
                console.log(dbResponse);
                next(error);
            }
            // format handlebars items
            let context = {}
            context = setUserContext(req, context); // sets booleans for logged in user
            let pets = parsedResponse.items;
            context.pets = pets;

            // Pull adopted pets from gallery pets
            // Should change to database call
            let adoptedPets = [];

            pets.forEach(pet => {
                if (pet.Availability == 'Adopted') {
                    adoptedPets.push(pet);
                }
            });

            context.adoptedPets = adoptedPets;

            // pass link to next page of results
            context.nextDbCursorURL = parsedResponse.next;

            // render page with items
            res.render('testHome', context);
        });

    }).on('error', (e) => {
        console.error(e);
    });

    // terminate db connection
    dbreq.end();
}

async function getPetbyId(req, res, dbURL) {
    let dbResponse = '';

    // Call db for paginated pet results
    const dbreq = protocol.get(dbURL, (dbres) => {
        dbres.on('data', (d) => {
            dbResponse += d;
        });
        dbres.on('end', () => {
            let pet = JSON.parse(dbResponse);
            // enable admin or user buttons
            let context = {};
            context = setUserContext(req, context);
            context.pet = pet

            res.render('profile', context);
        });

    }).on('error', (e) => {
        console.error(e);
    });

    // terminate db connection
    dbreq.end();
}

function callDatastore(path, method, data) {
    // set up server request
    const options = {
        path: path,
        method: method,
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length
        }
    };

    let serverReply = "";
    const dbreq = protocol.request(appURL, options, dbres => {
        // save server data as it is received
        dbres.on('data', d => {
            serverReply = serverReply + d;
        });
        dbres.on('end', async () => {
            //let entry = await JSON.parse(serverReply);
            //console.log(entry);
        });
    });
    dbreq.on('error', error => {
        console.error(error)
    });
    // send data to server
    dbreq.write(data);
    // end server connection
    dbreq.end();
}

async function getAllFromDatastore(KIND) {
    let entities = await ds.getAllItems(KIND);
    return entities;
}

function updateDatastoreItem(entityId, KIND, updates) {
    // stringify update data
    let data = JSON.stringify(updates);

    // determine correct api end point
    let path = '';
    if (KIND == KIND_PETS) {
        path = `/pets/${entityId}`;
    } else if (KIND == KIND_USERS) {
        path = `/users/${entityId}`;
    } else {
        console.log('Invalid KIND passed to updateDatastoreItem');
        return;
    }

    // call the database api
    callDatastore(path, 'PATCH', data);
}

function postDatastoreItem(KIND, item) {
    // stringify update data
    let data = JSON.stringify(item);

    // determine correct api end point
    let path = '';
    if (KIND == KIND_PETS) {
        path = `/pets`;
    } else if (KIND == KIND_USERS) {
        path = `/users`;
    } else if (KIND == KIND_REQUESTS) {
        path = `/requests`;
    } else {
        console.log('Invalid KIND passed to postDatastoreItem');
        return;
    }

    // call the database api
    callDatastore(path, 'POST', data);
}

function saveAdoptionRequest(userId, petId) {
    // post a request
    let adoptionRequest = {
        userId: userId,
        petId: petId,
        datetime: new Date().toISOString
    }

    postDatastoreItem(KIND_REQUESTS, adoptionRequest);
}

function setUserContext(req, context) {
    // Enable buttons for different user and admmin access
    if (req.session) {
        if (req.session.isAdmin) {
            // enable admin buttons if admin is logged in
            context.isAdmin = req.session.isAdmin;
        } else {
            // enable user buttons if user is logged in
            context.isUser = req.session.isUser;
        }

        if (req.session.showUserView) {
            context.isAdmin = false;
            context.isUser = true;
            context.showUserView = true;
        }
    }

    return context;
}

// GET pet by ID and render updateProfile page
async function updatePetbyId(clientResponse, dbURL) {
    let dbResponse = '';

    // Call db for paginated pet results
    const req = protocol.get(dbURL, (res) => {
        res.on('data', (d) => {
            dbResponse += d;
        });
        res.on('end', () => {
            let parsedResponse = JSON.parse(dbResponse);
            clientResponse.render('updateProfile', parsedResponse);
        });

    }).on('error', (e) => {
        console.error(e);
    });

    // terminate db connection
    req.end();
}

function toggleView(req){
    if (req.session.isAdmin && req.query.showUserView == 1) {
        req.session.showUserView = true;    
    } else if (req.query.showUserView == 2) {
        req.session.showUserView = false;
    }
}

/* --------------------Routes-------------------- */
// Renders test form for posting pet profiles
router.get('/add', (req, res) => {
    if (req.session.isAdmin) {
        res.render('postForm');
    } else {
        res.status(404).render('404');
    }
});

router.get('/adopt', (req, res) => {
    // Store query params in object
    let status = req.query.status;
    let pet = {
        id: req.query.petId,
        name: req.query.petName,
        image: req.query.image,
        status: status,
        statusAvailable: status == 'Available',
        statusPending: status == 'Pending',
        statusUnavailable: status != 'Available' && status != 'Pending'
    }


    // update pet's status
    if (pet.statusAvailable) {
        let updates = {
            Availability: 'Pending'
        }
        updateDatastoreItem(pet.id, KIND_PETS, updates);

        // save adoption request 
        let userId = req.session.userId;
        saveAdoptionRequest(userId, pet.id);
    }

    // Create fields for handlebars
    let context = {
        user: req.session.userName,
        pet: pet
    }
    context = setUserContext(req, context); // sets booleans for logged in user
    res.render('adoptMe', context);
});

// Displays next results of gallery list in home page.
router.get('/next', async (req, res, next) => {
    createGallery(req, res, next, req.query.nextDbCursorURL);
});

// Displays individual pet profile page
router.get('/petProfile', async (req, res) => {
    let dbURL = appURL + 'pets/' + req.query.petId;
    toggleView(req);
    getPetbyId(req, res, dbURL);
});

// Renders search form for searching pet profiles
router.get('/search', (req, res) => {
    res.render('searchForm');
});

// Update pet profile form display
router.get('/updatePetProfile', async (req, res) => {
    let dbURL = appURL + 'pets/' + req.query.petId;
    updatePetbyId(res, dbURL);
});

// User profile page
router.get('/userProfile', async (req, res) => {
    let user = await ds.getById(req.session.userId, KIND_USERS);
    res.render('userProfile', user)
});

// Renders test form for posting pet profiles
router.get('/viewRequests', async (req, res, next) => {
    if (req.session.isAdmin) {
        let requests = await getAllFromDatastore(KIND_REQUESTS);
        let context = {
            pendingRequests: requests.items
        };
        res.render('adoptionRequests', context);
    } else {
        res.status(404).render('404');
    }
});

// Home route
router.get('/', async (req, res, next) => {
    let dbURL = appURL + 'pets';
    toggleView(req);

    createGallery(req, res, next, dbURL);  // delegates render responsibility to async db call
});

// Called when a signed in user clicks logout menu choice
// Destroys session and redirects if needed
router.post('/logout', (req, res) => {
    let logOutLocationSource = req.body.logOutLocation;

    req.session.destroy();
    // redirect logged out user if coming from unauthorized location
    if (logOutLocationSource.includes('add')) {
        res.send('/add');
    } else {
        res.send('/');
    }
});

// Callback route for google sign in button
// Creates users in db and session for app
router.post('/tokenSignIn', async (req, res) => {
    // verify front end token with google auth library
    let jwt = req.body.idtoken;
    let payload = await auth.verify(jwt);
    let user = createUser(payload);

    // check if user already exists in database
    if (await isNewUser(user)) {
        // create ds entity for user
        ds.postUser(user);
    }

    // identify admin status
    let admin = await isAdmin(user);
    req.session.isAdmin = admin;
    req.session.userId = user.id;
    req.session.userName = user.name;
    req.session.userEmail = user.email;

    // set user session if not admin
    if (!admin) {
        req.session.isUser = true;
    }

    res.send(user.name);
});

// Receives add new pet form data, sends to datastore, renders result
router.post('/', (req, res) => {

    if (req.header('Content-Type').includes('application/json')) {
        let newPet = req.body;
        newPet.DateAdded = date;

        // store form data
        let data = JSON.stringify(newPet);

        // set up server request
        const options = {
            path: '/pets',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        };

        let serverReply = "";
        const dbreq = protocol.request(appURL, options, dbres => {
            // save server data as it is received
            dbres.on('data', d => {
                serverReply = serverReply + d;
            });
            dbres.on('end', () => {
                let postedPet = JSON.parse(serverReply);
                // Render server response on client side
                let context = postedPet;
                context = setUserContext(req, context); // sets booleans for logged in user
                res.render('animalPosted', context);
            });
        });

        dbreq.on('error', error => {
            console.error(error)
        });

        // send data to server
        dbreq.write(data);
        // end server connection
        dbreq.end()
    }
    else {
        const form = new FormData();

        for (prop in req.body) {
            form.append(prop, req.body[prop]);
        }

        if (req.files) {
            if (req.files.Picture1_URL_Primary) {
                const picture1 = req.files.Picture1_URL_Primary;
                // limit file name length to 50 chars
                const picture1Name = `${Date.now()}_${picture1.name.substr(picture1.name.length - 36, 36)}`;
                form.append('Picture1_URL_Primary', picture1.data, { filename: `${picture1Name}` });
            }

            if (req.files.Picture2_URL) {
                const picture2 = req.files.Picture2_URL;
                // limit file name length to 50 chars
                const picture2Name = `${Date.now()}_${picture2.name.substr(picture2.name.length - 36, 36)}`;
                form.append('Picture2_URL', picture2.data, { filename: `${picture2Name}` });
            }

            if (req.files.Picture3_URL) {
                const picture3 = req.files.Picture3_URL;
                // limit file name length to 50 chars
                const picture3Name = `${Date.now()}_${picture3.name.substr(picture3.name.length - 36, 36)}`;
                form.append('Picture3_URL', picture3.data, { filename: `${picture3Name}` });
            }

        }

        form.submit(`${appURL.protocol}//${appURL.host}/pets`, function (err, response) {
            if (err) {
                console.error(err);
                // res to return error
                res.status(500).json({ message: 'Encountered error when uploading file!' });
            } else {
                let responseBody = '';
                response.on('data', chunk => {
                    responseBody += chunk;
                });
                response.on('end', _ => {
                    let postedPet = JSON.parse(responseBody);
                    let context = postedPet;
                    res.render('animalPosted', context);
                });
            }
        });
    }
});


/* --------------------Error Handlers-------------------- */

router.use((req, res, next) => {
    res.status(404).render('404');
});

router.use((err, req, res, next) => {
    console.error(err.stack);
    res.sendStatus(500);
});


/* --------------------Exports-------------------- */

module.exports = router;