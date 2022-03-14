let devURL = 'http://localhost:8080';
let prodURL = 'https://paws-furever.wl.r.appspot.com';
let signInPath = '/tokenSignIn';

isDev = false;
let appURL = isDev ? devURL : prodURL;
let callbackURL = appURL + signInPath;
let id_token;

function onSignIn(googleUser) {
    id_token = googleUser.getAuthResponse().id_token;

    // authenticate at server
    var xhr = new XMLHttpRequest();
    xhr.open('POST', callbackURL);
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.onload = function () {
        console.log('Signed in as: ' + xhr.responseText);
        // adapted from https://stackoverflow.com/questions/6985507/one-time-page-refresh-after-first-page-load
        if (!window.location.hash) {
            window.location = window.location + '#logged_in';
            window.location.reload();
        }

    };
    xhr.send('idtoken=' + id_token);
}

function signOut() {
    var auth2 = gapi.auth2.getAuthInstance();
    auth2.signOut().then(function () {
        // send a signed out message to app.js here?
        var xhr = new XMLHttpRequest();
        xhr.open('POST', appURL + '/logout');
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        xhr.onload = function () {
            console.log('User signed out.');
            let responseRoute =xhr.responseText;
            // adapted from https://stackoverflow.com/questions/1397329/how-to-remove-the-hash-from-window-location-url-with-javascript-without-page-r/5298684#5298684
            if (responseRoute == '/add'){
                history.pushState("", document.title, window.location.pathname
                + window.location.search);
            }


            // adapted from https://stackoverflow.com/questions/6985507/one-time-page-refresh-after-first-page-load
            if (!window.location.hash) {
                window.location = window.location + '#admin_logged_out';
                window.location.reload();
            }
        };
        xhr.send('logOutLocation=' + window.location);
    });
}

function patchProfile(id){
    const patchForm = document.getElementById("updatePet");
    const patchURL = "/pets/" + id;
    const profileURL = "/petProfile?petId=" + id;

    patchForm.addEventListener("submit", (e) => {

        e.preventDefault();
        const req = new XMLHttpRequest();
        req.open("PATCH", patchURL);
        req.onload = function () {
            window.location.replace(profileURL)
        }

        req.send(new FormData(patchForm)); 
    });
    // adapted from https://www.youtube.com/watch?v=I_fVO_NzT2g
}

function deleteProfile(id){
    var deleteURL = "/pets/" + id;

    const req = new XMLHttpRequest();
    req.open("DELETE", deleteURL, true);
    req.onload = function () {
        window.location.replace('/')
    }

    req.send(null);
    // adapted from https://www.youtube.com/watch?v=I_fVO_NzT2g
}

function updateEmailPref(){
    const getEmailPrefValue = document.getElementById('emailPrefSelect').value;
    const getUID = document.getElementById('userid').value;
    let patchURL = "/users/" + getUID;
    let patchBody = "getEmail=" + getEmailPrefValue;

    const req = new XMLHttpRequest();
    req.open("PATCH", patchURL);
    req.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded')
    req.onload = function () {
        window.location.replace('/')
    }
    req.send(patchBody);
    // adapted from https://www.youtube.com/watch?v=I_fVO_NzT2g
    // adapted https://stackoverflow.com/questions/9713058/send-post-data-using-xmlhttprequest
}