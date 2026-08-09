import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../theme/colors';
import { fontSize, spacing } from '../theme/spacing';

interface Props {
  title: string;
  right?: React.ReactNode;
  onBack?: () => void;
}

export default function ScreenHeader({ title, right, onBack }: Props) {
  const navigation = useNavigation();
  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => (onBack ? onBack() : navigation.goBack())}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="chevron-back" size={22} color={colors.textDark} />
      </TouchableOpacity>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.right}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.bg,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { flex: 1, textAlign: 'center', fontSize: fontSize.lg, fontWeight: '700', color: colors.textDark },
  right: { width: 36, alignItems: 'flex-end' },
});
