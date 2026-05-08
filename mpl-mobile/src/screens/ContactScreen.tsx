import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors } from '../theme';

export default function ContactScreen() {
  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Contact us</Text>
      <Text style={styles.p}>Reach out to the Metalworks Premier League team.</Text>
      <View style={styles.card}>
        <Text style={styles.strong}>Coming soon</Text>
        <Text style={styles.p}>Contact details and a form will be added here, matching the website.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 12 },
  p: { color: colors.text, fontSize: 15, lineHeight: 22, marginBottom: 12 },
  strong: { color: colors.accent, fontSize: 16, fontWeight: '700', marginBottom: 8 },
  card: {
    marginTop: 8,
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
