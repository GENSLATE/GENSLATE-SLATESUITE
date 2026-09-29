# GENSLATE Terminal: zsh startup shim (.zshenv). The terminal starts zsh with ZDOTDIR pointing
# at this folder; each shim file loads your own file of the same name (from your ZDOTDIR, or
# home) and .zshrc then adds the shell integration. ZDOTDIR is restored for everything you
# start. Top-level code on purpose: sourcing your files inside a function would make their
# `typeset`/`local` variables local.
__genslate_shim_dir=$ZDOTDIR
__genslate_user_dir=${GENSLATE_USER_ZDOTDIR:-$HOME}
builtin unset GENSLATE_USER_ZDOTDIR
if [[ -r $__genslate_user_dir/.zshenv ]]; then
  ZDOTDIR=$__genslate_user_dir
  builtin source "$__genslate_user_dir/.zshenv"
  # Your .zshenv may move ZDOTDIR (e.g. to ~/.config/zsh): read the other files from there.
  __genslate_user_dir=${ZDOTDIR:-$HOME}
  ZDOTDIR=$__genslate_shim_dir
fi
