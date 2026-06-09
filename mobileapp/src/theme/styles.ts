import { StyleSheet } from "react-native";
import { colors } from "./colors";

export const sharedStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    paddingHorizontal: 16,
  },

  header: {
    marginBottom: 18,
  },

  eyebrow: {
    color: colors.primary,
    fontWeight: "800",
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
  },

  title: {
    fontSize: 30,
    fontWeight: "900",
    color: colors.text,
  },

  subtitle: {
    color: colors.mutedText,
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
  },

  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.text,
    marginBottom: 8,
  },

  muted: {
    color: colors.mutedText,
    lineHeight: 20,
  },

  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignItems: "center",
  },

  primaryButtonText: {
    color: colors.white,
    fontWeight: "900",
    fontSize: 16,
  },

  secondaryButton: {
    backgroundColor: colors.secondary,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: "center",
  },

  secondaryButtonText: {
    color: colors.white,
    fontWeight: "800",
  },
});