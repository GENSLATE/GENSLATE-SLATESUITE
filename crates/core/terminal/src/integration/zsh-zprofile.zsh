# GENSLATE Terminal: zsh startup shim (.zprofile, login shells). See .zshenv.
if [[ -r $__genslate_user_dir/.zprofile ]]; then
  ZDOTDIR=$__genslate_user_dir
  builtin source "$__genslate_user_dir/.zprofile"
  __genslate_user_dir=${ZDOTDIR:-$HOME}
  ZDOTDIR=$__genslate_shim_dir
fi
