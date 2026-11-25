# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

delegated: one zero-dependency Node.js file that serves a local UI on 127.0.0.1 and opens it as a chromeless app window (`--app=`) in an installed Chromium browser. Chosen because Node is already a Claude Code-adjacent dependency, there is nothing to npm-install or build, and the download stays a few KB. A CLI (`claude-switch`) shares the same code and data.

## Users

Developers who use Claude Code in the terminal and own two or more Claude subscription accounts (Pro or Max). Their situation: mid-task, they hit the usage limit on one account and want to carry on with another account without the slow sign-out / sign-in browser dance. Many also use the Claude in Chrome extension, which only connects to Claude Code when it is signed in to the same account, so they keep one browser profile per account.

## Product Purpose

Make switching the account Claude Code uses a one-click (or one-command) action, for any number of accounts, and open the browser profile that belongs to that account. Success: a user who just hit a limit is working again on another account within seconds, back in the same conversation.

## Positioning

It swaps Claude Code's own stored login instead of making the user log in again, saves the freshest tokens on every switch so saved logins do not go stale, and pairs each account with a browser profile so Claude in Chrome follows the switch.

## Operating Context

- Used in short bursts at the moment a limit is hit, often while a terminal session has just been closed.
- Claude Code must be quit before switching; a running session can write its own login back.
- After switching, the user resumes with `claude --continue` in a project folder.
- Logins are per computer; tokens rotate, so profiles are never copied between machines. Each machine signs in to each account once.
- Browsers: any installed Chromium browser (Chrome, Edge, Brave, Vivaldi, Chromium), each with its own profiles.

## Capabilities and Constraints

- Windows and Linux. Claude Code stores the login in `<config>/.credentials.json` and account info under `oauthAccount` in `~/.claude.json`; `CLAUDE_CONFIG_DIR` relocates both. macOS is out of scope (logins live in the Keychain).
- Accounts: add (via `claude auth login`), list, switch, rename, remove; any number of accounts.
- Auto-switch mid-conversation (verified 2026-11-25 on Claude Code 2.1.332): a running session re-reads `.credentials.json` before each request and recovers after a failed one. An opt-in `StopFailure` hook in `~/.claude/settings.json` fires on `error: "rate_limit"`, marks that account limited, and swaps in the next account not limited in the last 5 hours; the user types "continue" in the same session. If every account is limited, nothing is swapped and the user is told.
- Tray (Windows only, user request): a PowerShell NotifyIcon with the account list, one-click switch, auto-switch toggle, and "Open window". Linux gets the window and CLI only.
- Active account is tracked by the app's own state file, not inferred from `~/.claude.json`, because a running session can rewrite that file.
- Saved profiles live in `~/.claude-accounts/profiles/` and contain live tokens: private, never synced or published.
- Remaining usage per account is not available to the app; it must not claim to show it.
- Requires Node.js and Claude Code.

## Brand Commitments

Name: claude-switch (working name). It is an unofficial community tool, not affiliated with Anthropic; it must not use Anthropic's logo or brand marks or imply it is an official product.

## Evidence on Hand

None beyond the working CLI. No users, testimonials, or metrics exist; do not invent any.

## Product Principles

1. The switch is the product: one action, no confirmation dialogs for the common path.
2. Never lose a login: always save the current account's newest tokens before replacing them.
3. Say what the user must do (quit Claude, sign in once per machine) instead of hiding it.
4. Nothing leaves the machine.

## Accessibility & Inclusion

Keyboard-operable throughout; works in light and dark system themes.
