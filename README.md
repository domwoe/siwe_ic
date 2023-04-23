# Sign in with Ethereum (SIWE) on the Internet Computer

This is a sample project that demonstrates how to use Sign in with Ethereum (SIWE) on the Internet Computer.

If you want to start working on your project right away, you might want to try the following commands:

```bash
cd siwe_ic/
dfx help
dfx canister --help
```

## Running the project locally

If you want to test your project locally, you can use the following commands:

```bash
# Starts the replica, running in the background
dfx start --background

# Deploys your canisters to the replica and generates your candid interface
dfx deploy
```

Once the job completes, your application will be available at `http://localhost:4943?canisterId={asset_canister_id}`.
