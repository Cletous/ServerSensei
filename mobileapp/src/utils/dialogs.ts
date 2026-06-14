import { Alert, Platform } from "react-native";

export function showInfo(title: string, message: string): void {
  if (Platform.OS === "web") {
    window.alert(`${title}\n\n${message}`);
    return;
  }

  Alert.alert(title, message);
}

export function showError(title: string, message: string): void {
  showInfo(title, message);
}

export function showConfirm({
  title,
  message,
  confirmText = "OK",
  cancelText = "Cancel",
  destructive = false,
  onConfirm,
}: {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
}): void {
  if (Platform.OS === "web") {
    const confirmed = window.confirm(`${title}\n\n${message}`);

    if (confirmed) {
      void onConfirm();
    }

    return;
  }

  Alert.alert(title, message, [
    {
      text: cancelText,
      style: "cancel",
    },
    {
      text: confirmText,
      style: destructive ? "destructive" : "default",
      onPress: () => {
        void onConfirm();
      },
    },
  ]);
}