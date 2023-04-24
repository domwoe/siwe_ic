# Sign in with Ethereum (SIWE) on the Internet Computer

This is a sample project that demonstrates how to use Sign in with Ethereum (SIWE) on the Internet Computer.
This project has not been reviewed or audited and should only be used as inspiration for your own projects.

## How it works

### Creating a session

- When the user clicks on the "Sign in with Ethereum" button, the application (frontend) creates a new session key pair (an `Ed25519KeyIdentity`), and creates a new SIWE message with the following parameters:
  - `URI` - the principal according to the session key pair with a `did:icp:` prefix
  - `resources` - a list of canister IDSs (with `icp:` prefix) the user wants to access
- The application then sends the SIWE message to MetaMask for signing.
- The user can review the message and sign it.
- The application sends the message and the signature to the `create_session` method of the backend canister.
- The canister validates the request as follows:
  - It checks that the URI is equal to the caller's principal.
  - It checks that the canister is in the `resources` list.
  - It verifies the signature
- If the validation succeeds, the canister creates a new session by storing a mapping between the session principal and the ETH address, and an expiration time.

### Accessing a resource

- When the user calls a method of the canister, then the `check_session` method is called first.
- This function checks if a valid session for the caller exists, and if so, it returns the ETH address of the user.

## Running the project locally

If you want to test your project locally, you can use the following commands:

```bash
cd siwe_ic
# Starts the replica, running in the background
dfx start --background

# Deploys your canisters to the replica and generates your candid interface
dfx deploy
```

Once the job completes, your application will be available at `http://localhost:4943?canisterId={asset_canister_id}`.

## Remarks

This project uses Spruce's [siwe-rs](https://github.com/spruceid/siwe-rs) library, but had to be [modified](https://github.com/domwoe/siwe-rs) to work with the Internet Computer.
