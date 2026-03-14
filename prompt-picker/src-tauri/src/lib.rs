mod config;
mod indexer;

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

fn toggle_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        if window.is_visible().unwrap_or(false) {
            let _ = window.hide();
        } else {
            if window.move_window(Position::TrayCenter).is_err() {
                let _ = window.move_window(Position::Center);
            }
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
            rescan
        ])
        .setup(move |app| {
            let _window = WebviewWindowBuilder::new(app, "main", WebviewUrl::default())
                .title("Prompt Picker")
                .inner_size(460.0, 400.0)
                .resizable(false)
                .decorations(false)
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
                "About Prompt Picker",
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
                        println!("Prompt Picker v0.1.0");
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
