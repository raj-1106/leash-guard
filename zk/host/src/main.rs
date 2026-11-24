use base64::Engine;
use methods::{GUARD_ELF, GUARD_ID};
use risc0_zkvm::{default_prover, ExecutorEnv, ProverOpts, VerifierContext};
use serde::Serialize;

#[derive(Serialize)]
struct Proof {
    proof: String,
    image_id: String,
    pub_inputs: String,
}

fn main() {
    let b64 = std::env::args().nth(1).expect("usage: host <base64 tx> [out.json]");
    let out = std::env::args().nth(2).unwrap_or_else(|| "proof.json".into());
    let tx = base64::engine::general_purpose::STANDARD.decode(b64.trim()).expect("bad base64");

    let env = ExecutorEnv::builder().write(&tx).unwrap().build().unwrap();
    let receipt = default_prover()
        .prove_with_ctx(env, &VerifierContext::default(), GUARD_ELF, &ProverOpts::succinct())
        .unwrap()
        .receipt;
    receipt.verify(GUARD_ID).expect("local verification failed");

    let mut bin = Vec::new();
    ciborium::into_writer(&receipt, &mut bin).unwrap();
    let image_id: Vec<u8> = GUARD_ID.iter().flat_map(|w| w.to_le_bytes()).collect();
    let proof = Proof {
        proof: format!("0x{}", hex::encode(bin)),
        image_id: format!("0x{}", hex::encode(image_id)),
        pub_inputs: format!("0x{}", hex::encode(&receipt.journal.bytes)),
    };
    std::fs::write(&out, serde_json::to_string_pretty(&proof).unwrap()).unwrap();
    println!("verdict byte: {}", receipt.journal.bytes.last().unwrap());
    println!("wrote {out}");
}
