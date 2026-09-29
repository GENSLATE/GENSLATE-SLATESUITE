# GENSLATE Terminal: zsh startup shim (.zshrc) and the zsh shell integration. See .zshenv.
#
# After your .zshrc, marks prompts and commands with OSC 133 / 633 and reports the current
# folder with OSC 7, so the terminal can track commands, exit codes and the working folder.
# It prints nothing of its own and leaves `$?`, your prompt theme and your hooks alone.
if [[ -r $__genslate_user_dir/.zshrc ]]; then
  ZDOTDIR=$__genslate_user_dir
  builtin source "$__genslate_user_dir/.zshrc"
  __genslate_user_dir=${ZDOTDIR:-$HOME}
  ZDOTDIR=$__genslate_shim_dir
fi

if [[ -o interactive && -z ${__genslate_loaded-} ]]; then
  __genslate_loaded=1
  # The terminal's secret for this shell: appended to each command report so it can't be
  # forged by program output. Hidden from everything the shell starts.
  __genslate_nonce=${GENSLATE_NONCE-}
  builtin unset GENSLATE_NONCE
  __genslate_status=0
  __genslate_running=
  __genslate_ps1_wrapped=

  # VS Code's escaping for OSC 633;E: `\` → `\\`, `;` → `\x3b`, control characters → `\xHH`.
  __genslate_escape() {
    emulate -L zsh
    local out= c
    for c in "${(@s::)1}"; do
      case $c in
        '\') out+='\\' ;;
        ';') out+='\x3b' ;;
        [[:cntrl:]]) builtin printf -v c '\\x%02x' $(( #c )); out+=$c ;;
        *) out+=$c ;;
      esac
    done
    REPLY=$out
  }

  # OSC 7 with the percent-encoded current folder.
  __genslate_report_cwd() {
    emulate -L zsh
    setopt no_multibyte
    local out= c i
    for (( i = 1; i <= ${#PWD}; i++ )); do
      c=${PWD[i]}
      if [[ $c == [a-zA-Z0-9/._~-] ]]; then
        out+=$c
      else
        builtin printf -v c '%%%02X' $(( #c & 255 ))
        out+=$c
      fi
    done
    builtin printf '\e]7;file://%s%s\a' "${HOST-}" "$out"
  }

  # First precmd hook: remember the command's exit code before other hooks change `$?`.
  __genslate_save_status() {
    __genslate_status=$?
  }

  # Last precmd hook: close the finished command, report the folder, mark the prompt.
  __genslate_precmd() {
    if [[ -n $__genslate_running ]]; then
      builtin printf '\e]133;D;%s\a' "$__genslate_status"
      __genslate_running=
    fi
    __genslate_report_cwd
    # Themes (powerlevel10k, starship, …) may rebuild PS1 every time: wrap what they made.
    if [[ $PS1 != "$__genslate_ps1_wrapped" ]]; then
      PS1=$'%{\e]133;A\a%}'"$PS1"$'%{\e]133;B\a%}'
      __genslate_ps1_wrapped=$PS1
    fi
  }

  # A command is about to run: report its command line (633;E) and mark the output (133;C).
  __genslate_preexec() {
    __genslate_escape "${1:-${3-}}"
    builtin printf '\e]633;E;%s;%s\a\e]133;C\a' "$REPLY" "$__genslate_nonce"
    __genslate_running=1
  }

  builtin autoload -Uz add-zsh-hook
  precmd_functions=(__genslate_save_status ${precmd_functions[@]})
  add-zsh-hook precmd __genslate_precmd
  add-zsh-hook preexec __genslate_preexec
fi

# Non-login shells read nothing after .zshrc: restore ZDOTDIR now (login shells: in .zlogin).
if [[ ! -o login ]]; then
  if [[ $__genslate_user_dir == "$HOME" ]]; then
    builtin unset ZDOTDIR
  else
    ZDOTDIR=$__genslate_user_dir
  fi
fi
