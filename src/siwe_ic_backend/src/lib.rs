use candid::{Principal};
use hex::{FromHex};
use ic_cdk_macros::{query, update};
use siwe::{Message, VerificationOpts};
use std::collections::BTreeMap;
use std::str::{self, FromStr};
use time::{OffsetDateTime};


#[derive(Clone, Debug)]
struct Session {
    address: [u8; 20],
    expires: OffsetDateTime,   
}

type SessionMap = BTreeMap<Principal, Session>;


thread_local! {
    static SESSIONS: std::cell::RefCell<SessionMap> = std::cell::RefCell::new(BTreeMap::new());
    static LAST_CLEANUP: std::cell::RefCell<OffsetDateTime> = std::cell::RefCell::new(OffsetDateTime::from_unix_timestamp(0).unwrap());
}


async fn validate(siwe_msg: &str, siwe_sig: &str) -> [u8; 20] {
    
    let opts = VerificationOpts {
        domain: None,
        nonce: None,
        timestamp: Some(OffsetDateTime::from_unix_timestamp((ic_cdk::api::time() / (1000 * 1000 * 1000)) as i64).unwrap())
    };

    let msg = Message::from_str(siwe_msg).unwrap();
    let sig = <[u8; 65]>::from_hex( siwe_sig.strip_prefix("0x").unwrap_or(siwe_sig)).unwrap();

    msg.verify(&sig, &opts).await.unwrap();

    msg.address
}

fn check_session() -> Result<(), String> {
    
    let caller = ic_cdk::api::caller();
    let now =  OffsetDateTime::from_unix_timestamp((ic_cdk::api::time() / (1000 * 1000 * 1000)) as i64).unwrap();

    ic_cdk::api::print(std::format!("Checking session for {}", ic_cdk::api::caller().to_text()));


    SESSIONS.with(|sessions| {
        let mut sessions = sessions.borrow_mut();
        let session = sessions.get(&caller).ok_or("No session found")?;
        ic_cdk::api::print(std::format!("Session found for {}", hex::encode(session.address)));
        if session.expires < now {
            sessions.remove(&caller);
            return Err("Session expired".to_string());
        } else {
            return Ok(());
        }

    })
}


#[query]
fn greet(name: String) -> String {
    check_session().unwrap();
    format!("Hello, {}!", name)
}


#[update]
async fn create_session(siwe_msg: String, siwe_sig: String) -> Result<(), String> {

    ic_cdk::api::print(std::format!("Creating session for {}...", ic_cdk::api::caller().to_text()));

    let address = validate(&siwe_msg, &siwe_sig).await;

    ic_cdk::api::print(std::format!("Associated ETH account {:?}", hex::encode(address)));

    let now =  OffsetDateTime::from_unix_timestamp((ic_cdk::api::time() / (1000 * 1000 * 1000)) as i64).unwrap();
    let expires = now + time::Duration::minutes(5);

    let session = Session {
        address,
        expires,
    };

    SESSIONS.with(|sessions| {
        let mut sessions = sessions.borrow_mut();
        sessions.insert(ic_cdk::api::caller(), session);
    });

    ic_cdk::api::print(std::format!("Created session for {}, expires at {:?}", ic_cdk::api::caller().to_text(), expires));

    LAST_CLEANUP.with(|last_cleanup| {
        let mut last_cleanup = last_cleanup.borrow_mut();
        if now - *last_cleanup > time::Duration::minutes(15) {
            cleanup_sessions();
            *last_cleanup = now;
        }
    });

    Ok(())
}

#[query]

fn cleanup_sessions() {
    let now =  OffsetDateTime::from_unix_timestamp((ic_cdk::api::time() / (1000 * 1000 * 1000)) as i64).unwrap();

    SESSIONS.with(|sessions| {
        let mut sessions = sessions.borrow_mut();
        sessions.retain(|_, session| session.expires > now);
    });
}