import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import { api } from '../api/client';
import { toList } from '../utils/toList';
import { colors } from '../theme';

type Season = { season_id?: number; name?: string; year?: number };

type Batter = {
  player_id?: number;
  player_name?: string;
  matches?: number;
  innings?: number;
  runs?: number;
  hs?: number;
  fours?: number;
  avg?: number;
  sr?: number;
};

type Bowler = {
  player_id?: number;
  player_name?: string;
  matches?: number;
  overs?: string;
  wickets?: number;
  runs?: number;
  econ?: number | null;
};

type ImpactRow = {
  player_id?: number;
  player_name?: string;
  matches?: number;
  total_impact?: number;
  bat_impact?: number;
  bowl_impact?: number;
  field_impact?: number;
  avg_impact_per_match?: number | null;
};

type BidRow = {
  player_id?: number;
  player_name?: string;
  bid_value?: number;
  seasons?: number;
  avg_impact_per_match?: number | null;
};

type LeaderboardPayload = {
  batting?: Batter[];
  bowling?: Bowler[];
  impact?: ImpactRow[];
  highest_bid?: BidRow[];
};

type ActiveTab = 'batting' | 'bowling' | 'impact' | 'highest_bid';

/** Wide impact table (matches website columns); scrolls horizontally on narrow screens */
const IMPACT_TABLE_MIN_WIDTH = 520;

function buildLeaderboardParams(selected: string): { season_id: string; year?: string } {
  if (selected === 'all') return { season_id: 'all' };
  if (selected.startsWith('year:')) return { season_id: 'all', year: selected.slice(5) };
  return { season_id: selected };
}

function unwrapLeaderboardBody(data: unknown): LeaderboardPayload {
  if (!data || typeof data !== 'object') return {};
  const o = data as Record<string, unknown>;
  const inner = o.data && typeof o.data === 'object' ? (o.data as Record<string, unknown>) : o;
  return inner as LeaderboardPayload;
}

function formatBatAvg(avg: unknown): string {
  if (avg === Infinity || avg === 'Infinity') return 'N/R';
  const n = Number(avg);
  return Number.isFinite(n) ? n.toFixed(2) : '—';
}

function formatNum(n: unknown, digits = 2): string {
  if (n == null || n === '') return '—';
  const v = Number(n);
  return Number.isFinite(v) ? v.toFixed(digits) : '—';
}

function formatIntStat(n: unknown): string {
  if (n == null || n === '') return '—';
  const v = Number(n);
  return Number.isFinite(v) ? String(Math.trunc(v)) : '—';
}

export default function LeaderboardScreen() {
  const navigation = useNavigation();
  const { width: windowWidth } = useWindowDimensions();
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [matchYears, setMatchYears] = useState<number[]>([]);
  const [selectedScope, setSelectedScope] = useState('');
  const [loadingSeasons, setLoadingSeasons] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<LeaderboardPayload>({});
  const [activeTab, setActiveTab] = useState<ActiveTab>('batting');

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoadingSeasons(true);
      try {
        const [pub, yearsRes] = await Promise.all([
          api.get('/seasons/public'),
          api.get('/seasons/match-years').catch(() => ({ data: [] })),
        ]);
        if (!alive) return;
        const list = toList(pub.data) as unknown as Season[];
        const sorted = [...list].sort((a, b) => (b.season_id || 0) - (a.season_id || 0));
        setSeasons(sorted);
        const yRaw = yearsRes.data;
        const yList = Array.isArray(yRaw) ? yRaw : [];
        setMatchYears(
          yList
            .filter((y) => y != null)
            .map((y) => Number(y))
            .filter((y) => Number.isInteger(y))
        );
        if (sorted.length > 0) {
          const id = sorted[0].season_id;
          if (id != null) setSelectedScope(String(id));
          else setSelectedScope('all');
        } else {
          setSelectedScope('all');
        }
      } catch {
        if (alive) {
          setError('Failed to load seasons.');
          setSelectedScope('all');
        }
      } finally {
        if (alive) setLoadingSeasons(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const loadLeaderboards = useCallback(async () => {
    if (!selectedScope) return;
    setError(null);
    try {
      const params = buildLeaderboardParams(selectedScope);
      const { data: body } = await api.get('/leaderboard', { params });
      const d = unwrapLeaderboardBody(body);
      setData({
        batting: toList(d.batting) as Batter[],
        bowling: toList(d.bowling) as Bowler[],
        impact: toList(d.impact) as ImpactRow[],
        highest_bid: toList(d.highest_bid) as BidRow[],
      });
    } catch {
      setError('Could not load leaderboards.');
      setData({});
    } finally {
      setLoadingData(false);
      setRefreshing(false);
    }
  }, [selectedScope]);

  useEffect(() => {
    if (!selectedScope || loadingSeasons) return;
    setLoadingData(true);
    loadLeaderboards();
  }, [selectedScope, loadingSeasons, loadLeaderboards]);

  const onRefresh = () => {
    setRefreshing(true);
    loadLeaderboards();
  };

  const openPlayer = (playerId: number) => {
    const parent = navigation.getParent();
    if (parent) {
      (parent as { navigate: (name: string, params: { playerId: number }) => void }).navigate(
        'PlayerDetail',
        { playerId }
      );
    }
  };

  const useAvgBidColumns = selectedScope === 'all' || selectedScope.startsWith('year:');

  const leaderboardListWidth =
    activeTab === 'impact' ? Math.max(windowWidth, IMPACT_TABLE_MIN_WIDTH) : windowWidth;

  const listData = useMemo(() => {
    const slice = <T,>(arr: T[] | undefined) => (arr ?? []).slice(0, 40);
    if (activeTab === 'batting') return slice(data.batting);
    if (activeTab === 'bowling') return slice(data.bowling);
    if (activeTab === 'impact') return slice(data.impact);
    return slice(data.highest_bid);
  }, [activeTab, data]);

  const tabRow = (
    <View style={styles.tabBar}>
      {(
        [
          ['batting', 'Batters'] as const,
          ['bowling', 'Bowlers'] as const,
          ['impact', 'Impact'] as const,
          ['highest_bid', 'Auction'] as const,
        ] as const
      ).map(([key, label]) => (
        <TouchableOpacity
          key={key}
          style={[styles.tab, activeTab === key && styles.tabActive]}
          onPress={() => setActiveTab(key)}
          activeOpacity={0.7}
        >
          <Text
            style={[styles.tabText, activeTab === key && styles.tabTextActive]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
          >
            {label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  if (loadingSeasons) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.pickerWrap}>
        <Text style={styles.pickerLabel}>Stats scope</Text>
        <Picker
          selectedValue={selectedScope}
          onValueChange={(v) => setSelectedScope(String(v))}
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
          {matchYears.map((y) => (
            <Picker.Item key={`y-${y}`} label={`Calendar ${y}`} value={`year:${y}`} color={colors.text} />
          ))}
          <Picker.Item label="All-time" value="all" color={colors.text} />
        </Picker>
      </View>

      {tabRow}

      {error ? <Text style={styles.err}>{error}</Text> : null}

      {loadingData && !refreshing ? (
        <View style={styles.listBody}>
          <ActivityIndicator size="large" color={colors.accent} style={styles.listLoading} />
        </View>
      ) : (
        <View style={styles.listBody}>
          <LeaderboardFlatList
            activeTab={activeTab}
            listWidth={leaderboardListWidth}
            listData={listData}
            refreshing={refreshing}
            onRefresh={onRefresh}
            loadingData={loadingData}
            useAvgBidColumns={useAvgBidColumns}
            openPlayer={openPlayer}
          />
        </View>
      )}
    </View>
  );
}

type LeaderboardFlatListProps = {
  activeTab: ActiveTab;
  listWidth: number;
  listData: unknown[];
  refreshing: boolean;
  onRefresh: () => void;
  loadingData: boolean;
  useAvgBidColumns: boolean;
  openPlayer: (playerId: number) => void;
};

function LeaderboardFlatList({
  activeTab,
  listWidth,
  listData,
  refreshing,
  onRefresh,
  loadingData,
  useAvgBidColumns,
  openPlayer,
}: LeaderboardFlatListProps) {
  const flatList = (
    <FlatList
      key={activeTab}
      style={
        activeTab === 'impact'
          ? { width: listWidth, flex: 1 }
          : { flex: 1, alignSelf: 'stretch' }
      }
      data={listData}
      keyExtractor={(r, i) => String((r as { player_id?: number }).player_id ?? i)}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
      }
      ListHeaderComponent={
            activeTab === 'batting' ? (
              <View style={styles.headerRow}>
                <Text style={[styles.cell, styles.rank]}>#</Text>
                <Text style={[styles.cell, styles.name]}>Player</Text>
                <Text style={[styles.cell, styles.sm]}>Mat</Text>
                <Text style={[styles.cell, styles.sm]}>Runs</Text>
                <Text style={[styles.cell, styles.batNarrow]}>HS</Text>
                <Text style={[styles.cell, styles.sm]}>Avg</Text>
                <Text style={[styles.cell, styles.sm]}>SR</Text>
                <Text style={[styles.cell, styles.batNarrow]}>4s</Text>
              </View>
            ) : activeTab === 'bowling' ? (
              <View style={styles.headerRow}>
                <Text style={[styles.cell, styles.rank]}>#</Text>
                <Text style={[styles.cell, styles.name]}>Player</Text>
                <Text style={[styles.cell, styles.sm]}>Mat</Text>
                <Text style={[styles.cell, styles.bowlOvers]}>Overs</Text>
                <Text style={[styles.cell, styles.sm]}>Wkts</Text>
                <Text style={[styles.cell, styles.sm]}>Runs</Text>
                <Text style={[styles.cell, styles.sm]}>Econ</Text>
              </View>
            ) : activeTab === 'impact' ? (
              <View style={styles.headerRow}>
                <Text style={[styles.cell, styles.rank]}>#</Text>
                <Text style={[styles.cell, styles.impactNameHead]}>Player</Text>
                <Text style={[styles.cell, styles.impactMat]}>Mat</Text>
                <Text style={[styles.cell, styles.impactTotal]}>Total</Text>
                <Text style={[styles.cell, styles.impactAvg]}>Avg/m</Text>
                <Text style={[styles.cell, styles.impactSplit]}>Bat</Text>
                <Text style={[styles.cell, styles.impactSplit]}>Bowl</Text>
                <Text style={[styles.cell, styles.impactSplit]}>Fld</Text>
              </View>
            ) : (
              <View style={styles.headerRow}>
                <Text style={[styles.cell, styles.rank]}>#</Text>
                <Text style={[styles.cell, styles.name]}>Player</Text>
                <Text style={[styles.cell, styles.mid]}>
                  {useAvgBidColumns ? 'Avg bid' : 'Bid'}
                </Text>
                {useAvgBidColumns ? <Text style={[styles.cell, styles.sm]}>Sns</Text> : null}
              </View>
            )
          }
          renderItem={({ item, index }) => {
            if (activeTab === 'batting') {
              const b = item as Batter;
              return (
                <View style={styles.row}>
                  <Text style={[styles.cell, styles.rank]}>{index + 1}</Text>
                  <TouchableOpacity
                    style={styles.nameCell}
                    onPress={() => b.player_id != null && openPlayer(Number(b.player_id))}
                  >
                    <Text numberOfLines={1} style={styles.linkText}>
                      {b.player_name ?? '—'}
                    </Text>
                  </TouchableOpacity>
                  <Text style={[styles.cell, styles.sm]}>{b.matches ?? '—'}</Text>
                  <Text style={[styles.cell, styles.sm]}>{b.runs ?? '—'}</Text>
                  <Text style={[styles.cell, styles.batNarrow]}>{formatIntStat(b.hs)}</Text>
                  <Text style={[styles.cell, styles.sm]}>{formatBatAvg(b.avg)}</Text>
                  <Text style={[styles.cell, styles.sm]}>{formatNum(b.sr)}</Text>
                  <Text style={[styles.cell, styles.batNarrow]}>{formatIntStat(b.fours)}</Text>
                </View>
              );
            }
            if (activeTab === 'bowling') {
              const w = item as Bowler;
              return (
                <View style={styles.row}>
                  <Text style={[styles.cell, styles.rank]}>{index + 1}</Text>
                  <TouchableOpacity
                    style={styles.nameCell}
                    onPress={() => w.player_id != null && openPlayer(Number(w.player_id))}
                  >
                    <Text numberOfLines={1} style={styles.linkText}>
                      {w.player_name ?? '—'}
                    </Text>
                  </TouchableOpacity>
                  <Text style={[styles.cell, styles.sm]}>{w.matches ?? '—'}</Text>
                  <Text style={[styles.cell, styles.bowlOvers]} numberOfLines={1}>
                    {w.overs != null && w.overs !== '' ? String(w.overs) : '—'}
                  </Text>
                  <Text style={[styles.cell, styles.sm]}>{formatIntStat(w.wickets)}</Text>
                  <Text style={[styles.cell, styles.sm]}>{formatIntStat(w.runs)}</Text>
                  <Text style={[styles.cell, styles.sm]}>{formatNum(w.econ)}</Text>
                </View>
              );
            }
            if (activeTab === 'impact') {
              const im = item as ImpactRow;
              return (
                <View style={styles.row}>
                  <Text style={[styles.cell, styles.rank]}>{index + 1}</Text>
                  <TouchableOpacity
                    style={styles.impactNameCell}
                    onPress={() => im.player_id != null && openPlayer(Number(im.player_id))}
                  >
                    <Text numberOfLines={1} style={styles.linkText}>
                      {im.player_name ?? '—'}
                    </Text>
                  </TouchableOpacity>
                  <Text style={[styles.cell, styles.impactMat]}>{im.matches ?? '—'}</Text>
                  <Text style={[styles.cell, styles.impactTotal]}>{formatNum(im.total_impact)}</Text>
                  <Text style={[styles.cell, styles.impactAvg]}>
                    {formatNum(im.avg_impact_per_match)}
                  </Text>
                  <Text style={[styles.cell, styles.impactSplit]}>{formatNum(im.bat_impact)}</Text>
                  <Text style={[styles.cell, styles.impactSplit]}>{formatNum(im.bowl_impact)}</Text>
                  <Text style={[styles.cell, styles.impactSplit]}>{formatNum(im.field_impact)}</Text>
                </View>
              );
            }
            const hb = item as BidRow;
            return (
              <View style={styles.row}>
                <Text style={[styles.cell, styles.rank]}>{index + 1}</Text>
                <TouchableOpacity
                  style={styles.nameCell}
                  onPress={() => hb.player_id != null && openPlayer(Number(hb.player_id))}
                >
                  <Text numberOfLines={1} style={styles.linkText}>
                    {hb.player_name ?? '—'}
                  </Text>
                </TouchableOpacity>
                <Text style={[styles.cell, styles.mid]}>
                  {hb.bid_value != null ? `$${formatNum(hb.bid_value, 0)}` : '—'}
                </Text>
                {useAvgBidColumns ? (
                  <Text style={[styles.cell, styles.sm]}>{hb.seasons ?? '—'}</Text>
                ) : null}
              </View>
            );
          }}
      ListEmptyComponent={
        !loadingData ? <Text style={styles.empty}>No data for this scope.</Text> : null
      }
    />
  );

  if (activeTab === 'impact') {
    return (
      <ScrollView
        horizontal
        nestedScrollEnabled
        style={styles.listScroll}
        contentContainerStyle={styles.listScrollContent}
        showsHorizontalScrollIndicator
      >
        {flatList}
      </ScrollView>
    );
  }

  return flatList;
}

const styles = StyleSheet.create({
  /** Fills space below picker + category tabs so the table is not height-collapsed */
  listBody: { flex: 1, minHeight: 0 },
  listLoading: { flex: 1, marginTop: 20 },
  listScroll: { flex: 1 },
  /** Stretch wide impact table to full vertical space inside horizontal scroll */
  listScrollContent: { flexGrow: 1, alignItems: 'stretch' },
  wrap: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  pickerWrap: {
    paddingHorizontal: 16,
    paddingTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerLabel: { color: colors.muted, fontSize: 12, marginBottom: 4 },
  picker: { color: colors.text, marginBottom: 4 },
  /** Single horizontal row — avoids ScrollView + Android measuring tabs as a tall column */
  tabBar: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'stretch',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  tab: {
    flex: 1,
    minWidth: 0,
    marginHorizontal: 4,
    paddingVertical: 8,
    paddingHorizontal: 2,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: 44,
  },
  tabActive: { borderColor: colors.accent, backgroundColor: colors.surface },
  tabText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  tabTextActive: { color: colors.accent },
  headerRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: 'center',
  },
  cell: { color: colors.text, fontSize: 12 },
  linkText: { color: colors.accent, fontSize: 12 },
  rank: { width: 28 },
  name: { flex: 1, marginRight: 6, minWidth: 0 },
  nameCell: { flex: 1, marginRight: 6, minWidth: 0, justifyContent: 'center' },
  sm: { width: 40, textAlign: 'right' },
  /** HS / 4s — integer columns (HS may be 3 digits) */
  batNarrow: { width: 36, textAlign: 'right' },
  /** Bowling overs display e.g. 12.3 */
  bowlOvers: { width: 44, textAlign: 'right' },
  mid: { width: 52, textAlign: 'right' },
  /** Impact tab — aligned with website (bat_impact, bowl_impact, field_impact) */
  impactNameHead: {
    width: 140,
    marginRight: 6,
    color: colors.text,
    fontSize: 11,
    fontWeight: '600',
  },
  impactNameCell: { width: 140, marginRight: 6, justifyContent: 'center' },
  impactMat: { width: 36, textAlign: 'right', fontSize: 11 },
  impactTotal: { width: 54, textAlign: 'right', fontSize: 11 },
  impactAvg: { width: 50, textAlign: 'right', fontSize: 11 },
  impactSplit: { width: 44, textAlign: 'right', fontSize: 11 },
  err: { color: colors.danger, paddingHorizontal: 16, paddingTop: 8 },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 24 },
});
