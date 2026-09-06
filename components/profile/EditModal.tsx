import { ReactNode } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Colors, Radius, Spacing } from "../../constants/theme";

interface Props {
  visible: boolean;
  title: string;
  onClose: () => void;
  onSave: () => void;
  saveDisabled?: boolean;
  saving?: boolean;
  children: ReactNode;
}

/** One consistent editing surface reused for every Blueprint field, so
 * "how do I edit something" stays familiar across the whole screen instead
 * of each field inventing its own interaction. */
export default function EditModal({
  visible,
  title,
  onClose,
  onSave,
  saveDisabled,
  saving,
  children,
}: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      {/* Modal content sits outside the screen's own KeyboardAvoidingView
       * (if any), so the bottom sheet needs its own — otherwise the
       * TextInput/Save button inside it can end up under the keyboard,
       * especially on Android. */}
      <KeyboardAvoidingView
        style={styles.avoiding}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>

            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Text style={styles.close}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.content}>{children}</View>

          <TouchableOpacity
            style={[
              styles.saveButton,
              (saveDisabled || saving) && styles.saveButtonDisabled,
            ]}
            onPress={onSave}
            disabled={saveDisabled || saving}
          >
            {saving ? (
              <ActivityIndicator color={Colors.text} />
            ) : (
              <Text style={styles.saveText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  avoiding: {
    flex: 1,
  },

  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
  },

  sheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
    maxHeight: "85%",
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },

  title: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: "700",
  },

  close: {
    color: Colors.subtext,
    fontSize: 22,
    padding: 4,
  },

  content: {
    marginBottom: Spacing.lg,
  },

  saveButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 18,
    borderRadius: Radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },

  saveButtonDisabled: {
    opacity: 0.5,
  },

  saveText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
});
