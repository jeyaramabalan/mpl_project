import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

type StackName = 'Records' | 'Champions' | 'Auction' | 'Contact' | 'Rules';

const ITEMS: { name: StackName; label: string; icon: keyof typeof Ionicons.glyphMap; hint: string }[] = [
  { name: 'Records', label: 'Records', icon: 'medal', hint: 'Batting, bowling, fielding & awards' },
  { name: 'Champions', label: 'Champions', icon: 'trophy', hint: 'Season winners & runners' },
  { name: 'Auction', label: 'Auction', icon: 'logo-usd', hint: 'Live auction & squads' },
  { name: 'Contact', label: 'Contact', icon: 'mail', hint: 'Reach the league team' },
  { name: 'Rules', label: 'Rules & FAQ', icon: 'book', hint: 'Match format & guidelines' },
];

export default function MoreScreen() {
  const navigation = useNavigation();

  const open = (name: StackName) => {
    const parent = navigation.getParent();
    if (parent) {
      (parent as { navigate: (n: string) => void }).navigate(name);
    }
  };

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.content}>
      <Text style={styles.intro}>All sections from the MPL website (viewer).</Text>
      {ITEMS.map((it) => (
        <TouchableOpacity key={it.name} style={styles.row} onPress={() => open(it.name)} activeOpacity={0.75}>
          <View style={styles.iconWrap}>
            <Ionicons name={it.icon} size={26} color={colors.accent} />
          </View>
          <View style={styles.textWrap}>
            <Text style={styles.label}>{it.label}</Text>
            <Text style={styles.hint}>{it.hint}</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color={colors.muted} />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  content: { paddingVertical: 12, paddingBottom: 32 },
  intro: { color: colors.muted, fontSize: 14, paddingHorizontal: 20, marginBottom: 12, lineHeight: 20 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginHorizontal: 12,
    marginBottom: 8,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconWrap: { width: 44, alignItems: 'center' },
  textWrap: { flex: 1, minWidth: 0 },
  label: { color: colors.text, fontSize: 17, fontWeight: '600' },
  hint: { color: colors.muted, fontSize: 13, marginTop: 2 },
});
