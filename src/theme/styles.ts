import { StyleSheet } from 'react-native';
import { colors, spacing, borderRadius, fontSize, fontWeight } from './colors';

export const commonStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.greyDark,
  },
  contentContainer: {
    padding: spacing.md,
  },
  card: {
    backgroundColor: colors.grey,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowSpaceBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.normal,
  },
  textSmall: {
    color: colors.greyVeryLight,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.normal,
  },
  textLarge: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium,
  },
  title: {
    color: colors.white,
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.md,
  },
  subtitle: {
    color: colors.greyVeryLight,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.sm,
  },
  button: {
    backgroundColor: colors.green,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  buttonSecondary: {
    backgroundColor: colors.purple,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.greyLight,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    backgroundColor: colors.greyLight,
    color: colors.white,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.md,
    marginBottom: spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: colors.greyLight,
    marginVertical: spacing.md,
  },
});

