import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { api } from '../api/client';
import { toList } from '../utils/toList';
import { colors } from '../theme';

type ChampionRow = {
  season_id?: number;
  match_id?: number;
  season_name?: string;
  year?: number;
  winner_team_name?: string;
  runner_team_name?: string;
};

export default function ChampionsScreen() {
  const navigation = useNavigation();
  const [rows, setRows] = useState<ChampionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const { data } = await api.get('/matches/champions');
      setRows(toList(data) as unknown as ChampionRow[]);
    } catch {
      setError('Failed to load champions.');
      setRows([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openMatch = (matchId: number) => {
    const parent = navigation.getParent();
    if (parent) {
      (parent as { navigate: (n: string, p: { matchId: number }) => void }).navigate('MatchDetail', {
        matchId,
      });
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.wrap}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
          tintColor={colors.accent}
        />
      }
    >
      <Text style={styles.lead}>Season winners and runners for each completed season.</Text>
      {error ? <Text style={styles.err}>{error}</Text> : null}
      {rows.length === 0 && !error ? (
        <Text style={styles.muted}>No champions yet — complete a season final to see results here.</Text>
      ) : (
        rows.map((row, index) => {
          const mid = row.match_id;
          const seasonLabel = `${row.season_name || `Season ${row.year ?? ''}`}${row.year != null ? ` (${row.year})` : ''}`;
          return (
            <View
              key={`${row.season_id}-${row.match_id}-${index}`}
              style={[styles.card, index % 2 === 0 ? styles.cardEven : styles.cardOdd]}
            >
              <Text style={styles.season}>{seasonLabel}</Text>
              <Text style={styles.line}>
                <Text style={styles.tag}>Winner </Text>
                {row.winner_team_name ?? '—'}
              </Text>
              <Text style={styles.line}>
                <Text style={styles.tag}>Runner </Text>
                {row.runner_team_name ?? '—'}
              </Text>
              {mid != null ? (
                <TouchableOpacity onPress={() => openMatch(Number(mid))} activeOpacity={0.8}>
                  <Text style={styles.link}>View final →</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  lead: { color: colors.muted, fontSize: 14, marginBottom: 16, lineHeight: 20 },
  err: { color: colors.danger, marginBottom: 12 },
  muted: { color: colors.muted, fontSize: 15 },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
  },
  cardEven: { backgroundColor: colors.surface },
  cardOdd: { backgroundColor: colors.surface },
  season: { color: colors.accent, fontSize: 16, fontWeight: '700', marginBottom: 8 },
  line: { color: colors.text, fontSize: 15, marginBottom: 4 },
  tag: { color: colors.muted, fontWeight: '600' },
  link: { color: colors.accent, fontWeight: '600', marginTop: 10, fontSize: 15 },
});
