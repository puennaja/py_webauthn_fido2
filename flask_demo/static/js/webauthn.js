const SHOULD_MAKE_CREDENTIAL = 'SHOULD_MAKE_CREDENTIAL';
const DID_MAKE_CREDENTIAL = 'DID_MAKE_CREDENTIAL';
const MAKE_CREDENTIAL_ERROR = 'MAKE_CREDENTIAL_ERROR';
const SHOULD_GET_CREDENTIAL = 'SHOULD_GET_CREDENTIAL';
const DID_GET_CREDENTIAL = 'DID_GET_CREDENTIAL';
const GET_CREDENTIAL_ERROR = 'GET_CREDENTIAL_ERROR';

function b64enc(buf) {
    return base64js.fromByteArray(buf)
                   .replace(/\+/g, "-")
                   .replace(/\//g, "_")
                   .replace(/=/g, "");
}

function b64RawEnc(buf) {
    return base64js.fromByteArray(buf)
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function hexEncode(buf) {
    return Array.from(buf)
                .map(function(x) {
                    return ("0" + x.toString(16)).substr(-2);
				})
                .join("");
}

function registerNewCredential(newCredential) {
    let attObj = new Uint8Array(
        newCredential.response.attestationObject);
    let clientDataJSON = new Uint8Array(
        newCredential.response.clientDataJSON);
    let rawId = new Uint8Array(
        newCredential.rawId);
    $.post('/verify_credential_info', {
        id: newCredential.id,
        rawId: b64enc(rawId),
        type: newCredential.type,
        attObj: b64enc(attObj),
        clientData: b64enc(clientDataJSON),
    }).done(function(response){
        window.location = '/';
        console.log(response);
    });
}

function verifyAssertion(assertedCredential) {
    let authData = new Uint8Array(assertedCredential.response.authenticatorData);
    let clientDataJSON = new Uint8Array(assertedCredential.response.clientDataJSON);
    let rawId = new Uint8Array(assertedCredential.rawId);
    let sig = new Uint8Array(assertedCredential.response.signature);
    $.post('/verify_assertion', {
        id: assertedCredential.id,
        rawId: b64enc(rawId),
        type: assertedCredential.type,
        authData: b64RawEnc(authData),
        clientData: b64RawEnc(clientDataJSON),
        signature: hexEncode(sig),
    }).done(function(response){
        window.location = '/';
        console.log(response);
    });
}

/** Dispatches messages from parent */
const didReceiveMessage = ({data, origin}) => {
    const {type, body} = data;

    switch (type) {
        case DID_MAKE_CREDENTIAL:
            parentDidMakeCredential(body);
            break;
        case DID_GET_CREDENTIAL:
            parentDidGetCredential(body);
            break;
        default:
            break;
    }
}

/** Asks parent to create a credential */
const parentShouldMakeCredential = (options) => {
    const message = {
        type: SHOULD_MAKE_CREDENTIAL, 
        body: options
    }
    window.parent.postMessage(message, 'http://localhost:8080');
}

/** Callback executed after parent creates a credential */
const parentDidMakeCredential = (newCredentialInfo) => {
    registerNewCredential(newCredentialInfo);
}


/** Asks parent to get a credential */
const parentShouldGetCredential = assertionInfo => {
    const message = {
        type: SHOULD_GET_CREDENTIAL, 
        body: assertionInfo
    }
    window.parent.postMessage(message, 'http://localhost:8080');
}

/** Callback executed after parent gets a credential */
const parentDidGetCredential = assertedCredential => {
    verifyAssertion(assertedCredential);
}

$(document).ready(function() {
    // if (!PublicKeyCredential) { console.log("Browser not WebAuthn compatible."); }
    
    window.addEventListener('message', didReceiveMessage)
    
    $("#register").click(function(e) {
        e.preventDefault();
        var username = $('input[name="register_username"]').val();
        var displayName = $('input[name="register_display_name"]').val();
        $.post("/webauthn_begin_activate", {
            username: username,
            displayName: displayName
        }).done(function(makeCredentialOptions) {
            // Turn the challenge back into the accepted format
            makeCredentialOptions.challenge = Uint8Array.from(
                atob(makeCredentialOptions.challenge), c => c.charCodeAt(0));
            // Turn the user ID back into the accepted format
            makeCredentialOptions.user.id = Uint8Array.from(
                atob(makeCredentialOptions.user.id), c => c.charCodeAt(0));
            
            // Request parent to create a credential
            parentShouldMakeCredential(makeCredentialOptions)
        });
    });

    $("#login").click(function(e) {
        e.preventDefault();
        var username = $('input[name="login_username"]').val();
        $.post("/webauthn_begin_assertion", {
            username: username
        }).done(function(assertionOptions) {
            // Turn the challenge back into the accepted format
            assertionOptions.challenge = Uint8Array.from(
                atob(assertionOptions.challenge), c => c.charCodeAt(0));
            assertionOptions.allowCredentials.forEach(function(listItem) {
                var fixedId = listItem.id.replace(
                    /\_/g, "/").replace(/\-/g, "+");
                listItem.id = Uint8Array.from(
                    atob(fixedId), c => c.charCodeAt(0));
            });
    
            parentShouldGetCredential(assertionOptions);
        });
    });
});
