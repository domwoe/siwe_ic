import { Actor, HttpAgent } from "@dfinity/agent";
import { Ed25519KeyIdentity } from "@dfinity/identity";
import { siwe_ic_backend } from "../../declarations/siwe_ic_backend";
import { ethers } from 'ethers';
import { SiweMessage } from 'siwe';

const domain = window.location.host;
const origin = window.location.origin;
const provider = new ethers.providers.Web3Provider(window.ethereum);
const signer = provider.getSigner();

let agent;

let isAuthenticated = false;

function createSiweMessage (address, statement) {
  const message = new SiweMessage({
    domain,
    address,
    statement,
    uri: origin,
    version: '1',
    chainId: '1'
  });
  return message.prepareMessage();
}

function connectWallet () {
  provider.send('eth_requestAccounts', [])
    .catch(() => console.log('user rejected request'));
}

let message = null;
let signature = null;

async function signInWithEthereum (statement) {
  if (!statement) {
    statement = 'Sign in with Ethereum to the app.';
  }
  message = createSiweMessage(
    await signer.getAddress(), 
      statement
    );
  console.log(message);
  signature = await signer.signMessage(message);
  console.log(signature);

  const identity = await Ed25519KeyIdentity.generate();

  agent = Actor.agentOf(siwe_ic_backend);
  agent.replaceIdentity(identity);
  
  try {
    await siwe_ic_backend.create_session(message, signature);
    isAuthenticated = true;
  } catch (e) {
    console.log(e);
    isAuthenticated = false;
  }

}

const connectWalletBtn = document.getElementById('connectWalletBtn');
const siweBtn = document.getElementById('siweBtn');
connectWalletBtn.onclick = connectWallet;
siweBtn.onclick = signInWithEthereum;


document.querySelector("#greeting_form").addEventListener("submit", async (e) => {
  e.preventDefault();
  console.log("greeting")
  const button = e.target.querySelector("button");

  const name = document.getElementById("name").value.toString();

  button.setAttribute("disabled", true);

    try {

      const result = await siwe_ic_backend.greet(name);
      console.log(result);

    } catch (e){
      console.log(e);
      if (isAuthenticated) {
        signInWithEthereum("Your session has expired. Please sign in again.");
      } else {
        signInWithEthereum();
      }
      
    } finally {
      button.removeAttribute("disabled");
    }
      
      
});