let trackedIds = {};
let resultGroup = {};
let diceToExplode = {};
let finalResult = 0;
let isGM = false;
let me;

function roll(input)
{
    let name = document.getElementById("roll-name").value || "Exploding Dice";
    let dice = input || document.getElementById("roll-content").value || "1d20";
    //console.log(`submitting talespire://dice/${name}:${dice}/${name}:${dice}`);
    TS.dice.putDiceInTray([{name: name, roll: dice}], true).then((diceSetResponse) => {
        console.log("putDiceInTray rollId response:", diceSetResponse);
        trackedIds[diceSetResponse] = 1;
    });
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
		let max = parseInt(diceSet.kind.substring(1));
		for (let result of diceSet.results) {
			if (result === max) {
				if (diceToExplode[max] === undefined) {
					diceToExplode[max] = {"+": 0, "-": 0};
				}
				diceToExplode[max][operator || "+"]++;
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
    if (msg.kind === "haveInitialized") {
        TS.clients.whoAmI().then((me) => {
            TS.clients.getMoreInfo([me.id]).then((info) => {
                if (info[0].clientMode == "gm")
                {
                    document.getElementById("roll-result-container").classList.add("hidden");
                    isGM = true;
                }
                else
                {
                    document.getElementById("roll-result-container").classList.remove("hidden");
                    isGM = false;
                }
            }).catch((info) => {
                console.log("error in fetching client info", info);
            });

        }).catch((response) => {
            console.log("error in fetching own client info", response);
        });
    }
}

async function displayResult(result, resultGroup, rollId)
{
    document.getElementById("roll-result").textContent = result;
    TS.dice.sendDiceResult([resultGroup], rollId);
}
