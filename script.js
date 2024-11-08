var currentMoveIndex = 0;
var totalMoves = 0;
var currentPuzzleMoves = [];
var puzzles = [];
var whitePuzzle = true; 
var freeze = false; 
let eloLabels = [];          // Labels for ELO (e.g., [1000, 1050, 1100, ...])
let prior = [];        // Data representing the probability distribution
let puzzleCount = 0; 
var currentPuzzleRating = 0;

//global variables for final summary. 
let expectationOverTime = [];
let puzzleRatingOverTime = [];
let success = [];

function finishDiagnostic(){
    document.getElementById('resultsTable').style.display = 'table'; // Make the table visible
    document.getElementById("moveResult2").style.display = "none";
    document.getElementById("moveResult").style.display = "none";
    showMessageMove("Nice job solving! Here are the results:")
    document.getElementById("chessboard").style.display = "none";
    document.getElementById("sessionChart").style.display = "block";
    document.querySelector("button[onclick='finishDiagnostic()']").style.display = "none";
    document.querySelector("button[onclick='loadRandomPuzzle()']").style.display = "none";

    const expectations = [1500, ...expectationOverTime];
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

        // Add the puzzle result and rating
        const puzzleInfo = `${results[i-1]} Puzzle Rated ${puzzleRatings[i-1]}`;
        cell1.textContent = puzzleInfo;

        // Add the updated estimated Elo (from expectations array)
        const updatedElo = Math.round(expectations[i]);
        cell2.textContent = updatedElo;
    }
}

// Call the function to update the table with data
updateTable();

}


// Function to load puzzles from the CSV file
function loadPuzzles() {
    $.ajax({
        type: "GET",
        url: "lichess_puzzles.csv", 
        dataType: "text",
        success: function(data) {
            //showMessage("CSV data loaded.");
            const rows = data.split("\n");

            const maxPuzzles = 500; // You can adjust this if needed
            puzzles = rows.slice(0, maxPuzzles).map(row => {
                const cols = row.split(',');
                if (cols.length > 3) { // Make sure there are enough columns
                    return {
                      fen: cols[1].trim(),
                      solution: cols[2].split(' ').map(move => move.trim()),
                      rating: parseInt(cols[3].trim(), 10) // Extract the rating
                    };
                  }
                
                return null;
            }).filter(puzzle => puzzle !== null);

            //showMessage("Puzzles loaded: " + puzzles.length);
        },
        error: function() {
            showMessage("Error loading CSV. Please check the file path.");
        }
    });
}

function loadRandomPuzzle() {
    document.querySelector("button[onclick='loadRandomPuzzle()']").style.display = "none";
    reset();

    const puzzle = puzzles[Math.floor(Math.random() * puzzles.length)];
    puzzleCount += 1; 
    const fen = puzzle.fen;
    if (color(fen) === true){
        whitePuzzle = false; 
    }
   
    if (whitePuzzle){
        showMessageMove("Puzzle #" + puzzleCount + ", White To Move");
        board.orientation('white');
    }
    else {
        showMessageMove("Puzzle #" + puzzleCount + ", Black To Move");
        board.orientation('black');

    }
    currentPuzzleMoves = puzzle.solution; 
    currentPuzzleRating = puzzle.rating;
    //showMessage2(currentPuzzleRating);
    game.load(fen);
    board.position(fen);
    //game.move({from: 'e7', to: 'f7'});
    totalMoves = currentPuzzleMoves.length;

    makeMove(currentPuzzleMoves[0]);
  
}

function reset(){
     currentMoveIndex = 0;
     totalMoves = 0;
     currentPuzzleMoves = [];
     whitePuzzle = true;
     freeze = false;
}
function color(fen) {
    // Split the FEN string by spaces and check the sixth field
    const parts = fen.split(" ");
    return parts[1] === 'w';
}

function onDragStart (source, piece, position, orientation) {
    if (freeze){
        return false; 
    }
    else if ((game.turn() === 'w' && piece.search(/^b/) !== -1) ||
        (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
      return false
    }
    
    return true;
    //check that only drag correct pieces
    //if not, return false;

  }

  function onDrop (source, target, piece, newPos, oldPos, orientation) {
    //check if correct move
    var move = source+target;
    if (makeMove(move) === null) {
        return 'snapback';
    }
    if (move === currentPuzzleMoves[currentMoveIndex-1]){
        correctMove();
    }
    else {
        wrongMove();
    }
    
  }

function wrongMove(){
    finishedPuzzle(false);
    // showMessage("Wrong Move");
    // freeze = true;
    // prior = updateBelief(prior, currentPuzzleRating, false);
    // updateChartWithNewData(eloLabels, prior);
}
function correctMove(){
    if (currentMoveIndex === totalMoves){ // last move
        finishedPuzzle(true);
        // showMessage("Well Done. You got it!");  
        // prior = updateBelief(prior, currentPuzzleRating, true);
        // updateChartWithNewData(eloLabels, prior);
        // freeze = true;
        // return; 
    }
    else { 
        makeMove(currentPuzzleMoves[currentMoveIndex]);
        return;
    }   
}

function finishedPuzzle(result){
    freeze = true;
    if (result) {
        showMessage("Amazing. You got it!");
        prior = updateBelief(prior, currentPuzzleRating, true);
        success.push("Solved");
    }
    else {
        showMessage("Oh no!, that was incorrect.");
        prior = updateBelief(prior, currentPuzzleRating, false);
        success.push("Failed");
    }
    updateChartWithNewData(eloLabels, prior);
    expectationOverTime.push(calculateExpectedElo(eloLabels, prior));
    puzzleRatingOverTime.push(currentPuzzleRating);
    document.querySelector("button[onclick='loadRandomPuzzle()']").style.display = "block";
    
   // success.push(result);
}

function stringToMove(move){
    return {from: move.substring(0, 2), to: move.substring(2, 4), promotion: 'q'}
}


function makeMove(string) {
    const move = stringToMove(string);
    
    const result = game.move(move); // Make the move in the game logic
    if (result === null) return null; // Invalid move handling

    // Important to refesch board on delay, to avoid ghosting issues. 
    setTimeout(() => board.position(game.fen()), 50);
    
    
    currentMoveIndex++;
    return result;
}


// Function to display messages on the screen
function showMessage(msg) {
    const messageElement = document.getElementById("moveResult");
    if (messageElement) {
        messageElement.innerHTML = msg;
    }
}

function showMessage2(msg) {
    const messageElement = document.getElementById("moveResult2");
    if (messageElement) {
        messageElement.innerHTML = msg;
    }
}

function showMessageMove(msg) {
    const messageElement = document.getElementById("toMove");
    if (messageElement) {
        messageElement.innerHTML = msg;
    }
}

// Function to reset the game
function resetGame() {
    game.reset(); 
    board.start();
    currentMoveIndex = 1; 
    totalMoves = 0;
    currentPuzzleMoves = []; 
    showMessage(""); 
    updateTurnMessage(); 
}

// Initialize the chess game and board
var game = new Chess();
var board = Chessboard('chessboard', {
    draggable: true,
    position: 'start', 
    pieceTheme: function(piece) {
        return piece + '.png'; 
    }, onDrop: onDrop
    , onDragStart: onDragStart
});

// Load puzzles on page load
loadPuzzles();


// Generate Gaussian data for a normal distribution with given mean and standard deviation
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

// Initialize Chart.js line chart for ELO prediction
//let eloChart;

function plotEloLineChart(labels, data) {
    const ctx = document.getElementById('eloChart').getContext('2d');
        // Create new chart
        eloChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'ELO Prediction Density',
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
                            text: 'Probability Density'
                        },
                        beginAtZero: true
                    }
                }
            }
        });
    
}


// Initialize chart on page load with a normal distribution centered at 1500 ELO
document.addEventListener("DOMContentLoaded", () => {
    const mean = 1500;
    const stdDev = 500;
    const startElo = 0;
    const endElo = 3000;
    const step = 100;

    // Generate initial Gaussian data
    const { data: initialData, labels: elo } = generateContinuousGaussianData(mean, stdDev, startElo, endElo, step);
    // Plot the initial chart
    prior = initialData;
    eloLabels = elo;
    plotEloLineChart(eloLabels, prior);
});



// Functions for the probability math calculations: 

function eloProbability(playerElo, puzzleElo) {
    return 1 / (1 + Math.pow(10, (puzzleElo - playerElo) / 400));
  }
  
function updateBelief(priorBelief, puzzleElo, success) {
    const newBelief = [];
    let totalLikelihood = 0;

    for (let i = 0; i < priorBelief.length; i++) {
        const playerElo = eloLabels[i];  // Match ELO labels
        const likelihood = eloProbability(playerElo, puzzleElo);
        const updatedLikelihood = success ? likelihood : 1 - likelihood;
        
        newBelief[i] = priorBelief[i] * updatedLikelihood;
        totalLikelihood += newBelief[i];
    }

    // Normalize the new belief
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


function calculateExpectedElo(labels, distribution) {
    let expectedElo = 0;
    for (let i = 0; i < labels.length; i++) {
        expectedElo += labels[i] * distribution[i];
    }
    return expectedElo;
}

window.onload = function() {
    // document.getElementById("chessboard").style.display = "none";
    // document.getElementById('resultsTable').style.display = 'none'; // Hide the table on load
    // document.querySelector("button[onclick='finishDiagnostic()']").style.display = "none";
    // document.querySelector("button[onclick='loadRandomPuzzle()']").style.display = "none";
    // document.getElementById("eloChart").style.display = "none";
    
};


function beginDiagnostic(){
    document.querySelector("button[onclick='beginDiagnostic()']").style.display = "none";
    document.getElementById("chessboard").style.display = "block";
    document.getElementById("eloChart").style.display = "block";
    // document.querySelector("button[onclick='loadRandomPuzzle()']").style.display = "block";
    document.querySelector("button[onclick='finishDiagnostic()']").style.display = "block";
    document.getElementById("moveResult2").style.display = "block";
    document.getElementById("moveResult").style.display = "block";
    document.getElementById("toMove").style.display = "block";
    hideStartSceneElements();
    loadRandomPuzzle();

}

function hideStartSceneElements() {
    // Get the flowContainer element
    const flowContainer = document.getElementById('flowContainer');
  
    // Get all the children of the flowContainer (the divs with class "step")
    const steps = flowContainer.children;
  
    // Loop through each step
    for (let i = 0; i < steps.length; i++) {
      // Get the image and paragraph elements within each step
      const image = steps[i].querySelector('img');
      const paragraph = steps[i].querySelector('p');
  
      // Hide the image and paragraph
      image.style.display = 'none';
      paragraph.style.display = 'none';
    }
  }
