use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, WebviewUrl, WebviewWindowBuilder,
};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};
use tauri_plugin_positioner::{Position, WindowExt};

fn toggle_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        if window.is_visible().unwrap_or(false) {
            let _ = window.hide();
        } else {
            // Try positioning near tray, fall back to center
            if window.move_window(Position::TrayCenter).is_err() {
                let _ = window.move_window(Position::Center);
            }
            let _ = window.show();
            let _ = window.set_focus();
        }
    }
}

pub fn run() {
    let mut app = tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|_app, _args, _cwd| {}))
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_positioner::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(move |app, shortcut, event| {
                    let expected =
                        Shortcut::new(Some(Modifiers::SUPER | Modifiers::SHIFT), Code::KeyP);
                    if shortcut == &expected && event.state() == ShortcutState::Pressed {
                        toggle_window(app);
                    }
                })
                .build(),
        )
        .setup(|app| {
            // Create the popup window (hidden initially)
            let _window =
                WebviewWindowBuilder::new(app, "main", WebviewUrl::default())
                    .title("Prompt Picker")
                    .inner_size(460.0, 400.0)
                    .resizable(false)
                    .decorations(false)
                    .always_on_top(true)
                    .skip_taskbar(true)
                    .visible(false)
                    .build()?;

            // Register global shortcut
            let shortcut =
                Shortcut::new(Some(Modifiers::SUPER | Modifiers::SHIFT), Code::KeyP);
            app.global_shortcut().register(shortcut)?;

            // Build tray menu
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
            let menu = Menu::with_items(app, &[&open_config_i, &reload_i, &about_i, &quit_i])?;

            // Build tray icon
            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "open_config" => {
                        // Phase 2: will open config file
                        println!("Open Config clicked");
                    }
                    "reload" => {
                        // Phase 3: will trigger rescan
                        println!("Reload clicked");
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
                    // Feed events to positioner plugin
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

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    #[cfg(target_os = "macos")]
    app.set_activation_policy(tauri::ActivationPolicy::Accessory);

    app.run(|_app_handle, _event| {});
}
