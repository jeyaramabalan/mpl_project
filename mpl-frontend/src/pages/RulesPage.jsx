// src/pages/RulesPage.jsx
// MPL Rules – Match Format & Guidelines (replaces FAQ).

import React from 'react';
import './RulesPage.css';

function RulesPage() {
    return (
        <div className="mpl-section rules-page">
            <h1 className="mpl-page-title rules-page-title">🏏 MPL Rules – Match Format & Guidelines</h1>

            <section className="rules-block rules-block--run">
                <h2 className="rules-block__title">🟨 Run Rules by Zone</h2>
                <ul className="rules-list">
                    <li><strong>Zone A (Behind the stumps)</strong>
                        <ul>
                            <li>1 run if the ball off the bat crosses the rope</li>
                            <li>1 bye if the ball crosses the boundary rope without touching the batsman or wide cone</li>
                        </ul>
                    </li>
                    <li><strong>Zone B (Parallel boundaries – leg and off side)</strong>
                        <ul>
                            <li>2 runs if the ball off the bat crosses the rope</li>
                        </ul>
                    </li>
                    <li><strong>Zone C (Straight boundary)</strong>
                        <ul>
                            <li>4 runs if the ball off the bat crosses the rope</li>
                        </ul>
                    </li>
                </ul>
            </section>

            <section className="rules-block rules-block--wide">
                <h2 className="rules-block__title">⚠️ Wide Ball Rules</h2>
                <ul className="rules-list">
                    <li>Ball on or outside the wide cone is considered wide</li>
                    <li>First bouncer over shoulders is legal</li>
                    <li>Second bouncer over shoulders is wide</li>
                    <li>Bouncer over the head is a straight wide</li>
                    <li>Only 1 bouncer per over is allowed</li>
                </ul>
            </section>

            <section className="rules-block rules-block--noball">
                <h2 className="rules-block__title">🚫 No Ball Rules</h2>
                <ul className="rules-list">
                    <li>Bowler’s front foot crosses the crease</li>
                    <li>Any leg outside the bowling crease at delivery start</li>
                    <li>Full arm rotation without momentum break</li>
                    <li>Non-bowling arm raised above shoulder or rotated</li>
                    <li>Full-toss above hip height</li>
                    <li>More than one fielder behind the bowling stump</li>
                </ul>
            </section>

            <section className="rules-block rules-block--boundary">
                <h2 className="rules-block__title">🏁 Boundary Rules</h2>
                <ul className="rules-list">
                    <li>Ball touching the boundary = Runs</li>
                    <li>Ball hitting rope or flag directly = Runs</li>
                    <li>Ball going outside after fielder touch = Runs</li>
                    <li>Ball going outside during a no-ball = Runs</li>
                    <li>Ball going outside untouched = OUT</li>
                </ul>
            </section>

            <section className="rules-block rules-block--super">
                <h2 className="rules-block__title">🔥 Super Over Rules</h2>
                <ul className="rules-list">
                    <li>Super Over is randomly selected from one of the 5 overs using a lottery-style draw</li>
                    <li>The selected over is common for both teams</li>
                    <li>All runs (including extras) are counted as double</li>
                    <li>All fielders must be within the bowling stumps</li>
                    <li>The bowler who delivers the Super Over cannot bowl 2 regular overs</li>
                </ul>
            </section>

            <section className="rules-block rules-block--bowling">
                <h2 className="rules-block__title">🎯 Bowling Rules</h2>
                <ul className="rules-list">
                    <li>Only one bowler can bowl maximum 2 overs</li>
                    <li>Bowler who bowls the Super Over cannot bowl 2 regular overs</li>
                </ul>
            </section>

            <section className="rules-block rules-block--stumping">
                <h2 className="rules-block__title">❌ Stumping Rules</h2>
                <ul className="rules-list">
                    <li>Stumping is allowed only if the wicketkeeper is standing close to the stumps</li>
                    <li>Run-out is not applicable, as there is no running involved</li>
                </ul>
            </section>
        </div>
    );
}

export default RulesPage;
