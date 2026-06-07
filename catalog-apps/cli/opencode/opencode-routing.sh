# Managed by rigbox-examples (opencode). The AI backend is configured in the
# baked ~/.config/opencode/opencode.json (a custom OpenAI-compatible provider
# pointed at the workspace's managed AI proxy), so no env translation is needed
# here. This script only ensures the opencode binary is on PATH for
# non-interactive login shells (catalog scripts, sshd ForceCommand, ...): the
# upstream installer drops it at ~/.opencode/bin (or, on older releases,
# ~/.local/bin) and only patches per-user rc files.
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
