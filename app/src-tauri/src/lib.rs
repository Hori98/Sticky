#[cfg(desktop)]
use tauri::{Emitter, Manager};
#[cfg(desktop)]
use tauri::{PhysicalPosition, PhysicalSize};
#[cfg(desktop)]
use serde::Serialize;

#[cfg(desktop)]
#[derive(Clone, Copy, Serialize)]
struct PickerOpenPayload;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[cfg(desktop)]
    use tauri_plugin_global_shortcut::{
        Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState,
    };

    let open_single_session =
        Shortcut::new(Some(Modifiers::SUPER | Modifiers::ALT), Code::Enter);
    let open_session_picker =
        Shortcut::new(Some(Modifiers::SUPER | Modifiers::ALT), Code::KeyN);
    let toggle_clickthrough =
        Shortcut::new(Some(Modifiers::SUPER | Modifiers::ALT), Code::Slash);

    tauri::Builder::default()
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler({
                    let open_single_session = open_single_session.clone();
                    let open_session_picker = open_session_picker.clone();
                    let toggle_clickthrough = toggle_clickthrough.clone();
                    move |app, shortcut, event| {
                        if event.state() != ShortcutState::Pressed {
                            return;
                        }

                        let Some(window) = app.get_webview_window("main") else {
                            return;
                        };

                        if shortcut == &open_single_session {
                            let _ = window.show();
                            let _ = window.set_focus();
                            let _ = app.emit("session://open-single", true);
                            return;
                        }

                        if shortcut == &open_session_picker {
                            let _ = window.show();
                            let _ = window.set_focus();
                            let _ = app.emit("session://open-picker", PickerOpenPayload);
                            return;
                        }

                        #[cfg(debug_assertions)]
                        if shortcut == &toggle_clickthrough {
                            let enabled = window
                                .state::<OverlayState>()
                                .toggle_clickthrough()
                                .unwrap_or(false);

                            let _ = window.set_ignore_cursor_events(enabled);
                            let _ = app.emit("overlay://clickthrough", enabled);
                        }
                    }
                })
                .build(),
        )
        .setup({
            let open_single_session = open_single_session.clone();
            let open_session_picker = open_session_picker.clone();
            let toggle_clickthrough = toggle_clickthrough.clone();
            move |app| {
                #[cfg(desktop)]
                {
                    app.manage(OverlayState::default());

                    let window = app
                        .get_webview_window("main")
                        .expect("main window not found");

                    window.set_decorations(false)?;
                    window.set_always_on_top(true)?;
                    window.set_shadow(false)?;
                    window.set_visible_on_all_workspaces(true)?;
                    window.set_skip_taskbar(true)?;

                    if let Some(monitor) = window.current_monitor()? {
                        let size = monitor.size();
                        let position = monitor.position();
                        window.set_position(PhysicalPosition::new(
                            position.x,
                            position.y,
                        ))?;
                        window.set_size(PhysicalSize::new(
                            size.width,
                            size.height,
                        ))?;
                    }

                    window.set_focus()?;

                    app.global_shortcut().register(open_single_session)?;
                    app.global_shortcut().register(open_session_picker)?;
                    #[cfg(debug_assertions)]
                    app.global_shortcut().register(toggle_clickthrough)?;
                }

                if cfg!(debug_assertions) {
                    app.handle().plugin(
                        tauri_plugin_log::Builder::default()
                            .level(log::LevelFilter::Info)
                            .build(),
                    )?;
                }
                Ok(())
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(desktop)]
#[derive(Default)]
struct OverlayState(std::sync::Mutex<bool>);

#[cfg(desktop)]
impl OverlayState {
    fn toggle_clickthrough(&self) -> Result<bool, String> {
        let mut state = self
            .0
            .lock()
            .map_err(|_| "failed to lock overlay state".to_string())?;
        *state = !*state;
        Ok(*state)
    }
}
