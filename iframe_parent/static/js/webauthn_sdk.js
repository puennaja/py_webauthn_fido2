const SHOULD_MAKE_CREDENTIAL = 'SHOULD_MAKE_CREDENTIAL';
const DID_MAKE_CREDENTIAL = 'DID_MAKE_CREDENTIAL';
const MAKE_CREDENTIAL_ERROR = 'MAKE_CREDENTIAL_ERROR';
const SHOULD_GET_CREDENTIAL = 'SHOULD_GET_CREDENTIAL';
const DID_GET_CREDENTIAL = 'DID_GET_CREDENTIAL';
const GET_CREDENTIAL_ERROR = 'GET_CREDENTIAL_ERROR';

let iframe;
const iframeOrigin = 'http://localhost:5000';

/**
 * We can't pass the `PublicKeyCredential` attestation object over `postMessage`.
 * Serialize it into an object
 * @param  {PublicKeyCredential} publicKey
 * @return {Object}
 */
const serializePublicKey = publicKey => {
    const rawId = publicKey.rawId;
    const response = {
        attestationObject: publicKey.response.attestationObject,
        clientDataJSON: publicKey.response.clientDataJSON
    }
    const id = publicKey.id;
    const type = publicKey.type;

    return {rawId, response, id, type};
}

/**
 * We can't pass the `PublicKeyCredential` assertion object over `postMessage`.
 * Serialize it into an object
 * @param  {PublicKeyCredential} publicKey
 * @return {Object}
 */
const serializeAssertion = assertionInfo => {
    const rawId = assertionInfo.rawId;
    const response = {
        authenticatorData: assertionInfo.response.authenticatorData,
        clientDataJSON: assertionInfo.response.clientDataJSON,
        signature: assertionInfo.response.signature,
        userHandle: assertionInfo.response.userHandle
    }
    const id = assertionInfo.id;
    const type = assertionInfo.type; 

    return {rawId, response, id, type};
}

/** Gets the credential after the child frame requests it. */
const getCredential = (options) => {
    navigator.credentials.get({publicKey: options})
        .then(assertionInfo => {
            const serializedAssertion = serializeAssertion(assertionInfo);
                
            const message = {
                type: DID_GET_CREDENTIAL,
                body: serializedAssertion,
            }

            iframe.contentWindow.postMessage(message, iframeOrigin)
        })
        .catch(err => {
            console.log('Error in getting credential in parent');
            console.log(err)
            const message = {
                type: GET_CREDENTIAL_ERROR,
                body: err,
            }
            iframe.contentWindow.postMessage(message, iframeOrigin)
        })
}

/** Creates credentials after the child frame requests it. */
const makeCredentials = makeCredentialOptions => {
    navigator.credentials.create({publicKey: makeCredentialOptions})
        .then(newCredentialInfo => {
            const serializedPublicKey = serializePublicKey(newCredentialInfo);
            
            const message = {
                type: DID_MAKE_CREDENTIAL,
                body: serializedPublicKey,
            }
            console.log('Created credential in parent:')
            console.log(serializedPublicKey);

            iframe.contentWindow.postMessage(message, iframeOrigin)
        })
        .catch(err => {
            console.log('error in creating credential in parent');
            console.log(err)
            const message = {
                type: MAKE_CREDENTIAL_ERROR,
                body: err,
            }
            iframe.contentWindow.postMessage(message, iframeOrigin)
        })
}

/** Dispatches messages from the child frame. */
const didReceiveMessage = ({data, origin}) => {
    const {type, body} = data;

    switch (type) {
        case SHOULD_MAKE_CREDENTIAL:
            makeCredentials(body)
            break;
        case SHOULD_GET_CREDENTIAL:
            getCredential(body);
            break;
        default:
            break;
    }
}

/** Initializes the parent Javascript */
const init = () => {
    iframe = document.querySelector('iframe');

    window.addEventListener('message', didReceiveMessage);
}


document.addEventListener("DOMContentLoaded", init);