const DEFAULT_IMPACT_SETTINGS = {
    batting_dot_ball: -0.25,
    batting_one_run: 1,
    batting_two_runs: 3,
    batting_four_runs: 6,
    bowling_legal_dot: 1,
    bowling_extra_dot: -0.5,
    bowling_legal_one: 0,
    bowling_extra_one: -1,
    bowling_two_conceded: -1,
    bowling_four_conceded: -2,
    bowling_extra_other: -1,
    bowling_wicket_bonus: 6,
    fielding_catch_stumping: 5,
    super_over_batting_multiplier: 1.5,
    super_over_bowling_multiplier: 1.5,
};

async function ensureImpactSettingsTable(queryable) {
    await queryable.query(`
        CREATE TABLE IF NOT EXISTS impact_settings (
            id INT PRIMARY KEY AUTO_INCREMENT,
            super_over_batting_multiplier DECIMAL(6,2) NOT NULL DEFAULT 1.50,
            super_over_bowling_multiplier DECIMAL(6,2) NOT NULL DEFAULT 1.50,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `);
    const [cols] = await queryable.query(
        `SELECT COLUMN_NAME
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'impact_settings'`
    );
    const existing = new Set(cols.map((c) => c.COLUMN_NAME));
    const required = [
        ['batting_dot_ball', 'DECIMAL(8,2) NOT NULL DEFAULT -0.25'],
        ['batting_one_run', 'DECIMAL(8,2) NOT NULL DEFAULT 1.00'],
        ['batting_two_runs', 'DECIMAL(8,2) NOT NULL DEFAULT 3.00'],
        ['batting_four_runs', 'DECIMAL(8,2) NOT NULL DEFAULT 6.00'],
        ['bowling_legal_dot', 'DECIMAL(8,2) NOT NULL DEFAULT 1.00'],
        ['bowling_extra_dot', 'DECIMAL(8,2) NOT NULL DEFAULT -0.50'],
        ['bowling_legal_one', 'DECIMAL(8,2) NOT NULL DEFAULT 0.00'],
        ['bowling_extra_one', 'DECIMAL(8,2) NOT NULL DEFAULT -1.00'],
        ['bowling_two_conceded', 'DECIMAL(8,2) NOT NULL DEFAULT -1.00'],
        ['bowling_four_conceded', 'DECIMAL(8,2) NOT NULL DEFAULT -2.00'],
        ['bowling_extra_other', 'DECIMAL(8,2) NOT NULL DEFAULT -1.00'],
        ['bowling_wicket_bonus', 'DECIMAL(8,2) NOT NULL DEFAULT 6.00'],
        ['fielding_catch_stumping', 'DECIMAL(8,2) NOT NULL DEFAULT 5.00'],
    ];
    for (const [name, typeDef] of required) {
        if (!existing.has(name)) {
            await queryable.query(`ALTER TABLE impact_settings ADD COLUMN ${name} ${typeDef}`);
        }
    }
}

async function getImpactSettings(queryable) {
    await ensureImpactSettingsTable(queryable);
    const [rows] = await queryable.query(
        `SELECT batting_dot_ball, batting_one_run, batting_two_runs, batting_four_runs,
                bowling_legal_dot, bowling_extra_dot, bowling_legal_one, bowling_extra_one,
                bowling_two_conceded, bowling_four_conceded, bowling_extra_other,
                bowling_wicket_bonus, fielding_catch_stumping,
                super_over_batting_multiplier, super_over_bowling_multiplier
         FROM impact_settings
         ORDER BY id DESC
         LIMIT 1`
    );
    if (!rows.length) {
        await queryable.query(
            `INSERT INTO impact_settings (
                batting_dot_ball, batting_one_run, batting_two_runs, batting_four_runs,
                bowling_legal_dot, bowling_extra_dot, bowling_legal_one, bowling_extra_one,
                bowling_two_conceded, bowling_four_conceded, bowling_extra_other,
                bowling_wicket_bonus, fielding_catch_stumping,
                super_over_batting_multiplier, super_over_bowling_multiplier
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                DEFAULT_IMPACT_SETTINGS.batting_dot_ball,
                DEFAULT_IMPACT_SETTINGS.batting_one_run,
                DEFAULT_IMPACT_SETTINGS.batting_two_runs,
                DEFAULT_IMPACT_SETTINGS.batting_four_runs,
                DEFAULT_IMPACT_SETTINGS.bowling_legal_dot,
                DEFAULT_IMPACT_SETTINGS.bowling_extra_dot,
                DEFAULT_IMPACT_SETTINGS.bowling_legal_one,
                DEFAULT_IMPACT_SETTINGS.bowling_extra_one,
                DEFAULT_IMPACT_SETTINGS.bowling_two_conceded,
                DEFAULT_IMPACT_SETTINGS.bowling_four_conceded,
                DEFAULT_IMPACT_SETTINGS.bowling_extra_other,
                DEFAULT_IMPACT_SETTINGS.bowling_wicket_bonus,
                DEFAULT_IMPACT_SETTINGS.fielding_catch_stumping,
                DEFAULT_IMPACT_SETTINGS.super_over_batting_multiplier,
                DEFAULT_IMPACT_SETTINGS.super_over_bowling_multiplier,
            ]
        );
        return { ...DEFAULT_IMPACT_SETTINGS };
    }
    return {
        batting_dot_ball: Number(rows[0].batting_dot_ball),
        batting_one_run: Number(rows[0].batting_one_run),
        batting_two_runs: Number(rows[0].batting_two_runs),
        batting_four_runs: Number(rows[0].batting_four_runs),
        bowling_legal_dot: Number(rows[0].bowling_legal_dot),
        bowling_extra_dot: Number(rows[0].bowling_extra_dot),
        bowling_legal_one: Number(rows[0].bowling_legal_one),
        bowling_extra_one: Number(rows[0].bowling_extra_one),
        bowling_two_conceded: Number(rows[0].bowling_two_conceded),
        bowling_four_conceded: Number(rows[0].bowling_four_conceded),
        bowling_extra_other: Number(rows[0].bowling_extra_other),
        bowling_wicket_bonus: Number(rows[0].bowling_wicket_bonus),
        fielding_catch_stumping: Number(rows[0].fielding_catch_stumping),
        super_over_batting_multiplier: Number(rows[0].super_over_batting_multiplier),
        super_over_bowling_multiplier: Number(rows[0].super_over_bowling_multiplier),
    };
}

async function upsertImpactSettings(queryable, settings) {
    await ensureImpactSettingsTable(queryable);
    await queryable.query(
        `INSERT INTO impact_settings (
            batting_dot_ball, batting_one_run, batting_two_runs, batting_four_runs,
            bowling_legal_dot, bowling_extra_dot, bowling_legal_one, bowling_extra_one,
            bowling_two_conceded, bowling_four_conceded, bowling_extra_other,
            bowling_wicket_bonus, fielding_catch_stumping,
            super_over_batting_multiplier, super_over_bowling_multiplier
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            settings.batting_dot_ball,
            settings.batting_one_run,
            settings.batting_two_runs,
            settings.batting_four_runs,
            settings.bowling_legal_dot,
            settings.bowling_extra_dot,
            settings.bowling_legal_one,
            settings.bowling_extra_one,
            settings.bowling_two_conceded,
            settings.bowling_four_conceded,
            settings.bowling_extra_other,
            settings.bowling_wicket_bonus,
            settings.fielding_catch_stumping,
            settings.super_over_batting_multiplier,
            settings.super_over_bowling_multiplier,
        ]
    );
}

function applySuperOverImpactMultiplier(points, isSuperOverBall, settings) {
    if (!isSuperOverBall) return points;
    return {
        batsman: Number(points.batsman) * Number(settings.super_over_batting_multiplier),
        bowler: Number(points.bowler) * Number(settings.super_over_bowling_multiplier),
        fielder: Number(points.fielder),
    };
}

module.exports = {
    DEFAULT_IMPACT_SETTINGS,
    ensureImpactSettingsTable,
    getImpactSettings,
    upsertImpactSettings,
    applySuperOverImpactMultiplier,
};
