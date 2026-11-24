use risc0_zkvm::guest::env;
use risc0_zkvm::sha::{Impl, Sha256};

fn main() {
    let tx: Vec<u8> = env::read();
    // Journal: sha256(tx) (32 bytes) || verdict (1 byte: 0 allow, 1 warn, 2 block).
    // The image ID pins the exact rule code that produced the verdict.
    let verdict = guard_core::screen(&tx).map(|r| r.verdict as u8).unwrap_or(255);
    let mut journal = Impl::hash_bytes(&tx).as_bytes().to_vec();
    journal.push(verdict);
    env::commit_slice(&journal);
}
