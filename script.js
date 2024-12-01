// Global variables:
var currentMoveIndex = 0;
var totalMoves = 0;
var currentPuzzleMoves = [];
var puzzles = [];
var whitePuzzle = true;
var freeze = false;
let eloLabels = [];         
let prior = [];        
let puzzleCount = 0;
var currentPuzzleRating = 0;
let expectationOverTime = [];
let puzzleRatingOverTime = [];
let success = [];
let count = 0;
let totalCount = 17;
let openingPuzzles = [];
let middlegamePuzzles = [];
let endgamePuzzles = [];
let currentPuzzleType = "Opening"; 
let priorOpening = []
let priorMiddlegame = []
let priorEndgame = []
let expectationOverTimeOpening = [];
let puzzleRatingOverTimeOpening = [];
let successOpening = [];
let expectationOverTimeMiddlegame = [];
let puzzleRatingOverTimeMiddlegame = [];
let successMiddlegame = [];
let expectationOverTimeEndgame = [];
let puzzleRatingOverTimeEndgame = [];
let successEndgame = [];
let puzzleFenOverTime = [];
let puzzleUrls = [];



document.querySelector("button[onclick='learnMore()']").style.display = "none"; // for now, until write-up ready

// Called when the diagnostic is finished. 
// Does a lot of things: Closes/hides elements not needed
// Shows elements needed. Updates charts/tables. 
// Deals with the modal for the fen
function finishDiagnostic() {

    if (puzzleCount < 3) { // can't stop before 3
        alert("You must solve at least 3 puzzles, but we recommend 17.");
        event.preventDefault();
        return;
    }
    else if (puzzleCount < 17) {  // recc. not to stop before 17
        const confirmed = confirm(`Note: You only completed ${puzzleCount} puzzle(s). \nResults may be be incomplete or inaccurate. \nAre you sure you wish to proceed?`);
        if (!confirmed) {
            event.preventDefault();
            return;
        }
    }

    // hide/show elements needed:
    document.getElementById("diagnosticSubtitle").style.display = "none";
    document.getElementById("diagnosticTitle").style.display = "none";
    document.getElementById("scene2").style.display = "none";
    document.getElementById("scene3").style.display = "block";
    document.getElementById('resultsTable').style.display = 'table'; // Make the table visible
    document.getElementById("toMove").style.display = "none";
    document.getElementById("moveResult").style.display = "none";
    document.getElementById("chessboard").style.display = "none";
    document.querySelector("button[onclick='finishDiagnostic()']").style.display = "none";
    document.querySelector("button[onclick='loadNextPuzzle()']").style.display = "none";
    const expectations = [1500, ...expectationOverTime];
    const overallRating = Math.round(expectations[expectations.length - 1]);
    const openingRating = Math.round(expectationOverTimeOpening[expectationOverTimeOpening.length - 1]);
    const middlegameRating = Math.round(expectationOverTimeMiddlegame[expectationOverTimeMiddlegame.length - 1]);
    const endgameRating = Math.round(expectationOverTimeEndgame[expectationOverTimeEndgame.length - 1]);
    document.querySelector(".stats-card .rating").textContent = "Rating: " + overallRating;
    document.querySelector(".stats-card .rating-row:nth-child(1)").textContent = "Opening Rating: " + openingRating;
    document.querySelector(".stats-card .rating-row:nth-child(2)").textContent = "Middlegame Rating: " + middlegameRating;
    document.querySelector(".stats-card .rating-row:nth-child(3)").textContent = "Endgame Rating: " + endgameRating;

    // highlight the highest rating: 
    const ratings = [openingRating, middlegameRating, endgameRating];
    const maxRating = Math.max(...ratings);
    const ratingRows = document.querySelectorAll(".stats-card .rating-row");
    ratingRows.forEach((row, index) => {
        if (ratings[index] === maxRating) {
            const ratingValue = row.textContent.split(": ")[1];
            row.innerHTML = row.textContent.replace(ratingValue, `<span class="highlight">${ratingValue}</span>`);
        }
    });

    // plot the table and charts: 
    plotCumulativeEloChart(eloLabels, prior);
    const datasets = [
        {
            label: 'Opening',
            data: priorOpening,
            borderColor: 'rgba(255, 99, 132, 1)',
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            fill: true,
        },
        {
            label: 'Middlegame',
            data: priorMiddlegame,
            borderColor: 'rgba(54, 162, 235, 1)',
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            fill: true,
        },
        {
            label: 'Endgame',
            data: priorEndgame,
            borderColor: 'rgba(75, 192, 192, 1)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            fill: true,
        }];

    plotChart2(eloLabels, datasets, "individualGraph", "Elo Rating", "TEXT");
    const puzzleRatings = puzzleRatingOverTime;
    const results = success;

    // Generate x-axis labels from 1 to n (puzzle #1, #2, #3, ...)
    const xLabels = Array.from({ length: expectations.length + 1 }, (_, i) => i);

    const ctx = document.getElementById('sessionChart').getContext('2d');
    const sessionChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: xLabels,
            datasets: [{
                label: 'Expectation Over Time',
                data: expectations,
                borderColor: 'blue',
                backgroundColor: 'blue',
                fill: false,
                pointRadius: 5,
                pointHoverRadius: 7,
            }]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Puzzle Number',
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Estimated Elo',
                    }
                }
            },
            animation: {
                duration: 0, // Disable animations for smoother experience
            },
        },
    });

    // Function to populate the table with puzzle results and updated Elo estimates
    // Function to populate the table with puzzle results and updated Elo estimates
    function updateTable() {
        const tableBody = document.getElementById('resultsTable').getElementsByTagName('tbody')[0];

        // Add the initial "Starting Guess" row
        const initialRow = tableBody.insertRow();
        const initialCell1 = initialRow.insertCell(0);
        const initialCell2 = initialRow.insertCell(1);
        initialCell1.textContent = "Starting Guess";
        initialCell2.textContent = "1500";  // Initial Elo guess

        // Add the puzzle results and updated Elo values
        for (let i = 1; i < expectations.length; i++) {
            const row = tableBody.insertRow();
            const cell1 = row.insertCell(0);
            const cell2 = row.insertCell(1);

            // Add the puzzle result and rating with color
            const resultText = results[i - 1];
            const resultClass = resultText === "Solved" ? "solved-highlight" : "failed-highlight"; // Use CSS classes for highlighting
            const puzzleInfo = `<span class="${resultClass}">${resultText} Puzzle Rated ${puzzleRatings[i - 1]}</span>`;
            cell1.innerHTML = puzzleInfo;

            const updatedElo = Math.round(expectations[i]);
            cell2.textContent = updatedElo;
        }
    }

    // update the table and add in modal: 
    updateTable();
    const reviewPuzzlesButton = document.getElementById("reviewPuzzles");
    const fenModal = document.getElementById("fenModal");
    const closeModal = document.querySelector(".close-modal");

    reviewPuzzlesButton.addEventListener("click", () => {
        fenModal.style.display = "block";

        // Populate the FEN list in the modal with clickable links
        const fenList = document.getElementById("fenList");
        fenList.innerHTML = "";
        puzzleFenOverTime.forEach((fen, index) => {
            const fenItem = document.createElement("p");
            const fenText = document.createTextNode(`Puzzle ${index + 1}: ${fen} `);
            fenItem.appendChild(fenText);

            const link = document.createElement("a");
            link.href = puzzleUrls[index]; // Access the URL from the puzzleUrls array
            link.target = "_blank";
            link.textContent = "(link to game)";
            fenItem.appendChild(link);

            fenList.appendChild(fenItem);
        });
    });

    closeModal.addEventListener("click", () => {
        fenModal.style.display = "none";
    });

    // for the modal, close it when user clicks anywhere
    window.onclick = function (event) {
        if (event.target == fenModal) {
            fenModal.style.display = "none";
        }
    }
}

// Initially loads all the puzzles from the database for use later
function loadPuzzles(callback) {
    $("#loadingIndicator").show(); // show loading indicator

    $.ajax({
        type: "GET",
        url: "database/balanced_lichess_puzzles_Sorted.csv",
        dataType: "text",
        success: function (data) {
            const rows = data.split("\n");
            rows.slice(1).forEach(row => {
                const cols = row.split(',');
                if (cols.length > 4) {
                    const puzzle = { // add in the fen, solutions, rating, type, and url into the puzzle
                        fen: cols[0].trim(),
                        solution: cols[1].split(' ').map(move => move.trim()),
                        rating: parseInt(cols[2].trim(), 10),
                        type: cols[3].trim(),
                        url: cols[4].trim()
                    };

                    const isUnderpromotion = puzzle.solution.some(move => { // disregard puzzles with underpromotion (don't handle this yet)
                        const lastChar = move[move.length - 1];
                        return lastChar === 'r' || lastChar === 'b' || lastChar === 'n';
                    });

                    if (!isUnderpromotion) {
                        // push into the correct array of puzzles based on the theme 
                        if (puzzle.type === "Opening") {
                            openingPuzzles.push(puzzle);
                        } else if (puzzle.type === "Middlegame") {
                            middlegamePuzzles.push(puzzle);
                        } else if (puzzle.type === "Endgame") {
                            endgamePuzzles.push(puzzle);
                        }
                    } else {
                        console.log(puzzle.solution);

                    }
                }
            });

            // hide indicator
            $("#loadingIndicator").hide();
            if (callback) {
                callback();
            }
        },
        error: function () {
            //hide indicator
            $("#loadingIndicator").hide();
            showMessage("Error loading CSV."); // error loading the csv.
        }
    });
}

// Called each time next puzzle is pressed (or initial puzzle is loaded)
// Picks the puzzle and updates information as needed. 
function loadNextPuzzle() {

    reset();
    document.getElementById("moveResult").style.display = "none";
    document.querySelector("button[onclick='loadNextPuzzle()']").style.display = "none";
    document.querySelector("button[onclick='finishDiagnostic()']").style.display = "none";
    document.getElementById("toMove").style.display = "block";

    // switch the puzzle type "theme"
    if (currentPuzzleType === "Opening") {
        currentPuzzleType = "Middlegame";
    } else if (currentPuzzleType === "Middlegame") {
        currentPuzzleType = "Endgame";
    } else {
        currentPuzzleType = "Opening";
    }

    // select the puzzle based on "theme"
    let puzzle;
    if (currentPuzzleType === "Opening") {
        puzzle = selectPuzzle(openingPuzzles, prior);
    } else if (currentPuzzleType === "Middlegame") {
        puzzle = selectPuzzle(middlegamePuzzles, prior);
    } else {
        puzzle = selectPuzzle(endgamePuzzles, prior);
    }

    puzzleCount += 1; // increment puzzleCount counter
    const fen = puzzle.fen;
    if (color(fen) === true) {
        whitePuzzle = false;
    }
    if (whitePuzzle) {
        showMessageMove("Puzzle #" + puzzleCount + ", White To Move");
        board.orientation('white');
    }
    else {
        showMessageMove("Puzzle #" + puzzleCount + ", Black To Move");
        board.orientation('black');

    }
    currentPuzzleMoves = puzzle.solution;
    currentPuzzleRating = puzzle.rating;
    game.load(fen);
    board.position(fen);
    totalMoves = currentPuzzleMoves.length;
    makeMove(currentPuzzleMoves[0]);
    puzzleFenOverTime.push(game.fen());
    puzzleUrls.push(puzzle.url);
}

// Plots the chart for the cumlative chart
function plotCumulativeEloChart(labels, data) {
    const cumulativeData = [];
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
        sum += data[i];
        cumulativeData.push(sum);
    }

    const ctx = document.getElementById('cumulativeEloChart').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Cumulative ELO Probability',
                data: cumulativeData,
                borderColor: 'rgba(255, 99, 132, 1)',  // Example color (red)
                backgroundColor: 'rgba(255, 99, 132, 0.2)', // Example color (red)
                fill: true,
            }]
        },
        options: {
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'ELO Rating'
                    },
                    ticks: {
                        stepSize: 50
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Cumulative Probability'
                    },
                    beginAtZero: true,
                    max: 1.0 // Set max y-value to 1.0 for probability
                }
            }
        }
    });
}

// Plots the chart for all themes (openings, middlegames, and endgames)
function plotChart2(labels, datasets, elementId, xAxisLabel) {
    const ctx = document.getElementById(elementId).getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        usePointStyle: true
                    }
                }, title: {
                    display: true,
                    text: "Rating Distribution By Game Stage",
                    font: {
                        size: 18
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function (context) {
                            return `${context.dataset.label}: ${context.raw.toFixed(6)}`;
                        }
                    }
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: xAxisLabel
                    },
                    ticks: {
                        stepSize: 50
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Probability'
                    },
                    beginAtZero: true
                }
            }
        }
    });
}

// Takes in a distribution (assumed to be sorted by rating) and database of puzzles. Selects the puzzle that is closest in
// rating to the expectation +- 100 (for randomness) of the distribution (fast & accurate approximation of Entropy-based puzzle selection)
function selectPuzzle(puzzles, distribution) {
    const targetRating = calculateExpectedElo(eloLabels, distribution); // target rating to find

    // binary search:
    let left = 0;
    let right = puzzles.length - 1;

    while (left < right) { // traverse, via binary search to find the closest rating
        const mid = Math.floor((left + right) / 2);
        if (puzzles[mid].rating < targetRating) {
            left = mid + 1;
        } else {
            right = mid;
        }
    }

    const closestIndex = left; // the closest rating is left. 

    // Add some randomness so that it is not the same game each time
    // Allow for any puzzle within a 100 radius in both directions: 
    const startIndex = Math.max(0, closestIndex - 100);
    const endIndex = Math.min(puzzles.length - 1, closestIndex + 100);
    const rangeSize = endIndex - startIndex + 1;
    const randomOffset = Math.floor(Math.random() * rangeSize);
    const randomIndex = startIndex + randomOffset;
    return puzzles[randomIndex];
}

// when a new puzzle is made, re-initialzie vars to 0/starting 
function reset() {
    currentMoveIndex = 0;
    totalMoves = 0;
    currentPuzzleMoves = [];
    whitePuzzle = true;
    freeze = false;
}

// Helper function: identify the side to move in the given fen
function color(fen) {
    const parts = fen.split(" ");
    return parts[1] === 'w';
}

// Called when a piece is being moved. Ensure user is allowed to move piece
function onDragStart(source, piece, position, orientation) {
    if (freeze) { // user should not be moving pieces, return false
        return false;
    }
    else if ((game.turn() === 'w' && piece.search(/^b/) !== -1) ||
        (game.turn() === 'b' && piece.search(/^w/) !== -1)) { // user is trying to move opponents piece, return false
        return false
    }
    return true; // allow the user to move the piece
}

// Called when a piece is dropped. Ensures valid move, and checks if it is correct move
function onDrop(source, target, piece, newPos, oldPos, orientation) {
    var move = source + target;
    if (makeMove(move) === null) { // move is not valid
        return 'snapback';
    }
    if (game.in_checkmate()) { // if move is checkmate, then it is correct (for when there are multiple mates, not all can be listed in soln.) 
        correctMove();
    }
    else { // if move is not checkmate, check if it is correct move in the solution. 
        if (move === currentPuzzleMoves[currentMoveIndex - 1].substring(0, 4)) { // substring as a workaround for when there is promotion:
            correctMove();
        }
        else {
            finishedPuzzle(false);
        }
    }
}

// Called when a correct move is made. Simply checks if there are more moves to make, or the puzzle is finished.
function correctMove() {
    if (currentMoveIndex === totalMoves) { // last move
        finishedPuzzle(true);
    }
    else {  // more moves need to be made
        makeMove(currentPuzzleMoves[currentMoveIndex]);
        return;
    }
}

// Called when a puzzle is finished. Cleans up, incremenets counter, etc. 
function finishedPuzzle(result) {
    freeze = true; // don't let user make any more moves
    document.getElementById("moveResult").style.display = "block";
    if (result) {
        showMessage("Amazing. You got it!");
        prior = updateBelief(prior, currentPuzzleRating, true, 1);
        success.push("Solved");
    }
    else {
        showMessage("Oh no!, that was incorrect.");
        prior = updateBelief(prior, currentPuzzleRating, false, 1);
        success.push("Failed");
    }
    if (currentPuzzleType === "Opening") { // updates theme specific items
        priorOpening = updateBelief(priorOpening, currentPuzzleRating, result, 1);
        expectationOverTimeOpening.push(calculateExpectedElo(eloLabels, priorOpening));
        puzzleRatingOverTimeOpening.push(currentPuzzleRating);
    } else if (currentPuzzleType === "Middlegame") {
        priorMiddlegame = updateBelief(priorMiddlegame, currentPuzzleRating, result, 1);
        expectationOverTimeMiddlegame.push(calculateExpectedElo(eloLabels, priorMiddlegame));
        puzzleRatingOverTimeMiddlegame.push(currentPuzzleRating);
    } else {
        priorEndgame = updateBelief(priorEndgame, currentPuzzleRating, result, 1);
        expectationOverTimeEndgame.push(calculateExpectedElo(eloLabels, priorEndgame));
        puzzleRatingOverTimeEndgame.push(currentPuzzleRating);
    }

    updateChartWithNewData(eloLabels, prior);
    expectationOverTime.push(calculateExpectedElo(eloLabels, prior));
    puzzleRatingOverTime.push(currentPuzzleRating);
    document.querySelector("button[onclick='loadNextPuzzle()']").style.display = "block";
    document.querySelector("button[onclick='finishDiagnostic()']").style.display = "block";
    document.getElementById("toMove").style.display = "none";
    incrementCounter(true);
}

// Helper function: takes in a string assumed to be a move, and returns the move in form needed for chess.js/chessboard.js
function stringToMove(move) {
    return { from: move.substring(0, 2), to: move.substring(2, 4), promotion: 'q' }
}

// Makes the given move (in the form of string) to the board and game. 
function makeMove(string) {
    const move = stringToMove(string);
    const result = game.move(move);
    if (result === null) return null; // invalid move
    setTimeout(() => board.position(game.fen()), 50); // important to refresh board on delay, to avoid ghosting issues. 
    currentMoveIndex++;
    return result;
}

// Display message to the screen (used for error checking, and informing user if they solved correctly or incorrectly)
function showMessage(msg) {
    const messageElement = document.getElementById("moveResult");
    if (messageElement) {
        messageElement.innerHTML = msg;
    }
}

// Display message to the screen (used for showing the puzzle count and player to move)
function showMessageMove(msg) {
    const messageElement = document.getElementById("toMove");
    if (messageElement) {
        messageElement.innerHTML = msg;
    }
}

// Initializing the chess board and game
var game = new Chess();
var board = Chessboard('chessboard', {
    draggable: true,
    position: 'start',
    pieceTheme: function (piece) {
        return 'chess-pieces/' + piece + '.png';
    }, onDrop: onDrop
    , onDragStart: onDragStart
});
document.getElementById('chessboard').addEventListener('touchmove', (e) => {
    e.preventDefault();
}, { passive: false });


// Helper function: creates a guassian data, with given mean, stdDev, start, end, and
// step size. Used to create the intiial normal curve for the prior before any puzzle-solving. 
function generateContinuousGaussianData(mean, stdDev, startElo, endElo, step) {
    const data = [];
    const labels = [];
    for (let i = startElo; i <= endElo; i += step) {
        // Gaussian probability density function
        const probabilityDensity = (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * ((i - mean) / stdDev) ** 2);
        data.push(probabilityDensity);
        labels.push(i);
    }

    // Normalize values to sum up to 1 (for displaying as percentages)
    const sum = data.reduce((acc, val) => acc + val, 0);
    const normalizedData = data.map(value => value / sum);

    return { data: normalizedData, labels: labels };
}

// Plotting the eloChart (constantly gets updated)
function plotEloLineChart(labels, data) {
    const ctx = document.getElementById('eloChart').getContext('2d');
    // Create new chart
    eloChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Elo Probability Mass Function',
                data: data,
                borderColor: 'rgba(75, 192, 192, 1)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                fill: true,
            }]
        },
        options: {
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'ELO Rating'
                    },
                    ticks: {
                        stepSize: 50  // Display every 50 ELO on x-axis
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Probability'
                    },
                    beginAtZero: true
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            // Format the value shown in the tooltip
                            return `${context.dataset.label}: ${context.raw.toFixed(6)}`;
                        }
                    }
                }
            }

        }
    });
}

// load all the puzzles in the start:
loadPuzzles();

// Creates the intial prior: a normal distribution centered at 1500 ELO
document.addEventListener("DOMContentLoaded", () => {
    const mean = 1500;
    const stdDev = 500;
    const startElo = 0;
    const endElo = 3000;
    const step = 1;  // step sizes are set at 1
    const { data: initialData, labels: elo } = generateContinuousGaussianData(mean, stdDev, startElo, endElo, step);
    prior = initialData;
    priorOpening = initialData;
    priorEndgame = initialData;
    priorMiddlegame = initialData;
    eloLabels = elo;
    plotEloLineChart(eloLabels, prior);
});

// Returns the probability that a player rated playerElo solves a puzzle rated puzzleElo
// Assumes player rated Y solves puzzles rated X with equal prob. as they can beat player rated Y.
function eloProbability(playerElo, puzzleElo) {
    return 1 / (1 + Math.pow(10, ((puzzleElo - playerElo)) / 400));
}

// Returns an updated belief distribution given the new old prior, and the new puzzle information
// Uses Bayesian Inference!
function updateBelief(priorBelief, puzzleElo, success) {

    const newBelief = [];
    let totalLikelihood = 0;
    for (let i = 0; i < priorBelief.length; i++) { // for each Elo
        const playerElo = eloLabels[i];
        const likelihood = eloProbability(playerElo, puzzleElo);
        const updatedLikelihood = success ? likelihood : 1 - likelihood;
        newBelief[i] = priorBelief[i] * updatedLikelihood; // numerator
        totalLikelihood += newBelief[i];
    }

    // normalize for the denominator
    for (let i = 0; i < newBelief.length; i++) {
        newBelief[i] /= totalLikelihood;
    }
    return newBelief;
}

function updateChartWithNewData(labels, data) {
    if (eloChart) {
        eloChart.data.labels = labels;
        eloChart.data.datasets[0].data = data;
        const expectedElo = calculateExpectedElo(labels, data);
        eloChart.options.plugins.title.text = `Probabilities after ${puzzleCount} puzzles (Expected ELO: ${expectedElo.toFixed(0)})`;
        eloChart.update(); // Refresh the chart with new data
    }
}

// Calculates the expectation of the given distribution
function calculateExpectedElo(labels, distribution) {
    let expectedElo = 0;
    for (let i = 0; i < labels.length; i++) {
        expectedElo += labels[i] * distribution[i];
    }
    return expectedElo;
}

// Function that turns off & on all elements to begin a new diagnostic, and runs the first puzzle!
function beginDiagnostic() {

    // Turning ON all parts from scene2: 
    document.getElementById("diagnosticSubtitle").style.display = "block";
    document.getElementById("diagnosticTitle").style.display = "block";
    document.getElementById("scene2").style.display = "block";
    document.getElementById("chessboard").style.display = "block";
    document.getElementById("moveResult").style.display = "block";
    document.getElementById("toMove").style.display = "block";
    document.querySelector('.counter-bar-container').style.display = "block";

    // Turning OFF all parts from scene1: 
    document.querySelector("button[onclick='beginDiagnostic()']").style.display = "none";
    document.querySelector("button[onclick='learnMore()']").style.display = "none";
    const cards = document.querySelectorAll('#flowContainer .card');
    cards.forEach(card => { card.style.display = 'none'; });

    // Begin the first puzzle!
    loadNextPuzzle();
}

// Opens up the write-up for this project for interested indivuals
function learnMore() {
    //window.open("CompSci.pdf", "_blank");
}

// Helper function: Called after each puzzle, updates all information below the chess board
function incrementCounter() {
    count++;

    // update counter, progress bar and text:
    const currentCountElement = document.querySelector('.current-count');
    currentCountElement.textContent = count;
    const progressFillElement = document.getElementById('progress-fill');
    const progressPercentage = (count / totalCount) * 100;
    progressFillElement.style.width = `${progressPercentage}%`;
    updateColorsBasedOnDeviation();
}

// Helper function: Updates the color/text below chess board based on current rating deviation
function updateColorsBasedOnDeviation() {

    let deviation = calculateStandardDeviation(eloLabels, prior);
    let color;
    let confidenceText;

    // Setting color+text based on how low the deviation is
    if (deviation <= 100) {
        color = 'green';
        confidenceText = `Very High Confidence`;
    } else if (deviation <= 115) {
        color = 'lightgreen';
        confidenceText = `High Confidence`;
    } else if (deviation <= 150) {
        color = 'yellow';
        confidenceText = `Medium Confidence`;
    } else if (deviation <= 230) {
        color = 'orange';
        confidenceText = `Low Confidence`;
    } else {
        color = 'red';
        confidenceText = `Very Low Confidence`;
    }

    // Updating the color + text with newly set informaiton:
    const progressFillElement = document.getElementById('progress-fill');
    progressFillElement.style.backgroundColor = color;
    const currentCountElement = document.querySelector('.current-count');
    currentCountElement.style.color = color;
    const confidenceTextElement = document.getElementById('confidence-text');
    confidenceTextElement.textContent = confidenceText;
    confidenceTextElement.style.color = 'black';
    const confidenceText2Element = document.getElementById('confidence-text2');
    confidenceText2Element.innerHTML = `
        Your rating deviation is <span style="color: ${color};">${Math.round(deviation)} points</span>. Solve more to lower it!`;
}

// Helper function: 
// Given labels and distrubition, return the amount range for the distrubiton
// Ex: amount = .95, returns sum > .95, and minElo+maxElo for the 95% encompassing expectation  
function getRange(labels, distribution, amount) {

    let expected = calculateExpectedElo(labels, distribution);
    const roundedDown = Math.floor(expected / 25) * 25;
    let index = roundedDown / 25;
    let sum = distribution[index];
    let range = [index];
    let left = index - 1;
    let right = index + 1;

    // traverse left and right until we exceed amount 
    while (sum < amount) {
        if (left >= 0 && (right >= distribution.length || distribution[left] >= distribution[right])) {
            sum += distribution[left];
            range.unshift(left);
            left--;
        } else if (right < distribution.length) {
            sum += distribution[right];
            range.push(right);
            right++;
        } else {
            break;
        }
    }

    // convert to return values: 
    const eloRange = range.map(i => i * 25);
    const minElo = Math.min(...eloRange);
    const maxElo = Math.max(...eloRange) + 25;
    return {
        sum,
        minElo,
        maxElo
    };
}

// Given distribution, calculates entropy via formula: -Σ p(x) * log2(p(x))
// Not used now, but was used for earlier iterations and simulations
function calculateEntropy(distribution) {
    return distribution.reduce((entropy, prob) => {
        if (prob > 0) {
            entropy -= prob * Math.log2(prob);
        }
        return entropy;
    }, 0);
}

// SIMULATION FUNCTION: Used for simulation. Paramaters used to offer many differnet kinds of tests. 
// Note: [Most params have no impact in current code] Need to adjust code if wanting to use again for more tests. 
function simulateDiagnostic(simulationsCountS, puzzlesCountS, stepSize, normal, changeFactor, rating) {

    const changeNum = changeFactor;
    const mean = 1500;
    const stdDev = 500;
    const startElo = 0;
    const endElo = 3000;
    const step = stepSize;
    const deviation = [];
    const { data: initialData, labels: elo } = generateContinuousGaussianData(mean, stdDev, startElo, endElo, step);
    prior = initialData;
    eloLabels = elo;
    const trueElos = [];
    const eloDifferences = [];
    const entropyInEnd = [];
    const numSimulations = simulationsCountS;
    const numPuzzles = puzzlesCountS;

    for (let i = 0; i < numSimulations; i++) { // for numSimulation "runs"

        const trueElo = Math.floor(Math.random() * 3000) + 1;
        trueElos.push(trueElo);
        let currentPrior = [...prior];

        for (let j = 0; j < numPuzzles; j++) { // each "run" consists of attemting numPuzzles puzzles. 

            let puzzle = selectPuzzle(openingPuzzles, currentPrior);
            const successProbability = eloProbability(trueElo, puzzle.rating, 1);
            const success = Math.random() < successProbability;
            currentPrior = updateBelief(currentPrior, puzzle.rating, success);
        }
        let exp = calculateExpectedElo(eloLabels, currentPrior);
        deviation.push(Math.abs(exp - trueElo));
    }

    // reporting results in the end. 
    const deviationStats = analyzeEloDifferences(deviation, puzzlesCountS);
    console.log(deviationStats);
}

// (FOR SIMULATIONS) Helper Function: Takes in distrubiton, returns array of: [label, mean, median, q1, q3, min, max]
function analyzeEloDifferences(eloDifferences, label) {
    // mean
    const sum = eloDifferences.reduce((acc, val) => acc + val, 0);
    const mean = sum / eloDifferences.length;
    const sortedElo = eloDifferences.slice().sort((a, b) => a - b);

    // median
    const mid = Math.floor(sortedElo.length / 2);
    const median =
        sortedElo.length % 2 === 0
            ? (sortedElo[mid - 1] + sortedElo[mid]) / 2
            : sortedElo[mid];

    // q1 and q3
    function calculateQuartiles(sortedArray) {
        const mid = Math.floor(sortedArray.length / 2);

        const lowerHalf = sortedArray.slice(0, mid);
        const upperHalf =
            sortedArray.length % 2 === 0
                ? sortedArray.slice(mid)
                : sortedArray.slice(mid + 1);

        const q1 = lowerHalf.length % 2 === 0
            ? (lowerHalf[lowerHalf.length / 2 - 1] + lowerHalf[lowerHalf.length / 2]) / 2
            : lowerHalf[Math.floor(lowerHalf.length / 2)];

        const q3 = upperHalf.length % 2 === 0
            ? (upperHalf[upperHalf.length / 2 - 1] + upperHalf[upperHalf.length / 2]) / 2
            : upperHalf[Math.floor(upperHalf.length / 2)];

        return { q1, q3 };
    }

    const { q1, q3 } = calculateQuartiles(sortedElo);

    //min and max
    const min = Math.min(...sortedElo);
    const max = Math.max(...sortedElo);

    return [label, mean, median, q1, q3, min, max];
}

// Helper Function: Calculates the Standard Deviation of a given distribution 
function calculateStandardDeviation(labels, distribution) {
    const expectedElo = calculateExpectedElo(labels, distribution);
    // variance:
    let variance = 0;
    for (let i = 0; i < labels.length; i++) {
        variance += Math.pow(labels[i] - expectedElo, 2) * distribution[i];
    }
    // std deviation: 
    return Math.sqrt(variance);
}
