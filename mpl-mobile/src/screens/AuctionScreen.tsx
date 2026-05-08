import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  RefreshControl,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { api } from '../api/client';
import { toList } from '../utils/toList';
import { SITE_ORIGIN } from '../config';
import { colors } from '../theme';

type Season = { season_id?: number; name?: string; year?: number; status?: string };

export default function AuctionScreen() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [seasonId, setSeasonId] = useState('');
  const [state, setState] = useState<Record<string, unknown> | null>(null);
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const auctionSeasons = useMemo(
    () => seasons.filter((s) => s.status !== 'Completed'),
    [seasons]
  );

  const fetchSeasons = useCallback(async () => {
    try {
      const { data } = await api.get('/seasons/public');
      const list = toList(data) as unknown as Season[];
      setSeasons(list);
    } catch {
      setSeasons([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (seasonId || seasons.length === 0) return;
    const avail = seasons.filter((s) => s.status !== 'Completed');
    if (avail.length > 0 && avail[0].season_id != null) setSeasonId(String(avail[0].season_id));
  }, [seasons, seasonId]);

  const fetchState = useCallback(async () => {
    if (!seasonId) return;
    try {
      const { data } = await api.get('/auction/state', { params: { season_id: seasonId } });
      setState(data && typeof data === 'object' ? (data as Record<string, unknown>) : null);
    } catch {
      setState(null);
    }
  }, [seasonId]);

  useEffect(() => {
    fetchSeasons();
  }, [fetchSeasons]);

  useEffect(() => {
    if (seasons.length === 0 || !seasonId) return;
    if (!auctionSeasons.some((s) => String(s.season_id) === seasonId)) {
      setSeasonId(
        auctionSeasons.length > 0 && auctionSeasons[0].season_id != null
          ? String(auctionSeasons[0].season_id)
          : ''
      );
    }
  }, [auctionSeasons, seasonId, seasons.length]);

  useEffect(() => {
    fetchState();
    const t = setInterval(fetchState, 3000);
    return () => clearInterval(t);
  }, [fetchState]);

  const currentPlayer = state?.currentPlayer as { player_id?: number; name?: string } | undefined;
  const auctionState = state?.state as { status?: string; current_bid?: number } | undefined;
  const currentTeamName = state?.currentTeamName as string | undefined;
  const rosters = state?.team_rosters as
    | {
        team_id?: number;
        name?: string;
        captain?: { name?: string; price?: number };
        purchases?: { player_id?: number; name?: string; purchase_price?: number }[];
      }[]
    | undefined;

  const currentPlayerId = currentPlayer?.player_id;

  useEffect(() => {
    if (!currentPlayerId || auctionState?.status !== 'active') {
      setStats(null);
      return;
    }
    let cancelled = false;
    api
      .get(`/players/${currentPlayerId}/stats`)
      .then(({ data }) => {
        if (!cancelled && data && typeof data === 'object') setStats(data as Record<string, unknown>);
      })
      .catch(() => {
        if (!cancelled) setStats(null);
      });
    return () => {
      cancelled = true;
    };
  }, [currentPlayerId, auctionState?.status]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchSeasons(), fetchState()]);
    setRefreshing(false);
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
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
      }
    >
      <Text style={styles.lead}>Public auction view — same data as the website (read-only).</Text>

      <Text style={styles.label}>Season</Text>
      <View style={styles.pickerWrap}>
        <Picker
          selectedValue={seasonId}
          onValueChange={(v) => setSeasonId(String(v))}
          style={styles.picker}
          dropdownIconColor={colors.text}
        >
          {auctionSeasons.map((s) => {
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

      {!seasonId ? <Text style={styles.muted}>Select a season with an active or upcoming auction.</Text> : null}

      {seasonId && rosters && rosters.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.h2}>Squads so far</Text>
          <Text style={styles.hint}>Captain at £0; auction players with purchase price.</Text>
          {rosters.map((tr) => (
            <View key={tr.team_id ?? tr.name} style={styles.squadCard}>
              <Text style={styles.squadName}>{tr.name ?? 'Team'}</Text>
              {tr.captain ? (
                <Text style={styles.squadLine}>
                  <Text style={styles.bold}>{tr.captain.name}</Text> (C) — £{tr.captain.price ?? 0}
                </Text>
              ) : (
                <Text style={styles.muted}>Captain TBC</Text>
              )}
              {(tr.purchases ?? []).map((p) => (
                <Text key={p.player_id} style={styles.squadLine}>
                  {p.name} — £{p.purchase_price ?? '—'}
                </Text>
              ))}
            </View>
          ))}
        </View>
      )}

      {seasonId && state && (
        <View style={styles.liveBox}>
          {auctionState?.status === 'completed' && (
            <Text style={styles.statusBig}>Auction completed.</Text>
          )}
          {currentPlayer && auctionState?.status === 'active' && (
            <>
              <View style={styles.playerRow}>
                {currentPlayerId != null ? (
                  <Image
                    source={{ uri: `${SITE_ORIGIN}/images/players/${currentPlayerId}.jpg` }}
                    style={styles.avatar}
                  />
                ) : null}
                <View style={styles.playerText}>
                  <Text style={styles.playerName}>{currentPlayer.name ?? 'Player'}</Text>
                  <Text style={styles.bidLine}>
                    Current bid: <Text style={styles.bold}>£{auctionState?.current_bid ?? '—'}</Text>
                  </Text>
                  {currentTeamName ? (
                    <Text style={styles.leadTeam}>
                      Leading: <Text style={styles.bold}>{currentTeamName}</Text>
                    </Text>
                  ) : null}
                </View>
              </View>

              {stats && (
                <View style={styles.statsBox}>
                  <Text style={styles.h3}>Career stats</Text>
                  <Text style={styles.statLine}>
                    Mat {String(stats.matches_played ?? '—')} · Runs {String(stats.total_runs ?? '—')} · HS{' '}
                    {String(stats.highest_score ?? '—')}
                  </Text>
                  {stats.bowling_breakdown &&
                  typeof stats.bowling_breakdown === 'object' &&
                  stats.bowling_breakdown !== null ? (
                    <Text style={styles.statLine}>
                      Wkts{' '}
                      {String(
                        (stats.bowling_breakdown as { total?: { wickets?: unknown } }).total?.wickets ?? '—'
                      )}{' '}
                      · Econ{' '}
                      {(() => {
                        const e = (stats.bowling_breakdown as { total?: { economy?: number } }).total?.economy;
                        return e != null && !Number.isNaN(Number(e)) ? Number(e).toFixed(2) : '—';
                      })()}
                    </Text>
                  ) : null}
                </View>
              )}
            </>
          )}
          {!currentPlayer && auctionState?.status !== 'completed' && (
            <Text style={styles.muted}>Waiting for auction state…</Text>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  lead: { color: colors.muted, fontSize: 14, marginBottom: 12, lineHeight: 20 },
  label: { color: colors.muted, fontSize: 12, marginBottom: 4 },
  pickerWrap: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, marginBottom: 16 },
  picker: { color: colors.text },
  muted: { color: colors.muted, fontSize: 14 },
  section: { marginBottom: 16 },
  h2: { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 4 },
  hint: { color: colors.muted, fontSize: 13, marginBottom: 12 },
  squadCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    backgroundColor: colors.surface,
  },
  squadName: { color: colors.text, fontWeight: '700', marginBottom: 6, fontSize: 15 },
  squadLine: { color: colors.text, fontSize: 14, marginBottom: 4 },
  liveBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    backgroundColor: colors.surface,
  },
  statusBig: { color: colors.text, fontWeight: '700', fontSize: 16 },
  playerRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.border, marginRight: 14 },
  playerText: { flex: 1 },
  playerName: { color: colors.text, fontSize: 20, fontWeight: '700' },
  bidLine: { color: colors.text, fontSize: 16, marginTop: 6 },
  leadTeam: { color: colors.muted, marginTop: 4, fontSize: 15 },
  bold: { fontWeight: '700', color: colors.text },
  statsBox: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border },
  h3: { color: colors.accent, fontSize: 16, fontWeight: '700', marginBottom: 8 },
  statLine: { color: colors.text, fontSize: 14, marginBottom: 6 },
});
