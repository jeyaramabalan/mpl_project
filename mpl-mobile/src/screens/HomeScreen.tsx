import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';
import { toList } from '../utils/toList';
import { colors } from '../theme';

type MatchBrief = {
  match_id?: number;
  team1_name?: string;
  team2_name?: string;
  match_datetime?: string;
  status?: string;
};

type ChampionRow = {
  match_id?: number;
  season_id?: number;
  season_name?: string;
  winner_team_name?: string;
};

type FeaturedMom = {
  playerId: number;
  playerName: string;
  teamName: string;
  seasonName: string;
  matchId: number;
};

type FeaturedPlayer = {
  playerId: number;
  playerName: string;
  seasonName: string;
};

function formatMatchDate(dateStr?: string) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

function formatMatchTime(dateStr?: string) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

function initials(name?: string) {
  return (name || '')
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function unwrapLeaderboardBody(data: unknown): { batting?: unknown[]; bowling?: unknown[] } {
  if (!data || typeof data !== 'object') return {};
  const o = data as Record<string, unknown>;
  const inner = o.data && typeof o.data === 'object' ? (o.data as Record<string, unknown>) : o;
  return inner as { batting?: unknown[]; bowling?: unknown[] };
}

export default function HomeScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [scheduled, setScheduled] = useState<MatchBrief[]>([]);
  const [liveMatches, setLiveMatches] = useState<MatchBrief[]>([]);
  const [featuredMom, setFeaturedMom] = useState<FeaturedMom | null>(null);
  const [featuredBatter, setFeaturedBatter] = useState<FeaturedPlayer | null>(null);
  const [featuredBowler, setFeaturedBowler] = useState<FeaturedPlayer | null>(null);
  const [newsLoading, setNewsLoading] = useState(true);

  const openMatch = (matchId: number) => {
    const parent = navigation.getParent();
    if (parent) {
      (parent as { navigate: (name: string, params: { matchId: number }) => void }).navigate(
        'MatchDetail',
        { matchId }
      );
    }
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

  const goTab = (name: 'Schedule' | 'Standings' | 'Leaderboard' | 'Players' | 'More') => {
    navigation.navigate(name as never);
  };

  const openStack = (name: 'Records' | 'Champions' | 'Auction' | 'Contact' | 'Rules') => {
    const parent = navigation.getParent();
    if (parent) {
      (parent as { navigate: (n: string) => void }).navigate(name);
    }
  };

  const fetchLive = useCallback(async () => {
    try {
      const { data } = await api.get('/matches', { params: { status: 'Live' } });
      setLiveMatches(toList(data) as unknown as MatchBrief[]);
    } catch {
      setLiveMatches([]);
    }
  }, []);

  const loadMatches = useCallback(async () => {
    setMatchError(null);
    try {
      const { data } = await api.get('/matches', { params: { status: 'Scheduled' } });
      const list = toList(data) as unknown as MatchBrief[];
      const sorted = [...list].sort(
        (a, b) => new Date(a.match_datetime || 0).getTime() - new Date(b.match_datetime || 0).getTime()
      );
      setScheduled(sorted);
    } catch {
      setMatchError('Could not load upcoming matches.');
      setScheduled([]);
    } finally {
      setLoading(false);
    }
    await fetchLive();
  }, [fetchLive]);

  const loadFeaturedNews = useCallback(async () => {
    setNewsLoading(true);
    try {
      const { data: championsRaw } = await api.get('/matches/champions');
      const champions = toList(championsRaw) as unknown as ChampionRow[];
      const latest = champions.length > 0 ? champions[0] : null;
      if (!latest?.match_id) {
        setFeaturedMom(null);
        setFeaturedBatter(null);
        setFeaturedBowler(null);
        return;
      }

      const { data: matchDetails } = await api.get(`/matches/${latest.match_id}`);
      const md = matchDetails && typeof matchDetails === 'object' ? (matchDetails as Record<string, unknown>) : {};
      const momId = md.man_of_the_match_player_id;
      const momName = md.man_of_the_match_name;
      if (momId != null && momName != null) {
        setFeaturedMom({
          playerId: Number(momId),
          playerName: String(momName),
          teamName: String(latest.winner_team_name ?? md.winner_team_name ?? 'Champions'),
          seasonName: String(latest.season_name ?? md.season_name ?? 'Season'),
          matchId: Number(latest.match_id),
        });
      } else {
        setFeaturedMom(null);
      }

      const seasonId = latest.season_id;
      const seasonName = String(latest.season_name ?? 'Season');
      if (seasonId == null) {
        setFeaturedBatter(null);
        setFeaturedBowler(null);
        return;
      }

      const { data: lbRaw } = await api.get('/leaderboard', { params: { season_id: seasonId } });
      const lb = unwrapLeaderboardBody(lbRaw);
      const batting = toList(lb.batting) as { player_id?: number; player_name?: string }[];
      const bowling = toList(lb.bowling) as { player_id?: number; player_name?: string }[];

      setFeaturedBatter(
        batting.length > 0 && batting[0].player_id != null
          ? {
              playerId: Number(batting[0].player_id),
              playerName: String(batting[0].player_name ?? ''),
              seasonName,
            }
          : null
      );
      setFeaturedBowler(
        bowling.length > 0 && bowling[0].player_id != null
          ? {
              playerId: Number(bowling[0].player_id),
              playerName: String(bowling[0].player_name ?? ''),
              seasonName,
            }
          : null
      );
    } catch {
      setFeaturedMom(null);
      setFeaturedBatter(null);
      setFeaturedBowler(null);
    } finally {
      setNewsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  useEffect(() => {
    loadFeaturedNews();
  }, [loadFeaturedNews]);

  useEffect(() => {
    const id = setInterval(() => {
      fetchLive();
    }, 30000);
    return () => clearInterval(id);
  }, [fetchLive]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadMatches(), loadFeaturedNews()]);
    setRefreshing(false);
  };

  const nextMatch = scheduled.length > 0 ? scheduled[0] : null;
  const upcomingThree = scheduled.slice(0, 3);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
      }
    >
      <View style={styles.hero}>
        <Image source={require('../../assets/icon.png')} style={styles.heroLogo} resizeMode="contain" />
        <Text style={styles.heroWelcome}>Welcome to the</Text>
        <Text style={styles.heroTitle}>Metalworks Premier League!</Text>
        <Text style={styles.heroSub}>Featuring Community Spirit Through Box Cricket</Text>

        {liveMatches.length > 0 && (
          <View style={styles.liveStrip}>
            <Text style={styles.liveLabel}>LIVE</Text>
            {liveMatches.map((m) => (
              <TouchableOpacity
                key={m.match_id}
                style={styles.liveLinkWrap}
                onPress={() => m.match_id != null && openMatch(Number(m.match_id))}
                activeOpacity={0.8}
              >
                <Text style={styles.liveLink} numberOfLines={1}>
                  {m.team1_name} vs {m.team2_name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {nextMatch && (
          <Text style={styles.heroStrip}>
            Next: {nextMatch.team1_name} vs {nextMatch.team2_name} —{' '}
            {formatMatchDate(nextMatch.match_datetime)}
          </Text>
        )}
      </View>

      <Text style={styles.sectionTitle}>Upcoming</Text>
      {loading ? (
        <ActivityIndicator size="small" color={colors.accent} style={styles.sectionPad} />
      ) : matchError ? (
        <Text style={styles.err}>{matchError}</Text>
      ) : upcomingThree.length === 0 ? (
        <Text style={styles.muted}>No upcoming matches. Check the Schedule tab.</Text>
      ) : (
        <View style={styles.cardRow}>
          {upcomingThree.map((m, idx) => (
            <TouchableOpacity
              key={m.match_id ?? idx}
              style={styles.matchCard}
              activeOpacity={0.8}
              disabled={m.match_id == null}
              onPress={() => m.match_id != null && openMatch(Number(m.match_id))}
            >
              <View style={styles.avatars}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initials(m.team1_name)}</Text>
                </View>
                <Text style={styles.vs}>vs</Text>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initials(m.team2_name)}</Text>
                </View>
              </View>
              <Text style={styles.matchLabel}>Match {idx + 1}</Text>
              <Text style={styles.matchTeams} numberOfLines={2}>
                {m.team1_name} vs {m.team2_name}
              </Text>
              <Text style={styles.matchDate}>{formatMatchDate(m.match_datetime)}</Text>
              <Text style={styles.viewMatch}>View match</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.nextPanel}>
        <Text style={styles.nextLabel}>Next match</Text>
        {loading ? (
          <Text style={styles.muted}>…</Text>
        ) : nextMatch ? (
          <>
            <Text style={styles.nextTeams}>
              {nextMatch.team1_name} vs {nextMatch.team2_name}
            </Text>
            <Text style={styles.nextWhen}>
              {formatMatchDate(nextMatch.match_datetime)}
              {nextMatch.match_datetime ? `, ${formatMatchTime(nextMatch.match_datetime)}` : ''}
            </Text>
          </>
        ) : (
          <Text style={styles.muted}>No upcoming match</Text>
        )}
      </View>

      <Text style={styles.sectionTitle}>Quick access</Text>
      <View style={styles.quickGrid}>
        <TouchableOpacity style={styles.quickCard} onPress={() => goTab('Schedule')} activeOpacity={0.8}>
          <Ionicons name="calendar" size={28} color={colors.accent} />
          <Text style={styles.quickLabel}>Schedule</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickCard} onPress={() => goTab('Standings')} activeOpacity={0.8}>
          <Ionicons name="stats-chart" size={28} color={colors.accent} />
          <Text style={styles.quickLabel}>Standings</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickCard} onPress={() => goTab('Leaderboard')} activeOpacity={0.8}>
          <Ionicons name="trophy" size={28} color={colors.accent} />
          <Text style={styles.quickLabel}>Leaderboards</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickCard} onPress={() => goTab('Players')} activeOpacity={0.8}>
          <Ionicons name="people" size={28} color={colors.accent} />
          <Text style={styles.quickLabel}>Players</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Also on MPL</Text>
      <View style={styles.quickGrid}>
        <TouchableOpacity style={styles.quickCard} onPress={() => openStack('Records')} activeOpacity={0.8}>
          <Ionicons name="medal" size={26} color={colors.accent} />
          <Text style={styles.quickLabel}>Records</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickCard} onPress={() => openStack('Champions')} activeOpacity={0.8}>
          <Ionicons name="trophy" size={26} color={colors.accent} />
          <Text style={styles.quickLabel}>Champions</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickCard} onPress={() => openStack('Auction')} activeOpacity={0.8}>
          <Ionicons name="logo-usd" size={26} color={colors.accent} />
          <Text style={styles.quickLabel}>Auction</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickCard} onPress={() => openStack('Contact')} activeOpacity={0.8}>
          <Ionicons name="mail" size={26} color={colors.accent} />
          <Text style={styles.quickLabel}>Contact</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.quickGrid}>
        <TouchableOpacity style={styles.quickCard} onPress={() => openStack('Rules')} activeOpacity={0.8}>
          <Ionicons name="book" size={26} color={colors.accent} />
          <Text style={styles.quickLabel}>Rules</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickCard} onPress={() => goTab('More')} activeOpacity={0.8}>
          <Ionicons name="menu" size={26} color={colors.accent} />
          <Text style={styles.quickLabel}>More menu</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>News & updates</Text>
      {newsLoading ? (
        <ActivityIndicator size="small" color={colors.accent} style={styles.sectionPad} />
      ) : (
        <View style={styles.newsCol}>
          <TouchableOpacity
            style={styles.newsCard}
            disabled={!featuredMom}
            onPress={() => featuredMom && openMatch(featuredMom.matchId)}
            activeOpacity={featuredMom ? 0.8 : 1}
          >
            <View style={styles.newsAvatar}>
              <Text style={styles.newsAvatarText}>
                {(featuredMom?.playerName ?? 'M').charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.newsTitle} numberOfLines={3}>
              {featuredMom
                ? `${featuredMom.playerName} leads ${featuredMom.teamName} — ${featuredMom.seasonName} champions`
                : 'Season highlights — champions'}
            </Text>
            {!featuredMom && <Text style={styles.newsHint}>Check back after the final.</Text>}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.newsCard}
            disabled={!featuredBatter}
            onPress={() => featuredBatter && openPlayer(featuredBatter.playerId)}
            activeOpacity={featuredBatter ? 0.8 : 1}
          >
            <View style={styles.newsAvatar}>
              <Text style={styles.newsAvatarText}>
                {(featuredBatter?.playerName ?? 'B').charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.newsTitle} numberOfLines={3}>
              {featuredBatter
                ? `${featuredBatter.playerName} — top batter (${featuredBatter.seasonName})`
                : 'Top run-scorers — season highlights'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.newsCard}
            disabled={!featuredBowler}
            onPress={() => featuredBowler && openPlayer(featuredBowler.playerId)}
            activeOpacity={featuredBowler ? 0.8 : 1}
          >
            <View style={styles.newsAvatar}>
              <Text style={styles.newsAvatarText}>
                {(featuredBowler?.playerName ?? 'W').charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.newsTitle} numberOfLines={3}>
              {featuredBowler
                ? `${featuredBowler.playerName} — top bowler (${featuredBowler.seasonName})`
                : 'Top wicket-takers — season highlights'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.footerSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: 32 },
  hero: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: 'center',
  },
  heroLogo: { width: 72, height: 72, marginBottom: 12, borderRadius: 12 },
  heroWelcome: { color: colors.muted, fontSize: 15, marginBottom: 4 },
  heroTitle: {
    color: colors.accent,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSub: { color: colors.text, fontSize: 15, textAlign: 'center', lineHeight: 22 },
  liveStrip: {
    marginTop: 16,
    alignSelf: 'stretch',
    backgroundColor: colors.danger,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  liveLabel: { color: '#fff', fontWeight: '800', marginRight: 10 },
  liveLinkWrap: { marginRight: 10, marginBottom: 4 },
  liveLink: { color: '#fff', textDecorationLine: 'underline', fontWeight: '600', maxWidth: 280 },
  heroStrip: {
    marginTop: 12,
    color: colors.muted,
    fontSize: 13,
    textAlign: 'center',
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 22,
    marginBottom: 10,
    paddingHorizontal: 20,
  },
  sectionPad: { marginVertical: 12 },
  err: { color: colors.danger, paddingHorizontal: 20 },
  muted: { color: colors.muted, paddingHorizontal: 20, fontSize: 14 },
  cardRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    justifyContent: 'space-between',
  },
  matchCard: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 12,
  },
  avatars: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.text, fontSize: 12, fontWeight: '700' },
  vs: { color: colors.muted, marginHorizontal: 6, fontSize: 12 },
  matchLabel: { color: colors.muted, fontSize: 11, textAlign: 'center' },
  matchTeams: { color: colors.text, fontSize: 13, fontWeight: '600', textAlign: 'center', marginTop: 4 },
  matchDate: { color: colors.muted, fontSize: 12, textAlign: 'center', marginTop: 6 },
  viewMatch: { color: colors.accent, fontSize: 12, fontWeight: '600', textAlign: 'center', marginTop: 8 },
  nextPanel: {
    marginHorizontal: 20,
    marginTop: 8,
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  nextLabel: { color: colors.muted, fontSize: 12, marginBottom: 6 },
  nextTeams: { color: colors.accent, fontSize: 16, fontWeight: '700' },
  nextWhen: { color: colors.text, fontSize: 14, marginTop: 4 },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 14,
    justifyContent: 'space-between',
  },
  quickCard: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 18,
    paddingHorizontal: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  quickLabel: { color: colors.text, fontSize: 14, fontWeight: '600', marginTop: 8 },
  newsCol: { paddingHorizontal: 20 },
  newsCard: {
    marginBottom: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  newsAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  newsAvatarText: { color: colors.text, fontSize: 20, fontWeight: '700' },
  newsTitle: { flex: 1, color: colors.text, fontSize: 14, lineHeight: 20, fontWeight: '600' },
  newsHint: { color: colors.muted, fontSize: 12, marginTop: 4 },
  footerSpacer: { height: 8 },
});
