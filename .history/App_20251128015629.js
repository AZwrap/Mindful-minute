import * as QuickActions from "expo-quick-actions";

const HAS_QA = Platform.OS === "android" && QuickActions?.setShortcutItems;

useEffect(() => {
  if (!HAS_QA) {
    console.log("QuickActions not available (probably Expo Go).");
    return;
  }

  QuickActions.setShortcutItems([
    {
      id: "new_entry",
      title: "New Entry",
      subtitle: "Start writing",
      icon: "compose",
    },
  ]);

  const sub = QuickActions.addShortcutListener((shortcut) => {
    console.log("Shortcut pressed:", shortcut);
    if (shortcut.id === "new_entry") {
      navigationRef.current?.navigate("Write");
    }
  });

  return () => sub.remove?.();
}, []);
