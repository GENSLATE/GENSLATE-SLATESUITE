//! FTS5 helpers.

/// Turns free user text into a safe FTS5 `MATCH` expression, or `None` when there is nothing
/// to search for.
///
/// Each whitespace-separated word becomes a quoted string (so FTS5 operators and punctuation
/// in the text are never interpreted), every word must match and the last one matches
/// as a prefix, which suits search-as-you-type: `git sta` → `"git" "sta"*`. Words without a
/// letter or digit carry no token for the default tokenizer and are dropped.
pub fn match_query(text: &str) -> Option<String> {
    let words: Vec<&str> = text
        .split_whitespace()
        .filter(|word| word.chars().any(char::is_alphanumeric))
        .collect();
    let (last, rest) = words.split_last()?;
    let mut query = String::new();
    for word in rest {
        query.push_str(&quote(word));
        query.push(' ');
    }
    query.push_str(&quote(last));
    query.push('*');
    Some(query)
}

/// `"word"` with inner quotes doubled (FTS5 string syntax).
fn quote(word: &str) -> String {
    format!("\"{}\"", word.replace('"', "\"\""))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn empty_text_has_no_query() {
        assert_eq!(match_query(""), None);
        assert_eq!(match_query("   \t\n"), None);
        assert_eq!(match_query("-- ** \""), None);
    }

    #[test]
    fn quotes_every_word_and_prefixes_the_last() {
        assert_eq!(match_query("git sta").as_deref(), Some("\"git\" \"sta\"*"));
        assert_eq!(match_query("  deploy ").as_deref(), Some("\"deploy\"*"));
    }

    #[test]
    fn neutralises_fts_syntax() {
        assert_eq!(
            match_query("a\"b OR NEAR(c) -d").as_deref(),
            Some("\"a\"\"b\" \"OR\" \"NEAR(c)\" \"-d\"*")
        );
    }
}
