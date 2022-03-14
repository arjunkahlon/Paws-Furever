/* --------------------Functions-------------------- */

function valuesAreDefined(item) {
    /* Returns true if each expected parameter has been passed in the req params and is defined*/
    result = true;
    Object.values(item).forEach(value => {
        if (value == undefined) {
            result = false;
        }
    });
    return result;
}

function getAllAttributesPassed(req) {
    /** Returns a json object from the form data in the request body */
    return JSON.parse(JSON.stringify(req.body));
}

function sendError(res, status) {
    /** Sends error response. */
    let errMessage = { Error: "Error" };
    if (status == 404) {
        errMessage = { Error: 'No pet with this id exists' };
    } else if (status == 400) {
        errMessage = { Error: 'Invalid request parameters' }
    }
    res.status(status).send(errMessage);
}

/* --------------------Exports-------------------- */

module.exports = {
    valuesAreDefined: valuesAreDefined,
    getAllAttributesPassed: getAllAttributesPassed,
    sendError: sendError
}