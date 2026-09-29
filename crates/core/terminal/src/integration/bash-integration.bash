# GENSLATE Terminal: shell integration for bash (started as `bash --rcfile <this file> -i`).
#
# Loads your usual startup files first, exactly as bash would, then marks prompts and commands
# with OSC 133 / 633 and reports the current folder with OSC 7, so the terminal can track
# commands, exit codes and the working folder. It prints nothing of its own and keeps your
# PROMPT_COMMAND, DEBUG trap, bash-preexec hooks and `$?` working. Works with bash 3.2+.

# Only once per shell, and only when interactive.
if [[ -n "${__genslate_loaded-}" || $- != *i* ]]; then
  builtin return 0 2>/dev/null
fi
__genslate_loaded=1

# 1. The user's startup files (`--rcfile` replaces them, and bash ignores it for login shells).
if [[ "${GENSLATE_SHELL_LOGIN-}" == 1 ]]; then
  builtin unset GENSLATE_SHELL_LOGIN
  if [[ -r /etc/profile ]]; then builtin source /etc/profile; fi
  if [[ -r ~/.bash_profile ]]; then
    builtin source ~/.bash_profile
  elif [[ -r ~/.bash_login ]]; then
    builtin source ~/.bash_login
  elif [[ -r ~/.profile ]]; then
    builtin source ~/.profile
  fi
else
  if [[ -r /etc/bash.bashrc ]]; then builtin source /etc/bash.bashrc; fi
  if [[ -r ~/.bashrc ]]; then builtin source ~/.bashrc; fi
fi

# 2. The integration.
__genslate_status=0
__genslate_running=
__genslate_ready=
__genslate_hist_ready=
__genslate_last_hist=
__genslate_ps1_wrapped=

# VS Code's escaping for OSC 633;E: `\` → `\\`, `;` → `\x3b`, control characters → `\xHH`.
__genslate_escape() {
  local s=$1
  s=${s//\\/\\\\}
  s=${s//;/\\x3b}
  s=${s//$'\n'/\\x0a}
  s=${s//$'\r'/\\x0d}
  s=${s//$'\t'/\\x09}
  s=${s//$'\e'/\\x1b}
  s=${s//$'\a'/\\x07}
  REPLY=$s
}

# OSC 7 with the percent-encoded current folder (Git Bash: /c/Users → C:/Users).
__genslate_report_cwd() {
  local dir=$PWD
  if [[ "${OSTYPE-}" == msys* || "${OSTYPE-}" == cygwin* ]] && [[ $dir =~ ^/([a-zA-Z])(/.*)?$ ]]; then
    dir="${BASH_REMATCH[1]}:${BASH_REMATCH[2]:-/}"
  fi
  local LC_ALL=C out= c i
  for (( i = 0; i < ${#dir}; i++ )); do
    c=${dir:i:1}
    case $c in
      [a-zA-Z0-9/._~:-]) out+=$c ;;
      *) builtin printf -v c '%%%02X' "'$c"; out+=$c ;;
    esac
  done
  [[ $out == /* ]] || out=/$out
  builtin printf '\e]7;file://%s%s\a' "${HOSTNAME-}" "$out"
}

# The newest history entry: number and command line.
__genslate_history() {
  local line
  line=$(HISTTIMEFORMAT= builtin history 1 2>/dev/null)
  line=${line#"${line%%[![:space:]]*}"}
  __genslate_hist_num=${line%%[!0-9]*}
  line=${line#"$__genslate_hist_num"}
  __genslate_hist_cmd=${line:2}
}

__genslate_set_status() {
  return "${1:-0}"
}

# First in PROMPT_COMMAND: remember the command's exit code (and hand it on unchanged).
__genslate_prompt_start() {
  __genslate_status=$?
  __genslate_ready=
  return "$__genslate_status"
}

# Last in PROMPT_COMMAND: close the finished command, report the folder, mark the prompt.
__genslate_prompt_end() {
  if [[ -n $__genslate_running ]]; then
    builtin printf '\e]133;D;%s\a' "$__genslate_status"
    __genslate_running=
  fi
  if [[ -z $__genslate_hist_ready ]]; then
    __genslate_history
    __genslate_last_hist=$__genslate_hist_num
    __genslate_hist_ready=1
  fi
  __genslate_report_cwd
  # Prompt themes may rebuild PS1 every time: wrap whatever they produced.
  if [[ "$PS1" != "$__genslate_ps1_wrapped" ]]; then
    PS1="\[\e]133;A\a\]$PS1\[\e]133;B\a\]"
    __genslate_ps1_wrapped=$PS1
  fi
  __genslate_ready=1
  return "$__genslate_status"
}

# A command is about to run: report its command line (OSC 633;E) and mark the output (133;C).
__genslate_command_start() {
  __genslate_escape "$1"
  builtin printf '\e]633;E;%s\a\e]133;C\a' "$REPLY"
  __genslate_running=1
}

# DEBUG trap: only the first command after a prompt counts (not completion, not our hooks).
__genslate_preexec() {
  [[ -n $__genslate_ready && -z "${COMP_LINE-}" ]] || return 0
  __genslate_ready=
  [[ "$BASH_COMMAND" == __genslate_prompt_start* ]] && return 0
  local previous=$__genslate_last_hist command
  __genslate_history
  __genslate_last_hist=$__genslate_hist_num
  if [[ -n $__genslate_hist_num && $__genslate_hist_num != "$previous" ]]; then
    command=$__genslate_hist_cmd
  else
    # Not recorded (HISTCONTROL=ignorespace, history off): the command bash is running.
    command=$BASH_COMMAND
  fi
  __genslate_command_start "$command"
}

if [[ -n "${bash_preexec_imported-}${__bp_imported-}" ]]; then
  # bash-preexec owns the DEBUG trap and PROMPT_COMMAND: use its hooks.
  __genslate_bp_precmd() {
    __genslate_status=$?
    __genslate_prompt_end
  }
  __genslate_bp_preexec() {
    __genslate_command_start "$1"
  }
  precmd_functions+=(__genslate_bp_precmd)
  preexec_functions+=(__genslate_bp_preexec)
else
  if [[ "$(builtin declare -p PROMPT_COMMAND 2>/dev/null)" == "declare -a"* ]]; then
    PROMPT_COMMAND=(__genslate_prompt_start "${PROMPT_COMMAND[@]}" __genslate_prompt_end)
  else
    PROMPT_COMMAND=$'__genslate_prompt_start\n'"${PROMPT_COMMAND-}"$'\n__genslate_prompt_end'
  fi
  # Keep a DEBUG trap the user's files installed: run it after ours, with `$?` intact.
  __genslate_user_trap=
  __genslate_capture_trap() { __genslate_user_trap=$2; }
  __genslate_trap_line=$(builtin trap -p DEBUG)
  if [[ -n $__genslate_trap_line ]]; then
    builtin eval "__genslate_capture_trap ${__genslate_trap_line#trap }"
  fi
  builtin unset __genslate_trap_line
  if [[ -n $__genslate_user_trap ]]; then
    builtin trap '__genslate_trap_status=$?; __genslate_preexec; __genslate_set_status "$__genslate_trap_status"; builtin eval "$__genslate_user_trap"' DEBUG
  else
    builtin trap '__genslate_preexec' DEBUG
  fi
fi
