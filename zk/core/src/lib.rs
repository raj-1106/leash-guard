//! Screening rules, ported from src/screen.ts so they can run inside a zkVM.
//! Parses a serialized Solana transaction (legacy or v0) and returns a verdict.

pub const RULESET_VERSION: u32 = 1;

#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord)]
pub enum Level {
    Allow = 0,
    Warn = 1,
    Block = 2,
}

#[derive(Debug, PartialEq, Eq)]
pub struct Result {
    pub verdict: Level,
    pub codes: Vec<&'static str>,
}

const SYSTEM: &str = "11111111111111111111111111111111";
const TOKEN: &str = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const TOKEN_2022: &str = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
const KNOWN: &[&str] = &[
    SYSTEM,
    TOKEN,
    TOKEN_2022,
    "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
    "ComputeBudget111111111111111111111111111111",
    "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
    "Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo",
    "Stake11111111111111111111111111111111111111",
    "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4",
    "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8",
    "CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C",
    "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK",
    "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc",
    "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo",
    "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P",
    "pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA",
];
// Demo list; mirrors src/screen.ts.
const FLAGGED: &str = "DrainerWa11etXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";
const LAMPORTS_WARN: u64 = 5_000_000_000;
const U64_MAX_HALF: u64 = 1 << 63;

struct Reader<'a> {
    b: &'a [u8],
    i: usize,
}

impl<'a> Reader<'a> {
    fn u8(&mut self) -> Option<u8> {
        let v = *self.b.get(self.i)?;
        self.i += 1;
        Some(v)
    }
    fn take(&mut self, n: usize) -> Option<&'a [u8]> {
        let s = self.b.get(self.i..self.i.checked_add(n)?)?;
        self.i += n;
        Some(s)
    }
    /// Solana compact-u16.
    fn short_vec_len(&mut self) -> Option<usize> {
        let mut v = 0usize;
        for shift in [0, 7, 14] {
            let byte = self.u8()? as usize;
            v |= (byte & 0x7f) << shift;
            if byte & 0x80 == 0 {
                return Some(v);
            }
        }
        None
    }
}

fn pid_str(k: &[u8]) -> String {
    bs58::encode(k).into_string()
}

/// Returns None if the bytes are not a valid transaction.
pub fn screen(tx: &[u8]) -> Option<Result> {
    let mut r = Reader { b: tx, i: 0 };
    let nsigs = r.short_vec_len()?;
    r.take(nsigs.checked_mul(64)?)?;

    let mut first = r.u8()?;
    let v0 = first & 0x80 != 0;
    if v0 {
        if first & 0x7f != 0 {
            return None; // only v0 supported
        }
        first = r.u8()?;
    }
    let _ = first; // num_required_signatures
    r.take(2)?; // readonly counts

    let nkeys = r.short_vec_len()?;
    let mut keys = Vec::with_capacity(nkeys);
    for _ in 0..nkeys {
        keys.push(pid_str(r.take(32)?));
    }
    r.take(32)?; // blockhash

    let nix = r.short_vec_len()?;
    let mut codes: Vec<&'static str> = Vec::new();
    let mut verdict = Level::Allow;
    let mut push = |level: Level, code: &'static str, codes: &mut Vec<&'static str>| {
        if !codes.contains(&code) {
            codes.push(code);
        }
        if level > verdict {
            verdict = level;
        }
    };

    struct Ix<'a> {
        pid: usize,
        accts: &'a [u8],
        data: &'a [u8],
    }
    let mut ixs = Vec::with_capacity(nix);
    for _ in 0..nix {
        let pid = r.u8()? as usize;
        let na = r.short_vec_len()?;
        let accts = r.take(na)?;
        let nd = r.short_vec_len()?;
        let data = r.take(nd)?;
        ixs.push(Ix { pid, accts, data });
    }

    if v0 {
        let nlut = r.short_vec_len()?;
        if nlut > 0 {
            push(Level::Warn, "LOOKUP_TABLES", &mut codes);
        }
    }

    let acct = |ix: &Ix, i: usize| -> String {
        ix.accts
            .get(i)
            .and_then(|&k| keys.get(k as usize))
            .cloned()
            .unwrap_or_else(|| "?".into())
    };

    for ix in &ixs {
        let Some(pid) = keys.get(ix.pid) else { continue };
        let pid = pid.as_str();
        if !KNOWN.contains(&pid) {
            push(Level::Warn, "UNKNOWN_PROGRAM", &mut codes);
            continue;
        }
        let d = ix.data;
        if pid == SYSTEM {
            let kind = u32::from_le_bytes(d.get(0..4)?.try_into().ok()?);
            if kind == 2 {
                let lamports = u64::from_le_bytes(d.get(4..12)?.try_into().ok()?);
                if acct(ix, 1) == FLAGGED {
                    push(Level::Block, "FLAGGED_DESTINATION", &mut codes);
                }
                if lamports >= LAMPORTS_WARN {
                    push(Level::Warn, "LARGE_TRANSFER", &mut codes);
                }
            } else if kind == 1 || kind == 10 {
                push(Level::Block, "ASSIGN_OWNER", &mut codes);
            }
        } else if pid == TOKEN || pid == TOKEN_2022 {
            match d.first() {
                Some(4) | Some(13) => {
                    let amount = u64::from_le_bytes(d.get(1..9)?.try_into().ok()?);
                    if amount >= U64_MAX_HALF {
                        push(Level::Block, "UNLIMITED_APPROVAL", &mut codes);
                    } else {
                        push(Level::Warn, "TOKEN_APPROVAL", &mut codes);
                    }
                }
                Some(6) => push(Level::Block, "SET_AUTHORITY", &mut codes),
                _ => {}
            }
        }
    }

    Some(Result { verdict, codes })
}
