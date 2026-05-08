import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors } from '../theme';

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.block}>
      <Text style={styles.blockTitle}>{title}</Text>
      {children}
    </View>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <>
      {items.map((t) => (
        <Text key={t} style={styles.bullet}>
          • {t}
        </Text>
      ))}
    </>
  );
}

export default function RulesScreen() {
  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>MPL rules — match format & guidelines</Text>
      <Text style={styles.note}>Same content as the website Rules / FAQ page.</Text>

      <Block title="Run rules by zone">
        <Text style={styles.sub}>Zone A (behind the stumps)</Text>
        <BulletList
          items={[
            '1 run if the ball off the bat crosses the rope',
            '1 bye if the ball crosses the boundary rope without touching the batter or wide cone',
          ]}
        />
        <Text style={[styles.sub, styles.subSpaced]}>Zone B (parallel boundaries — leg and off side)</Text>
        <BulletList items={['2 runs if the ball off the bat crosses the rope']} />
        <Text style={[styles.sub, styles.subSpaced]}>Zone C (straight boundary)</Text>
        <BulletList items={['4 runs if the ball off the bat crosses the rope']} />
      </Block>

      <Block title="Wide ball rules">
        <BulletList
          items={[
            'Ball on or outside the wide cone is considered wide',
            'First bouncer over shoulders is legal',
            'Second bouncer over shoulders is wide',
            'Bouncer over the head is a straight wide',
            'Only 1 bouncer per over is allowed',
          ]}
        />
      </Block>

      <Block title="No ball rules">
        <BulletList
          items={[
            "Bowler's front foot crosses the crease",
            'Any leg outside the bowling crease at delivery start',
            'Full arm rotation without momentum break',
            'Non-bowling arm raised above shoulder or rotated',
            'Full-toss above hip height',
            'More than one fielder behind the bowling stump',
          ]}
        />
      </Block>

      <Block title="Boundary rules">
        <BulletList
          items={[
            'Ball touching the boundary = runs',
            'Ball hitting rope or flag directly = runs',
            'Ball going outside after fielder touch = runs',
            'Ball going outside during a no-ball = runs',
            'Ball going outside untouched = OUT',
          ]}
        />
      </Block>

      <Block title="Super over rules">
        <BulletList
          items={[
            'A Super Over may replace any one over from Over 1 to Over 4 only. Over 5 can never be designated as a Super Over.',
            'The selected over is common for both teams (e.g. lottery-style draw from Overs 1–4).',
            'All runs (including extras) in the Super Over are counted as double.',
            'All fielders must be within the bowling stumps during the Super Over.',
            'The bowler who delivers the Super Over cannot bowl 2 regular overs.',
          ]}
        />
      </Block>

      <Block title="Bowling rules">
        <BulletList
          items={[
            'The first four overs must be bowled by four different bowlers.',
            'Only one bowler in the innings may bowl two overs.',
            'If that bowler bowls two overs: their second over must be the 5th over; their first over may be Over 1, 2, or 3 only (not Over 4).',
            'No bowler may bowl both Over 4 and Over 5.',
            'The bowler who bowls the Super Over cannot bowl 2 regular overs.',
          ]}
        />
      </Block>

      <Block title="Batting restrictions">
        <BulletList
          items={[
            'A batter must retire after facing 12 legal deliveries.',
            'A batter cannot retire voluntarily before completing 12 legal balls.',
            'If the batter is dismissed (bowled, caught, etc.), the next batter comes in normally.',
            'If all wickets fall and retired batters remain, they may return to bat in the same order in which they retired.',
          ]}
        />
      </Block>

      <Block title="Stumping rules">
        <BulletList
          items={[
            'Stumping is allowed only if the wicketkeeper is standing close to the stumps',
            'Run-out is not applicable, as there is no running involved',
          ]}
        />
      </Block>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 40 },
  pageTitle: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 8 },
  note: { color: colors.muted, fontSize: 13, marginBottom: 20 },
  block: {
    marginBottom: 22,
    padding: 14,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  blockTitle: { fontSize: 17, fontWeight: '700', color: colors.accent, marginBottom: 10 },
  sub: { color: colors.text, fontSize: 14, fontWeight: '600', marginBottom: 6 },
  subSpaced: { marginTop: 10 },
  bullet: { color: colors.text, fontSize: 14, lineHeight: 22, marginBottom: 6, paddingLeft: 4 },
});
