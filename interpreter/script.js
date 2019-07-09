
let source_commands = [{ "index": 0, "command": "INITIALIZE_TRIM", "args": ["IP(IP8)", "BEAM(BEAM1,BEAM2)", "PLANE(SEPARATION,CROSSING)", "UNITS(SIGMA)"], "beamPos": { "BEAM1": { "CROSSING": 0, "SEPARATION": 0 }, "BEAM2": { "CROSSING": 0, "SEPARATION": 0 } }, "realTime": 0, "stepTime": 0 }, { "index": 1, "command": "SECONDS_WAIT", "args": ["20"], "beamPos": { "BEAM1": { "CROSSING": 0, "SEPARATION": 0 }, "BEAM2": { "CROSSING": 0, "SEPARATION": 0 } }, "realTime": 20, "stepTime": 20 }, { "index": 2, "command": "RELATIVE_TRIM", "args": ["IP8", "BEAM1", "CROSSING", "-3.375", "SIGMA", "IP8", "BEAM2", "CROSSING", "3.375", "SIGMA"], "beamPos": { "BEAM1": { "CROSSING": -0.03375, "SEPARATION": 0 }, "BEAM2": { "CROSSING": 0.03375, "SEPARATION": 0 } }, "realTime": 21.03375, "stepTime": 20 }, { "index": 3, "command": "SECONDS_WAIT", "args": ["10"], "beamPos": { "BEAM1": { "CROSSING": -0.03375, "SEPARATION": 0 }, "BEAM2": { "CROSSING": 0.03375, "SEPARATION": 0 } }, "realTime": 31.03375, "stepTime": 30 }, { "index": 4, "command": "RELATIVE_TRIM", "args": ["IP8", "BEAM1", "CROSSING", "0.375", "SIGMA", "IP8", "BEAM2", "CROSSING", "-0.375", "SIGMA"], "beamPos": { "BEAM1": { "CROSSING": -0.030000000000000002, "SEPARATION": 0 }, "BEAM2": { "CROSSING": 0.030000000000000002, "SEPARATION": 0 } }, "realTime": 32.0375, "stepTime": 30 }, { "index": 5, "command": "SECONDS_WAIT", "args": ["10"], "beamPos": { "BEAM1": { "CROSSING": -0.030000000000000002, "SEPARATION": 0 }, "BEAM2": { "CROSSING": 0.030000000000000002, "SEPARATION": 0 } }, "realTime": 42.0375, "stepTime": 40 }, { "index": 6, "command": "RELATIVE_TRIM", "args": ["IP8", "BEAM1", "CROSSING", "0.375", "SIGMA", "IP8", "BEAM2", "CROSSING", "-0.375", "SIGMA"], "beamPos": { "BEAM1": { "CROSSING": -0.026250000000000002, "SEPARATION": 0 }, "BEAM2": { "CROSSING": 0.026250000000000002, "SEPARATION": 0 } }, "realTime": 43.04125, "stepTime": 40 }, { "index": 7, "command": "SECONDS_WAIT", "args": ["10"], "beamPos": { "BEAM1": { "CROSSING": -0.026250000000000002, "SEPARATION": 0 }, "BEAM2": { "CROSSING": 0.026250000000000002, "SEPARATION": 0 } }, "realTime": 53.04125, "stepTime": 50 }, { "index": 8, "command": "RELATIVE_TRIM", "args": ["IP8", "BEAM1", "CROSSING", "0.375", "SIGMA", "IP8", "BEAM2", "CROSSING", "-0.375", "SIGMA"], "beamPos": { "BEAM1": { "CROSSING": -0.022500000000000003, "SEPARATION": 0 }, "BEAM2": { "CROSSING": 0.022500000000000003, "SEPARATION": 0 } }, "realTime": 54.044999999999995, "stepTime": 50 }, { "index": 9, "command": "SECONDS_WAIT", "args": ["10"], "beamPos": { "BEAM1": { "CROSSING": -0.022500000000000003, "SEPARATION": 0 }, "BEAM2": { "CROSSING": 0.022500000000000003, "SEPARATION": 0 } }, "realTime": 64.04499999999999, "stepTime": 60 }];

$(document).ready(function () {
    // Put datastructure into the veiwer
    /* let table = document.getElementById('table');
    table.content = source_commands; */

    let file = `0 INITIALIZE_TRIM IP(IP8) BEAM(BEAM1,BEAM2) PLANE(SEPARATION,CROSSING) UNITS(SIGMA)
1 SECONDS_WAIT 20
2 RELATIVE_TRIM IP8 BEAM1 CROSSING -3.375 SIGMA IP8 BEAM2 CROSSING 3.375 SIGMA
3 SECONDS_WAIT 10
4 RELATIVE_TRIM IP8 BEAM1 CROSSING 0.375 SIGMA IP8 BEAM2 CROSSING -0.375 SIGMA
5 SECONDS_WAIT 10`



    // Here I do stuff with the object!
    VdMObject = new VdMConstructor(file);
    console.log(VdMObject.lines);
    // VdMObject.addLine('10 THIS_IS_AN_ADDED_LINE', 2);
    // console.log(VdMObject.lines);
    // VdMObject.removeLine(2);
    // console.log(VdMObject.lines);
    // VdMObject.replaceLine('100 THIS_IS_A_REPLACED_LINE', 2)
    // console.log(VdMObject.lines);
});


class VdMConstructor {
    /**
     * @param {string} data
     */
    constructor(data) {
        let lineArr = data.split(/\n+/);
        this.lines = this._commandlinesToObjects(lineArr);
        this._simulateBeamPath(this.lines);

        // Some code that checks whether there is an INITIALIZE_TRIM line
    }

    /**
     * @param {string} newLine
     * @param {int} newLineNum
     */
    addLine(newLine, newLineNum) {
        let start = this.lines.slice(0, newLineNum);
        let end = this.lines.slice(newLineNum).map(function (obj) {
            obj.index++;
            // Here we must add stuff when the structure gets more features
            return obj;
        });
        let middle = this._commandlinesToObjects([newLine]);
        this.lines = start.concat(middle, end);
        this._simulateBeamPath(this.lines);
    }
    /**
     * @param {string} newLine
     * @param {int} newLineNum
     */
    removeLine(lineNum) {
        let start = this.lines.slice(0, lineNum);
        let end = this.lines.slice(lineNum + 1).map(function (obj) {
            obj.index--;
            // Here we must add stuff when the structure gets more features
            return obj;
        })
        this.lines = start.concat(end);
        this._simulateBeamPath(this.lines);
    }
    /**
     * @param {string} newLine
     * @param {int} lineNum
     */
    replaceLine(newLine, lineNum) {
        this.removeLine(lineNum);
        this.addLine(newLine, lineNum);
    }

    /**
     * @param {Array} lineArr
     */
    _commandlinesToObjects(lineArr) {
        let objArr = [];
        try {
            if (!Array.isArray(lineArr)) {
                throw '_commandlinesToObjects takes an array! Got "' + typeof lineArr + '" with value: ' + JSON.stringify(lineArr)
            }
            for (let line of lineArr) {
                // Deconstruct string into arguments
                let tmp = line.trim().split(/\s+/);
                if (tmp.length < 2) {
                    throw 'Command line has to include: "int command". Got: ' + tmp
                    // Maybe continue instead?
                }

                // Make object with areguments from string
                let obj = {};
                obj.index = parseInt(tmp[0]);
                obj.command = tmp[1];
                obj.args = tmp.slice(2);

                // Initialise the simulated parameters to object
                obj.beamPos = {
                    'BEAM1': { 'CROSSING': 0.0, 'SEPARATION': 0.0 },
                    'BEAM2': { 'CROSSING': 0.0, 'SEPARATION': 0.0 }
                }
                obj.stepTime = 0.0;
                obj.realTime = 0.0;

                // Add ovject to array
                objArr.push(obj);
            }
        } catch (err) {
            // Do something on error
            console.log(err)
        }
        return objArr
    }

    /**
     * 
     * @param {*} objArr 
     */
    // Maybe 'updateBeamPath' more fitting. Do not know what to put in above
    _simulateBeamPath(objArr) {
        try {
            let step = objArr[0];
            this._commandHandler[step.command].apply(step, step.args);
            if (objArr.length > 1) {
                for (let i = 1; i < objArr.length; i++) {
                    step = objArr[i];
                    step.beamPos = objArr[i - 1].beamPos;
                    step.stepTime = objArr[i - 1].stepTime;
                    step.realTime = objArr[i - 1].realTime;
                    this._commandHandler[step.command].apply(step, step.args);
                }
            }
        } catch (err) {
            // Do something on error
            console.log(err)
        }
    }

    _commandHandler = {
        'INITIALIZE_TRIM': function (ips, beams, planes, units) {

        },
        'SECONDS_WAIT': function (duration) {
            let waitTime = parseFloat(duration);
            if (!isFinite(waitTime)) {
                throw 'Wait time has to be finite. Got: ' + duration
            }
            this.stepTime += waitTime;
            this.realTime += waitTime;
        },
        'RELATIVE_TRIM': function (...actions) {

        },
        'ABSOLUTE_TRIM': function (...actions) {

        },
        'START_FIT': function (plane, type) {

        },
        'END_FIT': function (plane) {

        },
        'END_SEQUENCE': function (actions) {

        },
        'MESSAGE': function (message) {

        }
    }

}