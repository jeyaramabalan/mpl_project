import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Image,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api } from '../api/client';
import { colors } from '../theme';
import type { RootStackParamList } from '../navigation/types';
import { SITE_ORIGIN } from '../config';

type Props = NativeStackScreenProps<RootStackParamList, 'MatchDetail'>;

type InningsSummary = {
  inning_number?: number;
  score?: number;
  wickets?: number;
  overs_display?: string;
};

type PlayerStatRow = {
  player_id?: number;
  player_name?: string;
  team_number?: number;
  runs_scored?: number;
  balls_faced?: number;
  fours?: number;
  twos?: number;
  is_out?: boolean | number;
  how_out?: string | null;
  overs_bowled?: number;
  maidens?: number;
  runs_conceded?: number;
  wickets_taken?: number;
  wides?: number;
  no_balls?: number;
};

function formatOversBowled(dec: unknown): string {
  const n = Number(dec);
  if (dec == null || Number.isNaN(n) || n < 0) return '0.0';
  const completed = Math.floor(n);
  const balls = Math.round((n - completed) * 10);
  return `${completed}.${Math.min(5, balls)}`;
}

function economyRate(runsConceded: unknown, oversBowled: unknown): string {
  const runs = Number(runsConceded ?? 0);
  const overs = Number(oversBowled);
  if (Number.isNaN(overs) || overs <= 0) return '—';
  const completedOvers = Math.floor(overs);
  const ballsInPartialOver = Math.round((overs - completedOvers) * 10);
  const totalBalls = completedOvers * 6 + ballsInPartialOver;
  if (totalBalls === 0) return '—';
  const properOvers = totalBalls / 6;
  return (runs / properOvers).toFixed(2);
}

function strikeRate(runs: unknown, balls: unknown): string {
  const r = Number(runs ?? 0);
  const b = Number(balls ?? 0);
  if (!b) return '—';
  return ((r / b) * 100).toFixed(1);
}

function batDismissal(row: PlayerStatRow): string {
  const out = row.is_out === true || row.is_out === 1;
  const balls = Number(row.balls_faced ?? 0);
  if (!out && balls > 0) return 'not out';
  if (!out) return '—';
  return row.how_out != null && String(row.how_out).trim() !== '' ? String(row.how_out) : 'out';
}

function superOverLine(superOverNumber: unknown): string | null {
  if (superOverNumber == null || superOverNumber === '') return null;
  const n = Number(superOverNumber);
  if (!Number.isFinite(n) || n <= 0) return null;
  return `Super Over: regular over ${n} was played as the Super Over.`;
}

function inningsTeamLabel(
  inningNum: number,
  m: Record<string, unknown>,
  t1: string,
  t2: string
): string {
  const team1Id = m.team1_id;
  const team2Id = m.team2_id;
  const tw = m.toss_winner_team_id;
  const dec = String(m.decision ?? '');
  if (team1Id != null && team2Id != null && tw != null && (dec === 'Bat' || dec === 'Bowl')) {
    const t1BatFirst =
      (dec === 'Bat' && Number(tw) === Number(team1Id)) ||
      (dec === 'Bowl' && Number(tw) === Number(team2Id));
    const first = t1BatFirst ? t1 : t2;
    const second = t1BatFirst ? t2 : t1;
    if (inningNum === 1) return first;
    if (inningNum === 2) return second;
  }
  return `Innings ${inningNum}`;
}

export default function MatchDetailScreen({ route, navigation }: Props) {
  const { matchId } = route.params;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [m, setM] = useState<Record<string, unknown> | null>(null);
  const [momImageError, setMomImageError] = useState(false);

  useEffect(() => {
    setMomImageError(false);
  }, [matchId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await api.get(`/matches/${matchId}`);
        if (!cancelled) {
          setM(data && typeof data === 'object' ? (data as Record<string, unknown>) : null);
        }
      } catch {
        if (!cancelled) {
          setError('Failed to load match.');
          setM(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [matchId]);

  const playerStats = useMemo(() => {
    const raw = m?.playerStats;
    if (!Array.isArray(raw)) return [] as PlayerStatRow[];
    return raw as PlayerStatRow[];
  }, [m?.playerStats]);

  const inningsSummaries = useMemo(() => {
    const raw = m?.innings_summaries;
    if (!Array.isArray(raw)) return [] as InningsSummary[];
    return raw as InningsSummary[];
  }, [m?.innings_summaries]);

  const teamGroups = useMemo(() => {
    const t1 = playerStats.filter((r) => Number(r.team_number) === 1);
    const t2 = playerStats.filter((r) => Number(r.team_number) === 2);
    return { t1, t2 };
  }, [playerStats]);

  const openPlayer = (id: unknown) => {
    const n = Number(id);
    if (!Number.isFinite(n)) return;
    navigation.navigate('PlayerDetail', { playerId: n });
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }
  if (error || !m) {
    return (
      <View style={styles.centered}>
        <Text style={styles.err}>{error ?? 'Not found.'}</Text>
      </View>
    );
  }

  const t1 = String(m.team1_name ?? '');
  const t2 = String(m.team2_name ?? '');
  const status = String(m.status ?? '');
  const venue = m.venue != null && String(m.venue).trim() !== '' ? String(m.venue).trim() : '';
  const season = m.season_name != null ? String(m.season_name) : '';
  const when = m.match_datetime
    ? new Date(String(m.match_datetime)).toLocaleString(undefined, {
        dateStyle: 'full',
        timeStyle: 'short',
      })
    : '';
  const tossName = m.toss_winner_name != null ? String(m.toss_winner_name) : '';
  const decision = m.decision != null ? String(m.decision) : '';
  const tossLine =
    tossName && (decision === 'Bat' || decision === 'Bowl')
      ? tossSentence(tossName, decision)
      : tossName || '';
  const so = superOverLine(m.super_over_number);
  const momName = m.man_of_the_match_name != null ? String(m.man_of_the_match_name) : '';
  const momId = m.man_of_the_match_player_id;

  const renderBatting = (rows: PlayerStatRow[], teamTitle: string) => {
    const batters = rows.filter(
      (r) => Number(r.balls_faced ?? 0) > 0 || Number(r.runs_scored ?? 0) > 0 || r.is_out
    );
    if (batters.length === 0) return null;
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{teamTitle} — Batting</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator nestedScrollEnabled>
          <View>
            <View style={[styles.tableRow, styles.tableHead]}>
              <Text style={[styles.cell, styles.colName]}>Batter</Text>
              <Text style={styles.cell}>R</Text>
              <Text style={styles.cell}>B</Text>
              <Text style={styles.cell}>4s</Text>
              <Text style={styles.cell}>2s</Text>
              <Text style={styles.cell}>SR</Text>
              <Text style={[styles.cell, styles.colOut]}>How</Text>
            </View>
            {batters.map((r, i) => {
              const pid = r.player_id;
              return (
                <View
                  key={`${pid ?? r.player_name}-${i}`}
                  style={[styles.tableRow, i % 2 === 1 ? styles.tableAlt : undefined]}
                >
                  <TouchableOpacity
                    style={[styles.cell, styles.colName]}
                    onPress={() => pid != null && openPlayer(pid)}
                    disabled={pid == null}
                  >
                    <Text style={styles.linkText}>{String(r.player_name ?? '—')}</Text>
                  </TouchableOpacity>
                  <Text style={styles.cell}>{String(r.runs_scored ?? 0)}</Text>
                  <Text style={styles.cell}>{String(r.balls_faced ?? 0)}</Text>
                  <Text style={styles.cell}>{String(r.fours ?? 0)}</Text>
                  <Text style={styles.cell}>{String(r.twos ?? 0)}</Text>
                  <Text style={styles.cell}>{strikeRate(r.runs_scored, r.balls_faced)}</Text>
                  <Text style={[styles.cell, styles.colOut]} numberOfLines={2}>
                    {batDismissal(r)}
                  </Text>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderBowling = (rows: PlayerStatRow[], teamTitle: string) => {
    const bowlers = rows.filter(
      (r) => Number(r.overs_bowled ?? 0) > 0 || Number(r.wickets_taken ?? 0) > 0
    );
    if (bowlers.length === 0) return null;
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{teamTitle} — Bowling</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator nestedScrollEnabled>
          <View>
            <View style={[styles.tableRow, styles.tableHead]}>
              <Text style={[styles.cell, styles.colName]}>Bowler</Text>
              <Text style={styles.cell}>O</Text>
              <Text style={styles.cell}>M</Text>
              <Text style={styles.cell}>R</Text>
              <Text style={styles.cell}>W</Text>
              <Text style={styles.cell}>Econ</Text>
              <Text style={styles.cell}>Wd</Text>
              <Text style={styles.cell}>Nb</Text>
            </View>
            {bowlers.map((r, i) => {
              const pid = r.player_id;
              return (
                <View
                  key={`b-${pid ?? r.player_name}-${i}`}
                  style={[styles.tableRow, i % 2 === 1 ? styles.tableAlt : undefined]}
                >
                  <TouchableOpacity
                    style={[styles.cell, styles.colName]}
                    onPress={() => pid != null && openPlayer(pid)}
                    disabled={pid == null}
                  >
                    <Text style={styles.linkText}>{String(r.player_name ?? '—')}</Text>
                  </TouchableOpacity>
                  <Text style={styles.cell}>{formatOversBowled(r.overs_bowled)}</Text>
                  <Text style={styles.cell}>{String(r.maidens ?? 0)}</Text>
                  <Text style={styles.cell}>{String(r.runs_conceded ?? 0)}</Text>
                  <Text style={styles.cell}>{String(r.wickets_taken ?? 0)}</Text>
                  <Text style={styles.cell}>{economyRate(r.runs_conceded, r.overs_bowled)}</Text>
                  <Text style={styles.cell}>{String(r.wides ?? 0)}</Text>
                  <Text style={styles.cell}>{String(r.no_balls ?? 0)}</Text>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.vs}>
        {t1} vs {t2}
      </Text>
      <Text style={styles.status}>{status}</Text>
      {season ? <Text style={styles.line}>Season: {season}</Text> : null}
      {when ? <Text style={styles.line}>{when}</Text> : null}
      {venue ? (
        <Text style={styles.line}>
          <Text style={styles.label}>Venue: </Text>
          {venue}
        </Text>
      ) : null}
      {tossLine ? (
        <Text style={styles.line}>
          <Text style={styles.label}>Toss: </Text>
          {tossLine}
        </Text>
      ) : null}
      {so ? <Text style={styles.superLine}>{so}</Text> : null}

      {momName ? (
        <TouchableOpacity
          style={styles.momRow}
          onPress={() => momId != null && openPlayer(momId)}
          activeOpacity={0.7}
          disabled={momId == null}
        >
          {momId != null && !momImageError ? (
            <Image
              source={{ uri: `${SITE_ORIGIN}/images/players/${Number(momId)}.jpg` }}
              style={styles.momImg}
              onError={() => setMomImageError(true)}
            />
          ) : (
            <View style={styles.momPlaceholder}>
              <Text style={styles.momPlaceholderText}>{momName.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.momLabel}>Player of the match</Text>
            <Text style={styles.momName}>{momName}</Text>
          </View>
        </TouchableOpacity>
      ) : null}

      {m.result_summary != null && String(m.result_summary).length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Result</Text>
          <Text style={styles.cardBody}>{String(m.result_summary)}</Text>
        </View>
      ) : null}

      {inningsSummaries.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Innings</Text>
          {inningsSummaries.map((inn, idx) => {
            const num = Number(inn.inning_number ?? idx + 1);
            const label = inningsTeamLabel(num, m, t1, t2);
            const ov = inn.overs_display != null ? String(inn.overs_display) : '—';
            return (
              <Text key={`inn-${num}-${idx}`} style={styles.inningsLine}>
                <Text style={styles.inningsStrong}>{label}:</Text>{' '}
                {inn.score ?? '—'}/{inn.wickets ?? '—'} ({ov} ov)
              </Text>
            );
          })}
        </View>
      ) : null}

      {status === 'Completed' && playerStats.length > 0 ? (
        <>
          {renderBatting(teamGroups.t1, t1)}
          {renderBowling(teamGroups.t1, t1)}
          {renderBatting(teamGroups.t2, t2)}
          {renderBowling(teamGroups.t2, t2)}
        </>
      ) : null}
    </ScrollView>
  );
}

function tossSentence(name: string, decision: string): string {
  return `${name} won the toss and chose to ${decision === 'Bat' ? 'bat' : 'bowl'}`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 48 },
  centered: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' },
  vs: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 8 },
  status: { fontSize: 16, color: colors.accent, marginBottom: 12 },
  line: { color: colors.muted, marginBottom: 8, fontSize: 14, lineHeight: 20 },
  label: { color: colors.muted, fontWeight: '600' },
  superLine: {
    color: '#e8b923',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
    lineHeight: 18,
  },
  momRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  momImg: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.border },
  momPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  momPlaceholderText: { color: colors.text, fontSize: 20, fontWeight: '700' },
  momLabel: { color: colors.muted, fontSize: 12 },
  momName: { color: colors.text, fontSize: 16, fontWeight: '600', marginTop: 2 },
  card: {
    marginTop: 8,
    marginBottom: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: { color: colors.muted, fontSize: 12, marginBottom: 8 },
  cardBody: { color: colors.text, fontSize: 15, lineHeight: 22 },
  inningsLine: { color: colors.text, fontSize: 14, marginBottom: 6, lineHeight: 20 },
  inningsStrong: { fontWeight: '700', color: colors.text },
  section: { marginBottom: 20 },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    minWidth: 520,
  },
  tableHead: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 8,
  },
  tableAlt: { backgroundColor: 'rgba(255,255,255,0.03)' },
  cell: {
    width: 44,
    color: colors.text,
    fontSize: 12,
    textAlign: 'right',
    paddingHorizontal: 2,
  },
  colName: {
    width: 140,
    textAlign: 'left',
    flexGrow: 0,
  },
  colOut: { width: 100, textAlign: 'left' },
  linkText: { color: '#6eb5ff', fontSize: 12, textDecorationLine: 'underline' },
  err: { color: colors.danger },
});
