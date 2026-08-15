//! ICY (Shoutcast/Icecast) metadata proxy.
//!
//! An <audio> element cannot ask for ICY metadata, and cannot read it if it
//! arrives. So we sit in the middle: we open the upstream stream ourselves with
//! `Icy-MetaData: 1`, pull the interleaved metadata blocks out of the byte
//! stream, and re-serve pure audio on 127.0.0.1 for the webview to play.
//!
//! Being in the path (rather than opening a second connection just to sniff
//! metadata) keeps this to exactly one upstream connection per station, which
//! is the property the player was fixed to guarantee.

use std::io::{self, Read};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;

use tauri::{AppHandle, Emitter};
use tiny_http::{Header, Response, Server, StatusCode};

/// Only the *connect* phase is bounded. A global timeout would be wrong here -
/// a radio stream is meant to never finish.
const CONNECT_TIMEOUT: Duration = Duration::from_secs(12);

#[derive(Clone)]
struct Pending {
    token: String,
    url: String,
}

pub struct IcyProxy {
    port: u16,
    pending: Arc<Mutex<Option<Pending>>>,
    /// Bumped on every station change; in-flight streams see it and stop.
    generation: Arc<AtomicU64>,
}

impl IcyProxy {
    pub fn start(app: AppHandle) -> io::Result<Self> {
        let server = Server::http("127.0.0.1:0")
            .map_err(|e| io::Error::new(io::ErrorKind::Other, e.to_string()))?;
        let port = server
            .server_addr()
            .to_ip()
            .ok_or_else(|| io::Error::new(io::ErrorKind::Other, "no local port"))?
            .port();

        let pending: Arc<Mutex<Option<Pending>>> = Arc::new(Mutex::new(None));
        let generation = Arc::new(AtomicU64::new(0));

        let srv_pending = Arc::clone(&pending);
        let srv_generation = Arc::clone(&generation);
        thread::spawn(move || {
            for request in server.incoming_requests() {
                let pending = Arc::clone(&srv_pending);
                let generation = Arc::clone(&srv_generation);
                let app = app.clone();
                thread::spawn(move || handle(request, pending, generation, app));
            }
        });

        Ok(Self {
            port,
            pending,
            generation,
        })
    }

    /// Register `url` as the next stream and hand back the local URL to play.
    ///
    /// Bumping the generation here cuts any stream still running for the
    /// previous station, so the upstream connection is released the moment the
    /// user moves on rather than when the webview gets round to closing it.
    pub fn prepare(&self, url: String) -> String {
        let generation = self.generation.fetch_add(1, Ordering::SeqCst) + 1;
        // A token keeps this from being an open relay for anything else that
        // happens to be running on this machine.
        let token = format!("{:016x}{:016x}", rand::random::<u64>(), generation);

        *self.pending.lock().unwrap() = Some(Pending {
            token: token.clone(),
            url,
        });

        format!("http://127.0.0.1:{}/s/{}", self.port, token)
    }
}

fn handle(
    request: tiny_http::Request,
    pending: Arc<Mutex<Option<Pending>>>,
    generation: Arc<AtomicU64>,
    app: AppHandle,
) {
    let token = match request.url().strip_prefix("/s/") {
        Some(t) => t.to_string(),
        None => {
            let _ = request.respond(Response::empty(StatusCode(404)));
            return;
        }
    };

    let slot = pending.lock().unwrap().clone();
    let slot = match slot {
        Some(p) if p.token == token => p,
        _ => {
            let _ = request.respond(Response::empty(StatusCode(404)));
            return;
        }
    };

    let agent: ureq::Agent = ureq::Agent::config_builder()
        .timeout_connect(Some(CONNECT_TIMEOUT))
        .build()
        .into();

    // Claim the stream. A reconnect to the same token starts a new thread while
    // the old one may still be draining, so the claim - not the token - is what
    // guarantees only one upstream connection is ever live.
    let my_generation = generation.fetch_add(1, Ordering::SeqCst) + 1;

    let upstream = agent
        .get(&slot.url)
        .header("Icy-MetaData", "1")
        .header("User-Agent", "minke-fm/0.1")
        .call();

    let response = match upstream {
        Ok(r) => r,
        Err(_) => {
            // Let the audio element see a failure so the reconnect logic runs.
            let _ = request.respond(Response::empty(StatusCode(502)));
            return;
        }
    };

    let header = |name: &str| {
        response
            .headers()
            .get(name)
            .and_then(|v| v.to_str().ok())
            .map(|s| s.to_string())
    };

    let content_type = header("content-type").unwrap_or_else(|| "audio/mpeg".to_string());
    let metaint = header("icy-metaint")
        .and_then(|v| v.parse::<usize>().ok())
        .unwrap_or(0);
    let icy_name = header("icy-name");

    let _ = app.emit(
        "icy:connected",
        serde_json::json!({
            "hasMetadata": metaint > 0,
            "icyName": icy_name,
            "contentType": content_type,
        }),
    );

    let stripper = IcyStripper {
        inner: response.into_body().into_reader(),
        metaint,
        remaining: metaint,
        app,
        generation: my_generation,
        current: generation,
        last_title: String::new(),
    };

    let headers = vec![
        Header::from_bytes(&b"Content-Type"[..], content_type.as_bytes()).unwrap(),
        Header::from_bytes(&b"Cache-Control"[..], &b"no-store"[..]).unwrap(),
    ];

    // data_length None => chunked/close-delimited, which is what a live stream is.
    let _ = request.respond(Response::new(StatusCode(200), headers, stripper, None, None));
}

/// Wraps the upstream body, removing ICY metadata blocks and reporting titles.
struct IcyStripper<R: Read> {
    inner: R,
    metaint: usize,
    /// Audio bytes still to pass through before the next metadata block.
    remaining: usize,
    app: AppHandle,
    generation: u64,
    current: Arc<AtomicU64>,
    last_title: String,
}

impl<R: Read> IcyStripper<R> {
    fn consume_metadata(&mut self) -> io::Result<()> {
        let mut len = [0u8; 1];
        self.inner.read_exact(&mut len)?;

        let size = len[0] as usize * 16;
        if size == 0 {
            // An empty block just means "nothing changed since last time".
            return Ok(());
        }

        let mut block = vec![0u8; size];
        self.inner.read_exact(&mut block)?;

        let text = String::from_utf8_lossy(&block);
        if let Some(title) = parse_stream_title(&text) {
            if title != self.last_title {
                self.last_title = title.clone();
                let _ = self.app.emit("icy:title", title);
            }
        }
        Ok(())
    }
}

impl<R: Read> Read for IcyStripper<R> {
    fn read(&mut self, buf: &mut [u8]) -> io::Result<usize> {
        // The user moved on. Returning EOF drops the upstream connection.
        if self.current.load(Ordering::SeqCst) != self.generation {
            return Ok(0);
        }

        if self.metaint == 0 {
            return self.inner.read(buf);
        }

        if self.remaining == 0 {
            self.consume_metadata()?;
            self.remaining = self.metaint;
        }

        // Never read past the next metadata block, or we would forward it as
        // audio and lose our place in the stream.
        let take = buf.len().min(self.remaining);
        let read = self.inner.read(&mut buf[..take])?;
        self.remaining -= read;
        Ok(read)
    }
}

/// Pulls the value out of `StreamTitle='...';`.
///
/// Titles legitimately contain apostrophes ("Livin' On The Edge"), so the
/// terminator is the quote-semicolon pair, not the quote alone.
fn parse_stream_title(raw: &str) -> Option<String> {
    let start = raw.find("StreamTitle=")? + "StreamTitle=".len();
    let rest = raw[start..].strip_prefix('\'')?;

    let value = match rest.find("';") {
        Some(end) => &rest[..end],
        // Last field in the block may end with a bare quote.
        None => rest.strip_suffix('\'').unwrap_or(rest),
    };

    let value = value.trim();
    if value.is_empty() {
        None
    } else {
        Some(value.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::parse_stream_title;

    #[test]
    fn reads_a_plain_title() {
        assert_eq!(
            parse_stream_title("StreamTitle='Muse - Hysteria';StreamUrl='';"),
            Some("Muse - Hysteria".to_string())
        );
    }

    #[test]
    fn keeps_apostrophes_inside_the_title() {
        assert_eq!(
            parse_stream_title("StreamTitle='Aerosmith - Livin' On The Edge';StreamUrl='';"),
            Some("Aerosmith - Livin' On The Edge".to_string())
        );
    }

    #[test]
    fn handles_a_trailing_field_without_semicolon() {
        assert_eq!(
            parse_stream_title("StreamTitle='Only Field'"),
            Some("Only Field".to_string())
        );
    }

    #[test]
    fn treats_an_empty_title_as_nothing() {
        assert_eq!(parse_stream_title("StreamTitle='';StreamUrl='x';"), None);
        assert_eq!(parse_stream_title("StreamUrl='x';"), None);
    }
}
