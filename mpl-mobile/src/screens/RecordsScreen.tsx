import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import { api } from '../api/client';
import { toList } from '../utils/toList';
import { colors } from '../theme';

const RECORDS_NAME_MAX = 15;

type Col = { key: string; label: string; kind?: 'player' | 'match' | 'team' };

function truncateName(name: unknown, max = RECORDS_NAME_MAX) {
  const s = String(name ?? '').trim();
  if (!s) return '—';
  return s.length <= max ? s : `${s.slice(0, max)}…`;
}

function RecordTable({
  title,
  rows,
  columns,
  onPlayer,
  onMatch,
}: {
  title: string;
  rows: Record<string, unknown>[] | undefined | null;
  columns: Col[];
  onPlayer: (id: number) => void;
  onMatch: (id: number) => void;
}) {
  if (!rows || rows.length === 0) return null;
  return (
    <View style={styles.tableWrap}>
      <Text style={styles.tableTitle}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View>
          <View style={[styles.tr, styles.trHead]}>
            <Text style={[styles.th, styles.thRank]}>#</Text>
            {columns.map((c) => (
              <Text key={c.key} style={styles.th}>
                {c.label}
              </Text>
            ))}
          </View>
          {rows.map((row, idx) => (
            <View key={idx} style={styles.tr}>
              <Text style={[styles.td, styles.thRank]}>{idx + 1}</Text>
              {columns.map((c) => {
                const raw = row[c.key];
                if (c.kind === 'player' && row.player_id != null) {
                  return (
                    <TouchableOpacity key={c.key} style={styles.tdCell} onPress={() => onPlayer(Number(row.player_id))}>
                      <Text style={styles.link}>{truncateName(raw)}</Text>
                    </TouchableOpacity>
                  );
                }
                if (c.kind === 'match' && row.match_id != null) {
                  return (
                    <TouchableOpacity key={c.key} style={styles.tdCell} onPress={() => onMatch(Number(row.match_id))}>
                      <Text style={styles.link}>Match</Text>
                    </TouchableOpacity>
                  );
                }
                if (c.kind === 'team') {
                  return (
                    <Text key={c.key} style={styles.td}>
                      {truncateName(raw)}
                    </Text>
                  );
                }
                return (
                  <Text key={c.key} style={styles.td}>
                    {raw != null && raw !== '' ? String(raw) : '—'}
                  </Text>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

export default function RecordsScreen() {
  const navigation = useNavigation();
  const [seasons, setSeasons] = useState<{ season_id?: number; name?: string; year?: number }[]>([]);
  const [matchYears, setMatchYears] = useState<number[]>([]);
  const [seasonId, setSeasonId] = useState('all');
  const [scope, setScope] = useState<'individual' | 'team'>('individual');
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [standings, setStandings] = useState<{ name?: string; nrrDisplay?: string; position?: number }[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openPlayer = (playerId: number) => {
    const parent = navigation.getParent();
    if (parent) {
      (parent as { navigate: (n: string, p: { playerId: number }) => void }).navigate('PlayerDetail', { playerId });
    }
  };

  const openMatch = (matchId: number) => {
    const parent = navigation.getParent();
    if (parent) {
      (parent as { navigate: (n: string, p: { matchId: number }) => void }).navigate('MatchDetail', { matchId });
    }
  };

  const loadRecords = useCallback(async () => {
    setError(null);
    try {
      const params: Record<string, string> = { scope, season_id: 'all' };
      if (seasonId !== 'all') {
        if (seasonId.startsWith('year:')) params.year = seasonId.slice(5);
        else {
          const num = parseInt(seasonId, 10);
          if (Number.isInteger(num)) params.season_id = String(num);
        }
      }
      const { data: res } = await api.get('/records', { params });
      setData(res && typeof res === 'object' ? (res as Record<string, unknown>) : null);
    } catch {
      setError('Failed to load records.');
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [seasonId, scope]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [pub, yearsRes] = await Promise.all([
          api.get('/seasons/public'),
          api.get('/seasons/match-years').catch(() => ({ data: [] })),
        ]);
        if (!alive) return;
        const list = toList(pub.data) as unknown as { season_id?: number; name?: string; year?: number }[];
        setSeasons([...list].sort((a, b) => (b.season_id || 0) - (a.season_id || 0)));
        const yRaw = yearsRes.data;
        const yList = Array.isArray(yRaw) ? yRaw : [];
        setMatchYears(yList.map((y) => Number(y)).filter((y) => Number.isInteger(y)));
      } catch {
        setSeasons([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    setLoading(true);
    loadRecords();
  }, [loadRecords]);

  useEffect(() => {
    if (scope !== 'team' || seasonId === 'all' || seasonId.startsWith('year:')) {
      setStandings(null);
      return;
    }
    const seasonNum = parseInt(seasonId, 10);
    if (!Number.isInteger(seasonNum)) {
      setStandings(null);
      return;
    }
    let alive = true;
    api
      .get('/standings', { params: { season_id: seasonNum } })
      .then(({ data: list }) => {
        if (alive) setStandings(toList(list) as { name?: string; nrrDisplay?: string; position?: number }[]);
      })
      .catch(() => {
        if (alive) setStandings([]);
      });
    return () => {
      alive = false;
    };
  }, [scope, seasonId]);

  const onRefresh = () => {
    setRefreshing(true);
    loadRecords();
  };

  const batting = data?.batting as Record<string, Record<string, unknown>[]> | undefined;
  const bowling = data?.bowling as Record<string, Record<string, unknown>[]> | undefined;
  const fielding = data?.fielding as Record<string, Record<string, unknown>[]> | undefined;
  const awards = data?.awards as Record<string, Record<string, unknown>[]> | undefined;
  const team = data?.team as Record<string, Record<string, unknown>[]> | undefined;

  const nrrRows =
    scope === 'team' && seasonId !== 'all' && !seasonId.startsWith('year:') && standings && standings.length > 0
      ? standings.slice(0, 15).map((s) => ({
          team_name: s.name,
          value: s.nrrDisplay ?? '—',
          position: s.position,
        }))
      : null;

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
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
      }
    >
      <Text style={styles.intro}>Top 15 in each category (same filters as the website).</Text>
      {error ? <Text style={styles.err}>{error}</Text> : null}

      <Text style={styles.filterLabel}>Season</Text>
      <View style={styles.pickerOuter}>
        <Picker
          selectedValue={seasonId}
          onValueChange={(v) => setSeasonId(String(v))}
          style={styles.picker}
          dropdownIconColor={colors.text}
        >
          <Picker.Item label="All-time" value="all" color={colors.text} />
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
          {matchYears.map((y) => (
            <Picker.Item key={`y-${y}`} label={`Calendar ${y}`} value={`year:${y}`} color={colors.text} />
          ))}
        </Picker>
      </View>

      <Text style={styles.filterLabel}>View</Text>
      <View style={styles.pickerOuter}>
        <Picker
          selectedValue={scope}
          onValueChange={(v) => setScope(v as 'individual' | 'team')}
          style={styles.picker}
          dropdownIconColor={colors.text}
        >
          <Picker.Item label="Individual" value="individual" color={colors.text} />
          <Picker.Item label="Team" value="team" color={colors.text} />
        </Picker>
      </View>

      <Text style={styles.hint}>
        All-time includes every season. Calendar year uses completed matches in that year. Team view includes team
        records and best NRR when a single season is selected.
      </Text>

      {data && scope === 'individual' && (
        <>
          <Text style={styles.h1}>Batting</Text>
          <RecordTable
            title="Highest individual score"
            rows={batting?.highestScore}
            columns={[
              { key: 'player_name', label: 'Player', kind: 'player' },
              { key: 'value', label: 'Runs' },
              { key: 'match_id', label: 'Match', kind: 'match' },
            ]}
            onPlayer={openPlayer}
            onMatch={openMatch}
          />
          <RecordTable
            title="Most runs"
            rows={batting?.mostRuns}
            columns={[
              { key: 'player_name', label: 'Player', kind: 'player' },
              { key: 'value', label: 'Runs' },
              { key: 'matches', label: 'Mat' },
            ]}
            onPlayer={openPlayer}
            onMatch={openMatch}
          />
          <RecordTable
            title="Highest strike rate (min 30 balls)"
            rows={batting?.highestStrikeRate}
            columns={[
              { key: 'player_name', label: 'Player', kind: 'player' },
              { key: 'value', label: 'SR' },
              { key: 'runs', label: 'Runs' },
              { key: 'balls', label: 'Balls' },
            ]}
            onPlayer={openPlayer}
            onMatch={openMatch}
          />
          <RecordTable
            title="Most fours"
            rows={batting?.mostFours}
            columns={[
              { key: 'player_name', label: 'Player', kind: 'player' },
              { key: 'value', label: '4s' },
            ]}
            onPlayer={openPlayer}
            onMatch={openMatch}
          />
          <RecordTable
            title="Most twos"
            rows={batting?.mostTwos}
            columns={[
              { key: 'player_name', label: 'Player', kind: 'player' },
              { key: 'value', label: '2s' },
            ]}
            onPlayer={openPlayer}
            onMatch={openMatch}
          />
          <RecordTable
            title="Most ducks"
            rows={batting?.mostDucks}
            columns={[
              { key: 'player_name', label: 'Player', kind: 'player' },
              { key: 'value', label: 'Ducks' },
            ]}
            onPlayer={openPlayer}
            onMatch={openMatch}
          />

          <Text style={styles.h1}>Bowling</Text>
          <RecordTable
            title="Best bowling figures"
            rows={bowling?.bestBowlingFigures}
            columns={[
              { key: 'player_name', label: 'Player', kind: 'player' },
              { key: 'value', label: 'Figures' },
              { key: 'match_id', label: 'Match', kind: 'match' },
            ]}
            onPlayer={openPlayer}
            onMatch={openMatch}
          />
          <RecordTable
            title="Most wickets"
            rows={bowling?.mostWickets}
            columns={[
              { key: 'player_name', label: 'Player', kind: 'player' },
              { key: 'value', label: 'Wkts' },
              { key: 'matches', label: 'Mat' },
            ]}
            onPlayer={openPlayer}
            onMatch={openMatch}
          />
          <RecordTable
            title="Best economy (min 5 overs)"
            rows={bowling?.bestEconomy}
            columns={[
              { key: 'player_name', label: 'Player', kind: 'player' },
              { key: 'value', label: 'Econ' },
              { key: 'overs', label: 'Overs' },
            ]}
            onPlayer={openPlayer}
            onMatch={openMatch}
          />
          <RecordTable
            title="Most maidens"
            rows={bowling?.mostMaidens}
            columns={[
              { key: 'player_name', label: 'Player', kind: 'player' },
              { key: 'value', label: 'Maidens' },
            ]}
            onPlayer={openPlayer}
            onMatch={openMatch}
          />
          <RecordTable
            title="Most 3-wicket hauls"
            rows={bowling?.mostThreeWicketHauls}
            columns={[
              { key: 'player_name', label: 'Player', kind: 'player' },
              { key: 'value', label: 'Hauls' },
            ]}
            onPlayer={openPlayer}
            onMatch={openMatch}
          />
          <RecordTable
            title="Most 5-wicket hauls"
            rows={bowling?.mostFiveWicketHauls}
            columns={[
              { key: 'player_name', label: 'Player', kind: 'player' },
              { key: 'value', label: 'Hauls' },
            ]}
            onPlayer={openPlayer}
            onMatch={openMatch}
          />

          <Text style={styles.h1}>Fielding</Text>
          <RecordTable
            title="Most catches"
            rows={fielding?.mostCatches}
            columns={[
              { key: 'player_name', label: 'Player', kind: 'player' },
              { key: 'value', label: 'Catches' },
            ]}
            onPlayer={openPlayer}
            onMatch={openMatch}
          />
          <RecordTable
            title="Most run-outs"
            rows={fielding?.mostRunOuts}
            columns={[
              { key: 'player_name', label: 'Player', kind: 'player' },
              { key: 'value', label: 'Run-outs' },
            ]}
            onPlayer={openPlayer}
            onMatch={openMatch}
          />
          <RecordTable
            title="Most stumpings"
            rows={fielding?.mostStumpings}
            columns={[
              { key: 'player_name', label: 'Player', kind: 'player' },
              { key: 'value', label: 'Stumpings' },
            ]}
            onPlayer={openPlayer}
            onMatch={openMatch}
          />
          <RecordTable
            title="Best fielding impact"
            rows={fielding?.bestFieldingImpact}
            columns={[
              { key: 'player_name', label: 'Player', kind: 'player' },
              { key: 'value', label: 'Impact' },
            ]}
            onPlayer={openPlayer}
            onMatch={openMatch}
          />

          <Text style={styles.h1}>Impact & awards</Text>
          <RecordTable
            title="Most player of the match"
            rows={awards?.mostMoM}
            columns={[
              { key: 'player_name', label: 'Player', kind: 'player' },
              { key: 'value', label: 'MoM' },
            ]}
            onPlayer={openPlayer}
            onMatch={openMatch}
          />
          <RecordTable
            title="MVP (season) — MoM + impact"
            rows={awards?.mvpSeason}
            columns={[
              { key: 'player_name', label: 'Player', kind: 'player' },
              { key: 'mom_count', label: 'MoM' },
              { key: 'total_impact', label: 'Impact' },
            ]}
            onPlayer={openPlayer}
            onMatch={openMatch}
          />
          <RecordTable
            title="Highest impact"
            rows={awards?.highestImpact}
            columns={[
              { key: 'player_name', label: 'Player', kind: 'player' },
              { key: 'value', label: 'Impact' },
              { key: 'matches', label: 'Mat' },
            ]}
            onPlayer={openPlayer}
            onMatch={openMatch}
          />
          <RecordTable
            title="Best debut (latest season)"
            rows={awards?.bestDebut}
            columns={[
              { key: 'player_name', label: 'Player', kind: 'player' },
              { key: 'total_impact', label: 'Impact' },
              { key: 'runs', label: 'Runs' },
              { key: 'wickets', label: 'Wkts' },
            ]}
            onPlayer={openPlayer}
            onMatch={openMatch}
          />
          <RecordTable
            title="Part of champion side"
            rows={awards?.partOfChampionSide}
            columns={[
              { key: 'player_name', label: 'Player', kind: 'player' },
              { key: 'value', label: 'Titles' },
            ]}
            onPlayer={openPlayer}
            onMatch={openMatch}
          />
        </>
      )}

      {data && scope === 'team' && (
        <>
          <Text style={styles.h1}>Team records</Text>
          {seasonId === 'all' && (
            <Text style={styles.muted}>Select a specific season to see Best NRR from standings.</Text>
          )}
          <RecordTable
            title="Highest team score"
            rows={team?.highestScore}
            columns={[
              { key: 'team_name', label: 'Team', kind: 'team' },
              { key: 'value', label: 'Score' },
              { key: 'match_id', label: 'Match', kind: 'match' },
            ]}
            onPlayer={openPlayer}
            onMatch={openMatch}
          />
          <RecordTable
            title="Most titles"
            rows={team?.mostTitles}
            columns={[
              { key: 'team_name', label: 'Team', kind: 'team' },
              { key: 'value', label: 'Titles' },
            ]}
            onPlayer={openPlayer}
            onMatch={openMatch}
          />
          {nrrRows && (
            <RecordTable
              title="Best NRR (season)"
              rows={nrrRows as Record<string, unknown>[]}
              columns={[
                { key: 'team_name', label: 'Team', kind: 'team' },
                { key: 'value', label: 'NRR' },
                { key: 'position', label: 'Pos' },
              ]}
              onPlayer={openPlayer}
              onMatch={openMatch}
            />
          )}
        </>
      )}

      {!data && !loading && !error ? <Text style={styles.muted}>No records data.</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  intro: { color: colors.muted, fontSize: 14, marginBottom: 12, lineHeight: 20 },
  err: { color: colors.danger, marginBottom: 12 },
  filterLabel: { color: colors.muted, fontSize: 12, marginBottom: 4, marginTop: 8 },
  pickerOuter: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, marginBottom: 8 },
  picker: { color: colors.text },
  hint: { color: colors.muted, fontSize: 12, lineHeight: 18, marginBottom: 16 },
  h1: { color: colors.accent, fontSize: 18, fontWeight: '700', marginTop: 16, marginBottom: 10 },
  muted: { color: colors.muted, fontSize: 14, marginBottom: 8 },
  tableWrap: { marginBottom: 20 },
  tableTitle: { color: colors.text, fontSize: 15, fontWeight: '700', marginBottom: 8 },
  tr: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.border },
  trHead: { backgroundColor: colors.surface },
  th: { color: colors.muted, fontSize: 11, fontWeight: '600', paddingVertical: 8, paddingHorizontal: 6, minWidth: 72 },
  thRank: { minWidth: 28, width: 28 },
  td: { color: colors.text, fontSize: 12, paddingVertical: 8, paddingHorizontal: 6, minWidth: 72 },
  tdCell: { paddingVertical: 8, paddingHorizontal: 6, minWidth: 72, justifyContent: 'center' },
  link: { color: colors.accent, fontSize: 12, fontWeight: '600' },
});
