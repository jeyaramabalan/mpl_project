import React, { useEffect, useLayoutEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  TouchableOpacity,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api } from '../api/client';
import { colors } from '../theme';
import type { RootStackParamList } from '../navigation/types';
import { SITE_ORIGIN } from '../config';

type Props = NativeStackScreenProps<RootStackParamList, 'PlayerDetail'>;

type BowlingBucket = {
  overs_count?: number;
  overs_display?: string;
  maidens?: number;
  wickets?: number;
  runs?: number;
  economy?: number | null;
};

type StatsPayload = {
  matches_played?: number;
  total_runs?: number;
  highest_score?: number;
  batting_average_display?: string;
  batting_strike_rate?: number | null;
  total_fours?: number;
  total_twos?: number;
  total_wickets?: number;
  total_runs_conceded?: number;
  total_overs_bowled?: number;
  total_maidens?: number;
  total_wides?: number;
  total_no_balls?: number;
  total_catches?: number;
  total_stumps?: number;
  total_run_outs?: number;
  total_batting_impact?: number;
  total_bowling_impact?: number;
  total_fielding_impact?: number;
  bowling_economy_rate?: number | null;
  bowling_breakdown?: {
    normal?: BowlingBucket;
    super?: BowlingBucket;
    total?: BowlingBucket;
  };
};

type ByMatchRow = {
  match_id: number;
  match_datetime?: string;
  opponent_team_name?: string | null;
  runs_scored?: number;
  balls_faced?: number;
  fours?: number;
  wickets_taken?: number;
  runs_conceded?: number;
  overs_bowled?: number;
  batting_impact_points?: number;
  bowling_impact_points?: number;
  fielding_impact_points?: number;
  total_impact?: number;
};

type BySeasonRow = {
  season_id?: number;
  year?: number;
  name?: string;
  matches_played?: number;
  total_runs?: number;
  total_wickets?: number;
  total_overs_bowled?: number;
  total_impact?: number;
};

function economyRate(runsConceded: unknown, oversBowled: unknown): string | null {
  const runs = Number(runsConceded ?? 0);
  const overs = Number(oversBowled);
  if (Number.isNaN(overs) || overs <= 0) return null;
  const completedOvers = Math.floor(overs);
  const ballsInPartialOver = Math.round((overs - completedOvers) * 10);
  const totalBalls = completedOvers * 6 + ballsInPartialOver;
  if (totalBalls === 0) return null;
  const properOvers = totalBalls / 6;
  return (runs / properOvers).toFixed(2);
}

export default function PlayerDetailScreen({ route, navigation }: Props) {
  const { playerId } = route.params;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [p, setP] = useState<Record<string, unknown> | null>(null);
  const [stats, setStats] = useState<StatsPayload | null>(null);
  const [byMatch, setByMatch] = useState<ByMatchRow[] | null>(null);
  const [bySeason, setBySeason] = useState<BySeasonRow[] | null>(null);
  const [softError, setSoftError] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [playerId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      setSoftError(null);
      setP(null);
      setStats(null);
      setByMatch(null);
      setBySeason(null);
      try {
        const [profileRes, statsRes, matchRes, seasonRes] = await Promise.all([
          api.get(`/players/${playerId}`),
          api.get(`/players/${playerId}/stats`).catch(() => null),
          api.get(`/players/${playerId}/stats/by-match`, { params: { limit: 5 } }).catch(() => null),
          api.get(`/players/${playerId}/stats/by-season`, { params: { limit: 5 } }).catch(() => null),
        ]);
        if (cancelled) return;
        setP(
          profileRes.data && typeof profileRes.data === 'object'
            ? (profileRes.data as Record<string, unknown>)
            : null
        );
        setStats(statsRes?.data && typeof statsRes.data === 'object' ? (statsRes.data as StatsPayload) : null);
        const matches = matchRes?.data?.matches;
        setByMatch(Array.isArray(matches) ? (matches as ByMatchRow[]) : null);
        const seasons = seasonRes?.data?.seasons;
        setBySeason(Array.isArray(seasons) ? (seasons as BySeasonRow[]) : null);
        const parts: string[] = [];
        if (!statsRes) parts.push('career stats');
        if (!matchRes) parts.push('recent matches');
        if (!seasonRes) parts.push('season breakdown');
        if (parts.length) setSoftError(`Some sections failed to load (${parts.join(', ')}).`);
      } catch {
        if (!cancelled) {
          setError('Failed to load player.');
          setP(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [playerId]);

  useLayoutEffect(() => {
    const name = p?.name != null ? String(p.name) : '';
    if (name) navigation.setOptions({ title: name });
  }, [navigation, p?.name]);

  const openMatch = (mid: number) => {
    navigation.navigate('MatchDetail', { matchId: mid });
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }
  if (error || !p) {
    return (
      <View style={styles.centered}>
        <Text style={styles.err}>{error ?? 'Not found.'}</Text>
      </View>
    );
  }

  const name = String(p.name ?? '');
  const role = p.role === 'Batsman' ? 'Batter' : String(p.role ?? '—');
  const team = String(p.current_team_name ?? '—');
  const pid = p.player_id != null ? Number(p.player_id) : NaN;
  const impact =
    p.average_impact != null && !Number.isNaN(Number(p.average_impact))
      ? Number(p.average_impact).toFixed(2)
      : '—';
  const bid =
    p.average_bid_price != null && p.average_bid_price !== ''
      ? `$${Number(p.average_bid_price).toFixed(2)}`
      : '—';

  const bb = stats?.bowling_breakdown;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {softError ? <Text style={styles.softErr}>{softError}</Text> : null}

      <View style={styles.headerRow}>
        <View style={styles.avatarWrap}>
          {!imageError && Number.isFinite(pid) ? (
            <Image
              source={{ uri: `${SITE_ORIGIN}/images/players/${pid}.jpg` }}
              style={styles.avatar}
              onError={() => setImageError(true)}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarLetter}>{(name || 'P').charAt(0).toUpperCase()}</Text>
            </View>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{name}</Text>
          <Text style={styles.line}>Role: {role}</Text>
          <Text style={styles.line}>Current team: {team}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Summary</Text>
        <Text style={styles.cardLine}>Avg impact / match: {impact}</Text>
        <Text style={styles.cardLine}>Avg auction bid: {bid}</Text>
      </View>

      {stats ? (
        <>
          <Text style={styles.sectionHeading}>Statistics (career)</Text>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Batting</Text>
            <View style={styles.statGrid}>
              <StatItem label="Mat" value={stats.matches_played ?? '—'} />
              <StatItem label="Runs" value={stats.total_runs ?? '—'} />
              <StatItem label="HS" value={stats.highest_score ?? '—'} />
              <StatItem label="Avg" value={stats.batting_average_display ?? '—'} />
              <StatItem label="SR" value={stats.batting_strike_rate ?? '—'} />
              <StatItem label="4s" value={stats.total_fours ?? '—'} />
              <StatItem label="2s" value={stats.total_twos ?? '—'} />
            </View>
          </View>

          {bb ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Bowling (normal / super / total)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator nestedScrollEnabled>
                <View>
                  <View style={[styles.br, styles.brHead]}>
                    <Text style={[styles.bc, styles.bcType]}>Type</Text>
                    <Text style={styles.bc}>Overs</Text>
                    <Text style={styles.bc}>M</Text>
                    <Text style={styles.bc}>W</Text>
                    <Text style={styles.bc}>R</Text>
                    <Text style={styles.bc}>Econ</Text>
                  </View>
                  {(['normal', 'super', 'total'] as const).map((key) => {
                    const row = bb[key];
                    const label =
                      key === 'normal' ? 'Normal' : key === 'super' ? 'Super' : 'Total';
                    if (!row) return null;
                    return (
                      <View key={key} style={styles.br}>
                        <Text style={[styles.bc, styles.bcType]}>{label}</Text>
                        <Text style={styles.bc}>
                          {row.overs_display ??
                            (row.overs_count != null ? Number(row.overs_count).toFixed(1) : '—')}
                        </Text>
                        <Text style={styles.bc}>{row.maidens ?? '—'}</Text>
                        <Text style={styles.bc}>{row.wickets ?? '—'}</Text>
                        <Text style={styles.bc}>{row.runs ?? '—'}</Text>
                        <Text style={styles.bc}>
                          {row.economy != null ? Number(row.economy).toFixed(2) : '—'}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
              <Text style={styles.cardMeta}>
                Overall economy (PMS):{' '}
                {stats.bowling_economy_rate != null ? String(stats.bowling_economy_rate) : '—'} ·
                Wickets: {stats.total_wickets ?? 0} · Runs conc.: {stats.total_runs_conceded ?? 0} ·
                Overs: {stats.total_overs_bowled ?? 0}
              </Text>
            </View>
          ) : null}

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Fielding (career totals)</Text>
            <Text style={styles.cardLine}>
              Catches {stats.total_catches ?? 0} · Stumpings {stats.total_stumps ?? 0} · Run-outs{' '}
              {stats.total_run_outs ?? 0}
            </Text>
            <Text style={styles.cardLine}>
              Wides {stats.total_wides ?? 0} · No-balls {stats.total_no_balls ?? 0} · Maidens{' '}
              {stats.total_maidens ?? 0}
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Impact points (career)</Text>
            <Text style={styles.cardLine}>
              Batting {fmtImpact(stats.total_batting_impact)} · Bowling{' '}
              {fmtImpact(stats.total_bowling_impact)} · Fielding {fmtImpact(stats.total_fielding_impact)}
            </Text>
          </View>
        </>
      ) : (
        <Text style={styles.muted}>Detailed statistics are not available.</Text>
      )}

      {byMatch && byMatch.length > 0 ? (
        <>
          <Text style={styles.sectionHeading}>Recent matches</Text>
          {byMatch.map((row) => {
            const econ = economyRate(row.runs_conceded, row.overs_bowled);
            const when = row.match_datetime
              ? new Date(String(row.match_datetime)).toLocaleDateString()
              : '';
            return (
              <TouchableOpacity
                key={row.match_id}
                style={styles.matchRow}
                onPress={() => openMatch(row.match_id)}
                activeOpacity={0.7}
              >
                <Text style={styles.matchVs}>vs {row.opponent_team_name ?? 'Opponent'}</Text>
                <Text style={styles.matchMeta}>{when}</Text>
                <Text style={styles.matchLine}>
                  {row.runs_scored ?? 0} ({row.balls_faced ?? 0}) · {row.wickets_taken ?? 0}/
                  {row.runs_conceded ?? 0}
                  {econ ? ` · econ ${econ}` : ''}
                </Text>
                <Text style={styles.matchLine}>
                  Impact {fmtImpact(row.total_impact)} (bat {fmtImpact(row.batting_impact_points)} · bowl{' '}
                  {fmtImpact(row.bowling_impact_points)} · fld {fmtImpact(row.fielding_impact_points)})
                </Text>
              </TouchableOpacity>
            );
          })}
        </>
      ) : null}

      {bySeason && bySeason.length > 0 ? (
        <>
          <Text style={styles.sectionHeading}>Recent seasons</Text>
          {bySeason.map((s) => (
            <View key={s.season_id ?? s.name} style={styles.seasonRow}>
              <Text style={styles.seasonTitle}>
                {s.name ?? 'Season'} {s.year != null ? `(${s.year})` : ''}
              </Text>
              <Text style={styles.seasonMeta}>
                Mat {s.matches_played ?? 0} · Runs {s.total_runs ?? 0} · Wkts {s.total_wickets ?? 0}{' '}
                · Overs {s.total_overs_bowled ?? 0} · Impact {fmtImpact(s.total_impact)}
              </Text>
            </View>
          ))}
        </>
      ) : null}
    </ScrollView>
  );
}

function fmtImpact(n: unknown): string {
  if (n == null || Number.isNaN(Number(n))) return '0';
  return Number(n).toFixed(1);
}

function StatItem({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 48 },
  centered: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' },
  softErr: { color: '#e8b923', marginBottom: 12, fontSize: 13 },
  headerRow: { flexDirection: 'row', gap: 16, marginBottom: 16, alignItems: 'flex-start' },
  avatarWrap: { width: 88, height: 88 },
  avatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.border },
  avatarPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { fontSize: 36, fontWeight: '700', color: colors.text },
  title: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 8 },
  line: { color: colors.muted, fontSize: 15, marginBottom: 4 },
  sectionHeading: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 10,
  },
  card: {
    marginBottom: 14,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: { color: colors.muted, fontSize: 12, marginBottom: 10, textTransform: 'uppercase' },
  cardLine: { color: colors.text, fontSize: 15, marginBottom: 6, lineHeight: 22 },
  cardMeta: { color: colors.muted, fontSize: 12, marginTop: 10, lineHeight: 18 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statItem: { width: '28%', minWidth: 72, marginBottom: 8 },
  statLabel: { color: colors.muted, fontSize: 11, marginBottom: 4 },
  statValue: { color: colors.text, fontSize: 16, fontWeight: '600' },
  br: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    minWidth: 360,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  brHead: { borderBottomWidth: 2, paddingBottom: 8 },
  bc: { width: 52, color: colors.text, fontSize: 12, textAlign: 'right' },
  bcType: { width: 72, textAlign: 'left' },
  muted: { color: colors.muted, marginBottom: 16 },
  matchRow: {
    padding: 14,
    marginBottom: 10,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  matchVs: { color: colors.text, fontSize: 16, fontWeight: '600' },
  matchMeta: { color: colors.muted, fontSize: 12, marginTop: 4 },
  matchLine: { color: colors.muted, fontSize: 13, marginTop: 6, lineHeight: 18 },
  seasonRow: {
    padding: 14,
    marginBottom: 10,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  seasonTitle: { color: colors.text, fontSize: 15, fontWeight: '600' },
  seasonMeta: { color: colors.muted, fontSize: 13, marginTop: 6, lineHeight: 18 },
  err: { color: colors.danger },
});
