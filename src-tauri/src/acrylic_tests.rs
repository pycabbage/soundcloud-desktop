use super::*;

#[test]
fn subclass_install_and_remove_is_idempotent() {
    if !cfg!(windows) {
        return;
    }
    install_keep_active_subclass(0);
    remove_keep_active_subclass(0);
    install_keep_active_subclass(0);
    install_keep_active_subclass(0);
    remove_keep_active_subclass(0);
}
