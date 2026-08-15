//! Comparing names that two different systems wrote down.
//!
//! A station says "Aerosmith - Livin' On The Edge (LP Version)"; a music
//! database says "Livin' On the Edge". A station says "Goran Bregovic"; the
//! database says "Goran Bregović". These have to be recognised as the same
//! thing, without becoming so loose that unrelated titles start matching.

/// Below this many characters a comparison is meaningless.
const MIN_COMPARABLE: usize = 3;

/// Folds accented Latin letters onto their base.
///
/// Stations and databases disagree constantly about diacritics, and without
/// folding those are simply different strings.
fn fold(ch: char) -> char {
    match ch {
        'á' | 'à' | 'â' | 'ä' | 'ã' | 'å' | 'ā' | 'ą' | 'æ' => 'a',
        'é' | 'è' | 'ê' | 'ë' | 'ē' | 'ę' => 'e',
        'í' | 'ì' | 'î' | 'ï' | 'ī' | 'ı' => 'i',
        'ó' | 'ò' | 'ô' | 'ö' | 'õ' | 'ø' | 'ō' => 'o',
        'ú' | 'ù' | 'û' | 'ü' | 'ū' | 'ů' => 'u',
        'ý' | 'ÿ' => 'y',
        'ç' | 'ć' | 'č' => 'c',
        'š' | 'ś' | 'ş' | 'ß' => 's',
        'ž' | 'ź' | 'ż' => 'z',
        'đ' | 'ð' | 'ď' => 'd',
        'ñ' | 'ň' | 'ń' => 'n',
        'ł' => 'l',
        'ř' => 'r',
        'ť' => 't',
        'ğ' => 'g',
        other => other,
    }
}

/// Strips bracketed extras, keeping the words intact.
///
/// "(LP Version)", "[feat Tomi Joutsen]" and "(Radio Edit)" are things the
/// station adds and the database does not. They have to go before *searching*,
/// not just before comparing - leaving them in a query is enough to lose the
/// match entirely.
pub fn without_brackets(value: &str) -> String {
    let mut out = String::new();
    let mut depth = 0i32;

    for ch in value.chars() {
        match ch {
            '(' | '[' => depth += 1,
            ')' | ']' => depth = (depth - 1).max(0),
            _ if depth == 0 => out.push(ch),
            _ => {}
        }
    }

    out.split_whitespace().collect::<Vec<_>>().join(" ")
}

/// Lowercase, accent-folded alphanumerics, with bracketed suffixes dropped.
///
/// Non-Latin scripts pass through untouched, so a Korean title stays comparable.
pub fn normalize(value: &str) -> String {
    without_brackets(value)
        .chars()
        .flat_map(|ch| ch.to_lowercase())
        .map(fold)
        .filter(|ch| ch.is_alphanumeric())
        .collect()
}

/// True when two names plausibly denote the same thing.
pub fn same(ours: &str, theirs: &str) -> bool {
    let ours = normalize(ours);
    let theirs = normalize(theirs);

    if ours.chars().count() < MIN_COMPARABLE || theirs.chars().count() < MIN_COMPARABLE {
        return false;
    }

    ours == theirs || ours.contains(&theirs) || theirs.contains(&ours)
}

/// Percent-encodes a value for use in a query string.
pub fn percent_encode(value: &str) -> String {
    let mut out = String::new();
    for byte in value.as_bytes() {
        match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                out.push(*byte as char)
            }
            _ => out.push_str(&format!("%{byte:02X}")),
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::{normalize, same, without_brackets};

    #[test]
    fn drops_bracketed_suffixes() {
        assert_eq!(normalize("Livin' On The Edge (LP Version)"), "livinontheedge");
        assert_eq!(normalize("Cursed (feat. Wvlfpakt & Mecha Maiko)"), "cursed");
        assert_eq!(normalize("Eyes of the Deep [feat Tomi Joutsen]"), "eyesofthedeep");
    }

    #[test]
    fn matches_across_punctuation_and_case() {
        assert!(same("Aerosmith", "aerosmith"));
        assert!(same("Livin' On The Edge (LP Version)", "Livin' On the Edge"));
        assert!(same("Iggy Pop & Goran Bregovic", "Goran Bregovic"));
    }

    #[test]
    fn matches_across_diacritics() {
        // The station writes it plain, the database writes it properly.
        assert!(same("Iggy Pop & Goran Bregovic", "Goran Bregović"));
        assert!(same("Bjork", "Björk"));
        assert!(same("mell-ø", "mello"));
    }

    #[test]
    fn rejects_a_station_ident_against_a_real_band() {
        // The ident filter catches this first; this is the second line of defence.
        assert!(!same("POP RADIO", "The Final Countdown"));
        assert!(!same("Power Metal", "Mezmerize"));
    }

    #[test]
    fn refuses_to_judge_strings_too_short_to_compare() {
        assert!(!same("U2", "U2"));
        assert!(!same("", "Anything"));
    }

    #[test]
    fn keeps_non_latin_titles_comparable() {
        assert_eq!(normalize("혼자여도 괜찮아"), "혼자여도괜찮아");
        assert!(same("혼자여도 괜찮아", "혼자여도 괜찮아"));
    }

    #[test]
    fn strips_brackets_from_the_search_term_too() {
        assert_eq!(
            without_brackets("Livin' On The Edge (LP Version)"),
            "Livin' On The Edge"
        );
        assert_eq!(without_brackets("Snooze (ft Jordy Chandra) [2LPw]"), "Snooze");
    }
}
