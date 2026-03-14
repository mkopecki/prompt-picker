import { useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import "./index.css";

function App() {
  useEffect(() => {
    const appWindow = getCurrentWindow();
    const unlisten = appWindow.onFocusChanged(({ payload: focused }) => {
      if (!focused) {
        appWindow.hide();
      }
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  return (
    <div className="w-[460px] min-h-[200px] max-h-[600px] bg-white dark:bg-neutral-800 rounded-xl border-[0.5px] border-neutral-200/50 dark:border-neutral-700/50 shadow-2xl overflow-hidden">
      <div className="p-3 text-sm text-neutral-500 dark:text-neutral-400">
        Prompt Picker — Phase 1
      </div>
    </div>
  );
}

export default App;
