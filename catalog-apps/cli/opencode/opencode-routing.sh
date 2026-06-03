# Managed by rigbox-examples (opencode). OpenCode reads OPENROUTER_API_KEY
# natively (https://github.com/sst/opencode) — no env translation required.
# The upstream installer drops the binary at ~/.opencode/bin (or, on older
# releases, ~/.local/bin) and only patches per-user rc files, so we add both
# candidates to PATH here for non-interactive login shells.
for _rb_bin in "${HOME:-/home/developer}/.opencode/bin" "${HOME:-/home/developer}/.local/bin"; do
  if [ -d "$_rb_bin" ]; then
    case ":${PATH}:" in
      *":$_rb_bin:"*) ;;
      *) PATH="$_rb_bin:$PATH" ;;
    esac
  fi
done
unset _rb_bin
export PATH
