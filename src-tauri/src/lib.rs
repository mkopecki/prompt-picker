mod config;
mod indexer;
mod resolver;

use std::sync::atomic::{AtomicI32, Ordering};
use std::sync::{Arc, Mutex};
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager, WebviewUrl, WebviewWindowBuilder,
};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};
use tauri_plugin_positioner::{Position, WindowExt};

struct AppState {
    prompts: Arc<Mutex<Vec<indexer::Prompt>>>,
}

fn app_version() -> &'static str {
    const CONF: &str = include_str!("../tauri.conf.json");
    static VERSION: std::sync::OnceLock<String> = std::sync::OnceLock::new();
    VERSION.get_or_init(|| {
        serde_json::from_str::<serde_json::Value>(CONF)
            .ok()
            .and_then(|v| v["version"].as_str().map(String::from))
            .unwrap_or_else(|| "0.0.0".to_string())
    })
}

/// PID of the app that was frontmost before we showed our window.
static PREVIOUS_APP_PID: AtomicI32 = AtomicI32::new(-1);

#[cfg(target_os = "macos")]
mod macos_focus {
    use objc::runtime::{Class, Object};
    use objc::{msg_send, sel, sel_impl};

    pub fn get_frontmost_pid() -> Option<i32> {
        unsafe {
            let cls = Class::get("NSWorkspace")?;
            let workspace: *mut Object = msg_send![cls, sharedWorkspace];
            let app: *mut Object = msg_send![workspace, frontmostApplication];
            if app.is_null() {
                return None;
            }
            let pid: i32 = msg_send![app, processIdentifier];
            Some(pid)
        }
    }

    pub fn activate_pid(pid: i32) {
        unsafe {
            if let Some(cls) = Class::get("NSRunningApplication") {
                let app: *mut Object =
                    msg_send![cls, runningApplicationWithProcessIdentifier: pid];
                if !app.is_null() {
                    // NSApplicationActivateAllWindows | NSApplicationActivateIgnoringOtherApps
                    let _: bool = msg_send![app, activateWithOptions: 3u64];
                }
            }
        }
    }

    /// Simulate Cmd+V keystroke via CGEvent to paste clipboard contents.
    pub fn simulate_paste() {
        use core_graphics::event::{CGEvent, CGEventFlags, CGKeyCode};
        use core_graphics::event_source::{CGEventSource, CGEventSourceStateID};

        // Virtual keycode for 'V' on macOS
        const KV_V: CGKeyCode = 9;

        let source = CGEventSource::new(CGEventSourceStateID::HIDSystemState)
            .expect("Failed to create CGEventSource");

        let key_down = CGEvent::new_keyboard_event(source.clone(), KV_V, true)
            .expect("Failed to create key down event");
        key_down.set_flags(CGEventFlags::CGEventFlagCommand);
        key_down.post(core_graphics::event::CGEventTapLocation::HID);

        let key_up = CGEvent::new_keyboard_event(source, KV_V, false)
            .expect("Failed to create key up event");
        key_up.set_flags(CGEventFlags::CGEventFlagCommand);
        key_up.post(core_graphics::event::CGEventTapLocation::HID);
    }
}

/// Center the window on whichever monitor currently contains the mouse cursor.
fn center_on_active_screen(window: &tauri::WebviewWindow) {
    if let Ok(cursor) = window.cursor_position() {
        if let Ok(monitors) = window.available_monitors() {
            for monitor in &monitors {
                let pos = monitor.position();
                let size = monitor.size();
                let left = pos.x as f64;
                let top = pos.y as f64;
                let right = left + size.width as f64;
                let bottom = top + size.height as f64;

                if cursor.x >= left && cursor.x < right && cursor.y >= top && cursor.y < bottom {
                    let win_size = window
                        .outer_size()
                        .unwrap_or(tauri::PhysicalSize {
                            width: 460,
                            height: 400,
                        });
                    let x = pos.x + (size.width as i32 - win_size.width as i32) / 2;
                    let y = pos.y + (size.height as i32 - win_size.height as i32) / 2;
                    let _ = window.set_position(tauri::PhysicalPosition::new(x, y));
                    return;
                }
            }
        }
    }
    // Fallback: use the positioner plugin's center (primary monitor)
    let _ = window.move_window(Position::Center);
}

fn toggle_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        if window.is_visible().unwrap_or(false) {
            let _ = window.hide();
            #[cfg(target_os = "macos")]
            {
                let pid = PREVIOUS_APP_PID.load(Ordering::Relaxed);
                if pid > 0 {
                    macos_focus::activate_pid(pid);
                }
            }
        } else {
            #[cfg(target_os = "macos")]
            {
                if let Some(pid) = macos_focus::get_frontmost_pid() {
                    PREVIOUS_APP_PID.store(pid, Ordering::Relaxed);
                }
            }
            center_on_active_screen(&window);
            let _ = window.show();
            let _ = window.set_focus();
        }
    }
}

fn parse_shortcut(shortcut_str: &str) -> Option<Shortcut> {
    let parts: Vec<&str> = shortcut_str.split('+').collect();
    if parts.is_empty() {
        return None;
    }

    let mut modifiers = Modifiers::empty();
    let key_str = parts.last()?;

    for &part in &parts[..parts.len() - 1] {
        match part.trim() {
            "Cmd" | "Super" | "Command" => modifiers |= Modifiers::SUPER,
            "Shift" => modifiers |= Modifiers::SHIFT,
            "Ctrl" | "Control" => modifiers |= Modifiers::CONTROL,
            "Alt" | "Option" => modifiers |= Modifiers::ALT,
            _ => {}
        }
    }

    let code = match key_str.trim().to_uppercase().as_str() {
        "A" => Code::KeyA,
        "B" => Code::KeyB,
        "C" => Code::KeyC,
        "D" => Code::KeyD,
        "E" => Code::KeyE,
        "F" => Code::KeyF,
        "G" => Code::KeyG,
        "H" => Code::KeyH,
        "I" => Code::KeyI,
        "J" => Code::KeyJ,
        "K" => Code::KeyK,
        "L" => Code::KeyL,
        "M" => Code::KeyM,
        "N" => Code::KeyN,
        "O" => Code::KeyO,
        "P" => Code::KeyP,
        "Q" => Code::KeyQ,
        "R" => Code::KeyR,
        "S" => Code::KeyS,
        "T" => Code::KeyT,
        "U" => Code::KeyU,
        "V" => Code::KeyV,
        "W" => Code::KeyW,
        "X" => Code::KeyX,
        "Y" => Code::KeyY,
        "Z" => Code::KeyZ,
        "0" => Code::Digit0,
        "1" => Code::Digit1,
        "2" => Code::Digit2,
        "3" => Code::Digit3,
        "4" => Code::Digit4,
        "5" => Code::Digit5,
        "6" => Code::Digit6,
        "7" => Code::Digit7,
        "8" => Code::Digit8,
        "9" => Code::Digit9,
        "SPACE" => Code::Space,
        _ => return None,
    };

    let mods = if modifiers.is_empty() {
        None
    } else {
        Some(modifiers)
    };
    Some(Shortcut::new(mods, code))
}

#[tauri::command]
fn get_config() -> Result<config::Config, String> {
    config::load_config()
}

#[tauri::command]
fn open_config() -> Result<(), String> {
    config::open_config_file()
}

#[tauri::command]
fn get_prompts(state: tauri::State<'_, AppState>) -> Vec<indexer::Prompt> {
    state.prompts.lock().unwrap().clone()
}

#[tauri::command]
fn rescan(state: tauri::State<'_, AppState>) -> Result<Vec<indexer::Prompt>, String> {
    let cfg = config::load_config()?;
    let prompts = indexer::scan(&cfg);
    *state.prompts.lock().unwrap() = prompts.clone();
    Ok(prompts)
}

#[tauri::command]
fn get_resolved_chain(
    path: String,
    repo: String,
    state: tauri::State<'_, AppState>,
) -> resolver::ResolvedChain {
    let prompts = state.prompts.lock().unwrap().clone();
    resolver::resolve_chain(&path, &repo, &prompts)
}

#[tauri::command]
fn get_prompt_content(path: String, repo: String) -> Result<String, String> {
    let cfg = config::load_config()?;
    let repo_config = cfg
        .repos
        .iter()
        .find(|r| r.name == repo)
        .ok_or_else(|| format!("Repo not found: {repo}"))?;
    let full_path = config::expand_path(&repo_config.path).join(&path);
    let content = std::fs::read_to_string(&full_path)
        .map_err(|e| format!("Failed to read {}: {e}", full_path.display()))?;
    Ok(indexer::strip_frontmatter(&content))
}

#[tauri::command]
fn copy_to_clipboard(app: tauri::AppHandle, text: String) -> Result<(), String> {
    use tauri_plugin_clipboard_manager::ClipboardExt;
    app.clipboard()
        .write_text(text)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_version() -> String {
    format!("v{}", app_version())
}

#[tauri::command]
fn restore_previous_focus() {
    #[cfg(target_os = "macos")]
    {
        let pid = PREVIOUS_APP_PID.load(Ordering::Relaxed);
        if pid > 0 {
            macos_focus::activate_pid(pid);
        }
    }
}

#[tauri::command]
fn paste_to_app(app: tauri::AppHandle, text: String) -> Result<(), String> {
    use tauri_plugin_clipboard_manager::ClipboardExt;
    app.clipboard()
        .write_text(text)
        .map_err(|e| e.to_string())?;

    #[cfg(target_os = "macos")]
    {
        let pid = PREVIOUS_APP_PID.load(Ordering::Relaxed);
        if pid > 0 {
            macos_focus::activate_pid(pid);
            // Brief delay to let the target app gain focus before pasting
            std::thread::sleep(std::time::Duration::from_millis(100));
            macos_focus::simulate_paste();
        }
    }
    Ok(())
}

pub fn run() {
    let cfg = config::ensure_config().expect("Failed to load config");
    let shortcut = parse_shortcut(&cfg.shortcut)
        .unwrap_or_else(|| Shortcut::new(Some(Modifiers::SUPER | Modifiers::SHIFT), Code::KeyP));

    // Initial scan
    let prompts = indexer::scan(&cfg);
    println!("Indexed {} prompts", prompts.len());

    let state = AppState {
        prompts: Arc::new(Mutex::new(prompts)),
    };

    let expected_shortcut = shortcut.clone();

    let mut app = tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|_app, _args, _cwd| {}))
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_positioner::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(move |app, sc, event| {
                    if sc == &expected_shortcut && event.state() == ShortcutState::Pressed {
                        toggle_window(app);
                    }
                })
                .build(),
        )
        .manage(state)
        .invoke_handler(tauri::generate_handler![
            get_config,
            open_config,
            get_prompts,
            rescan,
            get_resolved_chain,
            get_prompt_content,
            copy_to_clipboard,
            restore_previous_focus,
            paste_to_app,
            get_version
        ])
        .setup(move |app| {
            let _window = WebviewWindowBuilder::new(app, "main", WebviewUrl::default())
                .title("Prompt Picker")
                .inner_size(460.0, 400.0)
                .resizable(false)
                .decorations(false)
                .transparent(true)
                .always_on_top(true)
                .skip_taskbar(true)
                .visible(false)
                .build()?;

            app.global_shortcut().register(shortcut)?;

            let open_config_i =
                MenuItem::with_id(app, "open_config", "Open Config", true, None::<&str>)?;
            let reload_i =
                MenuItem::with_id(app, "reload", "Reload", true, None::<&str>)?;
            let about_i = MenuItem::with_id(
                app,
                "about",
                &format!("About Prompt Picker v{}", app_version()),
                true,
                None::<&str>,
            )?;
            let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu =
                Menu::with_items(app, &[&open_config_i, &reload_i, &about_i, &quit_i])?;

            let app_handle_for_reload = app.handle().clone();
            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(move |app, event| match event.id.as_ref() {
                    "open_config" => {
                        let _ = config::open_config_file();
                    }
                    "reload" => {
                        if let Ok(cfg) = config::load_config() {
                            let prompts = indexer::scan(&cfg);
                            if let Some(state) =
                                app_handle_for_reload.try_state::<AppState>()
                            {
                                *state.prompts.lock().unwrap() = prompts.clone();
                                let _ = app_handle_for_reload.emit("prompts-changed", &prompts);
                            }
                        }
                    }
                    "about" => {
                        println!("Prompt Picker v{}", app_version());
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    tauri_plugin_positioner::on_tray_event(tray.app_handle(), &event);

                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        toggle_window(tray.app_handle());
                    }
                })
                .build(app)?;

            // Start watchers
            config::watch_config(app.handle().clone());
            indexer::watch_repos(&cfg, app.handle().clone());

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    #[cfg(target_os = "macos")]
    app.set_activation_policy(tauri::ActivationPolicy::Accessory);

    app.run(|_app_handle, _event| {});
}
