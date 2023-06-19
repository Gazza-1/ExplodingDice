# Exploding Dice

This implements exploding dice by adding another die of the specified type if the die result is the maximum for its type.

## Installation
For now, this has to be done manually, see the [offical instructions](https://symbiote-docs.talespire.com/#installing).

## How To Use
To do this, you will need to type in the dice formula (e.g 2D10 + 5) and click roll.

The dice roll will need to fit the format specified on the [knowledgebase](https://feedback.talespire.com/kb/article/talespire-url-scheme), with the exception of named roll, which is handled seperately, and multiple dice groups, which are not supported.

After the initial roll, whenever die meet the criteria for exploding, they will be placed in the hand.

After no more dice meet the criteria, the result will be displayed.

## Attribution
This was based off the [Dice Roller example](https://github.com/Bouncyrock/symbiotes-examples/tree/main/Dice_Roller).