import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { api } from '../api/client';
import { toList } from '../utils/toList';
import { colors } from '../theme';

type Season = { season_id?: number; name?: string; year?: number };

type StandingRow = {
  team_id?: number;
  name?: string;
  position?: number;
  played?: number;
  wins?: number;
  losses?: number;
  no_result?: number;
  nrrDisplay?: string;
  points?: number;
};

export default function StandingsScreen() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeason, setSelectedSeason] = useState('');
  const [rows, setRows] = useState<StandingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await api.get('/seasons/public');
        if (!alive) return;
        const list = toList(data) as unknown as Season[];
        const sorted = [...list].sort((a, b) => (b.season_id || 0) - (a.season_id || 0));
        setSeasons(sorted);
        if (sorted.length > 0) {
          const id = sorted[0].season_id;
          if (id != null) setSelectedSeason(String(id));
        }
      } catch {
        setError('Could not load seasons.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const loadStandings = useCallback(async () => {
    const seasonNum = parseInt(selectedSeason, 10);
    if (!selectedSeason || !Number.isInteger(seasonNum)) {
      setRows([]);
      setLoadingData(false);
      setRefreshing(false);
      return;
    }
    setError(null);
    try {
      const { data } = await api.get('/standings', { params: { season_id: seasonNum } });
      setRows(toList(data) as unknown as StandingRow[]);
    } catch {
      setError('Could not load standings.');
      setRows([]);
    } finally {
      setLoadingData(false);
      setRefreshing(false);
    }
  }, [selectedSeason]);

  useEffect(() => {
    if (!selectedSeason) return;
    setLoadingData(true);
    loadStandings();
  }, [selectedSeason, loadStandings]);

  const onRefresh = () => {
    setRefreshing(true);
    loadStandings();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      {seasons.length > 0 && (
        <View style={styles.pickerWrap}>
          <Text style={styles.pickerLabel}>Season</Text>
          <Picker
            selectedValue={selectedSeason}
            onValueChange={(v) => setSelectedSeason(String(v))}
            style={styles.picker}
            dropdownIconColor={colors.text}
          >
            {seasons.map((s) => {
              const id = s.season_id;
              if (id == null) return null;
              return (
                <Picker.Item
                  key={id}
                  label={`${s.name ?? 'Season'} (${s.year ?? id})`}
                  value={String(id)}
                  color={colors.text}
                />
              );
            })}
          </Picker>
        </View>
      )}

      {error ? <Text style={styles.err}>{error}</Text> : null}

      {loadingData && !refreshing ? (
        <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => String(r.team_id ?? r.name)}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
          }
          ListHeaderComponent={
            <View style={styles.headerRow}>
              <Text style={[styles.cell, styles.pos]}>#</Text>
              <Text style={[styles.cell, styles.team]}>Team</Text>
              <Text style={[styles.cell, styles.sm]}>P</Text>
              <Text style={[styles.cell, styles.sm]}>W</Text>
              <Text style={[styles.cell, styles.sm]}>L</Text>
              <Text style={[styles.cell, styles.nrr]}>NRR</Text>
              <Text style={[styles.cell, styles.pts]}>Pts</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Text style={[styles.cell, styles.pos]}>{item.position ?? '—'}</Text>
              <Text style={[styles.cell, styles.team]} numberOfLines={2}>
                {item.name ?? '—'}
              </Text>
              <Text style={[styles.cell, styles.sm]}>{item.played ?? '—'}</Text>
              <Text style={[styles.cell, styles.sm]}>{item.wins ?? '—'}</Text>
              <Text style={[styles.cell, styles.sm]}>{item.losses ?? '—'}</Text>
              <Text style={[styles.cell, styles.nrr]} numberOfLines={1}>
                {item.nrrDisplay ?? '—'}
              </Text>
              <Text style={[styles.cell, styles.pts]}>{item.points ?? '—'}</Text>
            </View>
          )}
          ListEmptyComponent={
            !loadingData && selectedSeason ? (
              <Text style={styles.empty}>No standings for this season yet.</Text>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' },
  pickerWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerLabel: { color: colors.muted, fontSize: 12, marginBottom: 4 },
  picker: { color: colors.text, marginBottom: 8 },
  headerRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: 'center',
  },
  cell: { color: colors.text, fontSize: 12 },
  pos: { width: 28 },
  team: { flex: 1, marginRight: 4 },
  sm: { width: 22, textAlign: 'center' },
  nrr: { width: 52, textAlign: 'right' },
  pts: { width: 30, textAlign: 'right', fontWeight: '600' },
  err: { color: colors.danger, padding: 12 },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 24, paddingHorizontal: 16 },
});
