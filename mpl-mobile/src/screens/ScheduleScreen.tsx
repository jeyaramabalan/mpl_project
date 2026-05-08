import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import { api } from '../api/client';
import { toList } from '../utils/toList';
import { colors } from '../theme';

type Fixture = {
  match_id?: number;
  team1_name?: string;
  team2_name?: string;
  status?: string;
  match_datetime?: string;
  venue?: string | null;
  season_name?: string;
  /** Regular over (1–4) that was played as Super Over; null if none */
  super_over_number?: number | null;
};

type Season = { season_id?: number; name?: string; year?: number };

export default function ScheduleScreen() {
  const navigation = useNavigation();
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeason, setSelectedSeason] = useState('');
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(true);
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
        /* optional */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const loadFixtures = useCallback(async () => {
    setError(null);
    try {
      const params: Record<string, string | number> = {};
      const n = parseInt(selectedSeason, 10);
      if (selectedSeason && Number.isInteger(n)) params.season_id = n;
      const { data } = await api.get('/matches', { params });
      setFixtures(toList(data) as unknown as Fixture[]);
    } catch {
      setError('Could not load schedule. Check API URL / network.');
      setFixtures([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedSeason]);

  useEffect(() => {
    setLoading(true);
    loadFixtures();
  }, [loadFixtures]);

  const onRefresh = () => {
    setRefreshing(true);
    loadFixtures();
  };

  const openMatch = (matchId: number) => {
    const parent = navigation.getParent();
    if (parent) {
      (parent as { navigate: (name: string, params: { matchId: number }) => void }).navigate(
        'MatchDetail',
        { matchId }
      );
    }
  };

  const formatWhen = (iso?: string) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return iso;
    }
  };

  const superOverLabel = (n: unknown) => {
    if (n == null || n === '') return null;
    const v = Number(n);
    if (!Number.isFinite(v) || v <= 0) return null;
    return `Super Over (regular over ${v} was played as SO)`;
  };

  const renderItem = ({ item }: { item: Fixture }) => {
    const id = item.match_id;
    const venue = item.venue != null && String(item.venue).trim() !== '' ? String(item.venue).trim() : null;
    const so = superOverLabel(item.super_over_number);
    return (
      <TouchableOpacity
        style={styles.row}
        disabled={id == null}
        onPress={() => id != null && openMatch(Number(id))}
        activeOpacity={0.7}
      >
        <Text style={styles.vs}>
          {item.team1_name ?? '?'} vs {item.team2_name ?? '?'}
        </Text>
        <Text style={styles.meta}>{formatWhen(item.match_datetime)}</Text>
        {venue ? (
          <Text style={styles.venue} numberOfLines={2}>
            Venue: {venue}
          </Text>
        ) : null}
        {so ? <Text style={styles.superOver}>{so}</Text> : null}
        <Text style={styles.status}>{item.status ?? ''}</Text>
      </TouchableOpacity>
    );
  };

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
      {loading && !refreshing ? (
        <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 24 }} />
      ) : error ? (
        <Text style={styles.err}>{error}</Text>
      ) : (
        <FlatList
          data={fixtures}
          keyExtractor={(it, i) => String(it.match_id ?? i)}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
          }
          ListEmptyComponent={<Text style={styles.empty}>No fixtures for this filter.</Text>}
          contentContainerStyle={fixtures.length === 0 ? styles.emptyList : undefined}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  pickerWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerLabel: { color: colors.muted, fontSize: 12, marginBottom: 4 },
  picker: { color: colors.text, marginBottom: 8 },
  row: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.bg,
  },
  vs: { color: colors.text, fontSize: 16, fontWeight: '600' },
  meta: { color: colors.muted, fontSize: 13, marginTop: 4 },
  venue: { color: colors.text, fontSize: 13, marginTop: 6, lineHeight: 18 },
  superOver: {
    color: '#e8b923',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  status: { color: colors.accent, fontSize: 13, marginTop: 6, fontWeight: '500' },
  err: { color: colors.danger, padding: 16 },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 24 },
  emptyList: { flexGrow: 1 },
});
