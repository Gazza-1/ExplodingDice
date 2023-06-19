let trackedIds = {};
let resultGroup = {};
let diceToExplode = {};
let finalResult = 0;
let isGM = false;
let me;
let explodeOn = {
    "4": {
        'min': 1,
        'max': 4
    },
    "6": {
        'min': 1,
        'max': 6
    },
    "8": {
        'min': 1,
        'max': 8
    },
    "10": {
        'min': 1,
        'max': 10
    },
    "12": {
        'min': 1,
        'max': 12
    },
    "20": {
        'min': 1,
        'max': 20
    },
    "100": {
        'min': 1,
        'max': 100
    }
};

function roll(input)
{
    var doRoll = true,
        error = "";
    for (let [diceName, options] of Object.entries(explodeOn)) {
        var slider = document.getElementById("slider-" + diceName).noUiSlider.get();
        if (parseInt(slider[0]) === options.min && parseInt(slider[1]) === options.max) {
            doRoll = false;
            error += error.length === 0 ? "Unable to roll; please change the min or max for:</br></br>D" + diceName : "</br>D" + diceName;
        }
    }
    if (doRoll) {
        document.getElementById("roll-result").textContent = "";
        let name = document.getElementById("roll-name").value || "Exploding Dice";
        let dice = input || document.getElementById("roll-content").value || "1d20";
        TS.dice.putDiceInTray([{name: name, roll: dice}], true).then((diceSetResponse) => {
            console.log("putDiceInTray rollId response:", diceSetResponse);
            trackedIds[diceSetResponse] = 1;
        });
    } else {
        document.getElementById("roll-result").innerHTML = error;
    }
}

async function handleRollResult(rollEvent)
{
    console.log("roll event", rollEvent);
    if (trackedIds[rollEvent.payload.rollId] == undefined && rollEvent.kind == "rollResults") //TODO: this is due to inconsistent naming, rollCleared has payload.id, rollResults has payload.rollId
    {
        console.log("untracked");
        //if we haven't tracked that roll, ignore it
        return;
    }

    if (rollEvent.kind == "rollResults")
    {
        let roll = rollEvent.payload
        if (roll.resultsGroups != undefined && roll.resultsGroups.length >= 1)
        {
            if (trackedIds[roll.rollId] == 1)
            {
                let diceSet = roll.resultsGroups[0].result;
                handleOperation("+", diceSet);
                finalResult += await TS.dice.evaluateDiceResultsGroup(roll.resultsGroups[0]);
                if (Object.keys(resultGroup).length === 0) {
                    resultGroup = roll.resultsGroups[0];
                }
            }
            else
            {
                return;
            }
        }
        if (Object.keys(diceToExplode).length > 0) {
            let diceStr = "";
            for (let [diceName, dice] of Object.entries(diceToExplode)) {
                for (let [operator, num] of Object.entries(dice)) {
                    if (num > 0) {
                        diceStr += operator + num.toString() + "d" + diceName;
                    }
                }
            }
			diceToExplode = {};
            if (diceStr.length > 0) {
                this.roll(diceStr);
            }
        } else {
            console.log(finalResult, resultGroup, roll.rollId);
            displayResult(finalResult, resultGroup, roll.rollId);
            finalResult = 0;
            resultGroup = {};
        }
    }
    else if (rollEvent.kind == "rollCleared")
    {
        //if you want special handling when the user doesn't roll the dice
        delete trackedIds[rollEvent.payload.id];
    }
}

function handleOperation(operator, diceSet) {
	if (diceSet.hasOwnProperty('value')) {
		//skip
	}
	else if (diceSet.operands === undefined) {
		let diceName = diceSet.kind.substring(1);
        let min = parseInt(document.getElementById("slider-" + diceName + "-min-amount").innerText);
        let max = parseInt(document.getElementById("slider-" + diceName + "-max-amount").innerText);
		for (let result of diceSet.results) {
			if (result >= min && result <= max) {
				if (diceToExplode[diceName] === undefined) {
					diceToExplode[diceName] = {"+": 0, "-": 0};
				}
				diceToExplode[diceName][operator || "+"]++;
			}
		}
		if (Object.keys(resultGroup).length > 0) {
			addToSavedResultGroup(operator, diceSet.kind, diceSet.results, "+");	
		}
	} else {
		handleOperation(operator, diceSet.operands[0]);
		handleOperation(diceSet.operator, diceSet.operands[1]);
	}
}

function addToSavedResultGroup(addOp, addKind, addResults, resOp, resResult) {
	var result = resResult || resultGroup.result;
	if (result.hasOwnProperty('value')) {
		//skip
	} 
	else if (result.operands === undefined) {
		if (resOp === addOp && result.kind === addKind) {
			result.results = result.results.concat(addResults);	
		}
	} else {
		addToSavedResultGroup(addOp, addKind, addResults, resOp, result.operands[0]);
		addToSavedResultGroup(addOp, addKind, addResults, result.operator, result.operands[1]);
	}
}

function onStateChangeEvent (msg) {
    if (msg.kind === "hasInitialized") {
        var explodeOnEl = document.getElementById("roll-explode-on");
        for (let [diceName, options] of Object.entries(explodeOn)) {
            var elToAdd = document.createElement("span");
            elToAdd.id = "slider-" + diceName;
            explodeOnEl.appendChild(elToAdd);
            noUiSlider.create(elToAdd, {
                start: [options.max, options.max],
                connect: true,
                range: options,
                step: 1
            });
            var diceEl = document.createElement("span");
            diceEl.className = "diceName";
            elToAdd.appendChild(diceEl);
            diceEl.innerText = "D" + diceName;
            var minEl = document.createElement("div");
            minEl.id = "slider-" + diceName + "-min";
            minEl.className = "amountLabel";
            elToAdd.appendChild(minEl);            
            minEl.innerHTML = "Min: <span id='slider-" + diceName + "-min-amount'>" + options.max + "</span>";
            var maxEl = document.createElement("div");
            maxEl.id = "slider-" + diceName + "-max";
            maxEl.className = "amountLabel";
            maxEl.innerHTML = "Max: <span id='slider-" + diceName + "-max-amount'>" + options.max + "</span>";
            elToAdd.appendChild(maxEl);
            elToAdd.noUiSlider.on('update', function (values, handle) {
                document.getElementById("slider-" + diceName + "-min-amount").innerText = parseInt(values[0]);
                document.getElementById("slider-" + diceName + "-max-amount").innerText = parseInt(values[1]);
            });
        }
    }
}

async function displayResult(result, resultGroup, rollId)
{
    document.getElementById("roll-result").textContent = result;
    TS.dice.sendDiceResult([resultGroup], rollId);
}
