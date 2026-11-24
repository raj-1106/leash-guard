use base64::Engine;
use guard_core::{screen, Level};

fn load(name: &str) -> Vec<u8> {
    let j: serde_json::Value = serde_json::from_str(include_str!("samples.json")).unwrap();
    base64::engine::general_purpose::STANDARD.decode(j[name].as_str().unwrap()).unwrap()
}

#[test]
fn safe_transfer_allowed() {
    let r = screen(&load("Safe: send 0.1 SOL")).unwrap();
    assert_eq!(r.verdict, Level::Allow);
    assert!(r.codes.is_empty());
}
#[test]
fn unlimited_approval_blocked() {
    let r = screen(&load("Risky: unlimited token approval")).unwrap();
    assert_eq!((r.verdict, r.codes), (Level::Block, vec!["UNLIMITED_APPROVAL"]));
}
#[test]
fn set_authority_blocked() {
    let r = screen(&load("Risky: hand over account authority")).unwrap();
    assert_eq!((r.verdict, r.codes), (Level::Block, vec!["SET_AUTHORITY"]));
}
#[test]
fn unknown_program_warns() {
    let r = screen(&load("Risky: unknown program")).unwrap();
    assert_eq!((r.verdict, r.codes), (Level::Warn, vec!["UNKNOWN_PROGRAM"]));
}
#[test]
fn garbage_rejected() {
    assert!(screen(&[1, 2, 3]).is_none());
}
