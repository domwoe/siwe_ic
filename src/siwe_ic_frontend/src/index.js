import { Actor } from '@dfinity/agent';
import { Ed25519KeyIdentity } from '@dfinity/identity';
import {
  siwe_ic_backend,
  canisterId,
} from '../../declarations/siwe_ic_backend';
import { ethers } from 'ethers';
import { SiweMessage } from 'siwe';

const domain = window.location.host;
const provider = new ethers.providers.Web3Provider(window.ethereum);
const signer = provider.getSigner();

let agent;

let isAuthenticated = false;

function createSiweMessage(address, statement, delegatee, resources) {
  const message = new SiweMessage({
    domain,
    address,
    statement,
    uri: delegatee,
    version: '1',
    chainId: '1',
    resources,
  });
  return message.prepareMessage();
}

function connectWallet() {
  provider
    .send('eth_requestAccounts', [])
    .catch(() => console.log('user rejected request'));
}

let message = null;
let signature = null;

async function signInWithEthereum(statement) {
  if (!statement) {
    statement = 'Sign in with Ethereum';
  }

  const identity = await Ed25519KeyIdentity.generate();

  message = createSiweMessage(
    await signer.getAddress(),
    statement,
    'did:icp:' + identity.getPrincipal(),
    ['icp:' + canisterId],
  );

  signature = await signer.signMessage(message);

  agent = Actor.agentOf(siwe_ic_backend);
  agent.replaceIdentity(identity);

  try {
    const session = await siwe_ic_backend.create_session(message, signature);
    console.log(session);
    isAuthenticated = true;
    logoutBtn.hidden = false;
    siweBtn.hidden = true;
    document.getElementById('msg').innerText = 'Successfully signed in!';
  } catch (e) {
    console.log(e);
    isAuthenticated = false;
  }
}

document
  .querySelector('#greeting_form')
  .addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('greeting');
    const button = e.target.querySelector('button');

    const name = document.getElementById('name').value.toString();

    button.setAttribute('disabled', true);

    try {
      const result = await siwe_ic_backend.greet(name);
      document.getElementById('msg').innerText = result;
    } catch (e) {
      document.getElementById('msg').innerText = e.message;
      logoutBtn.hidden = true;
      if (isAuthenticated) {
        signInWithEthereum('Your session has expired. Please sign in again.');
      } else {
        signInWithEthereum();
      }
    } finally {
      button.removeAttribute('disabled');
    }
  });

async function logout() {
  await siwe_ic_backend.clear_session();
  document.getElementById('msg').innerText = 'Successfully logged out!';
  isAuthenticated = false;
  logoutBtn.hidden = true;
  siweBtn.hidden = false;
}

const connectWalletBtn = document.getElementById('connectWalletBtn');
const siweBtn = document.getElementById('siweBtn');
const logoutBtn = document.getElementById('logoutBtn');
logoutBtn.hidden = true;
connectWalletBtn.onclick = connectWallet;
connectWalletBtn.hidden = true;
siweBtn.onclick = function () {
  signInWithEthereum();
};
logoutBtn.onclick = logout;

setTimeout(function () {
  if (!window.ethereum.isConnected()) {
    connectWalletBtn.hidden = false;
  }
}, 500);
