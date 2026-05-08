require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function main() {
  const pool = await mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  const conn = await pool.getConnection();
  try {
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const [preBalls] = await conn.query(
      'SELECT * FROM ballbyball WHERE match_id=? ORDER BY inning_number,over_number,ball_number_in_over,ball_id',
      [166]
    );
    const [prePms] = await conn.query(
      'SELECT * FROM playermatchstats WHERE match_id=? ORDER BY player_id,stat_id',
      [166]
    );
    fs.writeFileSync(path.join(__dirname, `match-166-prepatch-ballbyball-${ts}.json`), JSON.stringify(preBalls, null, 2));
    fs.writeFileSync(path.join(__dirname, `match-166-prepatch-pms-${ts}.json`), JSON.stringify(prePms, null, 2));

    await conn.beginTransaction();

    await conn.query(
      `DELETE FROM playermatchstats
       WHERE stat_id IN (
         SELECT stat_id FROM (
           SELECT p1.stat_id
           FROM playermatchstats p1
           JOIN (
             SELECT match_id, player_id, MAX(stat_id) AS keep_id
             FROM playermatchstats
             WHERE match_id = ?
             GROUP BY match_id, player_id
           ) k ON p1.match_id = k.match_id AND p1.player_id = k.player_id
           WHERE p1.match_id = ? AND p1.stat_id <> k.keep_id
         ) d
       )`,
      [166, 166]
    );

    const deliveries = [
      // over 2.x remainder (db over_number=3)
      [2, 3, 3, 14, 9, 0, 0, 0, 1, 'Wide', 1, 0, null, null, '2.3: Ball. Ahsan to Jeyaram Wide! +1.'],
      [2, 3, 3, 14, 9, 1, 0, 0, 0, null, 0, 0, null, null, '2.3: Ball. Ahsan to Jeyaram 1 run.'],
      [2, 3, 4, 14, 9, 0, 0, 0, 0, null, 0, 0, null, null, '2.4: Ball. Ahsan to Jeyaram no run.'],
      [2, 3, 5, 14, 9, 1, 0, 0, 0, null, 0, 0, null, null, '2.5: Ball. Ahsan to Jeyaram 1 run.'],
      [2, 3, 6, 14, 9, 0, 0, 0, 0, null, 0, 0, null, null, '2.6: Ball. Ahsan to Jeyaram no run.'],
      // super over 3.x (db over_number=4) with doubled component in super_over_runs
      [2, 4, 1, 5, 9, 2, 2, 0, 0, null, 0, 0, null, null, '3.1: Ball. Suhan to Jeyaram 2 runs.'],
      [2, 4, 2, 5, 9, 0, 1, 0, 1, 'Wide', 1, 0, null, null, '3.2: Ball. Suhan to Jeyaram Wide! +2.'],
      [2, 4, 2, 5, 9, 1, 1, 0, 0, null, 0, 0, null, null, '3.2: Ball. Suhan to Jeyaram 1 run.'],
      [2, 4, 3, 5, 9, 0, 0, 0, 0, null, 0, 0, null, null, '3.3: Ball. Suhan to Jeyaram no run.'],
      [2, 4, 4, 5, 9, 0, 0, 0, 0, null, 0, 0, null, null, '3.4: Ball. Suhan to Jeyaram no run.'],
      [2, 4, 5, 5, 9, 1, 2, 1, 1, 'Wide', 1, 0, null, null, '3.5: Ball. Suhan to Jeyaram Wide + Bye! +4.'],
      [2, 4, 5, 5, 9, 0, 0, 0, 0, null, 0, 0, null, null, '3.5: Ball. Suhan to Jeyaram no run.'],
      [2, 4, 6, 5, 9, 1, 1, 0, 0, null, 0, 0, null, null, '3.6: Ball. Suhan to Jeyaram 1 run.'],
      // over 4.x (db over_number=5)
      [2, 5, 1, 14, 9, 2, 0, 0, 0, null, 0, 0, null, null, '4.1: Ball. Ahsan to Jeyaram 2 runs.'],
      [2, 5, 2, 14, 9, 0, 0, 0, 0, null, 0, 1, '', null, '4.2: Ball. Ahsan to Jeyaram WICKET! (Hit Outside). no run.'],
      [2, 5, 3, 14, 2, 0, 0, 0, 0, null, 0, 0, null, null, '4.3: Ball. Ahsan to Rahul no run.'],
      [2, 5, 4, 14, 2, 0, 0, 0, 0, null, 0, 0, null, null, '4.4: Ball. Ahsan to Rahul no run.'],
      [2, 5, 5, 14, 2, 2, 0, 0, 0, null, 0, 0, null, null, '4.5: Ball. Ahsan to Rahul 2 runs. INNINGS END (Chase Complete).'],
    ];

    for (const d of deliveries) {
      await conn.query(
        `INSERT INTO ballbyball
         (match_id, inning_number, over_number, ball_number_in_over, bowler_player_id, batsman_on_strike_player_id,
          runs_scored, super_over_runs, is_bye, is_extra, extra_type, extra_runs, is_wicket, wicket_type, fielder_player_id, commentary_text)
         VALUES (166,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        d
      );
    }

    await conn.commit();

    const [postBalls] = await conn.query(
      'SELECT * FROM ballbyball WHERE match_id=? ORDER BY inning_number,over_number,ball_number_in_over,ball_id',
      [166]
    );
    const [postPms] = await conn.query(
      'SELECT * FROM playermatchstats WHERE match_id=? ORDER BY player_id,stat_id',
      [166]
    );
    fs.writeFileSync(path.join(__dirname, `match-166-postpatch-ballbyball-${ts}.json`), JSON.stringify(postBalls, null, 2));
    fs.writeFileSync(path.join(__dirname, `match-166-postpatch-pms-${ts}.json`), JSON.stringify(postPms, null, 2));

    console.log(
      JSON.stringify(
        {
          inserted: deliveries.length,
          ballRowsAfter: postBalls.length,
          pmsRowsAfterDedup: postPms.length,
          backupTs: ts,
        },
        null,
        2
      )
    );
  } catch (error) {
    await conn.rollback();
    console.error(error);
    process.exitCode = 1;
  } finally {
    conn.release();
    await pool.end();
  }
}

main();
