#include <napi.h>
#include <windows.h>
#include <string>

// the hook handle — kept global so we can unhook it later
static HHOOK g_hook = NULL;

static void CallJs(Napi::Env env, Napi::Function jsCallback, std::nullptr_t*, std::string* data);

using ViolationTSFN = Napi::TypedThreadSafeFunction<std::nullptr_t, std::string, CallJs>;
static ViolationTSFN g_tsfn;


// list of virtual key codes to block
static bool shouldBlock(DWORD vkCode, DWORD flags) {
  switch (vkCode) {
    case VK_LWIN:       // left Windows key
    case VK_RWIN:       // right Windows key
    case VK_TAB:        // Alt+Tab (checked with Alt below)
    case VK_ESCAPE:     // Ctrl+Escape = Start menu
    case VK_SNAPSHOT:   // PrintScreen
      return true;
    case 'C':           // Ctrl+C
    case 'V':           // Ctrl+V
    case 'X':           // Ctrl+X
      // only block if Ctrl is held down
      return (GetAsyncKeyState(VK_CONTROL) & 0x8000) != 0;
    default:
      return false;
  }
}

static std::string labelFor(DWORD vkCode, bool isAltTab, bool isWinShifS){
  if (isAltTab) return "alt_tab";
  if (isWinShifS) return "win_shift_s";

  switch(vkCode){
    case VK_LWIN: 
    case VK_RWIN: return "win_key";
    case VK_ESCAPE: return "ctrl_esc";
    case VK_SNAPSHOT: return "print_screen";
    case 'C': return "ctrl_c";
    case 'V': return "ctrl_v";
    case 'X': return "ctrl_x";
    default: return "unknown";
  }
}

static void CallJs(Napi::Env env, Napi::Function jsCallback, std::nullptr_t*, std::string* data) {
  // env/jsCallback can be null during shutdown — guard against that
  if (env != nullptr && jsCallback != nullptr) {
    jsCallback.Call({ Napi::String::New(env, *data) });
  }
  delete data; // free the heap copy now that JS has read it (or we're shutting down)
}

static void reportViolation(const std::string& label) {
  if (g_tsfn == nullptr) return; // nothing to report to if not started
  std::string* data = new std::string(label); // copy so it survives until JS reads it
  g_tsfn.NonBlockingCall(data); // queues the call — CallJs (already wired via ViolationTSFN) handles it on the JS thread
}

// this function runs for every keypress on the entire system
static LRESULT CALLBACK LowLevelKeyboardProc(int nCode, WPARAM wParam, LPARAM lParam) {
  if (nCode == HC_ACTION) {
    KBDLLHOOKSTRUCT* kb = (KBDLLHOOKSTRUCT*)lParam;

    // block Alt+Tab specifically
    bool isAltTab = (kb->vkCode == VK_TAB) &&
                    (GetAsyncKeyState(VK_MENU) & 0x8000);

    // block Win+Shift+S (snipping tool)
    bool isWinShiftS = (kb->vkCode == 'S') &&
                       (GetAsyncKeyState(VK_LWIN) & 0x8000 ||
                        GetAsyncKeyState(VK_RWIN) & 0x8000) &&
                       (GetAsyncKeyState(VK_SHIFT) & 0x8000);

    if (shouldBlock(kb->vkCode, kb->flags) || isAltTab || isWinShiftS) {
      // build the readable label for whichever key combo just fired
      std::string label = labelFor(kb->vkCode, isAltTab, isWinShiftS);
      // send that label to the JS side so it can be logged
      reportViolation(label);
      return 1; // returning 1 swallows the keypress — nothing else receives it
    }
  }
  // pass the key through normally if we're not blocking it
  return CallNextHookEx(g_hook, nCode, wParam, lParam);
}

// called from JS: starts the keyboard hook
Napi::Value StartHook(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (g_hook != NULL) {
    return env.Undefined();
  }

  Napi::Function callback = info[0].As<Napi::Function>();
  g_tsfn = ViolationTSFN::New(
    env,
    callback,
    "ViolationCallback",  // internal name, for debugging only
    0,                     // unlimited queue size
    1                      // only one thread will use this
  );

  g_hook = SetWindowsHookEx(WH_KEYBOARD_LL, LowLevelKeyboardProc, NULL, 0);
  if (g_hook == NULL) {
    Napi::Error::New(env, "Failed to install keyboard hook").ThrowAsJavaScriptException();
  }
  return env.Undefined();
}


// called from JS: removes the keyboard hook
Napi::Value StopHook(const Napi::CallbackInfo& info) {
  if (g_hook != NULL) {
    UnhookWindowsHookEx(g_hook);
    g_hook = NULL;
  }
  if (g_tsfn) {
    g_tsfn.Release();
  }
  return info.Env().Undefined();
}

// shared helper — writes one DWORD value into the policy registry key
static void setPolicyValue(const char* valueName, bool enable) {
  HKEY hKey;
  // open, or create, the policy folder for this Windows user
  LONG result = RegCreateKeyExA(
    HKEY_CURRENT_USER,
    "Software\\Microsoft\\Windows\\CurrentVersion\\Policies\\System",
    0, NULL, REG_OPTION_NON_VOLATILE, KEY_SET_VALUE, NULL, &hKey, NULL
  );
  if (result != ERROR_SUCCESS) {
    return; // silently skip if the key could not be opened
  }
  // 1 means the action is blocked, 0 means it is allowed
  DWORD value = enable ? 1 : 0;
  RegSetValueExA(hKey, valueName, 0, REG_DWORD, (const BYTE*)&value, sizeof(value));
  // close the key so Windows saves the change
  RegCloseKey(hKey);
}

// turns Windows' built-in Task Manager block on or off
Napi::Value SetTaskManagerDisabled(const Napi::CallbackInfo& info) {
  bool disable = info[0].As<Napi::Boolean>().Value();
  setPolicyValue("DisableTaskMgr", disable);
  return info.Env().Undefined();
}

// removes the Lock option from the Ctrl+Alt+Del screen
Napi::Value SetLockWorkstationDisabled(const Napi::CallbackInfo& info) {
  bool disable = info[0].As<Napi::Boolean>().Value();
  setPolicyValue("DisableLockWorkstation", disable);
  return info.Env().Undefined();
}

// removes the Change a password option from the Ctrl+Alt+Del screen
Napi::Value SetChangePasswordDisabled(const Napi::CallbackInfo& info) {
  bool disable = info[0].As<Napi::Boolean>().Value();
  setPolicyValue("DisableChangePassword", disable);
  return info.Env().Undefined();
}

// removes the Switch user option from the Ctrl+Alt+Del screen
Napi::Value SetFastUserSwitchingDisabled(const Napi::CallbackInfo& info) {
  bool disable = info[0].As<Napi::Boolean>().Value();
  setPolicyValue("HideFastUserSwitching", disable);
  return info.Env().Undefined();
}

// hides or shows the Windows taskbar and secondary taskbar (multi-monitor)
// called with true to restore, false to hide during lockdown
Napi::Value SetTaskbarVisible(const Napi::CallbackInfo& info) {
  bool visible = info[0].As<Napi::Boolean>().Value();

  // finds the taskbar window by its well-known class name
  HWND taskbar = FindWindow(TEXT("Shell_TrayWnd"), NULL);
  if (taskbar != NULL) {
    // SW_HIDE makes it completely invisible and unclickable
    // SW_SHOW restores it to its normal state
    ShowWindow(taskbar, visible ? SW_SHOW : SW_HIDE);
  }

  // also handle the secondary taskbar on multi-monitor setups
  HWND secondaryTaskbar = FindWindow(TEXT("Shell_SecondaryTrayWnd"), NULL);
  if (secondaryTaskbar != NULL) {
    ShowWindow(secondaryTaskbar, visible ? SW_SHOW : SW_HIDE);
  }

  return info.Env().Undefined();
}

// registers all functions so Node.js can call them via require()
Napi::Object Init(Napi::Env env, Napi::Object exports) {
  exports.Set("startHook",                    Napi::Function::New(env, StartHook));
  exports.Set("stopHook",                     Napi::Function::New(env, StopHook));
  exports.Set("setTaskManagerDisabled",       Napi::Function::New(env, SetTaskManagerDisabled));
  exports.Set("setLockWorkstationDisabled",   Napi::Function::New(env, SetLockWorkstationDisabled));
  exports.Set("setChangePasswordDisabled",    Napi::Function::New(env, SetChangePasswordDisabled));
  exports.Set("setFastUserSwitchingDisabled", Napi::Function::New(env, SetFastUserSwitchingDisabled));
  exports.Set("setTaskbarVisible",            Napi::Function::New(env, SetTaskbarVisible));
  // was missing from Init in your original — SetTaskbarVisible existed but was never callable from JS
  return exports;
}

NODE_API_MODULE(keyboard_hook, Init)