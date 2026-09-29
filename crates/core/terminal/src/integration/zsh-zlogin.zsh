# GENSLATE Terminal: zsh startup shim (.zlogin, login shells, read last). See .zshenv.
if [[ -r $__genslate_user_dir/.zlogin ]]; then
  ZDOTDIR=$__genslate_user_dir
  builtin source "$__genslate_user_dir/.zlogin"
  __genslate_user_dir=${ZDOTDIR:-$HOME}
fi
if [[ $__genslate_user_dir == "$HOME" ]]; then
  builtin unset ZDOTDIR
else
  ZDOTDIR=$__genslate_user_dir
fi
