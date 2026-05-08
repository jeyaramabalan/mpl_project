import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { api } from '../api/client';
import { toList } from '../utils/toList';
import { colors } from '../theme';

type PlayerRow = {
  player_id?: number;
  name?: string;
  role?: string;
  current_team_name?: string;
  matches_played?: number;
};

export default function PlayersScreen() {
  const navigation = useNavigation();
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const { data } = await api.get('/players');
      setPlayers(toList(data) as unknown as PlayerRow[]);
    } catch {
      setError('Could not load players.');
      setPlayers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openPlayer = (playerId: number) => {
    const parent = navigation.getParent();
    if (parent) {
      (parent as { navigate: (name: string, params: { playerId: number }) => void }).navigate(
        'PlayerDetail',
        { playerId }
      );
    }
  };

  const roleLabel = (r?: string) => (r === 'Batsman' ? 'Batter' : r ?? '—');

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      {error ? <Text style={styles.err}>{error}</Text> : null}
      <FlatList
        data={players}
        keyExtractor={(p, i) => String(p.player_id ?? i)}
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
        ListHeaderComponent={
          <View style={styles.headerRow}>
            <Text style={[styles.cell, styles.name]}>Player</Text>
            <Text style={[styles.cell, styles.role]}>Role</Text>
            <Text style={[styles.cell, styles.team]}>Team</Text>
          </View>
        }
        renderItem={({ item }) => {
          const id = item.player_id;
          return (
            <TouchableOpacity
              style={styles.row}
              disabled={id == null}
              onPress={() => id != null && openPlayer(Number(id))}
              activeOpacity={0.7}
            >
              <Text style={[styles.cell, styles.name]} numberOfLines={1}>
                {item.name ?? '—'}
              </Text>
              <Text style={[styles.cell, styles.role]} numberOfLines={1}>
                {roleLabel(item.role)}
              </Text>
              <Text style={[styles.cell, styles.team]} numberOfLines={1}>
                {item.current_team_name ?? '—'}
              </Text>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>No players found.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  headerRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: 'center',
  },
  cell: { color: colors.text, fontSize: 14 },
  name: { flex: 1.2, fontWeight: '600' },
  role: { flex: 0.7 },
  team: { flex: 1 },
  err: { color: colors.danger, padding: 12 },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 24 },
});
